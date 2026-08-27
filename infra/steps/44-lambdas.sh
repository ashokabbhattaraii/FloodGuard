#!/usr/bin/env bash
# Build and deploy the six Lambda functions.
#
# Bundling strategy: the Node 22 runtime already ships AWS SDK v3, so five of the
# six functions are a single .mjs file plus the shared helper — a few KB, which
# keeps cold starts short. Only fg-upload-presign declares dependencies
# (@aws-sdk/s3-request-presigner is not guaranteed present in the runtime image).
source "$(dirname "$0")/../lib/common.sh"
state_require DDB_TABLE SQS_FORECAST_URL SQS_ALERT_URL SNS_ALERTS_ARN \
              SQS_FORECAST_ARN SQS_ALERT_ARN
require_tools zip jq node

# Lambdas reach the monolith over HTTPS via CloudFront when it exists; the raw EB
# CNAME is HTTP-only, which would send the internal API key in clear text.
BACKEND_URL="$(state_get CLOUDFRONT_BACKEND_URL)"
if [[ -z "$BACKEND_URL" ]]; then
  EB_CNAME="$(state_get EB_BACKEND_CNAME)"
  [[ -n "$EB_CNAME" ]] || die "no backend URL yet — run ./deploy.sh 30 first"
  BACKEND_URL="http://${EB_CNAME}"
  warn "using HTTP to $EB_CNAME — re-run ./deploy.sh 44 after step 32 to switch to HTTPS"
fi
ok "backend URL for internal calls: $BACKEND_URL"

env_for() {
  case "$1" in
    fg-weather-ingest)  jq -nc --arg s "$SECRET_NAME" --arg b "$BACKEND_URL" --arg t "$DDB_TABLE" --arg q "$SQS_FORECAST_URL" \
                          '{SECRET_NAME:$s, BACKEND_URL:$b, DDB_TABLE:$t, FORECAST_QUEUE_URL:$q}' ;;
    fg-flood-forecast)  jq -nc --arg s "$SECRET_NAME" --arg b "$BACKEND_URL" --arg q "$SQS_ALERT_URL" \
                          '{SECRET_NAME:$s, BACKEND_URL:$b, ALERT_QUEUE_URL:$q}' ;;
    fg-alert-dispatch)  jq -nc --arg s "$SECRET_NAME" --arg b "$BACKEND_URL" --arg t "$SNS_ALERTS_ARN" \
                          '{SECRET_NAME:$s, BACKEND_URL:$b, ALERTS_TOPIC_ARN:$t}' ;;
    fg-report-intake)   jq -nc --arg s "$SECRET_NAME" --arg b "$BACKEND_URL" \
                          '{SECRET_NAME:$s, BACKEND_URL:$b}' ;;
    fg-upload-presign)  jq -nc --arg u "$S3_UPLOADS_BUCKET" '{UPLOADS_BUCKET:$u}' ;;
    fg-image-process)   jq -nc --arg s "$SECRET_NAME" --arg b "$BACKEND_URL" \
                          '{SECRET_NAME:$s, BACKEND_URL:$b}' ;;
  esac
}

# Per-function timeout: the scheduled sweep fans out over every region serially,
# so it needs materially longer than a single API-Gateway-fronted request.
timeout_for() {
  case "$1" in
    fg-weather-ingest) echo 300 ;;
    fg-flood-forecast) echo 120 ;;
    fg-alert-dispatch) echo 60  ;;
    *)                 echo 30  ;;
  esac
}

build_zip() {
  local fn="$1" src="$INFRA_DIR/lambdas/$fn" stage="$BUILD_DIR/lambda-$fn" zip="$BUILD_DIR/${fn}.zip"
  rm -rf "$stage" "$zip"; mkdir -p "$stage"
  cp "$src/index.mjs" "$stage/"
  cp "$INFRA_DIR/lambdas/_shared/common.mjs" "$stage/"
  if [[ -f "$src/package.json" ]]; then
    cp "$src/package.json" "$stage/"
    (cd "$stage" && npm install --omit=dev --no-audit --no-fund --silent) >/dev/null 2>&1 \
      || die "npm install failed for $fn"
  fi
  (cd "$stage" && zip -qr "$zip" .)
  printf '%s' "$zip"
}

for fn in fg-weather-ingest fg-flood-forecast fg-alert-dispatch \
          fg-report-intake fg-upload-presign fg-image-process; do
  log "$fn"
  ROLE_ARN="$(state_get "ROLE_$(tr 'a-z-' 'A-Z_' <<<"$fn")")"
  [[ -n "$ROLE_ARN" ]] || die "no role for $fn — run ./deploy.sh 43"

  ZIP="$(build_zip "$fn")"
  ENVJSON="$(jq -nc --argjson v "$(env_for "$fn")" '{Variables:$v}')"
  TMO="$(timeout_for "$fn")"

  if aws lambda get-function --function-name "$fn" >/dev/null 2>&1; then
    aws lambda update-function-code --function-name "$fn" \
      --zip-file "fileb://$ZIP" --publish >/dev/null
    # Code and config updates cannot overlap; wait for the code update to settle.
    aws lambda wait function-updated-v2 --function-name "$fn"
    aws lambda update-function-configuration --function-name "$fn" \
      --timeout "$TMO" --memory-size "$LAMBDA_MEMORY" \
      --environment "$ENVJSON" \
      --tracing-config Mode=Active >/dev/null
    aws lambda wait function-updated-v2 --function-name "$fn"
    ok "updated ($(du -h "$ZIP" | cut -f1), timeout ${TMO}s, X-Ray active)"
  else
    aws lambda create-function --function-name "$fn" \
      --runtime "$LAMBDA_RUNTIME" --architectures "$LAMBDA_ARCH" \
      --role "$ROLE_ARN" --handler index.handler \
      --zip-file "fileb://$ZIP" \
      --timeout "$TMO" --memory-size "$LAMBDA_MEMORY" \
      --environment "$ENVJSON" \
      --tracing-config Mode=Active \
      --tags "Project=$PROJECT" >/dev/null
    aws lambda wait function-active-v2 --function-name "$fn"
    ok "created ($(du -h "$ZIP" | cut -f1), $LAMBDA_ARCH, timeout ${TMO}s, X-Ray active)"
  fi

  # Explicit log group with retention: Lambda auto-creates these with retention
  # set to "Never expire", which silently accrues cost forever.
  LG="/aws/lambda/$fn"
  aws logs create-log-group --log-group-name "$LG" >/dev/null 2>&1 || true
  aws logs put-retention-policy --log-group-name "$LG" --retention-in-days 14 >/dev/null
done

log "SQS event source mappings"
# This account's Lambda quota is 10 concurrent executions, and an uncapped SQS
# mapping will scale out until it owns all of them. When that happens the queue
# consumers starve the synchronous path and API Gateway starts returning 500s to
# real users — a background job pushing a user-facing endpoint over is exactly the
# failure a shared concurrency pool invites. Capping each consumer keeps a floor
# free for the request path; the queue absorbs the backlog, which is its job.
map_queue() {
  local fn="$1" queue_arn="$2" batch="$3" maxconc="$4"
  local existing
  existing="$(aws lambda list-event-source-mappings --function-name "$fn" \
    --event-source-arn "$queue_arn" --query 'EventSourceMappings[0].UUID' --output text 2>/dev/null)"
  if [[ -n "$existing" && "$existing" != "None" ]]; then
    # Converge rather than skip: the cap is the whole point of this step, so a
    # mapping created before it existed must be corrected on re-run.
    aws lambda update-event-source-mapping --uuid "$existing" \
      --batch-size "$batch" \
      --maximum-batching-window-in-seconds 5 \
      --scaling-config "MaximumConcurrency=$maxconc" \
      --function-response-types ReportBatchItemFailures >/dev/null
    ok "$fn <- $(basename "$queue_arn") (updated: batch $batch, max concurrency $maxconc)"
  else
    aws lambda create-event-source-mapping \
      --function-name "$fn" --event-source-arn "$queue_arn" \
      --batch-size "$batch" \
      --maximum-batching-window-in-seconds 5 \
      --scaling-config "MaximumConcurrency=$maxconc" \
      --function-response-types ReportBatchItemFailures >/dev/null
    # ReportBatchItemFailures is what makes the handlers' batchItemFailures
    # return value meaningful — without it, one bad message retries all 10.
    ok "$fn <- $(basename "$queue_arn") (batch $batch, max concurrency $maxconc, partial-failure reporting on)"
  fi
}
# 3 + 2 of 10 reserved for queues; the remaining 5 stay free for the request path.
map_queue fg-flood-forecast "$SQS_FORECAST_ARN" 5 3
map_queue fg-alert-dispatch "$SQS_ALERT_ARN" 1 2

state_set LAMBDA_BACKEND_URL "$BACKEND_URL"
ok "6 functions deployed"

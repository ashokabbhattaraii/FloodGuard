#!/usr/bin/env bash
# Destroy ONLY the Task #2 serverless and monitoring layer (deploy steps 40-48, 61-62).
#
# Phase 1 is left completely alone: VPC, subnets, security groups, RDS, both
# Elastic Beanstalk environments, the S3 buckets themselves, the CloudFront
# distribution and Secrets Manager all survive. The public URL does not change and
# no application data is lost, because the frontend never calls /sl/* and the
# monolith does not depend on any of these resources.
#
# Written so the serverless layer can be rebuilt from scratch for documentation
# screenshots. Reverse dependency order: stop new work arriving, then remove
# consumers, then the resources they used.
#
#   ./teardown-serverless.sh --dry-run   # list what would go, delete nothing
#   ./teardown-serverless.sh             # requires typing the account id
#
# Deliberately NOT in steps/ so `./deploy.sh all` can never invoke it.
set -Eeuo pipefail
INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$INFRA_DIR/lib/common.sh"

DRY=false
[[ "${1:-}" == "--dry-run" ]] && DRY=true

FUNCTIONS=(fg-weather-ingest fg-flood-forecast fg-alert-dispatch
           fg-report-intake fg-upload-presign fg-image-process)

run() {
  if $DRY; then
    printf '  %s[dry-run]%s %s\n' "$C_DIM" "$C_RESET" "$*"
  else
    "$@" >/dev/null 2>&1 && ok "${1##*/} ${2:-}" || warn "already gone: ${*:1:4}"
  fi
}

printf '\n%sDestroys the Task #2 serverless layer in account %s (%s).%s\n' \
  "$C_RED" "$EXPECTED_ACCOUNT_ID" "$AWS_REGION" "$C_RESET"
printf 'Kept: VPC, RDS, Elastic Beanstalk, S3 buckets, CloudFront, Secrets Manager.\n'
printf 'Lost: DynamoDB weather snapshots, queue contents, the 21 alarms.\n\n'

if ! $DRY; then
  assert_account
  read -rp "Type the account id to confirm: " CONFIRM
  [[ "$CONFIRM" == "$EXPECTED_ACCOUNT_ID" ]] || die "aborted"
fi

state_load_all
ACC="$EXPECTED_ACCOUNT_ID"

# ---------------------------------------------------------------- 1. stop triggers
log "1. Triggers (stop new work arriving before removing consumers)"
run aws scheduler delete-schedule --name "$SCHEDULER_NAME"

# Empty notification configuration detaches the bucket from fg-image-process
# without touching the bucket or its objects.
if $DRY; then
  printf '  %s[dry-run]%s aws s3api put-bucket-notification-configuration --bucket %s (empty)\n' \
    "$C_DIM" "$C_RESET" "${S3_UPLOADS:-$S3_UPLOADS_BUCKET}"
else
  aws s3api put-bucket-notification-configuration \
    --bucket "${S3_UPLOADS:-$S3_UPLOADS_BUCKET}" \
    --notification-configuration '{}' >/dev/null 2>&1 \
    && ok "s3 notification detached" || warn "s3 notification already clear"
fi

for fn in fg-flood-forecast fg-alert-dispatch; do
  for uuid in $(aws lambda list-event-source-mappings --function-name "$fn" \
                  --query 'EventSourceMappings[].UUID' --output text 2>/dev/null); do
    run aws lambda delete-event-source-mapping --uuid "$uuid"
  done
done

# ---------------------------------------------------------------- 2. front door
log "2. CloudFront /sl/* behaviour and API Gateway origin"
# Must be removed before the API is deleted, otherwise the distribution keeps an
# origin pointing at a dead hostname and step 48 would skip on rebuild.
if [[ -n "${CLOUDFRONT_ID:-}" ]]; then
  if $DRY; then
    printf '  %s[dry-run]%s remove /sl/* behaviour + apigw-serverless origin from %s\n' \
      "$C_DIM" "$C_RESET" "$CLOUDFRONT_ID"
  else
    aws cloudfront get-distribution-config --id "$CLOUDFRONT_ID" > "$BUILD_DIR/cf-teardown.json" 2>/dev/null || true
    if [[ -s "$BUILD_DIR/cf-teardown.json" ]] && \
       jq -e '.DistributionConfig.CacheBehaviors.Items[]? | select(.PathPattern=="/sl/*")' \
          "$BUILD_DIR/cf-teardown.json" >/dev/null 2>&1; then
      ETAG="$(jq -r '.ETag' "$BUILD_DIR/cf-teardown.json")"
      jq '.DistributionConfig
          | .CacheBehaviors.Items = [.CacheBehaviors.Items[] | select(.PathPattern != "/sl/*")]
          | .CacheBehaviors.Quantity = (.CacheBehaviors.Items | length)
          | .Origins.Items = [.Origins.Items[] | select(.Id != "apigw-serverless")]
          | .Origins.Quantity = (.Origins.Items | length)' \
        "$BUILD_DIR/cf-teardown.json" > "$BUILD_DIR/cf-teardown-new.json"
      aws cloudfront update-distribution --id "$CLOUDFRONT_ID" \
        --if-match "$ETAG" \
        --distribution-config "file://$BUILD_DIR/cf-teardown-new.json" >/dev/null \
        && ok "/sl/* behaviour and apigw origin removed (propagates ~5-10 min)" \
        || warn "could not update distribution"
    else
      skip "/sl/* behaviour not present"
    fi
  fi
fi

log "3. API Gateway REST API"
API_ID="${APIGW_ID:-$(aws apigateway get-rest-apis --query "items[?name=='${APIGW_NAME}'].id | [0]" --output text 2>/dev/null)}"
[[ -n "$API_ID" && "$API_ID" != "None" ]] \
  && run aws apigateway delete-rest-api --rest-api-id "$API_ID" \
  || skip "no REST API named $APIGW_NAME"

# ---------------------------------------------------------------- 4. compute
log "4. Lambda functions and their log groups"
for fn in "${FUNCTIONS[@]}"; do
  run aws lambda delete-function --function-name "$fn"
  run aws logs delete-log-group --log-group-name "/aws/lambda/$fn"
done

log "5. Lambda execution roles and the scheduler invoke role"
# A role cannot be deleted while policies remain attached to it.
for role in fg-weather-ingest-role fg-flood-forecast-role fg-alert-dispatch-role \
            fg-report-intake-role fg-upload-presign-role fg-image-process-role \
            fg-scheduler-invoke-role; do
  if $DRY; then
    printf '  %s[dry-run]%s aws iam delete-role --role-name %s (detach policies first)\n' \
      "$C_DIM" "$C_RESET" "$role"
    continue
  fi
  for arn in $(aws iam list-attached-role-policies --role-name "$role" \
                 --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null); do
    aws iam detach-role-policy --role-name "$role" --policy-arn "$arn" 2>/dev/null || true
  done
  for pol in $(aws iam list-role-policies --role-name "$role" \
                 --query 'PolicyNames[]' --output text 2>/dev/null); do
    aws iam delete-role-policy --role-name "$role" --policy-name "$pol" 2>/dev/null || true
  done
  run aws iam delete-role --role-name "$role"
done
# fg-apigw-cloudwatch-role is intentionally kept: it is referenced by the
# account-wide API Gateway cloudwatchRoleArn setting, which is a one-time
# per-region bootstrap rather than part of this stack.

# ---------------------------------------------------------------- 6. messaging + data
log "6. SQS queues"
for q in "$SQS_FORECAST_QUEUE" "${SQS_FORECAST_QUEUE}-dlq" \
         "$SQS_ALERT_QUEUE" "${SQS_ALERT_QUEUE}-dlq"; do
  U="$(aws sqs get-queue-url --queue-name "$q" --query QueueUrl --output text 2>/dev/null || true)"
  [[ -n "$U" && "$U" != "None" ]] && run aws sqs delete-queue --queue-url "$U" || skip "queue $q"
done

log "7. SNS topics"
for t in "$SNS_ALERTS_TOPIC" "$SNS_OPS_TOPIC"; do
  run aws sns delete-topic --topic-arn "arn:aws:sns:${AWS_REGION}:${ACC}:${t}"
done

log "8. DynamoDB table"
run aws dynamodb delete-table --table-name "$DDB_WEATHER_TABLE"

# ---------------------------------------------------------------- 9. monitoring
log "9. CloudWatch alarms and dashboard"
if $DRY; then
  N="$(aws cloudwatch describe-alarms --query "length(MetricAlarms[?starts_with(AlarmName,'fg-')])" --output text 2>/dev/null || echo 0)"
  printf '  %s[dry-run]%s aws cloudwatch delete-alarms (%s alarms)\n' "$C_DIM" "$C_RESET" "$N"
else
  mapfile -t ALARMS < <(aws cloudwatch describe-alarms \
    --query "MetricAlarms[?starts_with(AlarmName,'fg-')].AlarmName" --output text 2>/dev/null | tr '\t' '\n' | grep . || true)
  if ((${#ALARMS[@]})); then
    aws cloudwatch delete-alarms --alarm-names "${ALARMS[@]}" && ok "${#ALARMS[@]} alarms deleted"
  else
    skip "no fg- alarms"
  fi
fi
run aws cloudwatch delete-dashboards --dashboard-names "$DASHBOARD_NAME"

# ---------------------------------------------------------------- 10. local state
if ! $DRY; then
  log "10. Clearing recorded state for the destroyed steps"
  # So ./deploy.sh does not believe these steps have already run.
  for k in STEP_40_DONE STEP_41_DONE STEP_42_DONE STEP_43_DONE STEP_44_DONE \
           STEP_45_DONE STEP_46_DONE STEP_47_DONE STEP_48_DONE \
           STEP_61_DONE STEP_62_DONE STEP_63_DONE \
           DDB_TABLE DDB_TABLE_ARN APIGW_ID APIGW_ENDPOINT APIGW_DOMAIN \
           SQS_FORECAST_URL SQS_FORECAST_ARN SQS_FORECAST_DLQ_URL SQS_FORECAST_DLQ_ARN \
           SQS_ALERT_URL SQS_ALERT_ARN SQS_ALERT_DLQ_URL SQS_ALERT_DLQ_ARN \
           SNS_ALERTS_ARN SNS_OPS_ARN SCHEDULER_STATE ALARM_COUNT LAST_VERIFY; do
    sed -i "/^${k}=/d" "$STATE_FILE" 2>/dev/null || true
  done
  ok "state cleared"
fi

printf '\n%sServerless layer destroyed. Phase 1 untouched.%s\n' "$C_GREEN" "$C_RESET"
printf 'Rebuild with the guide in docs/report/impl/, or with ./deploy.sh phase2 && ./deploy.sh phase3\n\n'

#!/usr/bin/env bash
# Destroy everything this project created, in reverse dependency order.
#
# Deliberately NOT placed in steps/ so `./deploy.sh all` can never run it.
# Requires typing the account id to confirm.
#
#   ./teardown.sh            # interactive confirmation
#   ./teardown.sh --dry-run  # list what would be deleted, delete nothing
set -Eeuo pipefail
INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$INFRA_DIR/lib/common.sh"

DRY=false
[[ "${1:-}" == "--dry-run" ]] && DRY=true

run() {
  if $DRY; then printf '  %s[dry-run]%s %s\n' "$C_DIM" "$C_RESET" "$*";
  else "$@" >/dev/null 2>&1 && ok "$1 ${2:-}" || warn "failed (may already be gone): $*"; fi
}

printf '\n%sThis destroys the FloodGuard stack in account %s (%s).%s\n' \
  "$C_RED" "$EXPECTED_ACCOUNT_ID" "$AWS_REGION" "$C_RESET"
printf 'RDS data is deleted with no final snapshot.\n\n'

if ! $DRY; then
  assert_account
  read -rp "Type the account id to confirm: " CONFIRM
  [[ "$CONFIRM" == "$EXPECTED_ACCOUNT_ID" ]] || die "aborted"
fi

state_load_all

log "Schedules and event sources (stop new work arriving first)"
run aws scheduler delete-schedule --name "$SCHEDULER_NAME"
for fn in fg-flood-forecast fg-alert-dispatch; do
  for uuid in $(aws lambda list-event-source-mappings --function-name "$fn" \
                  --query 'EventSourceMappings[].UUID' --output text 2>/dev/null); do
    run aws lambda delete-event-source-mapping --uuid "$uuid"
  done
done
# Detach the S3 trigger before deleting the function it points at.
run aws s3api put-bucket-notification-configuration \
  --bucket "$S3_UPLOADS_BUCKET" --notification-configuration '{}'

log "Lambda functions"
for fn in fg-weather-ingest fg-flood-forecast fg-alert-dispatch \
          fg-report-intake fg-upload-presign fg-image-process; do
  run aws lambda delete-function --function-name "$fn"
  run aws logs delete-log-group --log-group-name "/aws/lambda/$fn"
done

log "API Gateway"
[[ -n "${APIGW_ID:-}" ]] && run aws apigateway delete-rest-api --rest-api-id "$APIGW_ID"

log "CloudFront (disable, then delete once propagated)"
if [[ -n "${CLOUDFRONT_ID:-}" ]] && ! $DRY; then
  ETAG="$(aws cloudfront get-distribution-config --id "$CLOUDFRONT_ID" --query ETag --output text 2>/dev/null || true)"
  if [[ -n "$ETAG" ]]; then
    aws cloudfront get-distribution-config --id "$CLOUDFRONT_ID" \
      | jq '.DistributionConfig | .Enabled = false' > "$BUILD_DIR/cf-disable.json"
    aws cloudfront update-distribution --id "$CLOUDFRONT_ID" --if-match "$ETAG" \
      --distribution-config "file://$BUILD_DIR/cf-disable.json" >/dev/null 2>&1 || true
    warn "distribution disabled — a distribution cannot be deleted until fully disabled"
    warn "this takes 10-20 min; then run: aws cloudfront delete-distribution --id $CLOUDFRONT_ID --if-match \$(aws cloudfront get-distribution-config --id $CLOUDFRONT_ID --query ETag --output text)"
  fi
elif $DRY; then
  printf '  %s[dry-run]%s disable + delete distribution %s\n' "$C_DIM" "$C_RESET" "${CLOUDFRONT_ID:-none}"
fi

log "Elastic Beanstalk environments (terminates ALB, ASG, EC2)"
for env in "$EB_ENV_BACKEND" "$EB_ENV_FRONTEND"; do
  run aws elasticbeanstalk terminate-environment --environment-name "$env"
done
if ! $DRY; then
  for env in "$EB_ENV_BACKEND" "$EB_ENV_FRONTEND"; do
    wait_for "$env to terminate" 900 bash -c \
      "[[ -z \"\$(aws elasticbeanstalk describe-environments --environment-names '$env' \
         --query 'Environments[?Status!=\`Terminated\`].EnvironmentName' --output text)\" ]]" || true
  done
fi
for app in "$EB_APP_BACKEND" "$EB_APP_FRONTEND"; do
  run aws elasticbeanstalk delete-application --application-name "$app" --terminate-env-by-force
done

log "RDS"
run aws rds delete-db-instance --db-instance-identifier "$RDS_ID" \
  --skip-final-snapshot --delete-automated-backups
if ! $DRY; then
  wait_for "RDS $RDS_ID to delete" 1800 bash -c \
    "! aws rds describe-db-instances --db-instance-identifier '$RDS_ID' >/dev/null 2>&1" || true
fi
run aws rds delete-db-subnet-group --db-subnet-group-name "${RDS_SUBNET_GROUP:-$PROJECT-db-subnet-group}"

log "DynamoDB, SQS, SNS"
run aws dynamodb delete-table --table-name "$DDB_WEATHER_TABLE"
for q in "$SQS_FORECAST_QUEUE" "${SQS_FORECAST_QUEUE}-dlq" "$SQS_ALERT_QUEUE" "${SQS_ALERT_QUEUE}-dlq"; do
  U="$(aws sqs get-queue-url --queue-name "$q" --query QueueUrl --output text 2>/dev/null || true)"
  [[ -n "$U" ]] && run aws sqs delete-queue --queue-url "$U"
done
for t in "${SNS_ALERTS_ARN:-}" "${SNS_OPS_ARN:-}"; do
  [[ -n "$t" ]] && run aws sns delete-topic --topic-arn "$t"
done

log "S3 buckets (emptied first — a non-empty bucket cannot be deleted)"
for b in "$S3_UPLOADS_BUCKET" "$S3_ARTIFACTS_BUCKET"; do
  if $DRY; then printf '  %s[dry-run]%s empty + delete s3://%s\n' "$C_DIM" "$C_RESET" "$b"; continue; fi
  # Versioning is on for artifacts, so object versions and delete markers must go too.
  aws s3 rm "s3://$b" --recursive --only-show-errors 2>/dev/null || true
  python3 - "$b" <<'PY' 2>/dev/null || true
import json, subprocess, sys
b = sys.argv[1]
for key in ("Versions", "DeleteMarkers"):
    while True:
        out = subprocess.run(["aws","s3api","list-object-versions","--bucket",b,
                              "--max-keys","500","--query",f"{key}[].{{Key:Key,VersionId:VersionId}}",
                              "--output","json"], capture_output=True, text=True).stdout
        items = json.loads(out or "null") or []
        if not items: break
        subprocess.run(["aws","s3api","delete-objects","--bucket",b,"--delete",
                        json.dumps({"Objects":items,"Quiet":True})], capture_output=True)
PY
  run aws s3api delete-bucket --bucket "$b"
done

log "CloudWatch alarms and dashboard"
if ! $DRY; then
  mapfile -t ALARMS < <(aws cloudwatch describe-alarms --alarm-name-prefix fg- \
    --query 'MetricAlarms[].AlarmName' --output text 2>/dev/null | tr '\t' '\n' | grep -v '^$' || true)
  ((${#ALARMS[@]})) && aws cloudwatch delete-alarms --alarm-names "${ALARMS[@]}" && ok "${#ALARMS[@]} alarms deleted"
fi
run aws cloudwatch delete-dashboards --dashboard-names "$DASHBOARD_NAME"

log "Secrets Manager"
# Force-delete: without this the secret lingers 7-30 days and blocks reusing the name.
run aws secretsmanager delete-secret --secret-id "$SECRET_NAME" --force-delete-without-recovery

log "IAM roles and policies"
for role in "$PROJECT-eb-service-role" "$PROJECT-eb-instance-role" \
            fg-scheduler-invoke-role fg-apigw-cloudwatch-role \
            fg-weather-ingest-role fg-flood-forecast-role fg-alert-dispatch-role \
            fg-report-intake-role fg-upload-presign-role fg-image-process-role; do
  if ! $DRY; then
    for arn in $(aws iam list-attached-role-policies --role-name "$role" \
                   --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null); do
      aws iam detach-role-policy --role-name "$role" --policy-arn "$arn" 2>/dev/null || true
    done
    for pol in $(aws iam list-role-policies --role-name "$role" \
                   --query 'PolicyNames[]' --output text 2>/dev/null); do
      aws iam delete-role-policy --role-name "$role" --policy-name "$pol" 2>/dev/null || true
    done
    aws iam remove-role-from-instance-profile --instance-profile-name "$role" --role-name "$role" 2>/dev/null || true
    aws iam delete-instance-profile --instance-profile-name "$role" 2>/dev/null || true
  fi
  run aws iam delete-role --role-name "$role"
done
[[ -n "${EB_APP_POLICY_ARN:-}" ]] && run aws iam delete-policy --policy-arn "$EB_APP_POLICY_ARN"

log "Networking (last — everything above lives inside it)"
if ! $DRY; then
  for sg in "${EB_SG:-}" "${RDS_SG:-}"; do
    [[ -n "$sg" ]] && aws ec2 delete-security-group --group-id "$sg" 2>/dev/null \
      && ok "sg $sg deleted" || warn "sg $sg still in use (EB may still be tearing down)"
  done
  for s in "${SUBNET_A:-}" "${SUBNET_B:-}"; do
    [[ -n "$s" ]] && run aws ec2 delete-subnet --subnet-id "$s"
  done
  [[ -n "${IGW_ID:-}" && -n "${VPC_ID:-}" ]] && \
    run aws ec2 detach-internet-gateway --internet-gateway-id "$IGW_ID" --vpc-id "$VPC_ID"
  [[ -n "${IGW_ID:-}" ]] && run aws ec2 delete-internet-gateway --internet-gateway-id "$IGW_ID"
  [[ -n "${ROUTE_TABLE_ID:-}" ]] && run aws ec2 delete-route-table --route-table-id "$ROUTE_TABLE_ID"
  [[ -n "${VPC_ID:-}" ]] && run aws ec2 delete-vpc --vpc-id "$VPC_ID"
fi

if ! $DRY; then
  mv "$STATE_FILE" "${STATE_FILE}.torn-down-$(date -u +%Y%m%d%H%M%S)"
  ok "state archived"
fi
printf '\n%sTeardown complete.%s CloudFront may still need its final delete (see note above).\n\n' "$C_GREEN" "$C_RESET"

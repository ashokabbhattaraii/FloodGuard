#!/usr/bin/env bash
# One execution role PER function, each scoped to exactly what that function does.
#
# A single shared "fg-lambda-role" would be simpler but would mean fg-report-intake
# (a public, unauthenticated endpoint) carries permission to publish flood alerts
# to every subscriber. Per-function roles keep the blast radius of a bug in any one
# handler to that handler.
source "$(dirname "$0")/../lib/common.sh"
state_require DDB_TABLE_ARN SQS_FORECAST_ARN SQS_ALERT_ARN SNS_ALERTS_ARN SECRET_ARN

ACC="$EXPECTED_ACCOUNT_ID"
SECRET_WILDCARD="arn:aws:secretsmanager:${AWS_REGION}:${ACC}:secret:${SECRET_NAME}*"
UPLOADS_ARN="arn:aws:s3:::${S3_UPLOADS_BUCKET}"

# Emit the inline policy document for a given function name.
policy_for() {
  case "$1" in
    fg-weather-ingest)
      jq -nc --arg ddb "$DDB_TABLE_ARN" --arg q "$SQS_FORECAST_ARN" --arg sec "$SECRET_WILDCARD" '
        {Version:"2012-10-17",Statement:[
          {Sid:"WriteSnapshots",Effect:"Allow",Action:["dynamodb:PutItem"],Resource:$ddb},
          {Sid:"EnqueueForecastJobs",Effect:"Allow",Action:["sqs:SendMessage"],Resource:$q},
          {Sid:"ReadSecret",Effect:"Allow",Action:["secretsmanager:GetSecretValue"],Resource:$sec}]}' ;;
    fg-flood-forecast)
      jq -nc --arg inq "$SQS_FORECAST_ARN" --arg outq "$SQS_ALERT_ARN" --arg sec "$SECRET_WILDCARD" '
        {Version:"2012-10-17",Statement:[
          {Sid:"ConsumeForecastJobs",Effect:"Allow",
           Action:["sqs:ReceiveMessage","sqs:DeleteMessage","sqs:GetQueueAttributes"],Resource:$inq},
          {Sid:"EnqueueAlerts",Effect:"Allow",Action:["sqs:SendMessage"],Resource:$outq},
          {Sid:"ReadSecret",Effect:"Allow",Action:["secretsmanager:GetSecretValue"],Resource:$sec}]}' ;;
    fg-alert-dispatch)
      jq -nc --arg inq "$SQS_ALERT_ARN" --arg topic "$SNS_ALERTS_ARN" --arg sec "$SECRET_WILDCARD" '
        {Version:"2012-10-17",Statement:[
          {Sid:"ConsumeAlertJobs",Effect:"Allow",
           Action:["sqs:ReceiveMessage","sqs:DeleteMessage","sqs:GetQueueAttributes"],Resource:$inq},
          {Sid:"FanOut",Effect:"Allow",Action:["sns:Publish"],Resource:$topic},
          {Sid:"ReadSecret",Effect:"Allow",Action:["secretsmanager:GetSecretValue"],Resource:$sec}]}' ;;
    fg-report-intake)
      jq -nc --arg sec "$SECRET_WILDCARD" '
        {Version:"2012-10-17",Statement:[
          {Sid:"ReadSecret",Effect:"Allow",Action:["secretsmanager:GetSecretValue"],Resource:$sec}]}' ;;
    fg-upload-presign)
      # A presigned URL only works if the SIGNING identity itself holds the
      # permission — the URL cannot grant more than its signer has.
      jq -nc --arg b "$UPLOADS_ARN" '
        {Version:"2012-10-17",Statement:[
          {Sid:"SignUploads",Effect:"Allow",Action:["s3:PutObject"],Resource:($b+"/reports/*")}]}' ;;
    fg-image-process)
      jq -nc --arg b "$UPLOADS_ARN" --arg sec "$SECRET_WILDCARD" '
        {Version:"2012-10-17",Statement:[
          {Sid:"InspectUploads",Effect:"Allow",
           Action:["s3:GetObject","s3:GetObjectTagging","s3:PutObjectTagging","s3:DeleteObject"],
           Resource:($b+"/reports/*")},
          {Sid:"ReadSecret",Effect:"Allow",Action:["secretsmanager:GetSecretValue"],Resource:$sec}]}' ;;
    *) die "no policy defined for $1" ;;
  esac
}

TRUST='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

for fn in fg-weather-ingest fg-flood-forecast fg-alert-dispatch fg-report-intake fg-upload-presign fg-image-process; do
  role="${fn}-role"
  log "Role $role"
  if aws iam get-role --role-name "$role" >/dev/null 2>&1; then
    skip "role exists"
  else
    aws iam create-role --role-name "$role" --assume-role-policy-document "$TRUST" \
      --tags "Key=Project,Value=$PROJECT" >/dev/null
    ok "created"
  fi

  # CloudWatch Logs, and X-Ray so the trace map has a segment per function.
  for managed in \
      arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
      arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess; do
    aws iam list-attached-role-policies --role-name "$role" \
      --query 'AttachedPolicies[].PolicyArn' --output text | grep -qw "$managed" \
      || aws iam attach-role-policy --role-name "$role" --policy-arn "$managed"
  done

  # put-role-policy is a full replace, so re-runs converge automatically.
  aws iam put-role-policy --role-name "$role" --policy-name "${fn}-inline" \
    --policy-document "$(policy_for "$fn")"
  ok "least-privilege inline policy applied"
  state_set "ROLE_$(tr 'a-z-' 'A-Z_' <<<"$fn")" "arn:aws:iam::${ACC}:role/${role}"
done

# IAM is eventually consistent: creating a function immediately after its role can
# fail with "cannot be assumed by Lambda". Give propagation a moment.
log "waiting 10s for IAM propagation"
sleep 10
ok "6 execution roles ready"

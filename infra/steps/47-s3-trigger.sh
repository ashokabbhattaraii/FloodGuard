#!/usr/bin/env bash
# S3 ObjectCreated:* on reports/ -> fg-image-process
#
# The original diagram drew S3 as a passive sink with no arrow into any function.
# Wiring the event notification is what makes photo upload genuinely event-driven:
# the upload itself is the trigger, with nothing polling and nothing scheduled.
source "$(dirname "$0")/../lib/common.sh"
state_require S3_UPLOADS
require_tools jq

ACC="$EXPECTED_ACCOUNT_ID"
FN=fg-image-process

log "Allowing S3 to invoke $FN"
# Must exist BEFORE put-bucket-notification-configuration, which validates that
# the destination is invocable and fails otherwise.
aws lambda add-permission --function-name "$FN" \
  --statement-id "s3-invoke-${S3_UPLOADS}" \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn "arn:aws:s3:::${S3_UPLOADS}" \
  --source-account "$ACC" >/dev/null 2>&1 \
  && ok "permission added" || skip "permission already present"

log "Bucket notification"
NOTIF="$(jq -nc --arg arn "arn:aws:lambda:${AWS_REGION}:${ACC}:function:${FN}" '{
  LambdaFunctionConfigurations: [{
    Id: "invoke-fg-image-process",
    LambdaFunctionArn: $arn,
    Events: ["s3:ObjectCreated:*"],
    Filter: { Key: { FilterRules: [{ Name: "prefix", Value: "reports/" }] } }
  }]}')"

aws s3api put-bucket-notification-configuration \
  --bucket "$S3_UPLOADS" --notification-configuration "$NOTIF"
ok "s3://${S3_UPLOADS}/reports/* ObjectCreated:* -> $FN"

CONFIGURED="$(aws s3api get-bucket-notification-configuration --bucket "$S3_UPLOADS" \
  --query 'LambdaFunctionConfigurations[0].Id' --output text)"
[[ "$CONFIGURED" == "invoke-fg-image-process" ]] || die "notification did not persist"
ok "verified"

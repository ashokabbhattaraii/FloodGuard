#!/usr/bin/env bash
# EventBridge Scheduler -> fg-weather-ingest, every 10 minutes.
#
# This replaces @Cron(EVERY_10_MINUTES) in flood-monitor.scheduler.ts, which was
# not merely "server-based" but actively unsafe: @nestjs/schedule runs the job on
# every instance in the fleet, so the first autoscale event doubles every flood
# alert. EventBridge fires exactly once regardless of instance count.
#
# NOTE the direction. The original diagram drew arrow 6 as
# "EventBridge Scheduler -> SQS", but a scheduled tick has no per-message work to
# distribute — there is nothing in the queue to fan out yet. The correct chain is
# Scheduler -> Lambda -> SQS (one message per region) -> Lambda.
source "$(dirname "$0")/../lib/common.sh"
require_tools jq

ACC="$EXPECTED_ACCOUNT_ID"
ROLE="fg-scheduler-invoke-role"
TARGET_FN="fg-weather-ingest"

log "Scheduler invoke role"
TRUST="$(jq -nc --arg acc "$ACC" '{
  Version:"2012-10-17",
  Statement:[{
    Effect:"Allow",
    Principal:{Service:"scheduler.amazonaws.com"},
    Action:"sts:AssumeRole",
    Condition:{StringEquals:{"aws:SourceAccount":$acc}}
  }]}')"
if aws iam get-role --role-name "$ROLE" >/dev/null 2>&1; then
  skip "role $ROLE"
else
  aws iam create-role --role-name "$ROLE" --assume-role-policy-document "$TRUST" \
    --tags "Key=Project,Value=$PROJECT" >/dev/null
  ok "created $ROLE"
fi
# Scoped to the one function it is allowed to trigger.
aws iam put-role-policy --role-name "$ROLE" --policy-name invoke-weather-ingest \
  --policy-document "$(jq -nc --arg arn "arn:aws:lambda:${AWS_REGION}:${ACC}:function:${TARGET_FN}" \
    '{Version:"2012-10-17",Statement:[{Effect:"Allow",Action:["lambda:InvokeFunction"],Resource:[$arn,($arn+":*")]}]}')"
ok "invoke policy applied"
ROLE_ARN="arn:aws:iam::${ACC}:role/${ROLE}"

log "Schedule $SCHEDULER_NAME"
TARGET="$(jq -nc \
  --arg arn "arn:aws:lambda:${AWS_REGION}:${ACC}:function:${TARGET_FN}" \
  --arg role "$ROLE_ARN" \
  '{Arn:$arn, RoleArn:$role, Input:"{\"source\":\"eventbridge-scheduler\"}",
    RetryPolicy:{MaximumRetryAttempts:2, MaximumEventAgeInSeconds:3600}}')"

if aws scheduler get-schedule --name "$SCHEDULER_NAME" >/dev/null 2>&1; then
  aws scheduler update-schedule --name "$SCHEDULER_NAME" \
    --schedule-expression "$SCHEDULE_EXPRESSION" \
    --schedule-expression-timezone "UTC" \
    --flexible-time-window '{"Mode":"OFF"}' \
    --target "$TARGET" --state ENABLED >/dev/null
  skip "schedule updated"
else
  # IAM is eventually consistent. EventBridge Scheduler validates up front that it
  # can assume the role, and a role created seconds ago reliably fails that check
  # with "must allow AWS EventBridge Scheduler to assume the role".
  for attempt in 1 2 3 4 5 6 7 8; do
    if aws scheduler create-schedule --name "$SCHEDULER_NAME" \
        --schedule-expression "$SCHEDULE_EXPRESSION" \
        --schedule-expression-timezone "UTC" \
        --flexible-time-window '{"Mode":"OFF"}' \
        --target "$TARGET" --state ENABLED \
        --description "FloodGuard: trigger weather ingestion sweep" >/dev/null 2>&1; then
      ok "created (attempt $attempt)"
      break
    fi
    ((attempt == 8)) && die "create-schedule still failing after 8 attempts — check the trust policy on $ROLE"
    sleep 10
  done
fi

STATE="$(aws scheduler get-schedule --name "$SCHEDULER_NAME" --query 'State' --output text)"
state_set SCHEDULER_STATE "$STATE"
ok "$SCHEDULER_NAME $STATE ($SCHEDULE_EXPRESSION -> $TARGET_FN)"
warn "backend must run with FLOOD_MONITOR_ENABLED=false or alerts fire twice"

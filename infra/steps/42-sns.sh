#!/usr/bin/env bash
# Two SNS topics, deliberately separate:
#   fg-flood-alerts — public fan-out to residents (email now, SMS/push later)
#   fg-ops-alarms   — CloudWatch alarm actions for the team (Task #2 monitoring)
# The original diagram merged SNS and SES into one box; they are different
# services with different roles. SNS does topic fan-out and is what CloudWatch
# alarms can target. SES would only be needed for templated HTML mail.
source "$(dirname "$0")/../lib/common.sh"

ensure_topic() {
  local name="$1" arn
  arn="$(aws sns create-topic --name "$name" --tags "Key=Project,Value=$PROJECT" \
    --query TopicArn --output text)"   # create-topic is idempotent by design
  ok "topic $name -> $arn" >&2
  printf '%s' "$arn"
}

log "SNS topics"
ALERTS_ARN="$(ensure_topic "$SNS_ALERTS_TOPIC")"
OPS_ARN="$(ensure_topic "$SNS_OPS_TOPIC")"
state_set SNS_ALERTS_ARN "$ALERTS_ARN"
state_set SNS_OPS_ARN "$OPS_ARN"

# Subscribe the operator so alarms and alerts are actually observable.
# NOTE: email subscriptions stay "PendingConfirmation" until the link is clicked.
SUB_EMAIL="${FG_ALERT_EMAIL:-}"
if [[ -z "$SUB_EMAIL" ]]; then
  warn "set FG_ALERT_EMAIL=you@example.com and re-run ./deploy.sh 42 to receive alerts"
else
  for topic in "$ALERTS_ARN" "$OPS_ARN"; do
    if aws sns list-subscriptions-by-topic --topic-arn "$topic" \
         --query 'Subscriptions[].Endpoint' --output text | grep -qw "$SUB_EMAIL"; then
      skip "$SUB_EMAIL already subscribed to $(basename "$topic")"
    else
      aws sns subscribe --topic-arn "$topic" --protocol email --notification-endpoint "$SUB_EMAIL" >/dev/null
      ok "subscribed $SUB_EMAIL to $(basename "$topic") — CONFIRM THE EMAIL to activate"
    fi
  done
fi

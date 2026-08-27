#!/usr/bin/env bash
# Two work queues, each with a REAL dead-letter queue behind a redrive policy.
#
# The original diagram drew "SQS + DLQ" as one icon. A DLQ is a separate queue;
# the redrive policy (maxReceiveCount) is what actually makes the pipeline
# resilient, and it is the part worth showing in the report.
#
# Flow:  fg-weather-ingest --(1 msg per region)--> fg-forecast-jobs
#        fg-forecast-jobs  --> fg-flood-forecast --(threshold breached)--> fg-alert-dispatch
#        fg-alert-dispatch --> fg-alert-dispatch (Lambda) --> SNS fan-out
source "$(dirname "$0")/../lib/common.sh"

# Visibility timeout must exceed the consumer's timeout, or SQS redelivers a
# message that is still being processed. AWS guidance: >= 6x function timeout.
VISIBILITY=$((LAMBDA_TIMEOUT * 6))

queue_url() { aws sqs get-queue-url --queue-name "$1" --query QueueUrl --output text 2>/dev/null || true; }
queue_arn() { aws sqs get-queue-attributes --queue-url "$1" --attribute-names QueueArn \
                --query 'Attributes.QueueArn' --output text; }

ensure_queue() {
  local name="$1" attrs="$2" url
  url="$(queue_url "$name")"
  if [[ -z "$url" ]]; then
    url="$(aws sqs create-queue --queue-name "$name" --attributes "$attrs" \
      --tags "Project=$PROJECT" --query QueueUrl --output text)"
    ok "created queue $name" >&2
  else
    # Converge attributes on re-run (e.g. redrive policy or timeout changes).
    aws sqs set-queue-attributes --queue-url "$url" --attributes "$attrs" >/dev/null
    skip "queue $name (attributes reconciled)" >&2
  fi
  printf '%s' "$url"
}

setup_pair() {
  local base="$1" dlq_url dlq_arn main_url main_arn redrive
  log "Queue pair: $base" >&2

  # DLQ first — the main queue's redrive policy needs its ARN.
  dlq_url="$(ensure_queue "${base}-dlq" \
    "{\"MessageRetentionPeriod\":\"1209600\"}")"   # keep failures 14 days for inspection
  dlq_arn="$(queue_arn "$dlq_url")"

  redrive="$(jq -nc --arg arn "$dlq_arn" '{deadLetterTargetArn:$arn, maxReceiveCount:"3"}')"
  main_url="$(ensure_queue "$base" "$(jq -nc \
      --arg vis "$VISIBILITY" --arg rd "$redrive" \
      '{VisibilityTimeout:$vis, MessageRetentionPeriod:"345600", RedrivePolicy:$rd}')")"
  main_arn="$(queue_arn "$main_url")"

  ok "$base -> 3 failed receives -> ${base}-dlq (visibility ${VISIBILITY}s)" >&2
  printf '%s|%s|%s|%s' "$main_url" "$main_arn" "$dlq_url" "$dlq_arn"
}

IFS='|' read -r FQ_URL FQ_ARN FQ_DLQ_URL FQ_DLQ_ARN <<<"$(setup_pair "$SQS_FORECAST_QUEUE")"
state_set SQS_FORECAST_URL "$FQ_URL"
state_set SQS_FORECAST_ARN "$FQ_ARN"
state_set SQS_FORECAST_DLQ_URL "$FQ_DLQ_URL"
state_set SQS_FORECAST_DLQ_ARN "$FQ_DLQ_ARN"

IFS='|' read -r AQ_URL AQ_ARN AQ_DLQ_URL AQ_DLQ_ARN <<<"$(setup_pair "$SQS_ALERT_QUEUE")"
state_set SQS_ALERT_URL "$AQ_URL"
state_set SQS_ALERT_ARN "$AQ_ARN"
state_set SQS_ALERT_DLQ_URL "$AQ_DLQ_URL"
state_set SQS_ALERT_DLQ_ARN "$AQ_DLQ_ARN"

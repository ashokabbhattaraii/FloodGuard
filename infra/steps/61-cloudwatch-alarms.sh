#!/usr/bin/env bash
# CloudWatch alarms, all actioned to the fg-ops-alarms SNS topic.
#
# The original diagram showed CloudWatch receiving logs/metrics/traces but with no
# alarm actions anywhere — observation without response. The brief asks the system
# to be *evaluated*, so every alarm here answers a specific "how would we know?".
source "$(dirname "$0")/../lib/common.sh"
state_require SNS_OPS_ARN
require_tools jq

OPS="$SNS_OPS_ARN"
CREATED=0

alarm() {
  local name="$1"; shift
  aws cloudwatch put-metric-alarm \
    --alarm-name "$name" \
    --alarm-actions "$OPS" --ok-actions "$OPS" \
    --tags "Key=Project,Value=$PROJECT" \
    "$@"
  ok "$name"
  ((CREATED++)) || true
}

LAMBDAS=(fg-weather-ingest fg-flood-forecast fg-alert-dispatch
         fg-report-intake fg-upload-presign fg-image-process)

log "Lambda error + throttle alarms"
for fn in "${LAMBDAS[@]}"; do
  # Any error at all is worth knowing about: these run unattended.
  alarm "fg-${fn#fg-}-errors" \
    --alarm-description "$fn returned an error" \
    --namespace AWS/Lambda --metric-name Errors \
    --dimensions "Name=FunctionName,Value=$fn" \
    --statistic Sum --period 300 --evaluation-periods 1 \
    --threshold 1 --comparison-operator GreaterThanOrEqualToThreshold \
    --treat-missing-data notBreaching

  # Throttles mean concurrency is exhausted — a scaling signal, not a code bug.
  alarm "fg-${fn#fg-}-throttles" \
    --alarm-description "$fn was throttled (concurrency limit reached)" \
    --namespace AWS/Lambda --metric-name Throttles \
    --dimensions "Name=FunctionName,Value=$fn" \
    --statistic Sum --period 300 --evaluation-periods 1 \
    --threshold 1 --comparison-operator GreaterThanOrEqualToThreshold \
    --treat-missing-data notBreaching
done

log "Dead-letter queue alarms"
# A message in a DLQ means it failed 3 delivery attempts. That is silent data loss
# unless somebody is told, which is the single most important alarm here.
for q in "${SQS_FORECAST_QUEUE}-dlq" "${SQS_ALERT_QUEUE}-dlq"; do
  alarm "${q}-not-empty" \
    --alarm-description "Messages landed in $q — work was permanently dropped" \
    --namespace AWS/SQS --metric-name ApproximateNumberOfMessagesVisible \
    --dimensions "Name=QueueName,Value=$q" \
    --statistic Maximum --period 300 --evaluation-periods 1 \
    --threshold 1 --comparison-operator GreaterThanOrEqualToThreshold \
    --treat-missing-data notBreaching
done

log "Queue backlog alarms"
# Age of the oldest message is the honest backlog signal: depth alone looks fine
# when consumers are keeping up with a large but fast-moving queue.
for q in "$SQS_FORECAST_QUEUE" "$SQS_ALERT_QUEUE"; do
  alarm "${q}-backlog" \
    --alarm-description "Oldest message in $q is over 5 minutes old — consumer is falling behind" \
    --namespace AWS/SQS --metric-name ApproximateAgeOfOldestMessage \
    --dimensions "Name=QueueName,Value=$q" \
    --statistic Maximum --period 300 --evaluation-periods 2 \
    --threshold 300 --comparison-operator GreaterThanThreshold \
    --treat-missing-data notBreaching
done

log "API Gateway alarms"
alarm "fg-apigw-5xx" \
  --alarm-description "API Gateway returned server errors" \
  --namespace AWS/ApiGateway --metric-name 5XXError \
  --dimensions "Name=ApiName,Value=$APIGW_NAME" "Name=Stage,Value=$APIGW_STAGE" \
  --statistic Sum --period 300 --evaluation-periods 1 \
  --threshold 1 --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching

alarm "fg-apigw-latency-p99" \
  --alarm-description "API Gateway p99 latency above 3s" \
  --namespace AWS/ApiGateway --metric-name Latency \
  --dimensions "Name=ApiName,Value=$APIGW_NAME" "Name=Stage,Value=$APIGW_STAGE" \
  --extended-statistic p99 --period 300 --evaluation-periods 2 \
  --threshold 3000 --comparison-operator GreaterThanThreshold \
  --treat-missing-data notBreaching

log "RDS alarms"
alarm "fg-rds-cpu-high" \
  --alarm-description "RDS CPU above 80% — db.t3.micro is undersized or a query regressed" \
  --namespace AWS/RDS --metric-name CPUUtilization \
  --dimensions "Name=DBInstanceIdentifier,Value=$RDS_ID" \
  --statistic Average --period 300 --evaluation-periods 2 \
  --threshold 80 --comparison-operator GreaterThanThreshold \
  --treat-missing-data notBreaching

# 2 GiB of 20 GB. Postgres cannot write once storage is exhausted.
alarm "fg-rds-storage-low" \
  --alarm-description "RDS free storage below 2 GiB" \
  --namespace AWS/RDS --metric-name FreeStorageSpace \
  --dimensions "Name=DBInstanceIdentifier,Value=$RDS_ID" \
  --statistic Average --period 300 --evaluation-periods 1 \
  --threshold 2147483648 --comparison-operator LessThanThreshold \
  --treat-missing-data notBreaching

log "Elastic Beanstalk health alarm"
# EnvironmentHealth: 0=OK 1=Info 5=Unknown 10=NoData 15=Warning 20=Degraded 25=Severe
alarm "fg-backend-env-unhealthy" \
  --alarm-description "Backend EB environment health is Warning or worse" \
  --namespace AWS/ElasticBeanstalk --metric-name EnvironmentHealth \
  --dimensions "Name=EnvironmentName,Value=$EB_ENV_BACKEND" \
  --statistic Maximum --period 300 --evaluation-periods 2 \
  --threshold 15 --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching

state_set ALARM_COUNT "$CREATED"
ok "$CREATED alarms configured, all actioning $OPS"
warn "confirm the SNS email subscription or alarms fire into the void (./deploy.sh 42 with FG_ALERT_EMAIL set)"

#!/usr/bin/env bash
# DynamoDB: weather snapshot time-series.
#
# WHY NOT "live risk levels" (as the original diagram proposed): region risk already
# lives in Postgres (flood-forecast.service.ts writes region.riskLevel). A second
# copy in DynamoDB would be a dual-write with no owner and no consistency story.
#
# Instead DynamoDB gets a job Postgres is genuinely worse at: append-only,
# write-heavy time-series. fg-weather-ingest writes one item per region every
# 10 minutes; TTL expires them after 30 days automatically (no cron, no cost).
# This also serves the dashboard rainfall chart without touching RDS.
source "$(dirname "$0")/../lib/common.sh"

log "DynamoDB table $DDB_WEATHER_TABLE"
if aws dynamodb describe-table --table-name "$DDB_WEATHER_TABLE" >/dev/null 2>&1; then
  skip "table $DDB_WEATHER_TABLE"
else
  aws dynamodb create-table \
    --table-name "$DDB_WEATHER_TABLE" \
    --attribute-definitions \
        AttributeName=regionId,AttributeType=S \
        AttributeName=ts,AttributeType=S \
    --key-schema \
        AttributeName=regionId,KeyType=HASH \
        AttributeName=ts,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --tags "Key=Project,Value=$PROJECT" >/dev/null
  ok "created $DDB_WEATHER_TABLE (PK regionId, SK ts, on-demand)"
fi

wait_for "table $DDB_WEATHER_TABLE to be ACTIVE" 300 \
  aws dynamodb wait table-exists --table-name "$DDB_WEATHER_TABLE"

# TTL deletes expired items at no write cost — the reason this table stays free.
TTL_STATUS="$(aws dynamodb describe-time-to-live --table-name "$DDB_WEATHER_TABLE" \
  --query 'TimeToLiveDescription.TimeToLiveStatus' --output text)"
if [[ "$TTL_STATUS" == "ENABLED" || "$TTL_STATUS" == "ENABLING" ]]; then
  skip "TTL already $TTL_STATUS"
else
  aws dynamodb update-time-to-live --table-name "$DDB_WEATHER_TABLE" \
    --time-to-live-specification "Enabled=true,AttributeName=expiresAt" >/dev/null
  ok "TTL enabled on attribute expiresAt"
fi

state_set DDB_TABLE "$DDB_WEATHER_TABLE"
state_set DDB_TABLE_ARN "$(aws dynamodb describe-table --table-name "$DDB_WEATHER_TABLE" \
  --query 'Table.TableArn' --output text)"

#!/usr/bin/env bash
# A single CloudWatch dashboard laid out to follow the request path, so the
# performance write-up can be read straight off it:
#   front door -> serverless pipeline -> queue health -> data tier -> monolith
source "$(dirname "$0")/../lib/common.sh"
require_tools jq

R="$AWS_REGION"
LAMBDAS='["fg-weather-ingest","fg-flood-forecast","fg-alert-dispatch","fg-report-intake","fg-upload-presign","fg-image-process"]'

# Build the per-function metric list for a given Lambda metric name.
lambda_metrics() {
  jq -nc --argjson fns "$LAMBDAS" --arg m "$1" --arg stat "$2" \
    '[ $fns[] | ["AWS/Lambda", $m, "FunctionName", ., {stat:$stat}] ]'
}

log "Composing dashboard"
BODY="$(jq -n \
  --arg r "$R" \
  --arg api "$APIGW_NAME" --arg stage "$APIGW_STAGE" \
  --arg fq "$SQS_FORECAST_QUEUE" --arg aq "$SQS_ALERT_QUEUE" \
  --arg rds "$RDS_ID" --arg ebenv "$EB_ENV_BACKEND" --arg ddb "$DDB_WEATHER_TABLE" \
  --argjson inv "$(lambda_metrics Invocations Sum)" \
  --argjson err "$(lambda_metrics Errors Sum)" \
  --argjson dur "$(lambda_metrics Duration Average)" \
  --argjson thr "$(lambda_metrics Throttles Sum)" \
  '{
    widgets: [
      { type:"text", x:0, y:0, width:24, height:2,
        properties:{ markdown:"# FloodGuard — Task #2 Serverless & Monitoring\nRequest path: **CloudFront** → (`/api/*`) **EB monolith** · (`/sl/*`) **API Gateway → Lambda** → **SQS** → **Lambda** → **SNS**\n\nScheduled path: **EventBridge (10 min)** → `fg-weather-ingest` → **DynamoDB** + **SQS**" } },

      { type:"metric", x:0, y:2, width:12, height:6,
        properties:{ title:"API Gateway — requests & errors", region:$r, view:"timeSeries", stacked:false,
          metrics:[
            ["AWS/ApiGateway","Count","ApiName",$api,"Stage",$stage,{stat:"Sum",label:"requests"}],
            ["AWS/ApiGateway","4XXError","ApiName",$api,"Stage",$stage,{stat:"Sum",label:"4xx"}],
            ["AWS/ApiGateway","5XXError","ApiName",$api,"Stage",$stage,{stat:"Sum",label:"5xx"}]
          ], period:300 } },

      { type:"metric", x:12, y:2, width:12, height:6,
        properties:{ title:"API Gateway — latency (avg / p95 / p99)", region:$r, view:"timeSeries",
          metrics:[
            ["AWS/ApiGateway","Latency","ApiName",$api,"Stage",$stage,{stat:"Average",label:"avg"}],
            ["AWS/ApiGateway","Latency","ApiName",$api,"Stage",$stage,{stat:"p95",label:"p95"}],
            ["AWS/ApiGateway","Latency","ApiName",$api,"Stage",$stage,{stat:"p99",label:"p99"}]
          ], period:300, yAxis:{left:{label:"ms",showUnits:false}} } },

      { type:"metric", x:0, y:8, width:8, height:6,
        properties:{ title:"Lambda invocations", region:$r, view:"timeSeries", stacked:true,
          metrics:$inv, period:300 } },
      { type:"metric", x:8, y:8, width:8, height:6,
        properties:{ title:"Lambda errors", region:$r, view:"timeSeries", stacked:true,
          metrics:$err, period:300 } },
      { type:"metric", x:16, y:8, width:8, height:6,
        properties:{ title:"Lambda duration (avg ms)", region:$r, view:"timeSeries",
          metrics:$dur, period:300 } },

      { type:"metric", x:0, y:14, width:12, height:6,
        properties:{ title:"SQS depth — work queues vs DLQs", region:$r, view:"timeSeries",
          metrics:[
            ["AWS/SQS","ApproximateNumberOfMessagesVisible","QueueName",$fq,{stat:"Maximum",label:"forecast-jobs"}],
            ["AWS/SQS","ApproximateNumberOfMessagesVisible","QueueName",$aq,{stat:"Maximum",label:"alert-dispatch"}],
            ["AWS/SQS","ApproximateNumberOfMessagesVisible","QueueName",($fq+"-dlq"),{stat:"Maximum",label:"forecast DLQ"}],
            ["AWS/SQS","ApproximateNumberOfMessagesVisible","QueueName",($aq+"-dlq"),{stat:"Maximum",label:"alert DLQ"}]
          ], period:300,
          annotations:{ horizontal:[{ label:"anything in a DLQ is dropped work", value:1, fill:"above" }] } } },

      { type:"metric", x:12, y:14, width:12, height:6,
        properties:{ title:"Queue latency — age of oldest message (s)", region:$r, view:"timeSeries",
          metrics:[
            ["AWS/SQS","ApproximateAgeOfOldestMessage","QueueName",$fq,{stat:"Maximum",label:"forecast-jobs"}],
            ["AWS/SQS","ApproximateAgeOfOldestMessage","QueueName",$aq,{stat:"Maximum",label:"alert-dispatch"}]
          ], period:300,
          annotations:{ horizontal:[{ label:"backlog alarm", value:300 }] } } },

      { type:"metric", x:0, y:20, width:8, height:6,
        properties:{ title:"Lambda throttles (concurrency pressure)", region:$r, view:"timeSeries",
          metrics:$thr, period:300 } },

      { type:"metric", x:8, y:20, width:8, height:6,
        properties:{ title:"DynamoDB — weather snapshots", region:$r, view:"timeSeries",
          metrics:[
            ["AWS/DynamoDB","ConsumedWriteCapacityUnits","TableName",$ddb,{stat:"Sum",label:"write CU"}],
            ["AWS/DynamoDB","ConsumedReadCapacityUnits","TableName",$ddb,{stat:"Sum",label:"read CU"}],
            ["AWS/DynamoDB","ThrottledRequests","TableName",$ddb,{stat:"Sum",label:"throttled"}]
          ], period:300 } },

      { type:"metric", x:16, y:20, width:8, height:6,
        properties:{ title:"SNS delivery", region:$r, view:"timeSeries",
          metrics:[
            ["AWS/SNS","NumberOfMessagesPublished","TopicName","fg-flood-alerts",{stat:"Sum",label:"published"}],
            ["AWS/SNS","NumberOfNotificationsDelivered","TopicName","fg-flood-alerts",{stat:"Sum",label:"delivered"}],
            ["AWS/SNS","NumberOfNotificationsFailed","TopicName","fg-flood-alerts",{stat:"Sum",label:"failed"}]
          ], period:300 } },

      { type:"metric", x:0, y:26, width:12, height:6,
        properties:{ title:"RDS PostgreSQL", region:$r, view:"timeSeries",
          metrics:[
            ["AWS/RDS","CPUUtilization","DBInstanceIdentifier",$rds,{stat:"Average",label:"CPU %"}],
            ["AWS/RDS","DatabaseConnections","DBInstanceIdentifier",$rds,{stat:"Average",label:"connections",yAxis:"right"}]
          ], period:300 } },

      { type:"metric", x:12, y:26, width:12, height:6,
        properties:{ title:"EB monolith — requests & health", region:$r, view:"timeSeries",
          metrics:[
            ["AWS/ElasticBeanstalk","ApplicationRequestsTotal","EnvironmentName",$ebenv,{stat:"Sum",label:"requests"}],
            ["AWS/ElasticBeanstalk","ApplicationRequests5xx","EnvironmentName",$ebenv,{stat:"Sum",label:"5xx"}],
            ["AWS/ElasticBeanstalk","EnvironmentHealth","EnvironmentName",$ebenv,{stat:"Maximum",label:"health",yAxis:"right"}]
          ], period:300 } },

      { type:"log", x:0, y:32, width:24, height:6,
        properties:{ title:"Recent pipeline errors (all Lambdas)", region:$r,
          query:"SOURCE '/aws/lambda/fg-weather-ingest' | SOURCE '/aws/lambda/fg-flood-forecast' | SOURCE '/aws/lambda/fg-alert-dispatch' | SOURCE '/aws/lambda/fg-report-intake' | SOURCE '/aws/lambda/fg-image-process' | fields @timestamp, @log, level, message, error | filter level = 'error' | sort @timestamp desc | limit 50",
          view:"table" } }
    ]
  }')"

echo "$BODY" > "$BUILD_DIR/dashboard.json"
jq -e '.widgets | length' "$BUILD_DIR/dashboard.json" >/dev/null || die "dashboard JSON is malformed"

aws cloudwatch put-dashboard --dashboard-name "$DASHBOARD_NAME" \
  --dashboard-body "file://$BUILD_DIR/dashboard.json" >/dev/null
ok "dashboard '$DASHBOARD_NAME' published ($(jq '.widgets|length' "$BUILD_DIR/dashboard.json") widgets)"

state_set DASHBOARD_URL \
  "https://${R}.console.aws.amazon.com/cloudwatch/home?region=${R}#dashboards/dashboard/${DASHBOARD_NAME}"
ok "$(state_get DASHBOARD_URL)"

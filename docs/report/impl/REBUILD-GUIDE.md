# Task 2 serverless layer: rebuild and screenshot guide

Rebuilds the Task 2 serverless and monitoring layer from nothing, one AWS CLI
command at a time, so each figure in `System_Implementation.docx` has a real
creation screenshot behind it.

**Every command below was executed against account 292960609118 on 26 August 2026
and verified working.** The rebuild was then torn down again so you start from a
clean slate. The end state passes all 18 end-to-end checks.

Phase 1 is **not** touched: VPC, RDS, both Elastic Beanstalk environments, the S3
buckets, the CloudFront distribution and Secrets Manager all stay up throughout.
The public site keeps serving on the same URL.

Total time: about 25 minutes, of which 10 is waiting for CloudFront to propagate.

## How to read this guide

Every command block is labelled:

- **RUN ONLY, no screenshot.** Run it, but there is nothing worth capturing. These
  blocks write JSON files to disk, set shell variables, or print a single
  confirmation line. **You still have to run them**, or later steps fail.
- **RUN AND SCREENSHOT — Figure N.** Run it and capture the terminal. This is the
  evidence for Figure N in `System_Implementation.docx`.

A few figures span more than one block, for example Figure 2 covers three commands.
The label says when to capture, and the italic line underneath says what the image
must show.

Of the 39 command blocks, 21 are run-only and 18 produce a screenshot. The two
remaining figures, 17 (dashboard) and 19 (X-Ray service map), are browser captures
with no command behind them.

---

## 0. Setup

Run once per terminal. Every later command depends on these.

**RUN AND SCREENSHOT — Figure 1.** the `aws sts get-caller-identity` output only

```bash
cd /home/smr/_me/FloodGuard/infra
export ACC=292960609118
export REGION=us-east-1
export PROJECT=floodguard
export BUCKET=floodguard-uploads-$ACC
export CF_URL=https://drtyovliurlkl.cloudfront.net
export CFID=E7JA2N5C3YF8P
mkdir -p build/cli
aws sts get-caller-identity
```

Must print account `292960609118`. If it does not, stop.

*What Figure 1 must show:* the `get-caller-identity` output. Establishes which
account the whole build targets.

If the layer is still up, destroy it first:

**RUN ONLY, no screenshot.** only if the serverless layer is still up

```bash
./teardown-serverless.sh --dry-run     # review
./teardown-serverless.sh               # type the account id to confirm
```

---

## 1. DynamoDB weather snapshot table

Partition on region, sort on timestamp, so "latest snapshots for a region" is one
query. On demand billing because ingestion is periodic, not sustained.

**RUN ONLY, no screenshot.** part of Figure 2, capture after the next two blocks

```bash
aws dynamodb create-table \
  --table-name fg-weather-snapshots \
  --attribute-definitions AttributeName=regionId,AttributeType=S AttributeName=ts,AttributeType=S \
  --key-schema AttributeName=regionId,KeyType=HASH AttributeName=ts,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --tags Key=Project,Value=$PROJECT \
  --query 'TableDescription.{Table:TableName,Status:TableStatus,Keys:KeySchema}'
```

**RUN ONLY, no screenshot.** part of Figure 2

```bash
aws dynamodb wait table-exists --table-name fg-weather-snapshots && echo ACTIVE
```

TTL expires items after 30 days at no write cost, which is what keeps this table
inside the free tier:

**RUN AND SCREENSHOT — Figure 2.** capture this block together with the two above it

```bash
aws dynamodb update-time-to-live --table-name fg-weather-snapshots \
  --time-to-live-specification "Enabled=true,AttributeName=expiresAt" \
  --query 'TimeToLiveSpecification'
```

*What Figure 2 must show:* all three commands together. Must show `CREATING` then
`ACTIVE`, the `regionId` hash key, the `ts` range key, and TTL enabled on
`expiresAt`.

---

## 2. SQS work queues and dead-letter queues

Dead-letter queues must exist first, because the work queue's redrive policy
references their ARNs.

**RUN ONLY, no screenshot.** part of Figure 3

```bash
for q in fg-forecast-jobs-dlq fg-alert-dispatch-dlq; do
  aws sqs create-queue --queue-name $q \
    --attributes '{"MessageRetentionPeriod":"1209600"}' \
    --tags "Project=$PROJECT" --query QueueUrl --output text
done
```

14 days retention, so a poison message is still there to inspect on Monday.

**RUN ONLY, no screenshot.** sets shell variables, prints nothing

```bash
export FQ_DLQ_ARN=arn:aws:sqs:$REGION:$ACC:fg-forecast-jobs-dlq
export AQ_DLQ_ARN=arn:aws:sqs:$REGION:$ACC:fg-alert-dispatch-dlq
```

Now the work queues. Visibility timeout is 360 seconds, six times the longest
consumer timeout, so SQS cannot redeliver a message that is still being processed.
`maxReceiveCount` of 3 is what routes a repeatedly failing message to the DLQ.

**RUN ONLY, no screenshot.** part of Figure 3

```bash
cat > build/cli/q-forecast.json <<EOF
{"VisibilityTimeout":"360","MessageRetentionPeriod":"345600",
 "RedrivePolicy":"{\"deadLetterTargetArn\":\"$FQ_DLQ_ARN\",\"maxReceiveCount\":\"3\"}"}
EOF
cat > build/cli/q-alert.json <<EOF
{"VisibilityTimeout":"360","MessageRetentionPeriod":"345600",
 "RedrivePolicy":"{\"deadLetterTargetArn\":\"$AQ_DLQ_ARN\",\"maxReceiveCount\":\"3\"}"}
EOF

aws sqs create-queue --queue-name fg-forecast-jobs \
  --attributes file://build/cli/q-forecast.json --tags "Project=$PROJECT" --query QueueUrl --output text
aws sqs create-queue --queue-name fg-alert-dispatch \
  --attributes file://build/cli/q-alert.json --tags "Project=$PROJECT" --query QueueUrl --output text
```

**RUN AND SCREENSHOT — Figure 3.** capture this together with the queue URLs from two blocks above

```bash
aws sqs get-queue-attributes \
  --queue-url https://sqs.$REGION.amazonaws.com/$ACC/fg-forecast-jobs \
  --attribute-names VisibilityTimeout RedrivePolicy --query Attributes
```

*What Figure 3 must show:* the four queue URLs plus the final verification showing
`VisibilityTimeout 360` and the redrive policy naming the DLQ. This is the
resilience evidence.

---

## 3. SNS topics

Two topics, deliberately separate. Public alerts must never be mixed with
operational alarm noise.

**RUN AND SCREENSHOT — Figure 4.** both topic ARNs

```bash
aws sns create-topic --name fg-flood-alerts --tags Key=Project,Value=$PROJECT --query TopicArn --output text
aws sns create-topic --name fg-ops-alarms   --tags Key=Project,Value=$PROJECT --query TopicArn --output text
```

*What Figure 4 must show:* both topic ARNs.

Optional, needed only if you want the "alert email arrives" screenshot later.
Confirm the link in your inbox afterwards:

**RUN ONLY, no screenshot.** optional, only if you want the alert email screenshot later

```bash
aws sns subscribe --topic-arn arn:aws:sns:$REGION:$ACC:fg-flood-alerts \
  --protocol email --notification-endpoint YOUR_EMAIL@example.com
```

---

## 4. IAM execution roles, one per function

A single shared role would let `fg-report-intake`, the only unauthenticated
endpoint in the system, publish flood alerts to every subscriber. Six roles keep
the blast radius of any one handler to that handler.

**RUN AND SCREENSHOT — Figure 5.** the six role names

```bash
cat > build/cli/lambda-trust.json <<'EOF'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow",
 "Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}
EOF

for fn in fg-weather-ingest fg-flood-forecast fg-alert-dispatch \
          fg-report-intake fg-upload-presign fg-image-process; do
  aws iam create-role --role-name ${fn}-role \
    --assume-role-policy-document file://build/cli/lambda-trust.json \
    --tags Key=Project,Value=$PROJECT --query 'Role.RoleName' --output text
done
```

CloudWatch Logs and X-Ray write access, attached to all six:

**RUN ONLY, no screenshot.** prints only `attached`

```bash
for fn in fg-weather-ingest fg-flood-forecast fg-alert-dispatch \
          fg-report-intake fg-upload-presign fg-image-process; do
  aws iam attach-role-policy --role-name ${fn}-role \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  aws iam attach-role-policy --role-name ${fn}-role \
    --policy-arn arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess
done
echo attached
```

*What Figure 5 must show:* the six role names printed by the first loop.

### Least-privilege inline policies

Each function gets only what it actually touches.

**RUN ONLY, no screenshot.** writes six JSON files and applies them; produces no useful output

```bash
D=build/cli
cat > $D/pol-fg-weather-ingest.json <<EOF
{"Version":"2012-10-17","Statement":[
 {"Sid":"WriteSnapshots","Effect":"Allow","Action":["dynamodb:PutItem"],"Resource":"arn:aws:dynamodb:$REGION:$ACC:table/fg-weather-snapshots"},
 {"Sid":"EnqueueForecastJobs","Effect":"Allow","Action":["sqs:SendMessage"],"Resource":"arn:aws:sqs:$REGION:$ACC:fg-forecast-jobs"},
 {"Sid":"ReadSecret","Effect":"Allow","Action":["secretsmanager:GetSecretValue"],"Resource":"arn:aws:secretsmanager:$REGION:$ACC:secret:floodguard/app*"}]}
EOF
cat > $D/pol-fg-flood-forecast.json <<EOF
{"Version":"2012-10-17","Statement":[
 {"Sid":"ConsumeForecastJobs","Effect":"Allow","Action":["sqs:ReceiveMessage","sqs:DeleteMessage","sqs:GetQueueAttributes"],"Resource":"arn:aws:sqs:$REGION:$ACC:fg-forecast-jobs"},
 {"Sid":"EnqueueAlerts","Effect":"Allow","Action":["sqs:SendMessage"],"Resource":"arn:aws:sqs:$REGION:$ACC:fg-alert-dispatch"},
 {"Sid":"ReadSecret","Effect":"Allow","Action":["secretsmanager:GetSecretValue"],"Resource":"arn:aws:secretsmanager:$REGION:$ACC:secret:floodguard/app*"}]}
EOF
cat > $D/pol-fg-alert-dispatch.json <<EOF
{"Version":"2012-10-17","Statement":[
 {"Sid":"ConsumeAlertJobs","Effect":"Allow","Action":["sqs:ReceiveMessage","sqs:DeleteMessage","sqs:GetQueueAttributes"],"Resource":"arn:aws:sqs:$REGION:$ACC:fg-alert-dispatch"},
 {"Sid":"FanOut","Effect":"Allow","Action":["sns:Publish"],"Resource":"arn:aws:sns:$REGION:$ACC:fg-flood-alerts"},
 {"Sid":"ReadSecret","Effect":"Allow","Action":["secretsmanager:GetSecretValue"],"Resource":"arn:aws:secretsmanager:$REGION:$ACC:secret:floodguard/app*"}]}
EOF
cat > $D/pol-fg-report-intake.json <<EOF
{"Version":"2012-10-17","Statement":[
 {"Sid":"ReadSecret","Effect":"Allow","Action":["secretsmanager:GetSecretValue"],"Resource":"arn:aws:secretsmanager:$REGION:$ACC:secret:floodguard/app*"}]}
EOF
cat > $D/pol-fg-upload-presign.json <<EOF
{"Version":"2012-10-17","Statement":[
 {"Sid":"SignUploads","Effect":"Allow","Action":["s3:PutObject"],"Resource":"arn:aws:s3:::$BUCKET/reports/*"}]}
EOF
cat > $D/pol-fg-image-process.json <<EOF
{"Version":"2012-10-17","Statement":[
 {"Sid":"InspectUploads","Effect":"Allow","Action":["s3:GetObject","s3:GetObjectTagging","s3:PutObjectTagging","s3:DeleteObject"],"Resource":"arn:aws:s3:::$BUCKET/reports/*"},
 {"Sid":"ReadSecret","Effect":"Allow","Action":["secretsmanager:GetSecretValue"],"Resource":"arn:aws:secretsmanager:$REGION:$ACC:secret:floodguard/app*"}]}
EOF

for fn in fg-weather-ingest fg-flood-forecast fg-alert-dispatch \
          fg-report-intake fg-upload-presign fg-image-process; do
  aws iam put-role-policy --role-name ${fn}-role --policy-name ${fn}-inline \
    --policy-document file://$D/pol-${fn}.json && echo "  $fn ok"
done
```

The privilege separation, proven in one command:

**RUN AND SCREENSHOT — Figure 6.** this single command is the whole of Figure 6

```bash
aws iam get-role-policy --role-name fg-report-intake-role \
  --policy-name fg-report-intake-inline --query 'PolicyDocument.Statement[].Action'
```

*What Figure 6 must show:* this last output. The public intake function holds
`secretsmanager:GetSecretValue` and nothing else. No `sns:Publish`.

---

## 5. Package the six functions

Node 22 ships AWS SDK v3, so five functions are a handler plus the shared helper,
a few kilobytes each. Only the presign function needs npm dependencies.

**RUN AND SCREENSHOT — Figure 7.** the archive size table

```bash
D=build/cli
for fn in fg-weather-ingest fg-flood-forecast fg-alert-dispatch \
          fg-report-intake fg-upload-presign fg-image-process; do
  rm -rf $D/pkg-$fn $D/$fn.zip; mkdir -p $D/pkg-$fn
  cp lambdas/$fn/index.mjs $D/pkg-$fn/
  cp lambdas/_shared/common.mjs $D/pkg-$fn/
  if [ -f lambdas/$fn/package.json ]; then
    cp lambdas/$fn/package.json $D/pkg-$fn/
    (cd $D/pkg-$fn && npm install --omit=dev --no-audit --no-fund --silent)
  fi
  (cd $D/pkg-$fn && zip -qr ../$fn.zip .)
  printf "  %-20s %s\n" "$fn" "$(du -h $D/$fn.zip | cut -f1)"
done
```

*What Figure 7 must show:* the size table. Five archives at 4 KB, presign at 3.2 MB
because it bundles the S3 presigner. The size difference is the point: small
packages mean short cold starts.

---

## 6. Create the six Lambda functions

Timeouts differ by workload. Ingestion makes ten sequential outbound API calls and
needs 300 seconds; an API-fronted request needs 30.

**RUN AND SCREENSHOT — Figure 8.** the six JSON responses

```bash
export FQ_URL=https://sqs.$REGION.amazonaws.com/$ACC/fg-forecast-jobs
export AQ_URL=https://sqs.$REGION.amazonaws.com/$ACC/fg-alert-dispatch
export TOPIC=arn:aws:sns:$REGION:$ACC:fg-flood-alerts

create() {   # create <fn> <timeout> <env>
  aws lambda create-function --function-name "$1" \
    --runtime nodejs22.x --architectures arm64 \
    --role arn:aws:iam::$ACC:role/$1-role \
    --handler index.handler --zip-file fileb://build/cli/$1.zip \
    --timeout "$2" --memory-size 512 --environment "Variables=$3" \
    --tracing-config Mode=Active --tags Project=$PROJECT \
    --query '{Fn:FunctionName,Runtime:Runtime,Arch:Architectures[0],TO:Timeout,Tracing:TracingConfig.Mode}'
}

create fg-weather-ingest 300 "{SECRET_NAME=floodguard/app,BACKEND_URL=$CF_URL,DDB_TABLE=fg-weather-snapshots,FORECAST_QUEUE_URL=$FQ_URL}"
create fg-flood-forecast 120 "{SECRET_NAME=floodguard/app,BACKEND_URL=$CF_URL,ALERT_QUEUE_URL=$AQ_URL}"
create fg-alert-dispatch 60  "{SECRET_NAME=floodguard/app,BACKEND_URL=$CF_URL,ALERTS_TOPIC_ARN=$TOPIC}"
create fg-report-intake  30  "{SECRET_NAME=floodguard/app,BACKEND_URL=$CF_URL}"
create fg-upload-presign 30  "{UPLOADS_BUCKET=$BUCKET}"
create fg-image-process  30  "{SECRET_NAME=floodguard/app,BACKEND_URL=$CF_URL}"
```

*What Figure 8 must show:* the six JSON blocks. Each shows `nodejs22.x`, `arm64`,
its timeout, and `Tracing: Active`. Active tracing here is what makes the X-Ray
service map possible later.

**RUN ONLY, no screenshot.** prints only a confirmation line

```bash
for fn in fg-weather-ingest fg-flood-forecast fg-alert-dispatch \
          fg-report-intake fg-upload-presign fg-image-process; do
  aws lambda wait function-active-v2 --function-name $fn
  aws logs create-log-group --log-group-name /aws/lambda/$fn 2>/dev/null
  aws logs put-retention-policy --log-group-name /aws/lambda/$fn --retention-in-days 14
done
echo "all Active, retention 14 days"
```

Lambda would otherwise create log groups that never expire and accrue cost forever.

---

## 7. SQS event source mappings

`MaximumConcurrency` is the important part. This account allows only **10**
concurrent Lambda executions, and an uncapped queue consumer scales until it owns
all of them, starving the public API. Capping at 3 and 2 reserves 5 for the
request path.

**RUN AND SCREENSHOT — Figure 9.** both mapping responses

```bash
aws lambda create-event-source-mapping \
  --function-name fg-flood-forecast \
  --event-source-arn arn:aws:sqs:$REGION:$ACC:fg-forecast-jobs \
  --batch-size 5 --maximum-batching-window-in-seconds 5 \
  --scaling-config MaximumConcurrency=3 \
  --function-response-types ReportBatchItemFailures \
  --query '{Fn:FunctionArn,Batch:BatchSize,MaxConc:ScalingConfig.MaximumConcurrency,State:State}'

aws lambda create-event-source-mapping \
  --function-name fg-alert-dispatch \
  --event-source-arn arn:aws:sqs:$REGION:$ACC:fg-alert-dispatch \
  --batch-size 1 --maximum-batching-window-in-seconds 5 \
  --scaling-config MaximumConcurrency=2 \
  --function-response-types ReportBatchItemFailures \
  --query '{Fn:FunctionArn,Batch:BatchSize,MaxConc:ScalingConfig.MaximumConcurrency,State:State}'
```

`ReportBatchItemFailures` is what makes the handlers' `batchItemFailures` return
value meaningful. Without it one poison message forces redelivery of its nine
healthy batch-mates.

*What Figure 9 must show:* both outputs, showing batch sizes 5 and 1 and maximum
concurrency 3 and 2.

---

## 8. API Gateway REST API

REST v1, not HTTP API v2, for one concrete reason: **HTTP APIs do not emit X-Ray
trace segments**, and X-Ray evidence is required by the brief.

**RUN ONLY, no screenshot.** part of Figure 10

```bash
export API_ID=$(aws apigateway create-rest-api --name fg-serverless-api \
  --description "FloodGuard serverless microservices (Task #2)" \
  --endpoint-configuration types=REGIONAL --tags Project=$PROJECT \
  --query id --output text)
echo "API_ID=$API_ID"

export ROOT=$(aws apigateway get-resources --rest-api-id $API_ID \
  --query "items[?path=='/'].id | [0]" --output text)
echo "ROOT=$ROOT"
```

> The API id is **generated fresh every rebuild**. Keep `$API_ID` exported for the
> rest of this guide, and note the new value: it must replace the old one anywhere
> the report quotes it.

Resources are rooted at `/sl` so CloudFront can forward `/sl/*` with an origin path
of `/v1` and hit `/v1/sl/...` with no path rewriting.

**RUN AND SCREENSHOT — Figure 10.** capture together with the API id from the block above

```bash
export SL=$(aws apigateway create-resource --rest-api-id $API_ID --parent-id $ROOT --path-part sl --query id --output text)
export REPORTS=$(aws apigateway create-resource --rest-api-id $API_ID --parent-id $SL --path-part reports --query id --output text)
export UPLOADS=$(aws apigateway create-resource --rest-api-id $API_ID --parent-id $SL --path-part uploads --query id --output text)
export PRESIGN=$(aws apigateway create-resource --rest-api-id $API_ID --parent-id $UPLOADS --path-part presign --query id --output text)
printf "/sl=%s  /sl/reports=%s  /sl/uploads=%s  /sl/uploads/presign=%s\n" $SL $REPORTS $UPLOADS $PRESIGN
```

*What Figure 10 must show:* the API id and the four resource ids.

### Integrations and invoke permissions

`AWS_PROXY` passes the raw request to the handler, so routing and response shape
live in code rather than in gateway mapping templates.

**RUN AND SCREENSHOT — Figure 11.** the two wiring lines, plus a console shot of the resource tree

```bash
wire() {   # wire <resource-id> <fn> <path>
  aws apigateway put-method --rest-api-id $API_ID --resource-id $1 \
    --http-method POST --authorization-type NONE --no-api-key-required >/dev/null
  aws apigateway put-integration --rest-api-id $API_ID --resource-id $1 \
    --http-method POST --type AWS_PROXY --integration-http-method POST \
    --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACC:function:$2/invocations \
    --timeout-in-millis 29000 >/dev/null
  aws lambda add-permission --function-name $2 --statement-id apigw-$2 \
    --action lambda:InvokeFunction --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$ACC:$API_ID/*/POST$3" >/dev/null
  echo "  POST $3 -> $2"
}

wire $REPORTS fg-report-intake  /sl/reports
wire $PRESIGN fg-upload-presign /sl/uploads/presign
```

The invoke permission is scoped to this API and this method, not to any caller.

*What Figure 11 must show:* the two `POST ... -> ...` lines, plus the console view at
API Gateway, `fg-serverless-api`, Resources, showing the tree with the POST method
selected and the Lambda proxy target visible.

### CORS preflight

**RUN ONLY, no screenshot.** prints only `OPTIONS wired`

```bash
for R in $REPORTS $PRESIGN; do
  aws apigateway put-method --rest-api-id $API_ID --resource-id $R --http-method OPTIONS --authorization-type NONE >/dev/null
  aws apigateway put-integration --rest-api-id $API_ID --resource-id $R --http-method OPTIONS \
    --type MOCK --request-templates '{"application/json":"{\"statusCode\":200}"}' >/dev/null
  aws apigateway put-method-response --rest-api-id $API_ID --resource-id $R --http-method OPTIONS --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Origin":true,"method.response.header.Access-Control-Allow-Headers":true,"method.response.header.Access-Control-Allow-Methods":true}' >/dev/null
  aws apigateway put-integration-response --rest-api-id $API_ID --resource-id $R --http-method OPTIONS --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'","method.response.header.Access-Control-Allow-Headers":"'"'"'content-type'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'POST,OPTIONS'"'"'"}' >/dev/null
done
echo "OPTIONS wired"
```

### Deploy the stage and enable tracing

**RUN ONLY, no screenshot.** part of Figure 12

```bash
aws apigateway create-deployment --rest-api-id $API_ID --stage-name v1 \
  --description "rebuild $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --query '{Deployment:id,Created:createdDate}'

aws apigateway update-stage --rest-api-id $API_ID --stage-name v1 \
  --patch-operations \
    op=replace,path=/tracingEnabled,value=true \
    'op=replace,path=/*/*/metrics/enabled,value=true' \
    'op=replace,path=/*/*/logging/loglevel,value=INFO' \
  --query '{Stage:stageName,Tracing:tracingEnabled}'
```

Smoke test the API directly, before CloudFront is involved:

**RUN AND SCREENSHOT — Figure 12.** capture together with the deployment and tracing output above

```bash
curl -s -o /dev/null -w "presign via execute-api: %{http_code}\n" \
  -X POST https://$API_ID.execute-api.$REGION.amazonaws.com/v1/sl/uploads/presign \
  -H 'content-type: application/json' -d '{"filename":"a.jpg","contentType":"image/jpeg"}'
```

*What Figure 12 must show:* the deployment id, `Tracing: true`, and the `200` from the
smoke test in one shot. `tracingEnabled` is the setting HTTP APIs lack entirely.

---

## 9. EventBridge schedule

Replaces the in-process `@Cron` that ran on every instance and would have doubled
every alert on the first autoscale event. EventBridge fires once regardless of
fleet size.

**RUN ONLY, no screenshot.** writes policy files and creates the role

```bash
D=build/cli
cat > $D/scheduler-trust.json <<EOF
{"Version":"2012-10-17","Statement":[{"Effect":"Allow",
 "Principal":{"Service":"scheduler.amazonaws.com"},"Action":"sts:AssumeRole",
 "Condition":{"StringEquals":{"aws:SourceAccount":"$ACC"}}}]}
EOF
cat > $D/scheduler-invoke.json <<EOF
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["lambda:InvokeFunction"],
 "Resource":["arn:aws:lambda:$REGION:$ACC:function:fg-weather-ingest",
             "arn:aws:lambda:$REGION:$ACC:function:fg-weather-ingest:*"]}]}
EOF

aws iam create-role --role-name fg-scheduler-invoke-role \
  --assume-role-policy-document file://$D/scheduler-trust.json \
  --tags Key=Project,Value=$PROJECT --query 'Role.Arn' --output text
aws iam put-role-policy --role-name fg-scheduler-invoke-role \
  --policy-name invoke-weather-ingest --policy-document file://$D/scheduler-invoke.json
```

**RUN ONLY, no screenshot.** writes one JSON file, prints nothing

```bash
cat > $D/schedule-target.json <<EOF
{"Arn":"arn:aws:lambda:$REGION:$ACC:function:fg-weather-ingest",
 "RoleArn":"arn:aws:iam::$ACC:role/fg-scheduler-invoke-role",
 "Input":"{\"source\":\"eventbridge-scheduler\"}",
 "RetryPolicy":{"MaximumRetryAttempts":2,"MaximumEventAgeInSeconds":3600}}
EOF
```

IAM is eventually consistent and EventBridge validates up front that it can assume
the role, so a role created seconds ago reliably fails the first attempt. The loop
is not defensive padding; on the verified run it **succeeded on attempt 2**.

**RUN AND SCREENSHOT — Figure 13.** the attempt line and the schedule verification

```bash
for i in 1 2 3 4 5 6 7 8; do
  if aws scheduler create-schedule --name fg-weather-ingest-schedule \
      --schedule-expression "rate(10 minutes)" --schedule-expression-timezone UTC \
      --flexible-time-window '{"Mode":"OFF"}' \
      --target file://$D/schedule-target.json --state ENABLED \
      --description "FloodGuard: trigger weather ingestion sweep" >/dev/null 2>&1; then
    echo "created on attempt $i"; break
  fi
  sleep 10
done

aws scheduler get-schedule --name fg-weather-ingest-schedule \
  --query '{State:State,Expr:ScheduleExpression,Target:Target.Arn}'
```

*What Figure 13 must show:* the "created on attempt N" line and the verification
showing `ENABLED`, `rate(10 minutes)` and the ingest function as target.

---

## 10. S3 event trigger

The permission must exist **before** the notification, because
`put-bucket-notification-configuration` validates that the destination is invocable
and fails otherwise.

**RUN AND SCREENSHOT — Figure 14.** capture the final verification output

```bash
aws lambda add-permission --function-name fg-image-process \
  --statement-id s3-invoke-$BUCKET --action lambda:InvokeFunction \
  --principal s3.amazonaws.com --source-arn arn:aws:s3:::$BUCKET \
  --source-account $ACC --query Statement

cat > build/cli/s3-notification.json <<EOF
{"LambdaFunctionConfigurations":[{
  "Id":"invoke-fg-image-process",
  "LambdaFunctionArn":"arn:aws:lambda:$REGION:$ACC:function:fg-image-process",
  "Events":["s3:ObjectCreated:*"],
  "Filter":{"Key":{"FilterRules":[{"Name":"prefix","Value":"reports/"}]}}}]}
EOF

aws s3api put-bucket-notification-configuration --bucket $BUCKET \
  --notification-configuration file://build/cli/s3-notification.json

aws s3api get-bucket-notification-configuration --bucket $BUCKET \
  --query 'LambdaFunctionConfigurations[0].{Id:Id,Events:Events,Prefix:Filter.Key.FilterRules[0].Value}'
```

*What Figure 14 must show:* the verification output showing `s3:ObjectCreated:*` on
prefix `reports/`. Uploading a photo *is* the trigger; nothing polls.

---

## 11. CloudFront: add the /sl/* behaviour

Completes the single front door. `UpdateDistribution` demands the full canonical
shape for every origin and behaviour, so rather than enumerate dozens of required
fields, clone the existing `eb-backend` origin and override only what differs.

**RUN AND SCREENSHOT — Figure 15.** the update response

```bash
export APIGW_DOMAIN=$API_ID.execute-api.$REGION.amazonaws.com
aws cloudfront get-distribution-config --id $CFID > build/cli/cf.json
export ETAG=$(jq -r '.ETag' build/cli/cf.json)
echo "ETag=$ETAG  origin=$APIGW_DOMAIN"

jq --arg dom "$APIGW_DOMAIN" --arg stage "/v1" '
  .DistributionConfig as $cfg
  | ($cfg.Origins.Items[] | select(.Id=="eb-backend")) as $otpl
  | ($cfg.CacheBehaviors.Items[] | select(.PathPattern=="/api/*")) as $btpl
  | $cfg
  | .Origins.Items += [$otpl
      | .Id="apigw-serverless" | .DomainName=$dom | .OriginPath=$stage
      | .CustomOriginConfig.OriginProtocolPolicy="https-only"
      | .CustomOriginConfig.OriginReadTimeout=30]
  | .Origins.Quantity = (.Origins.Items|length)
  | .CacheBehaviors.Items += [$btpl
      | .PathPattern="/sl/*" | .TargetOriginId="apigw-serverless"]
  | .CacheBehaviors.Quantity = (.CacheBehaviors.Items|length)
' build/cli/cf.json > build/cli/cf-new.json

aws cloudfront update-distribution --id $CFID --if-match "$ETAG" \
  --distribution-config file://build/cli/cf-new.json \
  --query 'Distribution.{Status:Status,Origins:DistributionConfig.Origins.Quantity,Behaviors:DistributionConfig.CacheBehaviors.Quantity}'
```

*What Figure 15 must show:* `Status: InProgress`, 3 origins, 3 behaviours.

**This takes 5 to 10 minutes to propagate.** Wait for it before the verification
step, or `/sl/*` will still return 404:

**RUN ONLY, no screenshot.** waits 5 to 10 minutes, prints `Deployed`

```bash
aws cloudfront wait distribution-deployed --id $CFID && echo "Deployed"
```

---

## 12. CloudWatch alarms

21 alarms, every one actioning the ops topic. Metrics without alarm actions is
observation without response.

**RUN ONLY, no screenshot.** creates 12 alarms, output is long and not worth capturing

```bash
export OPS=arn:aws:sns:$REGION:$ACC:fg-ops-alarms

for fn in fg-weather-ingest fg-flood-forecast fg-alert-dispatch \
          fg-report-intake fg-upload-presign fg-image-process; do
  aws cloudwatch put-metric-alarm --alarm-name "${fn}-errors" \
    --alarm-description "$fn returned an error" \
    --namespace AWS/Lambda --metric-name Errors \
    --dimensions Name=FunctionName,Value=$fn \
    --statistic Sum --period 300 --evaluation-periods 1 --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --treat-missing-data notBreaching --alarm-actions $OPS --ok-actions $OPS
  aws cloudwatch put-metric-alarm --alarm-name "${fn}-throttles" \
    --alarm-description "$fn was throttled (concurrency limit reached)" \
    --namespace AWS/Lambda --metric-name Throttles \
    --dimensions Name=FunctionName,Value=$fn \
    --statistic Sum --period 300 --evaluation-periods 1 --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --treat-missing-data notBreaching --alarm-actions $OPS --ok-actions $OPS
done
echo "12 Lambda alarms"
```

The single most important alarm in the system: a message in a dead-letter queue
means work was permanently dropped.

**RUN ONLY, no screenshot.** creates 2 alarms

```bash
for q in fg-forecast-jobs-dlq fg-alert-dispatch-dlq; do
  aws cloudwatch put-metric-alarm --alarm-name "${q}-not-empty" \
    --alarm-description "Messages landed in $q - work was permanently dropped" \
    --namespace AWS/SQS --metric-name ApproximateNumberOfMessagesVisible \
    --dimensions Name=QueueName,Value=$q \
    --statistic Maximum --period 300 --evaluation-periods 1 --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --treat-missing-data notBreaching --alarm-actions $OPS --ok-actions $OPS
done
echo "2 DLQ alarms"
```

The remaining seven (queue backlog age, API Gateway 5XX and p99 latency, RDS CPU
and storage, Elastic Beanstalk health) are longer and unchanged from the
provisioning step, so create them with:

The remaining seven alarms are created by the provisioning step, which reads
resource identifiers from `infra/.state/resources.env`. The teardown cleared that
file, so restore it first or the step fails with `missing state 'SNS_OPS_ARN'`.

**RUN ONLY, no screenshot.** restores the state file the next step reads

```bash
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='fg-serverless-api'].id | [0]" --output text)
cat >> .state/resources.env <<EOF
DDB_TABLE=fg-weather-snapshots
DDB_TABLE_ARN=arn:aws:dynamodb:$REGION:$ACC:table/fg-weather-snapshots
SQS_FORECAST_URL=https://sqs.$REGION.amazonaws.com/$ACC/fg-forecast-jobs
SQS_FORECAST_ARN=arn:aws:sqs:$REGION:$ACC:fg-forecast-jobs
SQS_FORECAST_DLQ_URL=https://sqs.$REGION.amazonaws.com/$ACC/fg-forecast-jobs-dlq
SQS_FORECAST_DLQ_ARN=arn:aws:sqs:$REGION:$ACC:fg-forecast-jobs-dlq
SQS_ALERT_URL=https://sqs.$REGION.amazonaws.com/$ACC/fg-alert-dispatch
SQS_ALERT_ARN=arn:aws:sqs:$REGION:$ACC:fg-alert-dispatch
SQS_ALERT_DLQ_URL=https://sqs.$REGION.amazonaws.com/$ACC/fg-alert-dispatch-dlq
SQS_ALERT_DLQ_ARN=arn:aws:sqs:$REGION:$ACC:fg-alert-dispatch-dlq
SNS_ALERTS_ARN=arn:aws:sns:$REGION:$ACC:fg-flood-alerts
SNS_OPS_ARN=arn:aws:sns:$REGION:$ACC:fg-ops-alarms
APIGW_ID=$API_ID
APIGW_DOMAIN=$API_ID.execute-api.$REGION.amazonaws.com
APIGW_ENDPOINT=https://$API_ID.execute-api.$REGION.amazonaws.com/v1
SCHEDULER_STATE=ENABLED
EOF
sort -u -t= -k1,1 .state/resources.env -o .state/resources.env
echo "state restored"
```

**RUN ONLY, no screenshot.** reconciles all 21 alarms

```bash
./deploy.sh 61
```

That command is idempotent and reconciles all 21, including the ones you just made
by hand.

**RUN AND SCREENSHOT — Figure 16.** the alarm table

```bash
aws cloudwatch describe-alarms \
  --query "MetricAlarms[?starts_with(AlarmName,'fg-')].{Name:AlarmName,State:StateValue}" --output table
```

*What Figure 16 must show:* the table of 21 alarms, all `OK`.

A freshly created alarm reads `INSUFFICIENT_DATA` until its metric reports for the
first time, which is normal and not a failure. It settles to `OK` within a few
minutes, and immediately after the verification run in section 14. Take this
screenshot after section 14 if you want all 21 showing `OK`.

---

## 13. CloudWatch dashboard

The dashboard body is a 14-widget JSON document, far too long to paste as a
command. Create it with the provisioning step:

**RUN ONLY, no screenshot.** creates the dashboard, screenshot the dashboard itself in the browser

```bash
./deploy.sh 62
```

Then open and screenshot it after generating traffic in the next section:

```
https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards/dashboard/FloodGuard-Task2
```

*What Figure 17 must show:* the dashboard with the time range set to 1 hour, taken
*after* step 14. Capture the top and bottom halves separately so axis labels stay
readable.

---

## 14. Verify end to end

This proves every hop of both pipelines and generates 240 requests so the dashboard
and X-Ray have real data.

**RUN AND SCREENSHOT — Figure 18.** the verification summary

```bash
./deploy.sh 63
```

*What Figure 18 must show:* the verification summary. On the verified rebuild this
printed **18 passed, 0 failed**, covering routing, the 401 on the internal API,
input validation (400 and 415), the upload pipeline tagging a real PNG `verified`
and a text file `rejected`, scheduled ingestion writing to DynamoDB, both DLQs
empty, duplicate alert suppression, and X-Ray traces recorded.

### X-Ray service map

```
https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#xray:service-map
```

*What Figure 19 must show:* time range 1 hour. Must show the API Gateway stage node,
the Lambda nodes and the `floodguard-backend` node connected in one map. That the
gateway node exists at all is the payoff for choosing REST over HTTP API.

### Upload pipeline evidence

**RUN AND SCREENSHOT — Figure 20.** the object tags

```bash
KEY=$(aws s3api list-objects-v2 --bucket $BUCKET --prefix reports/ \
  --query 'reverse(sort_by(Contents,&LastModified))[0].Key' --output text)
echo "$KEY"
aws s3api get-object-tagging --bucket $BUCKET --key "$KEY"
```

*What Figure 20 must show:* tags `verification=verified` and `detectedType`, written
by `fg-image-process`. Proof the S3 event fired and the magic-number check ran.

---

---

## 15. Code screenshots (Figures 21 to 26)

The brief asks for code evidence of the serverless components and of how the
services interact. These need no AWS access and no particular ordering, so take
them whenever suits. A code editor with syntax highlighting reads better in the
report than a terminal, but `sed` is given so you can capture exactly the right
lines either way.

**RUN AND SCREENSHOT — Figure 21.** the source layout of the six services

```bash
find infra/lambdas -type f | sort
```

*What Figure 21 must show:* six independent function directories plus `_shared`,
each with its own `index.mjs`. One directory per service is what makes them
independently deployable.

**RUN AND SCREENSHOT — Figure 22.** weather ingestion fanning out to SQS

```bash
sed -n '93,103p' infra/lambdas/fg-weather-ingest/index.mjs
```

*What Figure 22 must show:* `SendMessageBatchCommand` chunking one message per
region into groups of ten, the batch API limit. Service to queue.

**RUN AND SCREENSHOT — Figure 23.** partial batch failure reporting

```bash
sed -n '115,131p' infra/lambdas/fg-flood-forecast/index.mjs
```

*What Figure 23 must show:* failed message identifiers collected into
`batchItemFailures` and returned. Without it one poison message forces redelivery
of its nine healthy batch-mates. Queue to service, plus the resilience mechanism.

**RUN AND SCREENSHOT — Figure 24.** idempotent alert dispatch and SNS fan-out

```bash
sed -n '35,64p' infra/lambdas/fg-alert-dispatch/index.mjs
```

*What Figure 24 must show:* the duplicate check returning early **before**
`PublishCommand` runs. SQS delivers at least once, so a redelivered message must
not notify every resident twice. Service to topic.

**RUN AND SCREENSHOT — Figure 25.** S3 content verification

```bash
sed -n '20,60p' infra/lambdas/fg-image-process/index.mjs
```

*What Figure 25 must show:* the magic-number signature table, the `sniff`
function, and `PutObjectTaggingCommand`. A presigned URL pins a declared content
type but S3 never checks the bytes, so this is the server-side check. Service to
object store.

**RUN AND SCREENSHOT — Figure 26.** authenticated service-to-service calls

```bash
sed -n '39,70p' infra/lambdas/_shared/common.mjs
```

*What Figure 26 must show:* `internalFetch` attaching the shared key header. This
is the boundary that lets the functions write to the relational store without ever
opening a database connection. Check no resolved key value is visible before you
save the image.

Between them these six cover every requirement in the brief's code clause: how each
service is structured (21), and how the services interact with SQS (22, 23), SNS
(24), S3 (25) and the monolith (26).


## Screenshot rules

- Crop to the command and its output. Do not capture the whole desktop.
- Keep each image about 2.3 inches (6 cm) tall so the document stays in range.
- Include the command itself, not just the output.
- No command here prints a secret. Never run `aws secretsmanager get-secret-value`.

## After the rebuild

The API id changed. Update it anywhere the other documents quote the old value:

**RUN ONLY, no screenshot.** housekeeping after the rebuild

```bash
echo "new API_ID = $API_ID"
grep -rn "60h0a79hgb" ../.. --include=*.md 2>/dev/null | grep -v node_modules
```

The CloudFront domain does **not** change, because the distribution was never
deleted.

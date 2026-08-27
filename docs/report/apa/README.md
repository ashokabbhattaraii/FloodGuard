# Screenshot capture guide

One entry per figure in `FloodGuard_Task2_APA_Report.docx`. Work top to bottom:
run the command, screenshot the result, paste it into the document in place of that
figure's instruction block.

**Every command here is read only.** Nothing creates, modifies, or deletes a
resource, so you can run any of them as many times as you like. The infrastructure
is already deployed; these commands photograph its current state, which is what
post-implementation evidence means.

## Before you start

```bash
aws login
aws sts get-caller-identity
```

The second command must print account `292960609118`. If it does not, stop; every
command below will fail.

Then move to the project root and stay there:

```bash
cd /home/smr/_me/FloodGuard
```

Two variables save repetition. Paste this once per terminal session:

```bash
export CF=https://drtyovliurlkl.cloudfront.net
export BUCKET=floodguard-uploads-292960609118
```

## Screenshot rules

- Crop to the command and its output. Do not capture the whole desktop.
- Keep each image about **2.3 inches (6 cm) tall** so the report stays under 40 pages.
- Include the command line itself, not just the output, so the evidence is traceable.
- Never capture a secret. No command below prints one, and two deliberately avoid it.

---

# Part A: command line and console figures

## Figure 1 — FloodGuard Task 2 As-Built Cloud Architecture

Already embedded in the document. No action needed.

## Figure 2 — CLI Resource Provisioning and Verification of the Amazon S3 Buckets

```bash
aws s3api get-public-access-block --bucket $BUCKET
```

Should show all four settings (`BlockPublicAcls`, `IgnorePublicAcls`,
`BlockPublicPolicy`, `RestrictPublicBuckets`) set to `true`.

Optionally capture the encryption rule in the same shot:

```bash
aws s3api get-bucket-encryption --bucket $BUCKET
```

## Figure 3 — CLI Resource Provisioning and Verification of the Amazon DynamoDB Table

```bash
aws dynamodb describe-table --table-name fg-weather-snapshots \
  --query 'Table.{Status:TableStatus,Keys:KeySchema,Billing:BillingModeSummary.BillingMode,Items:ItemCount}'
```

Should show `ACTIVE`, the `regionId` hash key, the `timestamp` range key,
`PAY_PER_REQUEST`, and a non-zero item count.

## Figure 4 — CLI Resource Provisioning and Verification of the Amazon SNS Topics

```bash
aws sns list-topics --query "Topics[?contains(TopicArn,'fg-')]" --output table
```

Should list both `fg-flood-alerts` and `fg-ops-alarms`.

## Figure 5 — CLI Resource Provisioning and Verification of the Application Secret

```bash
aws secretsmanager describe-secret --secret-id floodguard/app \
  --query '{Name:Name,Changed:LastChangedDate,Rotation:RotationEnabled}'
```

Should show the secret name and last-changed date. **Do not run
`get-secret-value`**; it prints the database password and signing key.

## Figure 6 — CLI Resource Provisioning and Verification of the Lambda Execution Roles

```bash
aws iam list-roles --query "Roles[?starts_with(RoleName,'fg-')].RoleName" --output table
```

Should list six roles, one per function. This is the least-privilege evidence.

## Figure 7 — Directory Layout of the Serverless Backend

```bash
find infra/lambdas -type f | sort
```

Should show six function directories plus `_shared`, each with an `index.mjs`.

## Figure 8 — Flood Forecast Handler Source Showing Partial Batch Failure Reporting

```bash
sed -n '115,140p' infra/lambdas/fg-flood-forecast/index.mjs
```

Should show the handler collecting `itemIdentifier` values into a
`batchItemFailures` array and returning it. A code editor screenshot of the same
lines is equally acceptable and usually more readable.

## Figure 9 — CLI Resource Provisioning and Verification of the Lambda Functions

```bash
aws lambda list-functions \
  --query "Functions[?starts_with(FunctionName,'fg-')].{Name:FunctionName,Runtime:Runtime,Arch:Architectures[0],Timeout:Timeout,Tracing:TracingConfig.Mode}" \
  --output table
```

Should show all six functions on `nodejs22.x`, `arm64`, tracing `Active`.

## Figure 10 — CLI Resource Provisioning and Verification of the EventBridge Schedule

```bash
aws scheduler get-schedule --name fg-weather-ingest-schedule \
  --query '{State:State,Expression:ScheduleExpression,Target:Target.Arn}'
```

Should show `ENABLED`, `rate(10 minutes)`, and the ingest function as target.

## Figure 11 — Verification of the SQS Event Source Mappings and Concurrency Ceilings

```bash
aws lambda list-event-source-mappings \
  --query 'EventSourceMappings[].{Function:FunctionArn,Batch:BatchSize,MaxConcurrency:ScalingConfig.MaximumConcurrency,State:State}' \
  --output table
```

Should show two enabled mappings with maximum concurrency **3** for the forecast
consumer and **2** for the dispatch consumer. This is the fix for the throttling
finding discussed in the report, so it is worth capturing clearly.

## Figure 12 — CLI Resource Provisioning and Verification of the API Gateway REST API

```bash
aws apigateway get-rest-apis \
  --query "items[?name=='fg-serverless-api'].{Id:id,Name:name,Created:createdDate}" \
  --output table
```

Should return the API identifier `60h0a79hgb` and its name.

## Figure 13 — Complete Deployed Resource Tree of the REST API

```bash
aws apigateway get-resources --rest-api-id 60h0a79hgb \
  --query 'items[].{Path:path,Methods:resourceMethods}' --output json
```

Should show `/sl`, `/sl/reports`, `/sl/uploads`, and `/sl/uploads/presign`, with
`POST` and `OPTIONS` on the two leaf resources.

## Figure 14 — CLI Deployment and Health Verification of the Web Environment

```bash
aws elasticbeanstalk describe-environments \
  --query 'Environments[?Status!=`Terminated`].{Env:EnvironmentName,Health:Health,Status:Status,Version:VersionLabel}' \
  --output table
```

Should show both environments `Green` and `Ready`.

Note the backticks around `Terminated` are part of JMESPath syntax. The surrounding
single quotes keep the shell from interpreting them, so paste the line as written.

## Figure 15 — CLI Resource Provisioning and Verification of the CloudFront Distribution

```bash
aws cloudfront get-distribution --id E7JA2N5C3YF8P \
  --query 'Distribution.{Status:Status,Domain:DomainName,Enabled:DistributionConfig.Enabled}'
```

Should show `Deployed`, the distribution domain, and `true`.

## Figure 16 — End-to-End Verification of All Three Origin Routes

```bash
printf '%-22s %s\n' '/' "$(curl -s -o /dev/null -w '%{http_code}' $CF/)"
printf '%-22s %s\n' '/api/health' "$(curl -s -o /dev/null -w '%{http_code}' $CF/api/health)"
printf '%-22s %s\n' '/sl/uploads/presign' "$(curl -s -o /dev/null -w '%{http_code}' -X POST $CF/sl/uploads/presign -H 'content-type: application/json' -d '{"filename":"a.jpg","contentType":"image/jpeg"}')"
```

Should print `200` three times: the web origin, the application origin, and the
serverless origin, all reached through a single hostname.

## Figure 17 — CloudWatch Dashboard Showing Request Path Metrics Under Load

Generate traffic first so the widgets are not empty, then open the dashboard within
the hour:

```bash
cd infra && ./deploy.sh 63 && cd ..
```

Then open:

```
https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards/dashboard/FloodGuard-Task2
```

Set the time range to **1 hour**. Capture the top half and the bottom half as two
images so the axis labels stay readable.

## Figure 18 — CloudWatch Alarm Inventory in a Non-Alarming State

```bash
aws cloudwatch describe-alarms \
  --query "MetricAlarms[?starts_with(AlarmName,'fg-')].{Name:AlarmName,State:StateValue}" \
  --output table
```

Should list 21 alarms, every one `OK`.

## Figure 19 — AWS X-Ray Service Map Spanning the Server and Serverless Tiers

Run the traffic generator from Figure 17 first, then open:

```
https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#xray:service-map
```

Set the time range to **1 hour**. The map must show the API Gateway stage node, the
Lambda nodes, and the `floodguard-backend` node connected in one view.

## Figure 20 — X-Ray Trace Timeline Showing Function Initialisation Cost

Get a recent trace identifier:

```bash
aws xray get-trace-summaries \
  --start-time "$(date -u -d '15 minutes ago' +%s)" \
  --end-time "$(date -u +%s)" \
  --query 'TraceSummaries[0].Id' --output text
```

Paste that identifier into the X-Ray console trace search and open it. Capture the
timeline showing the gateway segment and the Lambda subsegments. A trace containing
an `Initialization` subsegment is the one to use, since it illustrates the cold
start cost discussed in the report.

## Figure 21 — Consolidated End-to-End Verification Result

```bash
cd infra && ./deploy.sh 63 && cd ..
```

Capture the summary table at the end. Should show **18 checks passed, 0 failed**.

This is the single strongest piece of evidence in the report, so capture the whole
summary block even if it needs a slightly taller image.

---

# Part B: browser figures

Sign in at `$CF` with a test account. Do not use a personal password, and mask email
addresses before pasting screenshots.

| Figure | Page to capture | URL |
|---|---|---|
| 22 | Public landing page | `$CF/` |
| 23 | Resident alerts list | `$CF/dashboard/resident/alerts` |
| 24 | Interactive risk map | `$CF/dashboard/resident/map` |
| 26 | Registration form | `$CF/register` |
| 27 | Sign-in page | `$CF/login` |
| 28 | Resident dashboard | `$CF/dashboard/resident` |
| 31 | Authority dashboard | `$CF/dashboard/admin` |
| 32 | Report verify or reject | `$CF/dashboard/admin/reports` |
| 33 | Volunteer request claimed | `$CF/dashboard/volunteer/requests` |
| 34 | Issue an alert | `$CF/dashboard/admin/alerts` |
| 36 | Analytics view | `$CF/dashboard/admin/analytics` |
| 37 | User administration | `$CF/dashboard/admin/users` |
| 38 | Profile and notification preferences | resident dashboard, profile section |

Four figures in this part need more than a plain page capture: 25, 29, 30 and 35.

## Figure 25 — Unauthenticated Guest Report Accepted and Malformed Report Rejected

This one is command line, because guest intake is served by the serverless tier
rather than by a page:

```bash
curl -s -o /dev/null -w 'invalid body: %{http_code}\n' -X POST $CF/sl/reports \
  -H 'content-type: application/json' -d '{"description":"x"}'
```

Should print `400`. To show a valid submission alongside it, first take a region
identifier from the database, then post a complete report:

```bash
REGION=$(aws dynamodb scan --table-name fg-weather-snapshots --limit 1 \
  --query 'Items[0].regionId.S' --output text)

curl -s -o /dev/null -w 'valid report: %{http_code}\n' -X POST $CF/sl/reports \
  -H 'content-type: application/json' \
  -d "{\"regionId\":\"$REGION\",\"description\":\"report for report screenshot\",\"latitude\":26.45,\"longitude\":87.27,\"severity\":\"low\"}"
```

Should print `201`. Capture both lines together: validation that discriminates is
the point, not validation that rejects everything.

## Figure 29 — Report Submission Showing the Direct Browser-to-S3 Upload Sequence

Open `$CF/dashboard/resident/reports`, press **F12** to open developer tools, select
the **Network** tab, then submit a report with a photograph attached.

The network log must show `POST /sl/uploads/presign` followed by a separate `PUT`
addressed to the `floodguard-uploads-292960609118.s3.us-east-1.amazonaws.com`
hostname. That second request is the proof the image bypassed the application
server entirely.

Truncate or blur the long query string on the `PUT` request. It is a temporary
credential.

## Figure 30 — Object Tags Written by the Image Verification Function

Immediately after the upload above, this reads the tags on the most recent object:

```bash
KEY=$(aws s3api list-objects-v2 --bucket $BUCKET --prefix reports/ \
  --query 'reverse(sort_by(Contents,&LastModified))[0].Key' --output text)
echo "$KEY"
aws s3api get-object-tagging --bucket $BUCKET --key "$KEY"
```

Should show `verification` set to `verified` and `detectedType` set to the detected
media type. Those tags were written by `fg-image-process`, so their presence proves
the S3 event notification fired and the file signature check passed.

## Figure 35 — Alert Notification Delivered to a Subscriber by Amazon SNS

Capture the alert email in your inbox, with the recipient address obscured. To
evidence publication from the AWS side, capture this alongside it:

```bash
aws cloudwatch get-metric-statistics --namespace AWS/SNS \
  --metric-name NumberOfMessagesPublished \
  --dimensions Name=TopicName,Value=fg-flood-alerts \
  --start-time "$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --period 3600 --statistics Sum
```

Should show a non-zero `Sum`.

If no alert has fired recently, trigger the pipeline and wait about a minute:

```bash
aws lambda invoke --function-name fg-weather-ingest \
  --payload '{"source":"manual"}' --cli-binary-format raw-in-base64-out /tmp/out.json
cat /tmp/out.json
```

---

# Rebuilding the document

Only needed if you edit the text. Inserting screenshots does not require it.

```bash
cd docs/report/apa
./build.sh
```

The build reports the word count and page count and refuses to run if an em dash
has crept in. Source files are `part0-title.md` through `part3-results.md`; never
edit the `.docx` directly, since a rebuild overwrites it.

# Before submitting

1. Replace the title page placeholders: group number, lecturer, submission date,
   and the `NP0698[##]` student identifiers.
2. Confirm the M1 to M4 name mapping. Samir Pokhrel as M2 came from the repository;
   the other three were inferred from `docs/workbreakdown.md`.
3. Check the page count stays under 40 after the images go in.

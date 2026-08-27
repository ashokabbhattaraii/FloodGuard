# System Implementation

Every resource described in this section was provisioned through the AWS Command
Line Interface (CLI) rather than the management console, so that the deployment is
reproducible and auditable. The commands are organised into numbered, idempotent
step scripts under the project `infra/steps` directory; re-running any step
converges on the desired state instead of creating duplicate resources. Where a
provisioning command and a verification command are both given below, the
verification command is read-only and may be run at any time.

## S3 Storage Buckets

### Create S3 Buckets

Two buckets were created: one receiving resident photograph uploads and one holding
deployment artefacts. Bucket names embed the account identifier because the S3
namespace is global. Server-side encryption and versioning were enabled at creation,
and a cross-origin resource sharing policy was applied to the uploads bucket so that
browsers may complete a presigned upload directly.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
CLI Resource Provisioning and Verification of the Amazon S3 Buckets
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the terminal after provisioning the S3 buckets.
:::

::: {custom-style="FigInstr"}
CLI: AWS CLI v2
:::

::: {custom-style="FigInstr"}
Provisioning Command: `cd infra && ./deploy.sh 22`
:::

::: {custom-style="FigInstr"}
Verification Command: `aws s3api get-public-access-block --bucket floodguard-uploads-292960609118`
:::

::: {custom-style="FigInstr"}
Expected Evidence: Both bucket names reported, the AES256 encryption rule applied, and all four public access block settings `true`.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

### Block Public Access

Neither bucket is publicly readable. Photographs are written through presigned URLs
and read through CloudFront, so all four public access block settings were enabled.
This is the control that prevents an accidental object-level access control list from
exposing resident-submitted imagery.

## DynamoDB Table

### Create Weather Snapshot Table

A single DynamoDB table, `fg-weather-snapshots`, stores the forecast retrieved for
each region at each ingestion cycle. The partition key is the region identifier and
the sort key is the capture timestamp, which makes the most recent snapshots for a
region a single efficient query. On-demand capacity was selected because ingestion
traffic is periodic rather than sustained.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
CLI Resource Provisioning and Verification of the Amazon DynamoDB Table
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the terminal after provisioning the DynamoDB table.
:::

::: {custom-style="FigInstr"}
CLI: AWS CLI v2
:::

::: {custom-style="FigInstr"}
Provisioning Command: `cd infra && ./deploy.sh 40`
:::

::: {custom-style="FigInstr"}
Verification Command: `aws dynamodb describe-table --table-name fg-weather-snapshots --query 'Table.{Status:TableStatus,Keys:KeySchema,Billing:BillingModeSummary.BillingMode}'`
:::

::: {custom-style="FigInstr"}
Expected Evidence: Output shows `TableStatus` as `ACTIVE`, the `regionId` hash key and `timestamp` range key, and `PAY_PER_REQUEST` billing.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

### Enable Time to Live Expiry

Weather snapshots have diminishing analytical value and unbounded growth would
accrue cost indefinitely. A time-to-live attribute expires items after thirty days,
which DynamoDB removes without consuming write capacity.

### Verify Deployed Table

Confirming that the table contains data proves the ingestion pipeline is operating
rather than merely provisioned. At the time of measurement the table held 3,212
items occupying approximately 782 kilobytes.

## SNS Flood Alert Topics

### Create Flood Alert Topic

The `fg-flood-alerts` topic performs public fan-out to residents by electronic mail
and short message service. Subscriptions are created per subscriber, which allows
SNS rather than application code to manage delivery retries.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
CLI Resource Provisioning and Verification of the Amazon SNS Topics
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the terminal after provisioning the SNS topics.
:::

::: {custom-style="FigInstr"}
CLI: AWS CLI v2
:::

::: {custom-style="FigInstr"}
Provisioning Command: `cd infra && ./deploy.sh 42`
:::

::: {custom-style="FigInstr"}
Verification Command: `aws sns list-topics --query "Topics[?contains(TopicArn,'fg-')]"`
:::

::: {custom-style="FigInstr"}
Expected Evidence: Both the `fg-flood-alerts` and `fg-ops-alarms` topic ARNs.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

### Create Operations Alarm Topic

A second topic, `fg-ops-alarms`, carries CloudWatch alarm notifications to the
operations team. The topics are deliberately separate: an operational alarm storm
must never reach residents, and a public alert must never be mistaken for an
infrastructure notification.

## Secrets Manager Authentication

### Create Application Secret

Authentication in FloodGuard operates at two levels. Human users authenticate to the
application server with signed tokens, and the Lambda functions authenticate to the
internal service interface with a shared key. Both the token signing secret and the
internal key are generated at deployment time into a single Secrets Manager secret,
`floodguard/app`, together with the database password. No credential value appears in
source control or in terminal output.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
CLI Resource Provisioning and Verification of the Application Secret
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the terminal after provisioning the application secret.
:::

::: {custom-style="FigInstr"}
CLI: AWS CLI v2
:::

::: {custom-style="FigInstr"}
Provisioning Command: `cd infra && ./deploy.sh 20`
:::

::: {custom-style="FigInstr"}
Verification Command: `aws secretsmanager describe-secret --secret-id floodguard/app --query '{Name:Name,Changed:LastChangedDate}'`
:::

::: {custom-style="FigInstr"}
Expected Evidence: Output shows the secret name and last-changed date. Do not run `get-secret-value` and do not capture any secret material.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

### Inject Secrets Into Runtime

Secret values are read at deployment time and applied as environment properties on
the Elastic Beanstalk environments and as environment variables on the Lambda
functions. The functions therefore receive the internal key without any developer
handling it directly.

## IAM Roles and Lambda Permissions

### Create Lambda Trust Policy File

Each execution role requires a trust policy naming the Lambda service as the
permitted principal. The policy document is written to a file so that role creation
remains scriptable and reviewable.

### Create Lambda Role

One role was created per function, following the principle of least privilege. Six
roles therefore exist, each named after the function it serves.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
CLI Resource Provisioning and Verification of the Lambda Execution Roles
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the terminal after provisioning the six execution roles.
:::

::: {custom-style="FigInstr"}
CLI: AWS CLI v2
:::

::: {custom-style="FigInstr"}
Provisioning Command: `cd infra && ./deploy.sh 43`
:::

::: {custom-style="FigInstr"}
Verification Command: `aws iam list-roles --query "Roles[?starts_with(RoleName,'fg-')].RoleName" --output table`
:::

::: {custom-style="FigInstr"}
Expected Evidence: All six roles, one per function.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

### Attach CloudWatch Logging Policy

The AWS managed basic execution role policy grants each function permission to
create its log group and write log events. Without it a function executes but emits
no diagnostic output, which would make the monitoring requirement unachievable.

### Create Lambda App Policy File

Beyond logging, each function needs a narrowly scoped policy for the resources it
actually touches. The ingestion function requires DynamoDB write and queue send
permissions; the dispatch function requires queue receive and topic publish
permissions; the presign function requires only object put permission on a single
bucket prefix.

### Create Custom App Policy

The per-function policy is applied as an inline role policy, which binds its
lifecycle to the role and prevents an orphaned managed policy from persisting after
teardown.

### Attach Custom App Policy to Role

Because Identity and Access Management is eventually consistent, a function created
immediately after its role can fail to assume it. The provisioning steps therefore
retry role resolution before creating the function.

### Verify Attached Role Policies

A final consolidated check across all six roles confirms that no role acquired a
broader permission than intended.

## Serverless Backend Folder Structure

The function source is organised one directory per function beneath
`infra/lambdas`, with a shared directory copied into every deployment package at
build time. This layout keeps each function independently deployable while avoiding
duplicated helper code.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
Directory Layout of the Serverless Backend
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the function source directory tree.
:::

::: {custom-style="FigInstr"}
Capture: Terminal, project root.
:::

::: {custom-style="FigInstr"}
Command: `find infra/lambdas -type f | sort`
:::

::: {custom-style="FigInstr"}
Expected Evidence: Six function directories plus `_shared`, each with an `index.mjs` handler.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

### Weather Ingestion Lambda Folder

The ingestion handler batches its queue writes, because the SQS batch send operation
accepts a maximum of ten entries per call and the deployment monitors more regions
than that.

### Flood Forecast Lambda Folder

The forecast handler returns a list of failed message identifiers rather than
throwing, which is the mechanism that makes partial batch failure effective.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
Flood Forecast Handler Source Showing Partial Batch Failure Reporting
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the forecast handler source code.
:::

::: {custom-style="FigInstr"}
Capture: Code editor, `infra/lambdas/fg-flood-forecast/index.mjs`.
:::

::: {custom-style="FigInstr"}
Command: `grep -n "batchItemFailures" -A 4 -B 8 infra/lambdas/fg-flood-forecast/index.mjs`
:::

::: {custom-style="FigInstr"}
Expected Evidence: The handler collecting `itemIdentifier` values into `batchItemFailures` and returning it.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

### Report Intake Lambda Folder

The intake handler validates its request body before any write, since it accepts
unauthenticated input and must reject malformed submissions with a client error
rather than a server error.

### Alert Dispatch Lambda Folder

The dispatch handler publishes to SNS only after the alert record is created, so a
publication never precedes a durable record.

### Shared Helper Files

A single shared module provides structured logging, environment variable
resolution, and the authenticated internal fetch helper used by every function that
writes back to the application server.

## Lambda Microservices

### Install Lambda Dependencies

Only the presign function requires third-party dependencies, namely the S3 client
and request presigner packages. The remaining functions rely on the runtime
provided SDK, which keeps their deployment packages small and their cold start
latency low.

### Package Lambda Code

Each function is packaged as a compressed archive containing its handler and a copy
of the shared module. Table 3 records the resulting configuration of the six
deployed functions.

::: {custom-style="FigNum"}
Table 3
:::

::: {custom-style="FigTitle"}
Deployed Configuration of the Six Lambda Microservices
:::

| Function | Trigger | Timeout (s) | Memory (MB) | Tracing |
|---|---|---|---|---|
| `fg-weather-ingest` | EventBridge, 10 min | 300 | 512 | Active |
| `fg-flood-forecast` | SQS, batch 5 | 120 | 512 | Active |
| `fg-alert-dispatch` | SQS, batch 1 | 60 | 512 | Active |
| `fg-report-intake` | API Gateway | 30 | 512 | Active |
| `fg-upload-presign` | API Gateway | 30 | 512 | Active |
| `fg-image-process` | S3 object created | 30 | 512 | Active |

::: {custom-style="APANote"}
*Note.* All functions use the Node.js 22 runtime on the arm64 architecture. Timeout values reflect the longest observed execution for each workload plus headroom.
:::

### Create Weather Ingestion Lambda

The ingestion function is created with a three hundred second timeout, reflecting
its ten sequential outbound API calls, and with active tracing enabled so that
those calls appear as subsegments in X-Ray.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
CLI Resource Provisioning and Verification of the Lambda Functions
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the terminal after provisioning the Lambda functions.
:::

::: {custom-style="FigInstr"}
CLI: AWS CLI v2
:::

::: {custom-style="FigInstr"}
Provisioning Command: `cd infra && ./deploy.sh 44`
:::

::: {custom-style="FigInstr"}
Verification Command: `aws lambda list-functions --query "Functions[?starts_with(FunctionName,'fg-')].{Name:FunctionName,Runtime:Runtime,Tracing:TracingConfig.Mode}" --output table`
:::

::: {custom-style="FigInstr"}
Expected Evidence: Six functions, runtime `nodejs22.x`, tracing `Active`.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

### Create Flood Forecast Lambda

The forecast function is invoked from the queue rather than from the network, so it
requires no invoke permission for API Gateway. Its event source mapping is described
in Section *Event Source Configuration*.

### Create Report Intake Lambda

The intake function is the public write path and is deployed with the narrowest
execution role in the system.

### Create Alert Dispatch Lambda

The dispatch function holds the only SNS publish permission in the serverless tier,
which confines the ability to notify residents to a single component.

## Event Source Configuration

### Configure EventBridge Schedule

An EventBridge Scheduler schedule invokes the ingestion function every ten minutes.
This replaces the in-process cron and, critically, fires exactly once regardless of
how many application instances are running.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
CLI Resource Provisioning and Verification of the EventBridge Schedule
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the terminal after provisioning the schedule.
:::

::: {custom-style="FigInstr"}
CLI: AWS CLI v2
:::

::: {custom-style="FigInstr"}
Provisioning Command: `cd infra && ./deploy.sh 46`
:::

::: {custom-style="FigInstr"}
Verification Command: `aws scheduler get-schedule --name fg-weather-ingest-schedule --query '{State:State,Expression:ScheduleExpression,Target:Target.Arn}'`
:::

::: {custom-style="FigInstr"}
Expected Evidence: Output shows state `ENABLED`, the expression `rate(10 minutes)`, and the ingestion function as target.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

### Configure SQS Event Source Mappings

Two event source mappings connect the work queues to their consumers. Both enable
partial batch failure reporting, and both specify a maximum concurrency. The
concurrency ceiling is essential rather than cosmetic: this account permits ten
concurrent function executions, and an uncapped queue consumer will scale until it
owns all of them, starving the endpoints on the public request path. The rationale
and the measured consequence are examined in Section *CloudWatch Monitoring
Evidence*.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
Verification of the SQS Event Source Mappings and Concurrency Ceilings
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture both event source mappings with their concurrency limits.
:::

::: {custom-style="FigInstr"}
Capture: Terminal, AWS CLI.
:::

::: {custom-style="FigInstr"}
Command: `aws lambda list-event-source-mappings --query 'EventSourceMappings[].{Function:FunctionArn,Batch:BatchSize,MaxConcurrency:ScalingConfig.MaximumConcurrency,State:State}' --output table`
:::

::: {custom-style="FigInstr"}
Expected Evidence: Two enabled mappings, with maximum concurrency 3 for forecast and 2 for dispatch.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

## API Gateway REST API

### Create REST API

A REST API named `fg-serverless-api` fronts the two network-addressable functions.
The REST protocol was selected over the newer HTTP API protocol for one decisive
reason: HTTP APIs do not emit X-Ray trace segments, and tracing evidence is a
requirement of this task (Amazon Web Services, 2025c). The cost difference is
immaterial at this request volume.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
CLI Resource Provisioning and Verification of the API Gateway REST API
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the terminal after provisioning the REST API.
:::

::: {custom-style="FigInstr"}
CLI: AWS CLI v2
:::

::: {custom-style="FigInstr"}
Provisioning Command: `cd infra && ./deploy.sh 45`
:::

::: {custom-style="FigInstr"}
Verification Command: `aws apigateway get-rest-apis --query "items[?name=='fg-serverless-api'].{Id:id,Name:name}" --output table`
:::

::: {custom-style="FigInstr"}
Expected Evidence: The API identifier and name.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

### Create API Stage

A single stage named `v1` was deployed. Stage names appear in the request path, so
the invoke URL terminates in `/v1`.

### Enable X-Ray Tracing

Active tracing was enabled on the stage. This produces an API Gateway stage node in
the service map, which is what allowed a fault to be attributed to the gateway
rather than to a handler during performance analysis.

## API Gateway Integrations and Lambda Invoke Permissions

### Create Report Intake Integration

The report resource uses Lambda proxy integration, which forwards the entire request
to the handler and returns the handler response verbatim. This keeps request shaping
in application code rather than in gateway mapping templates.

### Create Upload Presign Integration

The presign resource is configured identically, targeting the presign function.

### Allow API Gateway to Invoke Report Intake Lambda

A resource-based policy statement permits the gateway to invoke the function.
Without it the gateway receives an authorisation failure and returns a server error,
a symptom easily mistaken for a defect in the handler.

### Allow API Gateway to Invoke Upload Presign Lambda

The equivalent statement was applied to the presign function.

## Create API Gateway Routes

### Report Routes

The report resource exposes a POST method for submission and an OPTIONS method so
that browser preflight requests succeed.

### Upload Routes

The presign resource is configured equivalently.

### Deployed Routes

A consolidated listing confirms the complete resource tree as deployed.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
Complete Deployed Resource Tree of the REST API
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture every deployed resource path and its methods.
:::

::: {custom-style="FigInstr"}
Capture: Terminal, AWS CLI.
:::

::: {custom-style="FigInstr"}
Command: `aws apigateway get-resources --rest-api-id 60h0a79hgb --query 'items[].{Path:path,Methods:resourceMethods}' --output json`
:::

::: {custom-style="FigInstr"}
Expected Evidence: Output shows the `/sl`, `/sl/reports`, `/sl/uploads`, and `/sl/uploads/presign` paths, with methods present on the two leaf resources.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

## Frontend Environment and Build

### Create Environment File

The frontend requires the API base path at build time, because framework
environment variables prefixed for public exposure are inlined into the browser
bundle during compilation rather than read at runtime. The relative path `/api` is
used, which means no rebuild is required if the distribution domain changes.

### Build the Frontend

The frontend is compiled to a standalone output bundle. It must be built with npm
rather than pnpm: standalone output traces dependencies into a generated module
directory, and the symlinked store used by pnpm omits transitive-only packages from
that trace, producing a runtime module resolution failure that surfaces as an opaque
gateway error.

### Deploy the Frontend

The compiled bundle is deployed to the Elastic Beanstalk web environment. The
deployment step asserts that the previously described module resolves before
shipping the artefact, converting a class of runtime failure into a build-time
failure.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
CLI Deployment and Health Verification of the Web Environment
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the terminal immediately after deploying the frontend environment.
:::

::: {custom-style="FigInstr"}
CLI: AWS CLI v2
:::

::: {custom-style="FigInstr"}
Provisioning Command: `cd infra && ./deploy.sh 31`
:::

::: {custom-style="FigInstr"}
Verification Command: `aws elasticbeanstalk describe-environments --query 'Environments[?Status!=`Terminated`].{Env:EnvironmentName,Health:Health,Status:Status}' --output table`
:::

::: {custom-style="FigInstr"}
Expected Evidence: Both environments report health `Green`, status `Ready`.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

## CloudFront Distribution

### Create Cache and Origin Request Policies

A single distribution serves three origins. Static framework assets are cached
immutably, while API and serverless paths forward the full request without caching,
since responses are request-specific.

### Create CloudFront Distribution

Consolidating the three Task 1 distributions into one removes the cross-origin
configuration that separate hostnames required. Every browser request is now
same-origin, so no preflight occurs anywhere in the system.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
CLI Resource Provisioning and Verification of the CloudFront Distribution
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the terminal after provisioning the distribution.
:::

::: {custom-style="FigInstr"}
CLI: AWS CLI v2
:::

::: {custom-style="FigInstr"}
Provisioning Command: `cd infra && ./deploy.sh 32`
:::

::: {custom-style="FigInstr"}
Verification Command: `aws cloudfront get-distribution --id E7JA2N5C3YF8P --query 'Distribution.{Status:Status,Domain:DomainName,Enabled:DistributionConfig.Enabled}'`
:::

::: {custom-style="FigInstr"}
Expected Evidence: Output shows status `Deployed`, the distribution domain name, and enabled `true`.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

### Add the Serverless Path Behaviour

A final behaviour routes the serverless path prefix to the API Gateway origin,
completing the single front door. Table 4 records the resulting routing table.

::: {custom-style="FigNum"}
Table 4
:::

::: {custom-style="FigTitle"}
CloudFront Path Routing to the Three Origins
:::

| Path pattern | Origin | Cached | Data owned by origin |
|---|---|---|---|
| `/_next/static/*` | Elastic Beanstalk web | Yes | None |
| `/` (default) | Elastic Beanstalk web | No | None |
| `/api/*` | Elastic Beanstalk application | No | PostgreSQL |
| `/sl/*` | API Gateway | No | DynamoDB and S3 |

::: {custom-style="APANote"}
*Note.* Because all four patterns resolve to one hostname, the browser treats every request as same-origin, which removes cross-origin preflight from the request path entirely.
:::

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
End-to-End Verification of All Three Origin Routes
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture all three origins responding correctly through the single distribution hostname.
:::

::: {custom-style="FigInstr"}
Capture: Terminal, curl.
:::

::: {custom-style="FigInstr"}
Command: `curl -s -o /dev/null -w "%{http_code}\n" https://drtyovliurlkl.cloudfront.net/` then repeat for `/api/health` and `/sl/uploads/presign` (POST)
:::

::: {custom-style="FigInstr"}
Expected Evidence: All three return HTTP 200, so all three origins are reachable through one hostname.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

## CloudWatch Monitoring Evidence

Monitoring was implemented as a fourteen-widget dashboard laid out along the request
path, together with twenty-one alarms, every one of which publishes to the
operations topic. Metrics without alarm actions constitute observation without
response, so no metric was instrumented without a corresponding threshold. All
handlers emit single-line structured logs, which makes fields queryable in
CloudWatch Logs Insights.

Three alarms carry disproportionate diagnostic weight. A non-empty dead-letter queue
indicates a message that has failed three delivery attempts and would otherwise
represent silent data loss. The age of the oldest queued message is a more honest
backlog signal than queue depth, because depth appears healthy on a large but
fast-moving queue even while consumers fall behind. Function throttling indicates
concurrency exhaustion, which is a scaling signal rather than a code defect.

The throttling alarm proved its value during load testing. An initial run returned
two server errors out of two hundred and fifty-three gateway requests. The traces
recorded thirteen millisecond durations with an empty function segment, which
indicates rejection before application code executed rather than handler failure.
The throttling metric confirmed two rejections, and the account quota query revealed
the cause: ten concurrent executions rather than the default one thousand. Because
neither queue consumer had a concurrency ceiling at that point, a queue backlog could
have consumed the entire pool and starved the public request path. Applying the
ceilings described in Section *Configure SQS Event Source Mappings* eliminated the
condition, as Table 5 records.

::: {custom-style="FigNum"}
Table 5
:::

::: {custom-style="FigTitle"}
Throttling and Server Error Counts Before and After Concurrency Allocation
:::

| Measurement run | Presign invocations | Throttled invocations | Gateway server errors |
|---|---|---|---|
| Before allocation, burst of 12 | 118 | 2 | 2 |
| After allocation, burst of 8 | 117 | 0 | 0 |

::: {custom-style="APANote"}
*Note.* Counts were obtained at sixty-second resolution from the AWS/Lambda and AWS/ApiGateway namespaces. Functional verification passed in both runs; only the metrics distinguished a working system from one able to withstand a queue backlog.
:::

Table 6 summarises the performance measured across a thirty-minute window covering
the load test.

::: {custom-style="FigNum"}
Table 6
:::

::: {custom-style="FigTitle"}
Measured Performance of the Serverless Tier
:::

| Function | Invocations | Errors | Mean (ms) | 95th percentile (ms) |
|---|---|---|---|---|
| `fg-upload-presign` | 245 | 0 | 13.1 | 96.2 |
| `fg-report-intake` | 4 | 0 | 277.7 | 551.0 |
| `fg-flood-forecast` | 12 | 0 | 466.9 | 968.6 |
| `fg-alert-dispatch` | 4 | 0 | 475.4 | 765.9 |
| `fg-image-process` | 2 | 0 | 557.5 | 772.2 |
| `fg-weather-ingest` | 5 | 0 | 1,638.3 | 2,194.8 |

::: {custom-style="APANote"}
*Note.* API Gateway recorded 253 requests with a mean latency of 59.6 ms, a 95th percentile of 144.4 ms, and mean integration latency of 56.8 ms. The divergence between mean and 95th percentile latency reflects initialisation of new execution environments during burst traffic rather than processing cost.
:::

The ingestion function is the slowest at 1.6 seconds, which is expected because it
performs ten sequential outbound API calls. That figure is the clearest
justification for moving scoring behind a queue: a synchronous design would have
placed those seconds on a user request. Across the same window both work queues
recorded equal counts of messages sent, received, and deleted, and both dead-letter
queues remained empty, indicating no message loss and no redrive.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
CloudWatch Dashboard Showing Request Path Metrics Under Load
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the monitoring dashboard populated with load test data.
:::

::: {custom-style="FigInstr"}
Capture: Console, CloudWatch, Dashboards, `FloodGuard-Task2`, time range set to one hour.
:::

::: {custom-style="FigInstr"}
Command: Run `cd infra && ./deploy.sh 63` first so the widgets contain traffic, then open the dashboard.
:::

::: {custom-style="FigInstr"}
Expected Evidence: Gateway, function, and queue widgets all show plotted data rather than empty axes. Capture the upper and lower halves separately so axis labels stay readable.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
CloudWatch Alarm Inventory in a Non-Alarming State
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture all project alarms and their current state.
:::

::: {custom-style="FigInstr"}
Capture: Console, CloudWatch, All alarms, filtered by the prefix `fg-`.
:::

::: {custom-style="FigInstr"}
Command: `aws cloudwatch describe-alarms --query "MetricAlarms[?starts_with(AlarmName,'fg-')].{Name:AlarmName,State:StateValue}" --output table`
:::

::: {custom-style="FigInstr"}
Expected Evidence: Twenty-one alarms, all in state `OK`.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
AWS X-Ray Service Map Spanning the Server and Serverless Tiers
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the X-Ray service map covering both tiers.
:::

::: {custom-style="FigInstr"}
Capture: Console, CloudWatch, X-Ray traces, Service map, time range set to one hour.
:::

::: {custom-style="FigInstr"}
Command: Run `cd infra && ./deploy.sh 63` first to generate traffic, then open the service map.
:::

::: {custom-style="FigInstr"}
Expected Evidence: The gateway stage node, the function nodes, and the application server node connected in one map.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
X-Ray Trace Timeline Showing Function Initialisation Cost
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture a single trace timeline that includes an initialisation subsegment.
:::

::: {custom-style="FigInstr"}
Capture: Console, CloudWatch, X-Ray traces, Traces list, opening a `POST /sl/uploads/presign` trace.
:::

::: {custom-style="FigInstr"}
Command: `aws xray get-trace-summaries --start-time $(date -u -d '15 minutes ago' +%s) --end-time $(date -u +%s) --query 'TraceSummaries[0].Id' --output text`
:::

::: {custom-style="FigInstr"}
Expected Evidence: The gateway segment and function subsegments with individual durations, showing initialisation latency.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
Consolidated End-to-End Verification Result
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the automated verification summary table.
:::

::: {custom-style="FigInstr"}
Capture: Terminal, project root.
:::

::: {custom-style="FigInstr"}
Command: `cd infra && ./deploy.sh 63`
:::

::: {custom-style="FigInstr"}
Expected Evidence: Summary shows eighteen checks passed, zero failed, covering routing, authorisation, validation, uploads, ingestion, dead-letter queues, deduplication, and traces.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

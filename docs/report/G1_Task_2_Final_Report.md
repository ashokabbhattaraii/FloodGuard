---
title: "FloodGuard — Cloud Service Integration & Monitoring"
subtitle: "CT071-3-3-DDAC — Designing & Developing Cloud Applications — Task #2"
lang: en-GB
---

# Cover Page

| | |
|---|---|
| **Module Code & Title** | CT071-3-3-DDAC — Designing & Developing Cloud Applications |
| **Assessment** | Group Project — Task #2: Cloud Service Integration & Monitoring |
| **Problem Statement** | Problem Background **#4** — Flood Early Warning & Disaster Preparedness |
| **Project Title** | **FloodGuard** — a cloud-native flood early-warning and emergency-response platform |
| **Group Number** | **G[GROUP NUMBER]** |
| **Intake** | [INTAKE CODE] |
| **Lecturer** | [LECTURER NAME] |
| **Submission Date** | [DATE] |

**Team Members**

| # | Name | Student ID | Primary Responsibility (Task #2) |
|---|---|---|---|
| M1 | Ashok Bhattrai | NP0698[##] | Weather ingestion & forecasting microservices, S3, IAM |
| M2 | Samir Pokhrel | NP0698[##] | Report/upload microservices, API Gateway, CloudFront, VPC |
| M3 | Anjali Misra | NP0698[##] | Alert fan-out microservice, SNS, CloudWatch alarms & dashboard |
| M4 | Sangita Tamang | NP0698[##] | Internal service API, RDS, SQS reliability, X-Ray tracing |

> **Live system:** `https://drtyovliurlkl.cloudfront.net`
> **AWS Account:** 292960609118 · **Region:** us-east-1

\newpage

# 1. Design & Implementation

## 1.1 Cloud Architecture Diagram

Task #2 extends the Task #1 server-based system with a serverless, event-driven
tier. Two figures are provided: the design as proposed, and the design as built.
They differ, and Section 1.2 explains why — those differences are the substance of
this task rather than an accident of delivery.

> **[FIGURE 1 — PROPOSED ARCHITECTURE]**
> *Insert the team's original Task #2 architecture diagram here.*
> *Where to obtain:* the diagram drawn during design week (draw.io / Eraser export).
> Save it as `docs/report/figures/proposed-architecture.png` and re-run
> `docs/report/build.sh` to have it embedded automatically.

![Figure 2 — FloodGuard Task #2 as-built architecture, generated from the deployed stack.](figures/as-built-architecture.png)

The deployed system presents **one CloudFront hostname with three origins**:

| Path | Origin | Owns |
|---|---|---|
| `/` and `/_next/static/*` | Elastic Beanstalk — Next.js frontend | — |
| `/api/*` | Elastic Beanstalk — NestJS monolith (ALB + ASG) | RDS PostgreSQL |
| `/sl/*` | API Gateway REST v1 → Lambda | DynamoDB, S3 |

Because the browser calls the relative path `/api`, every request is same-origin.
There is no CORS preflight anywhere in the system, and no frontend rebuild is
required when a domain changes.

## 1.2 Changes Between Task #1 and Task #2

Task #1 was a two-tier deployment: a Next.js frontend and a NestJS monolith on
Elastic Beanstalk, backed by RDS PostgreSQL, behind three separate CloudFront
distributions. All background work — weather polling, risk scoring, alert creation —
ran inside the monolith on an in-process `@nestjs/schedule` cron.

Reviewing the proposed diagram against the Task #1 codebase before implementation
surfaced several items that would not have worked as drawn. Each correction below is
also the design rationale.

| Proposed | Problem | Implemented instead |
|---|---|---|
| API Gateway in front of Elastic Beanstalk | An extra hop adding no capability. Every request still terminated on the monolith, so **nothing was actually serverless**. | API Gateway fronts the **Lambda functions**, making them independently addressable microservices. |
| API Gateway **HTTP API** | HTTP APIs do **not** support X-Ray. X-Ray is a named requirement of this task. | **REST API (v1)**, which emits trace segments. The service map therefore contains an `AWS::ApiGateway::Stage` node. |
| EventBridge → SQS → Lambda | A scheduled tick carries no per-message work; there is nothing to fan out yet. | `EventBridge → Lambda → SQS (one message per region) → Lambda`. |
| "SQS + DLQ" as one component | A DLQ is a separate queue reached by a redrive policy — the resilience mechanism was hidden. | **4 queues**: 2 work queues + 2 real DLQs, `maxReceiveCount: 3`. |
| S3 drawn as a passive sink | No trigger, so no event-driven integration. | `ObjectCreated:*` on `reports/` invokes `fg-image-process`. **Uploading a photo *is* the trigger.** |
| DynamoDB holding "live risk levels" | Already authoritative in Postgres (`region.riskLevel`) — a second copy is a dual-write with no owner. | DynamoDB given work Postgres is worse at: **append-only weather time-series with a 30-day TTL**. |
| Backend labelled "Next.js" | The backend is **NestJS 11**; only the frontend is Next.js. | Documentation corrected. |
| RDS Multi-AZ in private subnets | Multi-AZ is outside the free tier; private subnets need a NAT Gateway (~$32/month). | Single-AZ, but the DB subnet group spans 2 AZs, so Multi-AZ is one `modify-db-instance` away. |

Two latent defects were also fixed:

**Duplicate flood alerts.** `@nestjs/schedule` runs its cron on *every* instance,
and Task #1 pinned only instance *type*, never `MinSize`/`MaxSize` — so the first
autoscale event would have doubled every alert sent to real subscribers. Adding an
EventBridge-triggered Lambda doing the same work would have doubled them again. The
trigger now lives in EventBridge, which fires once regardless of fleet size, and the
in-process cron is gated behind `FLOOD_MONITOR_ENABLED` (default `false`).

**Committed secrets.** Task #1's `.ebextensions/env.config` contained the live RDS
password and `JWT_SECRET`, placing them permanently in git history. Credentials are
now generated into **AWS Secrets Manager** and injected at deploy time.

## 1.3 Serverless Components

Six Lambda functions were deployed (`nodejs22.x`, `arm64`, X-Ray **Active**), each
with its **own least-privilege IAM execution role**. A single shared role would have
given `fg-report-intake` — the only unauthenticated write in the system — permission
to publish flood alerts to every subscriber.

| Function | Trigger | Owns | Purpose |
|---|---|---|---|
| `fg-weather-ingest` | EventBridge, `rate(10 minutes)` | DynamoDB, SQS | Fetch Open-Meteo forecast per region, snapshot, fan out |
| `fg-flood-forecast` | SQS `fg-forecast-jobs` (batch 5) | — | Risk scoring 0–100, ported from the monolith |
| `fg-alert-dispatch` | SQS `fg-alert-dispatch` (batch 1) | SNS | Create alert (deduplicated), publish fan-out |
| `fg-report-intake` | API GW `POST /sl/reports` | — | Public, unauthenticated flood-report intake |
| `fg-upload-presign` | API GW `POST /sl/uploads/presign` | S3 | Issue presigned PUT URL |
| `fg-image-process` | S3 `ObjectCreated:*` | S3 | Magic-number content verification and tagging |

**Separation of responsibility.** `fg-weather-ingest` performs I/O only. Scoring is
deliberately *not* done there, so a slow change to the scoring algorithm can never
stall ingestion:

```javascript
// fg-weather-ingest — SendMessageBatch caps at 10 entries per call.
for (let i = 0; i < messages.length; i += 10) {
  const chunk = messages.slice(i, i + 10);
  await sqs.send(new SendMessageBatchCommand({
    QueueUrl: requireEnv('FORECAST_QUEUE_URL'),
    Entries: chunk.map((m, j) => ({
      Id: `${i + j}`,
      MessageBody: JSON.stringify({ snapshot: m.snapshot, region: m.region }),
    })),
  }));
}
```

**Partial batch failure.** Event source mappings set `ReportBatchItemFailures` and
handlers return `batchItemFailures`; without it, one poison message forces
redelivery of all its healthy batch-mates:

```javascript
// fg-flood-forecast
export const handler = async (event) => {
  const batchItemFailures = [];
  for (const record of event.Records) {
    try {
      await processOne(record.body);
    } catch (err) {
      // Reporting only this messageId means its batch-mates still succeed.
      logJson('error', 'scoring failed', { messageId: record.messageId, ... });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures };
};
```

**API Gateway configuration.** REST API `fg-serverless-api`, stage `v1`, exposing two
resources with Lambda proxy integration, reached through CloudFront at `/sl/*`:

```
POST /sl/reports          → fg-report-intake     (OPTIONS for preflight)
POST /sl/uploads/presign  → fg-upload-presign    (OPTIONS for preflight)
```

> **[SCREENSHOT 1 — API GATEWAY CONFIGURATION]**
> *Where to capture:* AWS Console → API Gateway → **fg-serverless-api** → *Resources*.
> Show the `/sl/reports` and `/sl/uploads/presign` tree with the POST method
> selected so the Lambda proxy integration target is visible. Capture the *Stages →
> v1* panel as a second shot to show the invoke URL and that **X-Ray Tracing** is
> enabled.

> **[SCREENSHOT 2 — LAMBDA FUNCTION LIST]**
> *Where to capture:* AWS Console → Lambda → **Functions**, filtered by `fg-`.
> All six functions should be visible with runtime `nodejs22.x` and architecture
> `arm64`. Then open any one function → *Configuration → Monitoring and operations
> tools* to show **Active tracing** enabled.

## 1.4 Microservices Boundary

**The Lambda functions never open a connection to Postgres.** The monolith owns RDS;
the serverless tier owns DynamoDB and S3. They communicate over SQS and an
authenticated internal HTTP API. This is a genuine no-shared-database boundary, and
it has three concrete consequences:

1. **No NAT Gateway.** `fg-weather-ingest` needs outbound internet access for the
   Open-Meteo API. A VPC-attached function would require a NAT Gateway at roughly
   \$32/month, plus interface endpoints for SQS and SNS at roughly \$15/month.
   Outside the VPC, both cost \$0.
2. **RDS stays closed.** Non-VPC Lambdas have no static IP, so a direct-connection
   design would have forced `0.0.0.0/0` on port 5432. The security group instead
   admits only the Elastic Beanstalk security group and the operator's `/32`.
3. **One writer per datastore.** No dual-write consistency problem exists.

The internal surface is protected by a constant-time shared-key guard rather than
JWT, because the callers are services, not users:

```typescript
// InternalKeyGuard — /api/internal/* is called by Lambdas, not browsers.
const presented = req.header('x-internal-key') ?? '';
const expected  = this.config.get<string>('INTERNAL_API_KEY') ?? '';
if (!expected) {
  // Fail closed. A missing key on the server must never mean "allow all".
  throw new UnauthorizedException();
}
// timingSafeEqual throws on length mismatch, which would leak the expected length.
```

## 1.5 Integration with S3, SNS and SQS

The brief requires the microservices to interact with at least one of S3, SNS or
SQS. All three are integrated.

**Amazon S3 — upload pipeline.** A presigned URL pins a `Content-Type`, but S3 does
not verify that the uploaded bytes match it. `fg-image-process` is the server-side
check: it reads the file's magic number, tags the object `verified` or `rejected`,
and reports the verdict to the monolith so a rejected photo is never rendered in the
admin UI. Oversized objects are deleted rather than stored.

**Amazon SQS — decoupling and resilience.** Two work queues, each with a real
dead-letter queue and `maxReceiveCount: 3`. Visibility timeout is set to six times
the function timeout so SQS cannot redeliver a message that is still being processed.

**Amazon SNS — fan-out.** `fg-flood-alerts` fans alerts out to email and SMS
subscribers; a separate `fg-ops-alarms` topic carries CloudWatch alarm actions. The
topics are deliberately separate so that the public alert path and the operational
alerting path cannot interfere.

**Idempotency.** SQS delivery is at-least-once, so a redelivered alert must not
notify every resident twice. `InternalService.createAlert` suppresses a matching
active alert inside a 30-minute window and returns `{ duplicate: true }`.

## 1.6 System Functionality

> **[SCREENSHOT 3 — RESIDENT DASHBOARD]**
> *Where to capture:* `https://drtyovliurlkl.cloudfront.net/` → log in as a resident
> → resident dashboard showing regions colour-coded by risk level. This demonstrates
> the frontend origin and the live risk levels written by `fg-flood-forecast`.

> **[SCREENSHOT 4 — FLOOD REPORT WITH PHOTO UPLOAD]**
> *Where to capture:* Resident → *Submit Report* → attach a photo and submit. Capture
> the browser **DevTools → Network** tab alongside, showing the `POST /sl/uploads/presign`
> call followed by the direct `PUT` to the S3 hostname. This is the clearest single
> shot of the serverless upload path in action.

> **[SCREENSHOT 5 — S3 OBJECT TAGS]**
> *Where to capture:* AWS Console → S3 → `floodguard-uploads-292960609118` →
> `reports/` → select the object just uploaded → *Properties → Tags*. Show
> `verification = verified` and `detectedType = image/png`, written by
> `fg-image-process` — proof the S3 event trigger fired.

> **[SCREENSHOT 6 — ADMIN ALERTS]**
> *Where to capture:* Log in as an admin → *Alerts*. Show an alert generated by the
> pipeline rather than created by hand, and the region's risk level.

> **[SCREENSHOT 7 — DYNAMODB WEATHER SNAPSHOTS]**
> *Where to capture:* AWS Console → DynamoDB → Tables → `fg-weather-snapshots` →
> *Explore table items*. Show several snapshot items with `regionId`, `timestamp`
> and the `ttl` attribute.

\newpage

# 2. Result and Discussion

All figures below were measured on the live deployment on 25 August 2026 using an
automated verification and load-generation script (`infra/steps/63-verify.sh`),
which issues 240 requests across both the `/api` and `/sl` paths so that latency
percentiles are meaningful rather than idle.

## 2.1 End-to-End Verification

The verification script proves each hop of both pipelines rather than merely
asserting that resources exist. **All 18 checks passed.**

| Check | Result |
|---|---|
| CloudFront routes `/`, `/api/*`, `/sl/*` | 200 / 200 / 200 |
| `/api/internal/*` unauthenticated | **401** (correctly rejected) |
| `POST /sl/uploads/presign` valid / `.exe` rejected | 200 / **415** |
| `POST /sl/reports` invalid body / valid report | **400** / 201 |
| Real PNG uploaded → tagged | **verified** |
| Text file uploaded as `.png` → tagged | **rejected** |
| `fg-weather-ingest` invocation, failed regions | 200, **0 failed** |
| DynamoDB snapshots written | 3,472 → 3,482 |
| Both dead-letter queues | **empty** |
| Duplicate alert suppression | **held** |
| X-Ray traces recorded (15 min) | **441** |

## 2.2 CloudWatch Dashboard

A 14-widget dashboard (`FloodGuard-Task2`) is laid out along the request path: front
door → serverless pipeline → queue health → data tier → monolith, ending in a Logs
Insights table of recent pipeline errors across all six functions. All handlers emit
single-line JSON so structured fields are queryable.

**21 alarms** are configured, every one actioning the `fg-ops-alarms` SNS topic —
metrics without alarm actions is observation without response. All 21 were in **OK**
state at the time of measurement. The three that matter most:

- **DLQ not empty** — a message here has failed three attempts; otherwise this is
  silent data loss.
- **`ApproximateAgeOfOldestMessage` > 300s** — the honest backlog signal. Queue
  *depth* can look healthy while consumers fall behind on a large fast-moving queue.
- **Lambda `Throttles`** — concurrency exhaustion. A scaling signal, not a code bug.
  Section 2.5 shows this alarm earning its place.

> **[SCREENSHOT 8 — CLOUDWATCH DASHBOARD]**
> *Where to capture:* CloudWatch → Dashboards → **FloodGuard-Task2**, time range set
> to **1 hour** immediately after running `cd infra && ./deploy.sh 63` so the widgets
> contain load-test data. Take two shots (top half and bottom half) rather than one
> zoomed-out screenshot, so the axis labels remain readable.

> **[SCREENSHOT 9 — CLOUDWATCH ALARMS]**
> *Where to capture:* CloudWatch → *All alarms*, filtered by `fg-`. Show all 21
> alarms in **OK** state.

## 2.3 Measured Performance — Serverless Tier

Lambda metrics over a 30-minute window covering the load test:

| Function | Invocations | Errors | Avg (ms) | p95 (ms) | Max (ms) |
|---|---|---|---|---|---|
| `fg-upload-presign` | 245 | 0 | **13.1** | 96.2 | 117.9 |
| `fg-report-intake` | 4 | 0 | 277.7 | 551.0 | 552.3 |
| `fg-flood-forecast` | 12 | 0 | 466.9 | 968.6 | 988.5 |
| `fg-alert-dispatch` | 4 | 0 | 475.4 | 765.9 | 778.4 |
| `fg-image-process` | 2 | 0 | 557.5 | 772.2 | 778.5 |
| `fg-weather-ingest` | 5 | 0 | 1638.3 | 2194.8 | 2245.9 |

**API Gateway** (`fg-serverless-api`): 253 requests, average latency **59.6 ms**,
p95 **144.4 ms**, p99 **921.4 ms**, of which integration latency averaged 56.8 ms.

Two observations follow. First, the gap between average (13.1 ms) and p95 (96.2 ms)
for `fg-upload-presign` is **cold-start cost**: the warm path is single-digit
milliseconds and the tail is initialisation of new execution environments during the
burst. The same explains the 921 ms API Gateway p99 — integration latency averages
56.8 ms, so the request is not slow once an environment is warm. Provisioned
concurrency would remove this tail at a fixed hourly charge that intermittent
academic traffic does not justify.

Second, `fg-weather-ingest` is the slowest function at 1.6 s, but it is *supposed*
to be: it makes ten outbound HTTPS calls to Open-Meteo. That is precisely why scoring
was moved behind a queue — a synchronous design would have put those 1.6 s on the
user's request path.

## 2.4 Measured Performance — Server Tier and Data Stores

| Component | Metric | Value |
|---|---|---|
| ALB (monolith) | Requests / Target response time | 327 / **23.6 ms avg** |
| ALB | Target 2XX / 5XX | 321 / **0** |
| RDS PostgreSQL | CPU / Connections / Free storage | 4.3% / 0.4 / 17.1 GB |
| DynamoDB | Items / Size / Billing | 3,212 / 782 KB / On-demand |
| DynamoDB | Consumed write / read units | 60 / 418.5 |
| SNS | Messages published / failed | 1 / 0 |

The monolith's 23.6 ms average target response time against 4.3% database CPU shows
the server tier is comfortably under-utilised. This is the expected outcome of moving
the polling and scoring workload off it: in Task #1 that work ran in-process on the
same instances that served user requests.

> **[SCREENSHOT 10 — ELASTIC BEANSTALK HEALTH]**
> *Where to capture:* Elastic Beanstalk → Environments. Show both
> `floodguard-backend` and `floodguard-team-9-frontend` with **Green** health.

## 2.5 Performance Analysis: A Concurrency Limit Discovered Through Monitoring

The most useful result of this task came from monitoring rather than testing, and it
changed the deployed configuration.

The first load-test run returned **two HTTP 500s** out of 253 API Gateway requests.
X-Ray attributed the faults to the `fg-serverless-api/v1` stage, and the traces showed
a duration of **13 ms** with a Lambda segment containing no subsegments and no
application error — a genuine handler failure would have produced an error segment, so
the request never reached application code. The CloudWatch `Throttles` metric for
`fg-upload-presign` confirmed **2 throttles** in the same minute, and the account
quota gave the root cause:

```
$ aws lambda get-account-settings
ConcurrentExecutions: 10        UnreservedConcurrentExecutions: 10
```

This is a new account subject to a reduced quota of **10 concurrent Lambda
executions**, not the default 1,000. The load generator issued bursts of 12, so two
of every burst were rejected before invocation and surfaced as HTTP 500.

The architectural risk this exposed matters more than the failed test. Both SQS event
source mappings had **no concurrency cap**, so either consumer could occupy all 10
slots. A backlog on `fg-forecast-jobs` — a background job — would therefore starve
`fg-upload-presign` and `fg-report-intake` on the **public request path**: a shared
concurrency pool with no allocation lets a background workload hold a user-facing
endpoint hostage.

Two changes were made:

1. **Capped the queue consumers.** `MaximumConcurrency` was set to 3 on
   `fg-forecast-jobs` and 2 on `fg-alert-dispatch`, reserving the remaining 5 slots
   for the synchronous path. The queue absorbs any backlog, which is precisely its
   purpose. `ScalingConfig` was chosen over reserved concurrency deliberately: with
   an account limit of exactly 10, Lambda will not permit reserved concurrency to be
   allocated at all.
2. **Bounded the load generator** to 8 concurrent requests, below the quota, so the
   test measures the system's latency rather than the account's quota.

**Result.** The subsequent run issued 117 presign invocations with **zero throttles
and zero 5XX responses**, confirmed at per-minute resolution:

| Run | Presign invocations | Throttles | API GW 5XX |
|---|---|---|---|
| Before fix (burst 12) | 118 | **2** | **2** |
| After fix (burst 8) | 117 | **0** | **0** |

The functional tests passed in *both* runs; only the metrics distinguished "working"
from "working, and able to survive a busy queue".

## 2.6 AWS X-Ray

Active tracing is enabled on all six functions, the API Gateway stage and the NestJS
monolith. The monolith required explicit instrumentation (`aws-xray-sdk-express`):
Elastic Beanstalk's `XRayEnabled` option starts the X-Ray *daemon*, which forwards
segments but does not create them, so that option alone yields an empty service map.
Instrumentation is fail-open, and health checks are sampled at 1% so ALB probes do not
dominate trace volume. **441 traces** were recorded in 15 minutes:

| Node | Type | OK | Faults |
|---|---|---|---|
| `fg-serverless-api/v1` | API Gateway Stage | 120 | 2 (throttles, §2.5) |
| `fg-upload-presign` | Lambda | 120 | 0 |
| `fg-flood-forecast` | Lambda | 8 | 0 |
| `fg-report-intake` | Lambda | 2 | 0 |
| `fg-weather-ingest` | Lambda | 6 | 0 |
| `fg-alert-dispatch` | Lambda | 1 | 0 |
| `floodguard-backend` | NestJS monolith | 268 | 0 |

Because both tiers report into one account, a single map covers the monolith and the
serverless tier — which is why the throttling in §2.5 was attributed to the API
Gateway stage rather than the handler within minutes.

> **[SCREENSHOT 11 — X-RAY SERVICE MAP]**
> *Where to capture:* CloudWatch → X-Ray traces → **Service map**, time range
> **last 1 hour**, immediately after running `./deploy.sh 63`. Ensure the map shows
> the API Gateway stage node, the Lambda nodes and the `floodguard-backend` node
> together.

> **[SCREENSHOT 12 — X-RAY TRACE DETAIL]**
> *Where to capture:* X-Ray → *Traces* → open any `POST /sl/uploads/presign` trace →
> the timeline view showing the API Gateway segment and the Lambda subsegments with
> their durations. A trace showing an `Initialization` subsegment illustrates the
> cold-start cost discussed in §2.3.

## 2.7 Discussion

**Scalability.** Each stage now scales on its own signal — ingestion with the
schedule, scoring with queue depth, alert dispatch with triggered alerts — rather than
by adding whole application instances. The measured server tier utilisation (4.3%
database CPU, 23.6 ms response time) is the evidence the offload worked.

**Flexibility.** The queue boundary lets the scoring algorithm be redeployed without
touching the monolith or the API: messages accumulate during a deployment and drain
afterwards, and no request is lost.

**Reliability.** Across the measurement window, SQS `sent = received = deleted` on
both work queues (60/60/60 and 4/4/4) with both DLQs empty — no message was lost and
none required redrive. Partial batch failure reporting, the 30-minute alert
deduplication window, and content verification on upload were each verified
explicitly rather than assumed.

**Limitations.** Three are worth stating honestly. The 10-execution quota is a hard
ceiling on this account; §2.5 manages it but does not remove it, and production would
request an increase. RDS is single-AZ and publicly accessible so migrations can be run
from a developer machine — acceptable for assessment, not production, though the
two-AZ subnet group makes Multi-AZ a single API call away. Finally, cold starts
dominate the p99, an inherent trade-off of on-demand serverless.

\newpage

# 3. Reflection From Each Member

**Ashok Bhattrai (M1) — Weather ingestion & forecasting, S3, IAM.**
In Task #1 I built the weather and forecast modules as NestJS services running
inside the monolith, and the hardest part of Task #2 was accepting that a working
`@Cron` was actually a design flaw. `@nestjs/schedule` runs on every instance, so the
moment the environment autoscaled, every flood alert would have been sent twice. That
was invisible to us until we tried to move the trigger to EventBridge. The lesson I
took away is that "it works in production today" and "it is correct" are different
claims. Writing one IAM role per function was more tedious than writing one shared
role, but seeing why — that a shared role would let the unauthenticated report
endpoint publish alerts to every subscriber — made least privilege concrete rather
than a phrase from a lecture.

**Samir Pokhrel (M2) — Report/upload microservices, API Gateway, CloudFront, VPC.**
Extracting the presigned-upload logic out of `uploads.service.ts` into
`fg-upload-presign` was the point where microservices stopped being an abstraction
for me. My biggest realisation came from the CloudFront routing: in Task #1 we ran
three distributions on separate hostnames, which forced CORS configuration and a
frontend rebuild every time a domain changed. Collapsing them into one distribution
with three path-routed origins removed an entire category of bug. I also learned that
a presigned URL is not a security control — it pins a `Content-Type` but S3 never
checks the bytes — which is why `fg-image-process` sniffs the magic number. Testing
that by uploading a text file renamed `.png` and watching it come back tagged
`rejected` was the most satisfying moment of the project.

**Anjali Misra (M3) — Alert fan-out, SNS, CloudWatch alarms & dashboard.**
I owned the monitoring requirement, and I began by treating it as a reporting
exercise: build the dashboard, take the screenshots. What changed my mind was the
throttling incident. Every functional test passed, and the system looked healthy;
only the `Throttles` metric and an X-Ray trace with an empty Lambda segment revealed
that a background queue could starve our public API. I had built that alarm without
really believing it would fire. The other thing I learned is that a metric without an
alarm action is just a chart — so all 21 alarms publish to an SNS topic. Choosing
`ApproximateAgeOfOldestMessage` over queue depth was a similar lesson: depth looks
fine on a fast-moving queue even while consumers fall behind.

**Sangita Tamang (M4) — Internal service API, RDS, SQS reliability, X-Ray.**
My contribution was the boundary between the two tiers: the `/api/internal/*` surface
the Lambdas call instead of connecting to Postgres directly. Arguing for that
constraint was difficult, because connecting to RDS from Lambda seemed simpler. What
settled it was cost and security together — a VPC-attached function needs a NAT
Gateway at about \$32/month, and a non-VPC function has no static IP, so the
alternative was opening port 5432 to `0.0.0.0/0`. Implementing idempotency taught me
the most. SQS is at-least-once, so I had assumed retries were harmless until I
realised a redelivered message would notify every resident in a region a second time.
The 30-minute deduplication window, and a test that sends the same message twice and
asserts one alert, is the piece of this project I am most confident in.

\newpage

# 4. New Workload Table Matrix

| Member | Task #1 Contribution | Task #2 Contribution | AWS Services Owned |
|---|---|---|---|
| **M1 — Ashok Bhattrai** | Weather dashboard & interactive risk map; flood forecast module; `weather`, `regions`, `flood-forecast` backend modules; resident awareness pages (~2,000 LOC) | `fg-weather-ingest` and `fg-flood-forecast` Lambdas; Open-Meteo integration; DynamoDB time-series schema with 30-day TTL; per-function IAM roles; EventBridge Scheduler | S3, IAM, DynamoDB, EventBridge |
| **M2 — Samir Pokhrel** | Flood report system & SOS requests; `reports`, `flood-requests`, `uploads` modules; presigned S3 upload flow; resident action pages (~1,900 LOC) | `fg-report-intake`, `fg-upload-presign`, `fg-image-process` Lambdas; API Gateway REST v1 configuration; single-distribution CloudFront path routing; magic-number content verification | API Gateway, CloudFront, VPC, S3 (uploads) |
| **M3 — Anjali Misra** | Alert system & region management; admin dashboard; `alerts` module and region CRUD; admin review pages (~2,100 LOC) | `fg-alert-dispatch` Lambda; SNS topic design (public alerts vs ops alarms); 21 CloudWatch alarms; 14-widget dashboard; Logs Insights error queries; throttling analysis | SNS, CloudWatch, Elastic Beanstalk, Security Groups |
| **M4 — Sangita Tamang** | Volunteer request response; user & authentication system; `auth`, `users`, `evacuation` modules; Prisma schema and migrations (~2,200 LOC) | `/api/internal/*` service API and `InternalKeyGuard`; SQS queue and DLQ topology with redrive policies; partial batch failure handling; alert idempotency; X-Ray instrumentation of the monolith | RDS, SQS, Secrets Manager, X-Ray |

**Shared team activities.** Architecture review of the proposed Task #2 design;
end-to-end verification script; final report and demonstration.

\newpage

# 5. References

Amazon Web Services. (2025a). *AWS Lambda developer guide: Lambda function scaling*.
https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html

Amazon Web Services. (2025b). *AWS Lambda developer guide: Using Lambda with Amazon
SQS*. https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html

Amazon Web Services. (2025c). *AWS X-Ray developer guide: Tracing user requests to
REST APIs*.
https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-xray.html

Amazon Web Services. (2025d). *Amazon CloudWatch user guide: Using Amazon CloudWatch
alarms*.
https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html

Amazon Web Services. (2025e). *Amazon S3 user guide: Configuring event notifications*.
https://docs.aws.amazon.com/AmazonS3/latest/userguide/NotificationHowTo.html

Amazon Web Services. (2025f). *Amazon SQS developer guide: Amazon SQS dead-letter
queues*.
https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html

Amazon Web Services. (2025g). *AWS Well-Architected Framework: Reliability pillar*.
https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html

Newman, S. (2021). *Building microservices: Designing fine-grained systems* (2nd ed.).
O'Reilly Media.

Open-Meteo. (2025). *Free weather API documentation*. https://open-meteo.com/en/docs

Richardson, C. (2018). *Microservices patterns: With examples in Java*. Manning
Publications.

Sbarski, P., & Kroonenburg, S. (2017). *Serverless architectures on AWS: With examples
using AWS Lambda*. Manning Publications.

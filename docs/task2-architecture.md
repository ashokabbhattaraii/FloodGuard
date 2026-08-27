# FloodGuard — Task #2 Architecture

Serverless and microservices extension of the Task #1 server-based system, with
CloudWatch and X-Ray observability.

**Region:** `us-east-1` · **Account:** `292960609118`

> Task #1 ran in account `679777944150`, whose free trial was expiring. The whole
> stack was rebuilt here, so Task #1 and Task #2 now share one account, one
> CloudWatch view and one X-Ray service map.

---

## 1. Validation of the proposed design

The initial architecture diagram was reviewed against the actual codebase before
implementation. It was directionally right — Lambda, SQS, SNS, S3, DynamoDB,
EventBridge, CloudWatch, X-Ray — but a number of items would not have worked as
drawn. Each is recorded with what was done instead.

### 1.1 Factual corrections

| Diagram said | Reality |
|---|---|
| Elastic Beanstalk — Backend **(Next.js)** | Backend is **NestJS 11** (`nest build`, `dist/src/main.js`). Only the frontend is Next.js. |
| RDS **Multi-AZ standby**, in private subnets | Task #1 ran **single-AZ, publicly accessible, public subnets**. Multi-AZ is not free-tier; private subnets would require a NAT Gateway. Kept single-AZ; the DB subnet group still spans 2 AZs so Multi-AZ is one `modify-db-instance` away. |
| "Prima-TLS", "prssigned", "live risk toads" | Typos for Prisma / presigned / loads. |
| `fg-pport-verify` | Not a resolvable name. Replaced with two well-defined functions: `fg-report-intake` and `fg-upload-presign`. |
| `ap-southeast-1` in `backend/.env` | Stale. Everything real is `us-east-1`. |

### 1.2 Structural corrections

**API Gateway was in the wrong place.** As drawn it sat in "Public Entry Points"
with arrow ③ pointing at the Elastic Beanstalk backend, behind a CloudFront
distribution that already terminated TLS and routed to the same ALB. That is an
extra hop with no capability added, and it meant no part of the system was actually
made serverless — every request still landed on the monolith.

API Gateway now fronts the Lambda functions, which is what makes them independently
addressable microservices rather than internal background jobs.

**EventBridge → SQS was backwards.** A scheduled tick has no per-message work to
distribute; there is nothing in the queue yet to fan out. The correct chain is
`Scheduler → Lambda → SQS (one message per region) → Lambda`.

**"SQS + DLQ" as one box hid the design.** A DLQ is a separate queue reached via a
redrive policy, and this pipeline needs two work queues. The redrive policy is the
resilience mechanism, so it is modelled explicitly: 4 queues, `maxReceiveCount: 3`.

**S3 had no trigger.** It was drawn as a passive sink. An `ObjectCreated:*`
notification now invokes `fg-image-process` — uploading a photo *is* the trigger.

**DynamoDB duplicated RDS.** "Live risk levels" already live in Postgres
(`flood-forecast.service.ts` writes `region.riskLevel`), so a second copy would be
a dual-write with no owner. DynamoDB was instead given a job Postgres is worse at:
append-only weather time-series with a 30-day TTL.

**CloudWatch had no alarm actions.** Metrics without alarms is observation without
response. 21 alarms now action an SNS topic.

### 1.3 Two defects the design would have introduced

**Duplicate flood alerts.** `flood-monitor.scheduler.ts` already ran
`@Cron(EVERY_10_MINUTES)` calling `monitorAllRegions()`, which auto-creates alerts
and mutates region risk. Adding an EventBridge-triggered Lambda doing the same
would fire every alert twice, to real subscribers.

This was *already* latent: `@nestjs/schedule` runs on **every** instance, and
`.ebextensions/env.config` pinned only instance *type*, never `MinSize`/`MaxSize`.
The first autoscale event would have doubled alerts in Task #1. Moving the trigger
to EventBridge fixes a live bug; the in-process cron is now gated behind
`FLOOD_MONITOR_ENABLED` (default `false`).

**Committed secrets.** `.ebextensions/env.config` contained the live RDS password
and `JWT_SECRET`, committing them to git history. Credentials are now generated into
Secrets Manager and injected at deploy time.

### 1.4 REST API, not HTTP API

The diagram specified API Gateway **HTTP API**, which does not support X-Ray — only
REST API (v1) emits trace segments. Since X-Ray is a named requirement, REST v1 was
used. The service map consequently includes an `AWS::ApiGateway::Stage` node
(`fg-serverless-api/v1`); with HTTP API that node would simply be absent. The cost
difference ($3.50 vs $1.00 per million requests) is immaterial at this scale.

---

## 2. Implemented architecture

### 2.1 Single front door

One CloudFront distribution, path-routed to three origins. Task #1 used *three*
distributions on separate hostnames, which forced CORS configuration and a frontend
rebuild whenever a domain changed.

```
                          ┌─────────────────────────┐
  Residents / Volunteers  │   CloudFront (HTTPS)    │
  Admins / Public ───────►│  one hostname           │
                          └───────────┬─────────────┘
                    ┌─────────────────┼──────────────────┐
                    │                 │                  │
              /*  and              /api/*             /sl/*
        /_next/static/*               │                  │
                    ▼                 ▼                  ▼
          ┌──────────────┐   ┌────────────────┐  ┌──────────────────┐
          │ EB Frontend  │   │  EB Backend    │  │  API Gateway     │
          │ Next.js 16   │   │  NestJS 11     │  │  REST v1, X-Ray  │
          │ SingleInst.  │   │  ALB + ASG     │  └────────┬─────────┘
          └──────────────┘   └────────┬───────┘           │
                                      │ TLS 5432   ┌──────┴────────────┐
                                      ▼            ▼                   ▼
                            ┌──────────────┐  fg-report-intake  fg-upload-presign
                            │ RDS Postgres │           │                │
                            │ 16.10 t3.micro│          │                ▼
                            └──────▲───────┘           │        ┌──────────────┐
                                   │                   │        │ S3 uploads   │
                          /api/internal/* (shared key) │        └──────┬───────┘
                                   │                   │               │ ObjectCreated
                                   └───────────────────┘               ▼
                                                              fg-image-process
```

Because the frontend calls the relative path `/api`, every request is same-origin:
no CORS preflight anywhere, and no rebuild when a domain changes.

### 2.2 Event-driven pipeline

```
EventBridge Scheduler  rate(10 minutes)
        │
        ▼
  fg-weather-ingest ──── Open-Meteo API (48h hourly precipitation)
        │
        ├──► DynamoDB  fg-weather-snapshots   (1 item/region, TTL 30d)
        │
        └──► SQS  fg-forecast-jobs  (1 message per region)  ──┐
                        │ maxReceiveCount 3                    │
                        ▼                                      ▼
                fg-forecast-jobs-dlq              fg-flood-forecast  (batch 5)
                                                          │
                                    risk score = weather(0-40)
                                                + sensors(0-40)
                                                + geographic(0-20)
                                                          │
                                     ┌────────────────────┴──────────┐
                                     ▼                               ▼
                        POST /api/internal/regions/:id/risk   score >= 70?
                                     │                               │
                                     ▼                               ▼
                              RDS region.riskLevel        SQS fg-alert-dispatch
                                                                     │
                                                                     ▼
                                                          fg-alert-dispatch (batch 1)
                                                                     │
                                          ┌──────────────────────────┴────────┐
                                          ▼                                   ▼
                            POST /api/internal/alerts              SNS fg-flood-alerts
                            (Alert row + resident                  (email / SMS fan-out)
                             notifications, deduped)
```

### 2.3 Microservices boundary

**The Lambda functions never open a connection to Postgres.** The monolith owns
RDS; the serverless tier owns DynamoDB and S3; they communicate over SQS and an
authenticated internal HTTP API (`InternalKeyGuard`, constant-time key comparison).

This is the no-shared-database boundary, and it has three concrete consequences:

1. **No NAT Gateway.** `fg-weather-ingest` needs outbound internet for Open-Meteo. A
   VPC-attached function would need a NAT Gateway at ~$32/month; interface endpoints
   for SQS and SNS would be ~$15/month. Outside the VPC, both are $0.
2. **RDS stays closed.** Non-VPC Lambdas have no static IP, so a direct-connection
   design would have forced `0.0.0.0/0` on port 5432. The security group allows only
   the EB security group and the operator's `/32`.
3. **One writer per datastore.** No dual-write consistency problem.

### 2.4 Function inventory

| Function | Trigger | Owns | Purpose |
|---|---|---|---|
| `fg-weather-ingest` | EventBridge, 10 min | DynamoDB, SQS | Fetch Open-Meteo per region, snapshot, fan out |
| `fg-flood-forecast` | SQS `fg-forecast-jobs` | — | Risk scoring, ported verbatim from the monolith |
| `fg-alert-dispatch` | SQS `fg-alert-dispatch` | SNS | Create alert (deduped), publish fan-out |
| `fg-report-intake` | API GW `POST /sl/reports` | — | Public, unauthenticated flood report intake |
| `fg-upload-presign` | API GW `POST /sl/uploads/presign` | S3 | Presigned PUT — extracted from `uploads.service.ts` |
| `fg-image-process` | S3 `ObjectCreated:*` | S3 | Magic-number content verification, tagging |

Each has its **own** least-privilege execution role. A single shared role would give
`fg-report-intake` — the only unauthenticated write in the system — permission to
publish flood alerts to every subscriber.

### 2.5 Reliability mechanisms

**Partial batch failure.** SQS event source mappings use
`ReportBatchItemFailures`, and the handlers return `batchItemFailures`. Without it a
single poison message forces redelivery of its nine healthy batch-mates.

**Idempotency.** SQS is at-least-once, so a redelivered alert must not notify every
resident twice. `InternalService.createAlert` suppresses a matching active alert
inside a 30-minute window and returns `{ duplicate: true }`. Verified by sending the
same message twice: the second logs `duplicate suppressed` and the alert count stays
at 1.

**Content verification.** A presigned URL pins a `Content-Type`, but S3 does not
verify the bytes match. `fg-image-process` reads the magic number and tags the object
`verified`/`rejected`; a rejected photo is cleared from the report so the admin UI
never renders it. Verified with a real PNG and a text file renamed `.png`.

**Concurrency allocation.** This account's Lambda quota is 10 concurrent executions
(new-account limit, not the default 1000). Both SQS mappings were initially uncapped,
so either consumer could occupy all 10 slots and starve the synchronous endpoints —
API Gateway surfaces a throttled function as HTTP 500. `MaximumConcurrency` is now 3
on `fg-forecast-jobs` and 2 on `fg-alert-dispatch`, reserving 5 slots for the request
path. Found via CloudWatch `Throttles` plus an X-Ray trace whose Lambda segment was
empty at 13 ms — the signature of a rejection before invocation.

**Visibility timeout = 6× function timeout**, so SQS cannot redeliver a message that
is still being processed.

---

## 3. Monitoring

### 3.1 CloudWatch

A 14-widget dashboard (`FloodGuard-Task2`) laid out along the request path: front
door → serverless pipeline → queue health → data tier → monolith, ending in a Logs
Insights table of recent pipeline errors across all six functions.

21 alarms, all actioning the `fg-ops-alarms` SNS topic. The three that matter most:

- **DLQ not empty** — a message here failed 3 attempts. Silent data loss otherwise.
- **`ApproximateAgeOfOldestMessage` > 300s** — the honest backlog signal. Queue
  *depth* looks fine when consumers keep up with a large but fast-moving queue.
- **Lambda `Throttles`** — concurrency exhausted; a scaling signal, not a code bug.

All handlers emit single-line JSON so Logs Insights can query structured fields.

### 3.2 X-Ray

Active tracing on all six functions and on the API Gateway stage. The monolith is
instrumented with `aws-xray-sdk-express` (`src/common/xray.ts`); EB's
`XRayEnabled` option only starts the *daemon*, which forwards segments but does not
create them.

Instrumentation is fail-open: tracing is observability, not functionality, so a
missing SDK or unreachable daemon logs a warning and the API keeps serving. Health
checks are sampled at 1% so ALB probes do not dominate trace volume.

---

## 4. Verification

`infra/steps/63-verify.sh` proves each hop rather than merely asserting resources
exist, then generates load so latency percentiles are meaningful. Checks:

1. All three CloudFront paths route correctly
2. `/api/internal/*` returns 401 without the shared key
3. Serverless endpoints accept valid input and reject invalid (400/415)
4. Scheduled pipeline: ingest → DynamoDB → SQS → scoring → RDS
5. Both DLQs are empty
6. Duplicate alert suppression holds
7. Upload pipeline end to end: presign → S3 PUT → event → magic-number sniff → tag
8. Load generation across `/api` and `/sl` (burst held under the concurrency quota)
9. X-Ray traces recorded

Run with `cd infra && ./deploy.sh 63`.

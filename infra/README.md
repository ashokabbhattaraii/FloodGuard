# FloodGuard — Infrastructure & Deployment

One command deploys everything. Every step is **idempotent**: re-running converges
on the desired state instead of creating duplicates, so any team member can run
any step at any time without coordinating.

```bash
cd infra
./deploy.sh list        # every step, and whether it has run
./deploy.sh all         # full stack, in order
./deploy.sh phase1      # Task #1 stack: network → data → compute → CDN
./deploy.sh phase2      # Task #2 serverless: DynamoDB/SQS/SNS/Lambda/API GW/EventBridge
./deploy.sh phase3      # monitoring: alarms, dashboard, verification
./deploy.sh 30 44       # specific steps by number
./deploy.sh outputs     # every endpoint and resource id
./teardown.sh --dry-run # what a teardown would delete
```

## Prerequisites

```bash
aws sts get-caller-identity     # must return account 292960609118
```
Tools: `aws` v2, `jq`, `zip`, `curl`, `psql`, `node`, `npm`, `pnpm`.

Optional — receive alerts and alarms by email:
```bash
export FG_ALERT_EMAIL=you@example.com   # then ./deploy.sh 42 and confirm the email
```

## Layout

| Path | Purpose |
|---|---|
| `config.env` | Every resource name and sizing knob. Safe to commit — no secrets. |
| `deploy.sh` | Orchestrator. Resolves steps, runs them, records progress. |
| `teardown.sh` | Reverse-order destroy. Deliberately **not** in `steps/` so `all` can't run it. |
| `lib/common.sh` | Logging, state, idempotency helpers, `ERR` trap. |
| `lib/eb.sh` | Elastic Beanstalk option-settings and versioning helpers. |
| `steps/NN-*.sh` | One step per concern, ordered by number. |
| `lambdas/` | Lambda source. `_shared/common.mjs` is copied into every bundle. |
| `.state/resources.env` | Generated resource ids. **Gitignored** — contains ARNs. |
| `build/` | Bundles and generated JSON. Gitignored. |

## Steps

**Phase 1 — Task #1 stack**

| Step | What | Notes |
|---|---|---|
| `10-network` | VPC, IGW, 2 public subnets, route table | 2 AZs is mandatory for an RDS subnet group |
| `11-security-groups` | Tiered SGs | RDS `5432` open only to the EB SG + your IP — never `0.0.0.0/0` |
| `12-iam` | EB service role + instance profile | Includes X-Ray and CloudWatch agent policies |
| `20-secrets` | Generates DB password, JWT secret, internal API key | Written to Secrets Manager, never printed or committed |
| `21-rds` | PostgreSQL 16.10, `db.t3.micro`, single-AZ | ~7 min. Publicly accessible so `prisma db push` runs locally |
| `22-s3` | `uploads` + `artifacts` buckets | Private, encrypted; CORS on uploads for presigned PUT |
| `23-database` | `prisma db push` + seed | Run from your machine, never on the instance |
| `30-eb-backend` | NestJS API, LoadBalanced | Pre-built artifact. Sets `FLOOD_MONITOR_ENABLED=false` |
| `31-eb-frontend` | Next.js, SingleInstance | **npm, not pnpm** — see below |
| `32-cloudfront` | Single distribution, path-routed | `/` → frontend, `/api/*` → backend |

**Phase 2 — Task #2 serverless**

| Step | What | Notes |
|---|---|---|
| `40-dynamodb` | `fg-weather-snapshots` | Time-series, 30-day TTL — not a duplicate of RDS |
| `41-sqs` | 2 work queues + 2 real DLQs | `maxReceiveCount: 3`, visibility 6× function timeout |
| `42-sns` | `fg-flood-alerts`, `fg-ops-alarms` | Separate topics: public fan-out vs team alarms |
| `43-lambda-iam` | One least-privilege role **per function** | So the public intake endpoint can't publish alerts |
| `44-lambdas` | Builds + deploys 6 functions | X-Ray active; SQS mappings use partial-batch failure and a concurrency cap |
| `45-apigateway` | REST API v1, stage `v1` | v1 not v2 — **HTTP APIs don't support X-Ray** |
| `46-eventbridge` | Scheduler → `fg-weather-ingest`, 10 min | Replaces the in-process cron |
| `47-s3-trigger` | `ObjectCreated:*` on `reports/` → `fg-image-process` | Upload *is* the trigger |
| `48-cloudfront-serverless` | Adds `/sl/*` → API Gateway | Completes the single front door |

**Phase 3 — Monitoring**

| Step | What |
|---|---|
| `61-cloudwatch-alarms` | 21 alarms → `fg-ops-alarms` |
| `62-cloudwatch-dashboard` | 14-widget dashboard following the request path |
| `63-verify` | End-to-end checks + load generation for latency percentiles |

## Request routing

One hostname, three origins — no CORS anywhere:

```
https://<distribution>/            → EB frontend (Next.js)
https://<distribution>/_next/static/*  → EB frontend, cached immutably
https://<distribution>/api/*       → EB backend  (NestJS monolith, owns Postgres)
https://<distribution>/sl/*        → API Gateway → Lambda (owns DynamoDB + S3)
```

## Design decisions worth knowing

**Lambdas never connect to Postgres.** The monolith owns RDS; the functions own
DynamoDB and S3 and write through `/api/internal/*` with a shared key. This is what
keeps them outside the VPC — `fg-weather-ingest` needs outbound internet for
Open-Meteo, and a VPC-attached function would need a NAT Gateway (~$32/mo). It also
lets the RDS security group stay closed to everything but the EB SG.

**`FLOOD_MONITOR_ENABLED=false` is load-bearing.** `@nestjs/schedule` runs its cron
on *every* instance, so the first autoscale event doubles every flood alert.
EventBridge fires once regardless of fleet size. Running both at once double-fires
immediately.

**SQS consumers are capped below the account concurrency quota.** This account
allows **10** concurrent Lambda executions, not the default 1000. An uncapped SQS
event source mapping scales out until it owns all of them, so a forecast backlog
would starve `fg-upload-presign` and `fg-report-intake` on the public request path —
API Gateway returns 500 when a function is throttled. `MaximumConcurrency` is 3 on
`fg-forecast-jobs` and 2 on `fg-alert-dispatch`, leaving 5 slots for the request
path. `ScalingConfig` rather than reserved concurrency: with an account limit of
exactly 10, Lambda will not let you reserve any.

**Backend LoadBalanced, frontend SingleInstance.** The free tier covers 750 ALB
hours/month — one continuously-running ALB. It is spent on the API tier; CloudFront
already fronts the web tier.

**Frontend must be built with npm.** `output: 'standalone'` traces dependencies into
`.next/standalone/node_modules`. pnpm's symlinked store reproduces its own layout,
and transitive-only packages (`@swc/helpers`, pulled in by SWC transform output)
never get a top-level entry — the instance then dies with
`Cannot find module '@swc/helpers/_/_interop_require_default'`, surfacing as a bare
nginx 502. Step 31 asserts the module resolves before shipping.

**`NEXT_PUBLIC_*` is inlined at build time.** Setting `NEXT_PUBLIC_API_URL` as a
runtime EB env var does nothing for browser code. Step 31 exports it before
`next build`, using the relative `/api` so no rebuild is needed if a domain changes.

## Secrets

Generated by step 20 into Secrets Manager under `floodguard/app`, then injected as
EB environment properties at deploy time. Nothing sensitive is committed.

```bash
aws secretsmanager get-secret-value --secret-id floodguard/app --query SecretString --output text | jq
```

> Task #1 committed the live RDS password and `JWT_SECRET` in
> `backend/.ebextensions/env.config`. Those values are in git history and are
> **invalid in this account** — the new credentials were generated fresh.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `prisma` commands time out locally | Your ISP changed your IP. `./deploy.sh 11` re-adds it. |
| A step fails with no message | The `ERR` trap prints file, line and command. `rc 141` = SIGPIPE from `cmd \| head`. |
| Step fails right after creating a role | IAM is eventually consistent; steps 43/45/46 retry. Just re-run. |
| Frontend 502, environment Red | pnpm-linked `node_modules`. `rm -rf frontend/node_modules && ./deploy.sh 31` |
| Alerts arriving twice | `FLOOD_MONITOR_ENABLED` is `true` somewhere, or the schedule and cron are both on. |
| API GW 500s under load, empty Lambda segment in X-Ray | Concurrency throttle, not a code bug. Check `Throttles`; keep bursts under 10. |
| DLQ alarm fired | `aws sqs receive-message --queue-url <dlq>` to read the poison message. |
| No X-Ray backend segments | Check `[XRay]` in `web.stdout.log` via the **bundle** log (the tail window is too short). |

## Cost

Within the 12-month free tier: EC2 `t3.micro`/`t3.small` hours, 750 ALB hours,
`db.t3.micro` + 20 GB, 1 M Lambda requests, 1 M API Gateway calls, 25 GB DynamoDB,
1 M SQS requests, 50 GB CloudFront.

Outside it: Secrets Manager ~$0.40/secret/month, and CloudWatch alarms beyond the
first 10 at $0.10 each (this stack creates 21).

Run `./teardown.sh` when the project is assessed. CloudFront must be disabled before
it can be deleted; the script prints the follow-up command.

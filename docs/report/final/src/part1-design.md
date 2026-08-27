# Introduction

Flooding is among the most destructive recurring natural hazards, and the interval
between a rising river and a warned population is often measured in minutes rather
than hours. FloodGuard addresses Problem Background 4 by providing a cloud-native
early warning and emergency response platform for residents, volunteers, and
municipal authorities. Task 1 delivered a working server-based implementation of
that platform. Task 2, documented in this report, extends it with a serverless,
event-driven tier, refactors the background processing into independently
deployable microservices, and adds the monitoring instrumentation needed to
evaluate the result.

The report has three objectives. First, it summarises the system inherited from
Task 1 and states precisely how the architecture was expanded and why. Second, it
documents the implementation of the serverless components and of the microservices
that consume Amazon Simple Storage Service (S3), Amazon Simple Notification Service
(SNS), and Amazon Simple Queue Service (SQS). Third, it presents monitoring evidence
gathered from Amazon CloudWatch and AWS X-Ray and discusses what that evidence
reveals about the performance of the expanded system. Every resource described was
deployed to a single AWS account in the us-east-1 region and verified live before
this report was written.

## Task 1 Existing System Summary

Task 1 produced a two-tier server-based deployment. A Next.js frontend and a NestJS
application server were each hosted on AWS Elastic Beanstalk, backed by a single
Amazon Relational Database Service (RDS) instance running PostgreSQL 16. Three
separate Amazon CloudFront distributions fronted the deployment.

All background processing ran inside the application server. Weather polling, flood
risk scoring, and alert creation were executed by an in-process scheduled task. The
design was functional but structurally constrained in three respects: background
work competed with user requests for the same compute resources, the scheduled task
could not scale independently of the web workload, and the scheduler would have
produced duplicate alerts had the environment ever scaled beyond one instance.
Table 1 summarises the inherited components.

::: {custom-style="FigNum"}
Table 1
:::

::: {custom-style="FigTitle"}
Components Inherited From the Task 1 Server-Based Deployment
:::

| Tier | Service | Configuration | Responsibility |
|---|---|---|---|
| Presentation | Elastic Beanstalk | Next.js 16, single instance | Server-rendered web interface |
| Application | Elastic Beanstalk | NestJS 11, load balanced | Business logic and REST interface |
| Data | Amazon RDS | PostgreSQL 16.10, db.t3.micro | Relational persistence |
| Delivery | Amazon CloudFront | Three distributions | Transport security and caching |
| Scheduling | In-process cron | Ten-minute interval | Weather polling and alerting |

::: {custom-style="APANote"}
*Note.* The scheduling row identifies the only component wholly replaced in Task 2. All other rows were retained and extended rather than rebuilt.
:::

## Proposed Cloud Architecture

The architecture proposed for Task 2 introduces a serverless tier alongside the
retained server tier, on the principle that workloads with different scaling
characteristics should not share a compute boundary. Scheduled ingestion, risk
scoring, and notification fan-out are episodic and bursty, whereas the web and
application tiers serve steady interactive traffic. Separating them allows each to
scale on its own signal, which Newman (2021) identified as the primary operational
benefit of service decomposition.

The design consolidates the three CloudFront distributions into one distribution
with path-based routing to three origins. It places Amazon API Gateway in front of
a set of AWS Lambda functions rather than in front of the existing application
server, because only that arrangement makes the functions independently addressable
services. It introduces Amazon DynamoDB for append-only weather time-series data,
SQS for decoupling the processing stages, and SNS for alert fan-out. Figure @REF(as-built-architecture)
presents the resulting architecture as deployed.

::: {custom-style="FigNum"}
Figure @FIG(as-built-architecture)
:::

::: {custom-style="FigTitle"}
FloodGuard Task 2 As-Built Cloud Architecture
:::

::: {custom-style="FigImage"}
![](figures/as-built-architecture.png){width=AUTO}
:::

::: {custom-style="APANote"}
*Note.* The diagram was generated from the deployed resource inventory rather than from the design proposal, so every component shown corresponds to a provisioned resource. Solid arrows denote synchronous request flow and dashed arrows denote authenticated service-to-service calls.
:::

## Changes Made to the Architecture

Reviewing the proposed design against the Task 1 codebase before implementation
identified several elements that would not have worked as first drawn. Each was
corrected, and those corrections constitute the substantive architectural change
between the two tasks. Table 2 records them.

::: {custom-style="FigNum"}
Table 2
:::

::: {custom-style="FigTitle"}
Architectural Changes Between Task 1 and Task 2
:::

| Element | Issue identified | Resolution |
|---|---|---|
| Gateway placement | Positioned in front of Elastic Beanstalk, adding a network hop without adding capability, so no request would ever reach a function | API Gateway placed in front of the Lambda functions |
| Gateway protocol | HTTP APIs emit no X-Ray trace segments, and tracing evidence is required by this task | REST API version 1 selected, which emits trace segments |
| Trigger chain | EventBridge was drawn as publishing directly to SQS, but a scheduled tick carries no per-item work to distribute | Reordered to EventBridge, then Lambda, then SQS, then Lambda |
| Queue topology | Work queue and dead-letter queue were drawn as one component, concealing the redrive mechanism | Four queues provisioned: two work queues and two dead-letter queues |
| S3 integration | S3 was drawn as a passive store with no event wiring | Object-created notification invokes an image verification function |
| DynamoDB purpose | Intended to hold live risk levels already authoritative in PostgreSQL, creating a dual write with no owner | Repurposed for append-only weather time series with a 30-day expiry |
| Database exposure | Multi-availability-zone deployment in private subnets exceeded the available budget and required a network address translation gateway | Single availability zone retained, with a two-zone subnet group so promotion remains one API call |

::: {custom-style="APANote"}
*Note.* Every resolution listed was implemented and verified rather than proposed. The protocol decision recorded in the second row is discussed further under Stage Deployment and Tracing.
:::

Two latent defects in the inherited system were corrected at the same time. The
first concerned duplicate alerting. Because the in-process scheduler executes on
every running instance, and because the Task 1 configuration constrained instance
type but not instance count, the first autoscaling event would have delivered every
flood alert twice to real subscribers. Relocating the trigger to Amazon EventBridge
Scheduler resolves this, since the scheduler fires once irrespective of fleet size.
The second defect concerned credential handling: the Task 1 deployment
configuration contained the live database password and token signing secret, which
committed both permanently to version control. Credentials are now generated into
AWS Secrets Manager and injected at deployment time.

## Microservices Design

Six Lambda functions were implemented. Each carries its own least-privilege
execution role, an arrangement that matters because the functions do not hold
equivalent trust. A single shared role would grant the unauthenticated public
intake endpoint permission to publish alerts to every subscriber, which is a
privilege escalation path rather than a convenience. Table 3 states the boundary,
trigger, and integration of each service.

::: {custom-style="FigNum"}
Table 3
:::

::: {custom-style="FigTitle"}
Microservice Boundaries, Triggers, and AWS Service Integrations
:::

| Function | Trigger | Integrates with | Responsibility |
|---|---|---|---|
| fg-weather-ingest | EventBridge, 10 min | DynamoDB, SQS | Retrieve forecasts, store snapshot, enqueue one job per region |
| fg-flood-forecast | SQS work queue | SQS, internal interface | Compute composite risk score, enqueue alerts above threshold |
| fg-alert-dispatch | SQS alert queue | SNS, internal interface | Create the alert idempotently, then fan out to subscribers |
| fg-report-intake | API Gateway | Internal interface | Accept unauthenticated public flood reports |
| fg-upload-presign | API Gateway | S3 | Issue time-limited presigned upload URLs |
| fg-image-process | S3 object created | S3, internal interface | Verify the file signature and tag the stored object |

::: {custom-style="APANote"}
*Note.* No function opens a connection to PostgreSQL. The application server owns the relational store and exposes an authenticated internal interface, which preserves a single writer per data store.
:::

Ingestion performs input and output only. Risk scoring is deliberately excluded
from it so that a slow change to the scoring algorithm cannot stall data collection.
The scoring logic itself was ported from the Task 1 application server without
modification, which keeps the two implementations behaviourally identical. Because
SQS provides at-least-once delivery, dispatch is idempotent: a matching active
alert within a thirty-minute window is suppressed rather than duplicated.

## Benefits of the Expansion

The expansion delivers four benefits that the monitoring evidence in the next
section quantifies. Independent scalability is the first, since each stage now
responds to its own signal: ingestion on schedule, scoring on queue depth, and
dispatch on triggered alert volume, rather than by adding whole application
instances. Second, the queue boundary confers deployment flexibility, because the
scoring function can be replaced while messages accumulate and drain without
request loss. Third, resilience improves through explicit dead-letter queues and
partial batch failure reporting, which together prevent one malformed message from
forcing redelivery of an entire batch. Fourth, cost efficiency improves because the
functions consume compute only while executing, consistent with the economic model
described by Adzic and Chatley (2017).

A further benefit concerns data ownership. Keeping the functions outside the
virtual private cloud avoids the recurring cost of a network address translation
gateway and allows the database security group to remain closed, while the internal
interface avoids the dual-write consistency problem that Richardson (2018)
identified as a common decomposition failure.

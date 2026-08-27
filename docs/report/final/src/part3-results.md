# Results and Discussion

All figures reported in this section were measured on the live deployment using an
automated verification and load-generation script. The script exercises every hop of
both pipelines and then issues 240 requests across the server and serverless paths in
thirty seconds, so that latency percentiles describe a system under load rather than
an idle one.

## End-to-End Verification

The verification routine proves each hop rather than merely asserting that resources
exist, and it discriminates between correct acceptance and correct rejection. All 18
checks passed with no failures. Table 5 summarises the assertions and Figure @REF(image26)
records the run.

::: {custom-style="FigNum"}
Table 5
:::

::: {custom-style="FigTitle"}
End-to-End Verification Assertions and Observed Results
:::

| Assertion | Expected | Observed |
|---|---|---|
| Front door routes to web, application, and serverless origins | 200, 200, 200 | 200, 200, 200 |
| Internal interface reached without a credential | Rejected | 401 |
| Presign endpoint with a valid request and with an executable | 200, rejected | 200, 415 |
| Public report endpoint with a malformed body and a valid body | Rejected, created | 400, 201 |
| Genuine image uploaded, then a text file renamed as an image | verified, rejected | verified, rejected |
| Scheduled ingestion invoked, failed regions | 200, none | 200, 0 |
| DynamoDB snapshots written during the run | Increase | 20 to 30 |
| Both dead-letter queues after the run | Empty | 0 and 0 |
| Duplicate alert message delivered twice | Suppressed | Suppressed |
| X-Ray traces recorded in the preceding 15 minutes | Non-zero | 275 |

::: {custom-style="APANote"}
*Note.* The rejection assertions matter as much as the acceptance assertions. Validation that rejects everything would also pass a test that only checked for failure.
:::

::: {custom-style="FigNum"}
Figure @FIG(image26)
:::

::: {custom-style="FigTitle"}
Consolidated End-to-End Verification Result for the Serverless Layer
:::

::: {custom-style="FigImage"}
![](figures/image26.png){width=AUTO}
:::

## Monitoring Coverage

A 14-widget dashboard is laid out along the request path, from front door through
the serverless pipeline and queue health to the data tier and the retained server
tier, ending in a log query of recent errors across all six functions. All handlers
emit single-line structured output so that fields remain queryable.

::: {custom-style="FigNum"}
Figure @FIG(image24)
:::

::: {custom-style="FigTitle"}
Monitoring Dashboard Populated Under Load
:::

::: {custom-style="FigImage"}
![](figures/image24.png){width=AUTO}
:::

::: {custom-style="FigImage"}
![](figures/image25.png){width=AUTO}
:::

Twenty-one alarms are configured, every one of them publishing to the operations
topic, because a metric without an alarm action is observation without response
(Amazon Web Services, 2025e). Three matter most. A non-empty dead-letter queue means
work was permanently dropped. An age of oldest message above five minutes is the
honest backlog signal, because queue depth can look healthy on a fast-moving queue
while consumers fall behind. A Lambda throttle count is a capacity signal rather than
a code defect, and the next subsection shows that alarm earning its place.

::: {custom-style="FigNum"}
Figure @FIG(image23)
:::

::: {custom-style="FigTitle"}
Alarm Inventory in a Non-Alarming State
:::

::: {custom-style="FigImage"}
![](figures/image23.png){width=AUTO}
:::

::: {custom-style="APANote"}
*Note.* Alarms reported as INSUFFICIENT_DATA cover error and throttle conditions that had not occurred within the evaluation window, which is the expected state for a healthy system rather than a configuration fault.
:::

## Measured Performance of the Serverless Tier

Table 6 reports Lambda metrics across the window covering the load run.

::: {custom-style="FigNum"}
Table 6
:::

::: {custom-style="FigTitle"}
Lambda Invocation Counts, Error Counts, and Duration Percentiles Under Load
:::

| Function | Invocations | Errors | M (ms) | p95 (ms) | Max (ms) |
|---|---|---|---|---|---|
| fg-upload-presign | 245 | 0 | 13.1 | 96.2 | 117.9 |
| fg-report-intake | 4 | 0 | 277.7 | 551.0 | 552.3 |
| fg-flood-forecast | 12 | 0 | 466.9 | 968.6 | 988.5 |
| fg-alert-dispatch | 4 | 0 | 475.4 | 765.9 | 778.4 |
| fg-image-process | 2 | 0 | 557.5 | 772.2 | 778.5 |
| fg-weather-ingest | 5 | 0 | 1638.3 | 2194.8 | 2245.9 |

::: {custom-style="APANote"}
*Note.* M denotes the arithmetic mean duration. Invocation counts differ by function because each is driven by a different event source rather than by uniform traffic.
:::

Two observations follow. First, the gap between the mean of 13.1 ms and the 95th
percentile of 96.2 ms for the presign function is initialisation cost. The warm path
is a matter of single-digit milliseconds and the tail is the creation of new
execution environments during a burst (Amazon Web Services, 2025c). Provisioned
concurrency would remove that tail at a fixed hourly charge, which intermittent
academic traffic does not justify. Second, weather ingestion is the slowest function
at 1.6 s, but it is intended to be, because it makes ten outbound calls to an
external forecast service (Open-Meteo, 2025). That is precisely why scoring was moved behind a queue: a
synchronous design would have placed those 1.6 s on a user's request path.

## Measured Performance of the Server Tier and Data Stores

::: {custom-style="FigNum"}
Table 7
:::

::: {custom-style="FigTitle"}
Server Tier and Data Store Utilisation Across the Measurement Window
:::

| Component | Metric | Value |
|---|---|---|
| Load balancer | Requests, mean target response time | 327, 23.6 ms |
| Load balancer | Successful responses, server errors | 321, 0 |
| RDS PostgreSQL | CPU, connections, free storage | 4.3%, 0.4, 17.1 GB |
| DynamoDB | Items, size, billing mode | 3,212, 782 KB, on demand |
| DynamoDB | Consumed write units, read units | 60, 418.5 |
| SNS | Messages published, failed | 1, 0 |

A mean target response time of 23.6 ms against 4.3% database processor utilisation
shows the server tier comfortably under-used. That is the expected outcome of moving
polling and scoring off it, because in Task 1 the same instances that served user
requests also ran that work in process.

## A Concurrency Limit Discovered Through Monitoring

The most useful result of this task came from monitoring rather than from testing,
and it changed the deployed configuration.

An early load run returned two server errors out of 253 gateway requests. X-Ray
attributed the faults to the gateway stage, and the traces showed a duration of 13 ms
with a Lambda segment containing no subsegments and no application error. A genuine
handler failure would have produced an error segment, so the request had never
reached application code. The throttle metric for the presign function confirmed two
throttles in the same minute, and the account quota supplied the cause: this account
permits ten concurrent executions, not the default thousand, and the load generator
was issuing bursts of twelve.

The architectural risk this exposed matters more than the failed test. Both queue
event source mappings had no concurrency ceiling, so either consumer could occupy all
ten slots. A backlog on the forecast queue, which is background work, would therefore
starve the presign and intake functions on the public request path. A shared
concurrency pool with no allocation lets a background workload hold a user-facing
endpoint hostage.

Two changes followed. The queue consumers were capped at three and two, reserving the
remaining five executions for synchronous traffic, and the queue absorbs any
resulting backlog, which is precisely its purpose. Scaling configuration was chosen
over reserved concurrency deliberately, because at an account limit of exactly ten
Lambda will not permit reserved concurrency to be allocated at all. The load
generator was then bounded below the quota so that the test measures the latency of
the system rather than the ceiling of the account. Table 8 records the outcome.

::: {custom-style="FigNum"}
Table 8
:::

::: {custom-style="FigTitle"}
Throttling and Server Errors Before and After the Concurrency Allocation
:::

| Run | Presign invocations | Throttles | Gateway server errors |
|---|---|---|---|
| Before allocation, burst of 12 | 118 | 2 | 2 |
| After allocation, burst of 8 | 117 | 0 | 0 |

::: {custom-style="APANote"}
*Note.* The functional assertions passed in both runs. Only the metrics distinguished a system that worked from a system that would continue to work while a queue was busy.
:::

## Distributed Tracing With AWS X-Ray

Active tracing is enabled on all six functions, on the gateway stage, and on the
application server. The server required explicit instrumentation, because the
platform option enables the trace daemon, which forwards segments but does not create
them, so that option alone yields an empty service map. Because both tiers report
into one account, a single map spans the monolith and the serverless tier, which is
why the throttling above was attributed to the gateway stage rather than to a handler
within minutes of it occurring.

::: {custom-style="FigNum"}
Figure @FIG(image27)
:::

::: {custom-style="FigTitle"}
Trace Map Metrics for the Gateway Stage Under Load
:::

::: {custom-style="FigImage"}
![](figures/image27.png){width=AUTO}
:::

::: {custom-style="APANote"}
*Note.* Mean latency of 56 ms and a fault rate of zero are recorded against the stage. The 2% client error rate is the deliberate rejection traffic issued by the verification routine, namely the unauthenticated internal call, the malformed report, and the rejected executable upload.
:::

::: {custom-style="FigNum"}
Figure @FIG(image28)
:::

::: {custom-style="FigTitle"}
Service Map Spanning the Serverless and Server Tiers
:::

::: {custom-style="FigImage"}
![](figures/image28.png){width=AUTO}
:::

::: {custom-style="APANote"}
*Note.* The gateway stage node, the six function nodes, and the application server node appear in one view. The presence of the gateway node is the return on selecting a REST API over an HTTP API, as recorded in Table 2.
:::

## Functional Evidence From the Event Pipelines

Two outcomes confirm that the event wiring fired rather than merely existing. The
object tags in Figure @REF(image29) were written by the verification function, so their presence
proves the object-created notification invoked it and that the file signature check
ran on the stored bytes. The message in Figure @REF(image6) confirms that fan-out reaches a
subscribed endpoint, which is the outcome that matters most in an early warning
system.

::: {custom-style="FigNum"}
Figure @FIG(image29)
:::

::: {custom-style="FigTitle"}
Object Tags Written by the Image Verification Function
:::

::: {custom-style="FigImage"}
![](figures/image29.png){width=AUTO}
:::

::: {custom-style="FigNum"}
Figure @FIG(image6)
:::

::: {custom-style="FigTitle"}
Notification Delivered to a Subscribed Endpoint by Amazon SNS
:::

::: {custom-style="FigImage"}
![](figures/image6.png){width=AUTO}
:::

## Discussion

The monitoring evidence supports the four benefits claimed for the expansion.
Scalability is evidenced by the server tier utilisation figures in Table 7: each
stage now scales on its own signal, and the offloaded work no longer competes with
user requests. Flexibility follows from the queue boundary, which allows the scoring
function to be redeployed while messages accumulate and drain, so no request is lost
during a deployment. Reliability is evidenced directly, because sent, received, and
deleted counts agreed on both work queues with both dead-letter queues empty, so no
message was lost and none required redrive. Partial batch failure reporting, the
thirty-minute deduplication window, and content verification on upload were each
asserted explicitly rather than assumed.

Three limitations deserve statement. The ten-execution quota is a hard ceiling on
this account; the allocation described above manages it but does not remove it, and a
production deployment would request an increase. The database remains in a single
availability zone and is publicly reachable so that migrations can be run from a
developer machine, which is acceptable for assessment but not for production, though
the two-zone subnet group makes promotion a single API call. Finally, initialisation
cost dominates the 99th percentile, which is an inherent trade-off of on-demand
serverless compute and one that Jonas et al. (2019) identified as a defining
characteristic of the model rather than a defect of this implementation.

# System Implementation

The Task 2 serverless layer was provisioned entirely through the AWS Command Line
Interface so that every step is reproducible and auditable rather than a sequence of
console gestures. Table 4 lists what was built. The Task 1 server tier, comprising
the virtual private cloud, the relational database, both Elastic Beanstalk
environments, and the content delivery distribution, was retained and enhanced
rather than replaced.

::: {custom-style="FigNum"}
Table 4
:::

::: {custom-style="FigTitle"}
Resources Provisioned in the Task 2 Serverless Layer
:::

| Service | Resource provisioned | Purpose |
|---|---|---|
| DynamoDB | fg-weather-snapshots | Append-only weather time series with 30-day expiry |
| SQS | Two work queues and two dead-letter queues | Decoupling and failure isolation |
| SNS | fg-flood-alerts and fg-ops-alarms | Public fan-out and operator alarms |
| IAM | Six execution roles and one scheduler role | One least-privilege role per function |
| Lambda | Six functions | The microservices |
| API Gateway | REST API fg-serverless-api, stage v1 | Public entry to two functions |
| EventBridge | fg-weather-ingest-schedule | Ten-minute ingestion trigger |
| S3 | Object-created notification | Upload is itself the trigger |
| CloudFront | Path behaviour for /sl/* | Single front door across three origins |
| CloudWatch | 21 alarms and a 14-widget dashboard | Monitoring and response |

::: {custom-style="APANote"}
*Note.* All commands were executed against a single account in the us-east-1 region and were verified end to end after execution. The account identifier is visible in the resource identifiers shown throughout the figures that follow.
:::

## Data Layer

### DynamoDB Weather Snapshot Table

The table is partitioned on region and sorted on timestamp, so the latest snapshots
for a region resolve in a single query. On-demand billing suits periodic rather than
sustained ingestion. A time-to-live attribute expires items after thirty days at no
write cost, which is what keeps the table within the free tier.

::: {custom-style="FigNum"}
Figure @FIG(image2)
:::

::: {custom-style="FigTitle"}
Creation of the DynamoDB Table and Its Expiry Specification
:::

::: {custom-style="FigImage"}
![](figures/image2.png){width=AUTO}
:::

::: {custom-style="APANote"}
*Note.* The status moves to ACTIVE with regionId as the partition key, ts as the sort key, and the time-to-live attribute enabled on expiresAt.
:::

### SQS Work Queues and Dead-Letter Queues

Four queues were created rather than two. A dead-letter queue is a separate queue
reached by a redrive policy, and that policy is the resilience mechanism (Amazon Web
Services, 2025a). Visibility timeout was set to six times the longest consumer
timeout so that SQS cannot redeliver a message still being processed, and a maximum
receive count of three routes a repeatedly failing message aside instead of looping
indefinitely.

::: {custom-style="FigNum"}
Figure @FIG(image3)
:::

::: {custom-style="FigTitle"}
Queue Creation and the Redrive Policy Linking Each Work Queue to Its Dead-Letter Queue
:::

::: {custom-style="FigImage"}
![](figures/image3.png){width=AUTO}
:::

### SNS Topics

Two topics were kept deliberately separate so that an operational alarm storm can
never reach residents, and a public flood alert is never mistaken for an
infrastructure notification.

::: {custom-style="FigNum"}
Figure @FIG(image4)
:::

::: {custom-style="FigTitle"}
Creation of the Alert and Operations Topics and Confirmation of a Subscription
:::

::: {custom-style="FigImage"}
![](figures/image4.png){width=AUTO}
:::

::: {custom-style="FigImage"}
![](figures/image5.png){width=AUTO}
:::

## Identity and Access Management

### One Execution Role per Function

Six roles confine the blast radius of a fault in any one handler to that handler
alone. Each role trusts only the Lambda service and carries the basic execution and
X-Ray write policies in addition to its own inline policy.

::: {custom-style="FigNum"}
Figure @FIG(image7)
:::

::: {custom-style="FigTitle"}
Creation of the Six Lambda Execution Roles and Attachment of Their Managed Policies
:::

::: {custom-style="FigImage"}
![](figures/image7.png){width=AUTO}
:::

::: {custom-style="FigImage"}
![](figures/image8.png){width=AUTO}
:::

### Least-Privilege Policy Verification

Each role receives an inline policy naming only the resources that its function
actually touches. Figure @REF(image9) verifies the narrowest of the six.

::: {custom-style="FigNum"}
Figure @FIG(image9)
:::

::: {custom-style="FigTitle"}
Evidence of Privilege Separation on the Unauthenticated Intake Function
:::

::: {custom-style="FigImage"}
![](figures/image9.png){width=AUTO}
:::

::: {custom-style="APANote"}
*Note.* The action list for fg-report-intake-role contains secretsmanager:GetSecretValue and nothing further, which demonstrates that the only unauthenticated endpoint in the system holds no permission to publish to SNS.
:::

## Compute Layer

### Deployment Packaging

The Node.js 22 runtime already ships the AWS SDK, so five of the six functions
package as a handler plus a shared helper of a few kilobytes. Only the presign
function declares external dependencies. Small packages mean short initialisation
times, which Figure @REF(image10) makes visible as a size difference of three orders of
magnitude.

::: {custom-style="FigNum"}
Figure @FIG(image10)
:::

::: {custom-style="FigTitle"}
Deployment Archive Sizes Across the Six Functions
:::

::: {custom-style="FigImage"}
![](figures/image10.png){width=AUTO}
:::

### Function Creation

Timeouts are set per workload. Ingestion makes ten sequential outbound calls and
receives 300 seconds, whereas a function fronted by an endpoint receives 30. Active
tracing is enabled on all six, which is what makes the service map in Figure @REF(image28)
possible.

::: {custom-style="FigNum"}
Figure @FIG(image11)
:::

::: {custom-style="FigTitle"}
Creation of the Six Lambda Microservices With Active Tracing Enabled
:::

::: {custom-style="FigImage"}
![](figures/image11.png){width=AUTO}
:::

### Event Source Mappings and Concurrency Allocation

This account permits ten concurrent Lambda executions rather than the default
thousand. An uncapped queue consumer scales until it owns all of them and starves
the public request path, which API Gateway surfaces to users as a server error.
Capping the consumers at three and two therefore reserves five executions for
synchronous traffic. Partial batch failure reporting prevents one poison message
from forcing redelivery of its healthy batch companions (Amazon Web Services, 2025f).

::: {custom-style="FigNum"}
Figure @FIG(image12)
:::

::: {custom-style="FigTitle"}
Queue Consumers Created With Explicit Concurrency Ceilings
:::

::: {custom-style="FigImage"}
![](figures/image12.png){width=AUTO}
:::

## API Layer

### REST API and Resource Tree

A REST API was selected over an HTTP API for one decisive reason: HTTP APIs do not
emit X-Ray trace segments, and tracing evidence is required (Amazon Web Services,
2025d). Resources are rooted at /sl so that the distribution can forward with an
origin path of /v1 and require no path rewriting.

::: {custom-style="FigNum"}
Figure @FIG(image13)
:::

::: {custom-style="FigTitle"}
REST API Identifier and Deployed Resource Tree
:::

::: {custom-style="FigImage"}
![](figures/image13.png){width=AUTO}
:::

### Integrations and Invoke Permissions

Lambda proxy integration passes the raw request to the handler, so routing and
response shape live in code rather than in gateway mapping templates. The
resource-based invoke permission is scoped to this API and this method rather than
granted broadly.

::: {custom-style="FigNum"}
Figure @FIG(image14)
:::

::: {custom-style="FigTitle"}
Lambda Proxy Integrations and the Resulting Console Resource Tree
:::

::: {custom-style="FigImage"}
![](figures/image14.png){width=AUTO}
:::

::: {custom-style="FigImage"}
![](figures/image15.png){width=AUTO}
:::

### Stage Deployment and Tracing

::: {custom-style="FigNum"}
Figure @FIG(image16)
:::

::: {custom-style="FigTitle"}
Stage Deployment With X-Ray Tracing Enabled and a Direct Endpoint Test
:::

::: {custom-style="FigImage"}
![](figures/image16.png){width=AUTO}
:::

::: {custom-style="FigImage"}
![](figures/image17.png){width=AUTO}
:::

::: {custom-style="FigImage"}
![](figures/image18.png){width=AUTO}
:::

::: {custom-style="APANote"}
*Note.* The tracingEnabled setting shown in the second panel is the capability that HTTP APIs lack entirely, and it is the reason the protocol decision in Table 2 was reversed. The third panel is a direct call to the stage endpoint, bypassing the distribution, which isolates the gateway from the front door during testing.
:::

## Event Sources

### EventBridge Schedule

The schedule replaces the in-process task that ran on every instance. EventBridge
fires once regardless of fleet size. Because Identity and Access Management is
eventually consistent and the scheduler validates role assumption at creation time,
the call is issued inside a retry loop.

::: {custom-style="FigNum"}
Figure @FIG(image19)
:::

::: {custom-style="FigTitle"}
Scheduler Role Creation and Verification of the Ten-Minute Trigger
:::

::: {custom-style="FigImage"}
![](figures/image19.png){width=AUTO}
:::

::: {custom-style="FigImage"}
![](figures/image20.png){width=AUTO}
:::

### S3 Object-Created Notification

The invoke permission must exist before the notification is attached, because
attaching it validates that the destination is invocable (Amazon Web Services,
2025b). Uploading a photograph is itself the trigger: nothing polls and nothing is
scheduled.

::: {custom-style="FigNum"}
Figure @FIG(image21)
:::

::: {custom-style="FigTitle"}
Bucket Notification Wiring Uploads to the Image Verification Function
:::

::: {custom-style="FigImage"}
![](figures/image21.png){width=AUTO}
:::

## Front Door

### CloudFront Serverless Behaviour

Adding the /sl/* behaviour completes a single hostname serving three origins, so
every browser request is same-origin and no cross-origin preflight occurs anywhere
in the system.

::: {custom-style="FigNum"}
Figure @FIG(image22)
:::

::: {custom-style="FigTitle"}
Distribution Updated With the API Gateway Origin
:::

::: {custom-style="FigImage"}
![](figures/image22.png){width=AUTO}
:::

## Microservice Source and Interaction

The functions never share a database. The application server owns the relational
store, the serverless tier owns DynamoDB and S3, and the two communicate over queues
and an authenticated internal interface. Figure @REF(image30) shows the source layout: six
independent function directories plus one shared helper, each with its own entry
point, which is what makes them independently deployable. Ingestion fans work out by
sending one message per region in batches of ten, the batch API limit. The forecast
consumer collects failed message identifiers into a batch item failure array and
returns it, so only the failures are redelivered. Dispatch checks for a matching
active alert and returns early before publishing, which is what makes at-least-once
delivery safe. Image verification reads the file signature from the object bytes,
because a presigned URL pins a declared content type but S3 never checks that the
bytes agree with it.

::: {custom-style="FigNum"}
Figure @FIG(image30)
:::

::: {custom-style="FigTitle"}
Source Layout of the Six Independently Deployable Microservices
:::

::: {custom-style="FigImage"}
![](figures/image30.png){width=AUTO}
:::

## System Functionality Post-Implementation

The interfaces below exercise the integrated system end to end, from an
unauthenticated visitor through to administrative review. Each was captured from the
live deployment reached through the single CloudFront hostname, which confirms that
the serverless tier and the retained server tier are reachable as one application.

::: {custom-style="FigNum"}
Figure @FIG(public-landing-page)
:::

::: {custom-style="FigTitle"}
Public Landing Page Served Through the CloudFront Distribution
:::

::: {custom-style="FigInstr"}
[PASTE SCREENSHOT: the public landing page at the distribution root, with the CloudFront hostname visible in the address bar.]
:::

::: {custom-style="FigNum"}
Figure @FIG(resident-dashboard-showing)
:::

::: {custom-style="FigTitle"}
Resident Dashboard Showing Regional Risk and Active Alerts
:::

::: {custom-style="FigInstr"}
[PASTE SCREENSHOT: the authenticated resident dashboard, showing the risk level and at least one pipeline-generated alert.]
:::

::: {custom-style="FigNum"}
Figure @FIG(report-submission-showing)
:::

::: {custom-style="FigTitle"}
Report Submission Showing the Direct Browser-to-S3 Upload Sequence
:::

::: {custom-style="FigInstr"}
[PASTE SCREENSHOT: the report form with the browser network panel open, showing a request for a presigned URL followed by a separate upload addressed to the S3 hostname. Truncate the signed query string, which is a temporary credential.]
:::

::: {custom-style="FigNum"}
Figure @FIG(authority-review-of)
:::

::: {custom-style="FigTitle"}
Authority Review of a Submitted Report
:::

::: {custom-style="FigInstr"}
[PASTE SCREENSHOT: a report moving to the verified state, with the attached photograph rendered.]
:::

::: {custom-style="FigNum"}
Figure @FIG(alert-issued-by)
:::

::: {custom-style="FigTitle"}
Alert Issued by an Authority User
:::

::: {custom-style="FigInstr"}
[PASTE SCREENSHOT: the alert creation interface immediately after issuing an alert, with the new alert visible in the active list.]
:::

::: {custom-style="FigNum"}
Figure @FIG(user-administration-and)
:::

::: {custom-style="FigTitle"}
User Administration and Role Assignment
:::

::: {custom-style="FigInstr"}
[PASTE SCREENSHOT: the user management view with assigned roles. Obscure real electronic mail addresses.]
:::

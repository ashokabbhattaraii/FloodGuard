# Reflection From Each Member

**Ashok Bhattrai (M1), weather ingestion and forecasting, S3 and IAM.**
In Task 1 I built the weather and forecast modules as services running inside the
application server, and the hardest part of Task 2 was accepting that a working
scheduled task was in fact a design fault. The in-process scheduler runs on every
instance, so the moment the environment scaled out, every flood alert would have been
delivered twice. That was invisible to us until we tried to move the trigger to
EventBridge. The lesson I took from it is that "it works in production today" and
"it is correct" are different claims, and only the second survives a change in
capacity. Writing one role per function was more tedious than writing one shared
role, but seeing exactly why a shared role would let the unauthenticated report
endpoint publish alerts to every subscriber made least privilege concrete rather than
a phrase from a lecture. My contribution sat at the front of the pipeline, so
everything downstream depended on ingestion staying simple.

**Samir Pokhrel (M2), report and upload microservices, API Gateway, CloudFront.**
Extracting the presigned upload logic out of the application server into its own
function was the point at which microservices stopped being an abstraction for me. My
largest realisation came from the front door. In Task 1 we ran three distributions on
separate hostnames, which forced cross-origin configuration and a frontend rebuild
whenever a domain changed. Collapsing them into one distribution with three
path-routed origins removed an entire category of defect rather than fixing
individual instances of it. I also learned that a presigned URL is not a security
control, because it pins a declared content type while S3 never inspects the bytes,
which is why the verification function reads the file signature itself. Testing that
by uploading a text file renamed as an image and watching it come back tagged as
rejected was the most instructive moment of the project.

**Anjali Misra (M3), alert fan-out, SNS, CloudWatch alarms and dashboard.**
I owned the monitoring requirement and began by treating it as a reporting exercise:
build the dashboard, capture the screenshots, submit. What changed my mind was the
throttling incident. Every functional assertion passed and the system looked healthy;
only the throttle metric and a trace with an empty function segment revealed that a
background queue could starve our public interface. I had configured that alarm
without really believing it would ever fire. The second lesson was that a metric
without an alarm action is only a chart, which is why all 21 alarms publish to a
topic. Choosing age of oldest message over queue depth taught me the same thing in a
different form, because depth looks reassuring on a fast queue even while consumers
fall behind. Working on alert fan-out also made me careful about who receives what,
which is why operational alarms and public alerts use separate topics.

**Sangita Tamang (M4), internal service interface, RDS, SQS reliability, X-Ray.**
My contribution was the boundary between the two tiers, that is the internal
interface the functions call instead of connecting to the database directly. Arguing
for that constraint was difficult, because a direct connection seemed simpler. What
settled it was cost and security together: a function attached to the virtual private
cloud needs an address translation gateway with a recurring monthly charge, and a
function outside it has no stable address, so the alternative was opening the database
port to the public internet. Implementing idempotency taught me the most. Because SQS
delivers at least once, I had assumed retries were harmless until I realised that a
redelivered message would notify every resident in a region a second time. The
deduplication window, and a test that sends the same message twice and asserts that
one alert results, is the part of this project I am most confident in.


# New Workload Table Matrix

Table 9 records each member's responsibilities across both tasks. Distribution was
planned by feature rather than by layer, so that every member owned frontend,
backend, and cloud infrastructure work in both tasks rather than specialising into a
single tier.

::: {custom-style="FigNum"}
Table 9
:::

::: {custom-style="FigTitle"}
Member Responsibilities and Contributions Across Task 1 and Task 2
:::

| Member | Task 1 contribution | Task 2 contribution | AWS services owned |
|---|---|---|---|
| M1, Ashok Bhattrai | Weather dashboard and interactive risk map; flood forecast module; weather, regions, and forecast backend modules; resident awareness pages | fg-weather-ingest and fg-flood-forecast functions; external forecast integration; DynamoDB time-series schema with 30-day expiry; per-function execution roles; EventBridge schedule | S3, IAM, DynamoDB, EventBridge |
| M2, Samir Pokhrel | Flood report system and assistance requests; report, request, and upload modules; presigned upload flow; resident action pages | fg-report-intake, fg-upload-presign, and fg-image-process functions; REST API configuration; single-distribution path routing; file signature verification | API Gateway, CloudFront, VPC, S3 uploads |
| M3, Anjali Misra | Alert system and region management; authority dashboard; alert module and region administration; review pages | fg-alert-dispatch function; separation of public and operational topics; 21 CloudWatch alarms; 14-widget dashboard; log query views; throttling analysis | SNS, CloudWatch, Elastic Beanstalk, security groups |
| M4, Sangita Tamang | Volunteer request response; user and authentication system; authentication, user, and evacuation modules; database schema and migrations | Internal service interface and its guard; queue and dead-letter queue topology with redrive policies; partial batch failure handling; alert idempotency; tracing of the application server | RDS, SQS, Secrets Manager, X-Ray |

::: {custom-style="APANote"}
*Note.* Architecture review, the end-to-end verification routine, this report, and the demonstration were shared activities carried out jointly by all four members.
:::

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

# References

::: {custom-style="Hanging"}
Adzic, G., & Chatley, R. (2017). Serverless computing: Economic and architectural impact. In *Proceedings of the 2017 11th Joint Meeting on Foundations of Software Engineering* (pp. 884–889). Association for Computing Machinery. https://doi.org/10.1145/3106237.3117767
:::

::: {custom-style="Hanging"}
Amazon Web Services. (2025a). *Amazon SQS dead-letter queues*. Amazon SQS Developer Guide. https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
:::

::: {custom-style="Hanging"}
Amazon Web Services. (2025b). *Configuring event notifications using Amazon S3 event notifications*. Amazon S3 User Guide. https://docs.aws.amazon.com/AmazonS3/latest/userguide/NotificationHowTo.html
:::

::: {custom-style="Hanging"}
Amazon Web Services. (2025c). *Lambda function scaling*. AWS Lambda Developer Guide. https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html
:::

::: {custom-style="Hanging"}
Amazon Web Services. (2025d). *Tracing user requests to REST APIs using X-Ray*. Amazon API Gateway Developer Guide. https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-xray.html
:::

::: {custom-style="Hanging"}
Amazon Web Services. (2025e). *Using Amazon CloudWatch alarms*. Amazon CloudWatch User Guide. https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html
:::

::: {custom-style="Hanging"}
Amazon Web Services. (2025f). *Using Lambda with Amazon SQS*. AWS Lambda Developer Guide. https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
:::

::: {custom-style="Hanging"}
Jonas, E., Schleier-Smith, J., Sreekanti, V., Tsai, C.-C., Khandelwal, A., Pu, Q., Shankar, V., Carreira, J., Krauth, K., Yadwadkar, N., Gonzalez, J. E., Popa, R. A., Stoica, I., & Patterson, D. A. (2019). *Cloud programming simplified: A Berkeley view on serverless computing* (Technical Report No. UCB/EECS-2019-3). University of California, Berkeley. https://doi.org/10.48550/arXiv.1902.03383
:::

::: {custom-style="Hanging"}
Newman, S. (2021). *Building microservices: Designing fine-grained systems* (2nd ed.). O'Reilly Media.
:::

::: {custom-style="Hanging"}
Open-Meteo. (2025). *Weather forecast API documentation*. https://open-meteo.com/en/docs
:::

::: {custom-style="Hanging"}
Richardson, C. (2018). *Microservices patterns: With examples in Java*. Manning Publications.
:::

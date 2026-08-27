# Results

This section presents the functional outcome of the implementation from the
perspective of each user role the platform serves. All screens were captured from
the live deployment reached through the single CloudFront hostname. Where a
capability is exercised by the serverless tier rather than by a page, the evidence
is presented at the interface level instead.

## Public Users

Unauthenticated visitors can reach public information and submit a flood report
without registering, which matters during an emergency when account creation is an
unreasonable precondition to raising an alarm.

### Homepage

The landing page presents current regional risk levels and entry points to
authentication.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
Public Landing Page Served Through the CloudFront Distribution
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the public landing page as served to an unauthenticated visitor.
:::

::: {custom-style="FigInstr"}
Capture: Browser, `https://drtyovliurlkl.cloudfront.net/`.
:::

::: {custom-style="FigInstr"}
Command: Not applicable (browser view).
:::

::: {custom-style="FigInstr"}
Expected Evidence: Rendered page with the distribution hostname in the address bar, confirming delivery via CloudFront.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

### Alerts Page

The alerts view lists active flood alerts for the regions relevant to the signed-in
resident, ordered by severity.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
Resident Alerts View Listing Active Flood Alerts
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the alerts listing.
:::

::: {custom-style="FigInstr"}
Capture: Browser, `https://drtyovliurlkl.cloudfront.net/dashboard/resident/alerts`.
:::

::: {custom-style="FigInstr"}
Command: Not applicable (browser view).
:::

::: {custom-style="FigInstr"}
Expected Evidence: At least one pipeline-generated alert, with severity and affected region.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

### Map Page

The map view renders monitored regions coloured by the risk level written by the
forecast function, which makes the output of the serverless pipeline directly
visible to residents.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
Interactive Risk Map Reflecting Computed Regional Risk Levels
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the interactive risk map.
:::

::: {custom-style="FigInstr"}
Capture: Browser, `https://drtyovliurlkl.cloudfront.net/dashboard/resident/map`.
:::

::: {custom-style="FigInstr"}
Command: Not applicable (browser view).
:::

::: {custom-style="FigInstr"}
Expected Evidence: Regions must be visibly colour-coded by risk level, with a legend present.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

### Guest Report Submission

Guest reporting is served by the serverless tier rather than by the application
server. The intake function accepts an unauthenticated report through API Gateway and
rejects a malformed submission with a client error, which is the behaviour a public
endpoint must exhibit.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
Unauthenticated Guest Report Accepted and Malformed Report Rejected
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture both a successful guest report submission and the rejection of an invalid submission.
:::

::: {custom-style="FigInstr"}
Capture: Terminal, curl.
:::

::: {custom-style="FigInstr"}
Command: `curl -s -o /dev/null -w "invalid body: %{http_code}\n" -X POST https://drtyovliurlkl.cloudfront.net/sl/reports -H 'content-type: application/json' -d '{"description":"x"}'`
:::

::: {custom-style="FigInstr"}
Expected Evidence: The malformed body returns HTTP 400 and a valid one returns HTTP 201, so validation discriminates.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

## Create Account

Registration collects the minimum necessary detail and assigns the resident role by
default. Role elevation is an administrative action rather than a self-service one.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
Account Registration Form
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the completed registration form immediately before submission.
:::

::: {custom-style="FigInstr"}
Capture: Browser, `https://drtyovliurlkl.cloudfront.net/register`.
:::

::: {custom-style="FigInstr"}
Command: Not applicable (browser view).
:::

::: {custom-style="FigInstr"}
Expected Evidence: Completed form with the password masked. Use a test account, not a personal credential.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

## Credential Verification

Authentication uses signed tokens issued by the application server, with the signing
secret drawn from Secrets Manager. Verification is therefore demonstrated by showing
that a valid credential yields a token while an invalid one is refused, rather than
by an electronic mail confirmation code.

## Sign In

Successful authentication redirects each user to the dashboard appropriate to their
assigned role.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
Authentication Sign-In Page
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the sign-in page with the test account electronic mail entered.
:::

::: {custom-style="FigInstr"}
Capture: Browser, `https://drtyovliurlkl.cloudfront.net/login`.
:::

::: {custom-style="FigInstr"}
Command: Not applicable (browser view).
:::

::: {custom-style="FigInstr"}
Expected Evidence: The sign-in form must be visible with the password field masked.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

## Citizen Dashboard

The resident dashboard aggregates local risk level, active alerts, and the
resident's own submissions into a single view.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
Resident Dashboard Following Successful Authentication
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the authenticated resident dashboard.
:::

::: {custom-style="FigInstr"}
Capture: Browser, `https://drtyovliurlkl.cloudfront.net/dashboard/resident`.
:::

::: {custom-style="FigInstr"}
Command: Not applicable (browser view).
:::

::: {custom-style="FigInstr"}
Expected Evidence: Region risk level and active alerts, confirming role-based routing after sign-in.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

## Submit Report

Report submission with a photograph exercises the serverless upload path end to end.
The browser requests a presigned URL from the presign function, transmits the image
directly to S3, and the resulting object notification invokes the verification
function. This is the clearest single demonstration of the serverless integration
because no image byte passes through the application server.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
Report Submission Showing the Direct Browser-to-S3 Upload Sequence
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the report submission form with the browser network inspector open alongside it.
:::

::: {custom-style="FigInstr"}
Capture: Browser, `https://drtyovliurlkl.cloudfront.net/dashboard/resident/reports`, with developer tools open on the Network tab.
:::

::: {custom-style="FigInstr"}
Command: Not applicable (browser view).
:::

::: {custom-style="FigInstr"}
Expected Evidence: `POST /sl/uploads/presign` followed by a separate `PUT` to the S3 hostname, proving the image bypassed the application server. Truncate the signed URL query string; it is a temporary credential.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
Object Tags Written by the Image Verification Function
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the verification tags applied to the uploaded object.
:::

::: {custom-style="FigInstr"}
Capture: Console, S3, `floodguard-uploads-292960609118`, `reports/` prefix, the newly uploaded object, Properties, Tags.
:::

::: {custom-style="FigInstr"}
Command: `aws s3api get-object-tagging --bucket floodguard-uploads-292960609118 --key reports/<OBJECT-KEY>`
:::

::: {custom-style="FigInstr"}
Expected Evidence: Tags `verification=verified` and `detectedType` are present, proving the object notification invoked the function and the signature check passed.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

## Authority Dashboard

The authority dashboard presents incoming reports awaiting triage together with
regional status, giving an operator a single queue of work.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
Authority Dashboard Showing Reports Awaiting Triage
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the authority dashboard.
:::

::: {custom-style="FigInstr"}
Capture: Browser, `https://drtyovliurlkl.cloudfront.net/dashboard/admin`, signed in with an administrative account.
:::

::: {custom-style="FigInstr"}
Command: Not applicable (browser view).
:::

::: {custom-style="FigInstr"}
Expected Evidence: Pending reports and regional status summaries must be visible.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

## Verify or Reject Report

An operator confirms or dismisses a submitted report. Only verified reports
contribute to regional assessment, which prevents a malicious or mistaken
submission from influencing risk.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
Report Verification Decision Recorded by an Authority User
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture a report transitioning to the verified state.
:::

::: {custom-style="FigInstr"}
Capture: Browser, `https://drtyovliurlkl.cloudfront.net/dashboard/admin/reports`, with a single report opened.
:::

::: {custom-style="FigInstr"}
Command: Not applicable (browser view).
:::

::: {custom-style="FigInstr"}
Expected Evidence: Status changed to verified, with the photograph rendered because the function tagged it a genuine image.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

## Dispatch Rescuers

Verified reports requiring intervention are converted into assistance requests that
volunteers can claim. Claiming is exclusive, so two volunteers cannot be dispatched
to the same task.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
Volunteer Assistance Request Claimed for Dispatch
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture an assistance request assigned to a volunteer.
:::

::: {custom-style="FigInstr"}
Capture: Browser, `https://drtyovliurlkl.cloudfront.net/dashboard/volunteer/requests`, signed in with a volunteer account.
:::

::: {custom-style="FigInstr"}
Command: Not applicable (browser view).
:::

::: {custom-style="FigInstr"}
Expected Evidence: An assigned volunteer and claimed status, demonstrating exclusive assignment.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

## Update Report Status to Resolved

Closing the loop, an operator marks the incident resolved once the assistance
request is complete, which removes it from the active queue while retaining it for
analysis.

## Issue Alerts

An authority user may issue an alert manually in addition to those generated
automatically by the forecast pipeline. Both paths converge on the same dispatch
function, so both benefit from the duplicate suppression window.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
Manual Alert Issued by an Authority User
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the alert creation interface immediately after issuing an alert.
:::

::: {custom-style="FigInstr"}
Capture: Browser, `https://drtyovliurlkl.cloudfront.net/dashboard/admin/alerts`.
:::

::: {custom-style="FigInstr"}
Command: Not applicable (browser view).
:::

::: {custom-style="FigInstr"}
Expected Evidence: The newly created alert must appear in the active alert list with its severity and target region.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

## Alert Notification Reaches Users

Delivery is the outcome that matters most in an early warning system. SNS fan-out
places the alert in subscriber inboxes, and the resident interface reflects the same
alert, confirming both channels operate from one authoritative record.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
Alert Notification Delivered to a Subscriber by Amazon SNS
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the delivered notification received by a subscribed test address.
:::

::: {custom-style="FigInstr"}
Capture: Electronic mail client inbox showing the received flood alert notification.
:::

::: {custom-style="FigInstr"}
Command: `aws cloudwatch get-metric-statistics --namespace AWS/SNS --metric-name NumberOfMessagesPublished --dimensions Name=TopicName,Value=fg-flood-alerts --period 3600 --statistics Sum --start-time <ISO8601> --end-time <ISO8601>`
:::

::: {custom-style="FigInstr"}
Expected Evidence: Message shows alert severity and region. Obscure the recipient address.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

## Admin Dashboard

The administrative analytics view aggregates alert volume, severity distribution,
and the most frequently affected regions, supporting review after an event rather
than response during one.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
Administrative Analytics View
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the analytics dashboard.
:::

::: {custom-style="FigInstr"}
Capture: Browser, `https://drtyovliurlkl.cloudfront.net/dashboard/admin/analytics`.
:::

::: {custom-style="FigInstr"}
Command: Not applicable (browser view).
:::

::: {custom-style="FigInstr"}
Expected Evidence: Key indicator tiles and at least one populated chart must be visible.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

## Manage Users

User administration permits role assignment across the resident, volunteer, and
authority roles. This is the only path by which a user gains elevated permission.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
User Administration and Role Assignment
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the user management interface.
:::

::: {custom-style="FigInstr"}
Capture: Browser, `https://drtyovliurlkl.cloudfront.net/dashboard/admin/users`.
:::

::: {custom-style="FigInstr"}
Command: Not applicable (browser view).
:::

::: {custom-style="FigInstr"}
Expected Evidence: The user list with assigned roles. Obscure real electronic mail addresses.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

## User Profile Management

Each user maintains their own contact details and notification preferences, which
determine the channels through which SNS reaches them.

::: {custom-style="FigNum"}
Figure @FIG
:::

::: {custom-style="FigTitle"}
User Profile and Notification Preference Management
:::

::: {custom-style="FigInstr"}
SCREENSHOT INSTRUCTION: Capture the user profile management view.
:::

::: {custom-style="FigInstr"}
Capture: Web browser, signed in as the test resident, at the profile section of the resident dashboard.
:::

::: {custom-style="FigInstr"}
Command: Not applicable (browser view).
:::

::: {custom-style="FigInstr"}
Expected Evidence: Editable contact details and notification preferences. Use the test account only.
:::

::: {custom-style="FigInstr"}
Placement: Immediately after the paragraph above.
:::

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

# References

::: {custom-style="Hanging"}
Adzic, G., & Chatley, R. (2017). Serverless computing: Economic and architectural impact. In *Proceedings of the 2017 11th Joint Meeting on Foundations of Software Engineering* (pp. 884–889). Association for Computing Machinery. https://doi.org/10.1145/3106237.3117767
:::

::: {custom-style="Hanging"}
Amazon Web Services. (2025a). *Lambda function scaling*. AWS Lambda Developer Guide. https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html
:::

::: {custom-style="Hanging"}
Amazon Web Services. (2025b). *Using Lambda with Amazon SQS*. AWS Lambda Developer Guide. https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
:::

::: {custom-style="Hanging"}
Amazon Web Services. (2025c). *Tracing user requests to REST APIs using X-Ray*. Amazon API Gateway Developer Guide. https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-xray.html
:::

::: {custom-style="Hanging"}
Amazon Web Services. (2025d). *Using Amazon CloudWatch alarms*. Amazon CloudWatch User Guide. https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html
:::

::: {custom-style="Hanging"}
Amazon Web Services. (2025e). *Configuring event notifications using Amazon S3 event notifications*. Amazon S3 User Guide. https://docs.aws.amazon.com/AmazonS3/latest/userguide/NotificationHowTo.html
:::

::: {custom-style="Hanging"}
Amazon Web Services. (2025f). *Amazon SQS dead-letter queues*. Amazon SQS Developer Guide. https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
:::

::: {custom-style="Hanging"}
Amazon Web Services. (2025g). *Reliability pillar: AWS Well-Architected Framework*. https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html
:::

::: {custom-style="Hanging"}
Baldini, I., Castro, P., Chang, K., Cheng, P., Fink, S., Ishakian, V., Mitchell, N., Muthusamy, V., Rabbah, R., Slominski, A., & Suter, P. (2017). Serverless computing: Current trends and open problems. In S. Chaudhary, G. Somani, & R. Buyya (Eds.), *Research advances in cloud computing* (pp. 1–20). Springer. https://doi.org/10.1007/978-981-10-5026-8_1
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

::: {custom-style="Hanging"}
Sbarski, P., & Kroonenburg, S. (2017). *Serverless architectures on AWS: With examples using AWS Lambda*. Manning Publications.
:::

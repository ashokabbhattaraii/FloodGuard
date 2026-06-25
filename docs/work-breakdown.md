# FloodGuard — Work Breakdown Structure (4 Members)

> CT071-3-3-DDAC Group Project | Problem #4: Flood Early Warning & Community Alert System
> Each member owns **1 distinct user role** + **minimum 2 unique, non-overlapping features** (Rule 7 & 8)

---

## Summary Matrix

| Member | Role Owned | Features (min 2) | Task 1 (30m) | Task 2 (20m) | AWS Services |
|--------|-----------|-------------------|--------------|--------------|--------------|
| **Member 1** | Resident | Flood Risk Map, Alert Subscriptions & Notifications | Frontend + Backend | SNS/SES integration | EC2, RDS, SNS, SES |
| **Member 2** | Volunteer | SOS Request Management, Shelter & Relief Coordination | Frontend + Backend | S3 file uploads | EC2, RDS, S3 |
| **Member 3** | Admin | Alert Management Console, Report Review & Region Management | Frontend + Backend | CloudWatch monitoring | EC2, RDS, CloudWatch |
| **Member 4** | Super Admin / Infra Lead | User Management, Analytics Dashboard & System Config | Frontend + Backend | Deployment (EB) + Lambda | EC2, RDS, EB, Lambda |

---

## Member 1 — Resident Role (Public-Facing Features)

### Role: Public / Resident
> The everyday user who receives flood warnings and needs to stay safe.

### Feature 1: Real-Time Flood Risk Map + Weather Dashboard
| Item | Detail |
|------|--------|
| **What** | Interactive map showing flood risk zones (color-coded by severity), weather forecast display with rainfall charts, sensor gauge readings |
| **Frontend Pages** | `/dashboard/resident` (home), `/dashboard/resident/map`, `WeatherForecast.tsx`, `RainfallChart.tsx`, `SensorGauges.tsx`, `FloodRiskBanner.tsx` |
| **Backend Modules** | `weather/` (weather.controller, weather.service), `regions/` (GET endpoints) |
| **DB Tables Used** | `regions`, `sensors` (read), `alerts` (read) |
| **API Endpoints** | `GET /api/weather/:regionId`, `GET /api/regions`, `GET /api/regions/:id/status` |
| **Cloud** | RDS (read weather/region data) |

### Feature 2: Alert Subscriptions & Push Notifications (SNS/SES)
| Item | Detail |
|------|--------|
| **What** | Residents subscribe to regions → receive email/SMS alerts when admin issues flood warning. View alert history, mark as read. Notification bell in UI. |
| **Frontend Pages** | `/dashboard/resident/alerts`, `NotificationBell.tsx` |
| **Backend Modules** | `notifications/` (notifications.controller, notifications.service) |
| **DB Tables Used** | `notifications`, `alerts` (read), `users.notificationPreferences` |
| **API Endpoints** | `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `POST /api/notifications/subscribe` |
| **Cloud (Task 2)** | **AWS SNS** (topic publish for fan-out), **AWS SES** (email delivery) |
| **Task 2 Deliverable** | SNS topic creation, SES email verification, IAM policy for sns:Publish + ses:SendEmail, demonstrate end-to-end: admin creates alert → resident gets email/SMS |

### Shared Work
- Landing page components (can split with others)
- Auth pages (login/register) — shared foundation

---

## Member 2 — Volunteer Role (Community Response)

### Role: Volunteer
> Community volunteers who respond to SOS requests, manage shelters, and coordinate relief.

### Feature 1: SOS Request Management (Submit + Claim + Track)
| Item | Detail |
|------|--------|
| **What** | Residents submit SOS requests (evacuation, rescue, medical, relief). Volunteers view available requests, claim them, update status (assigned → in_progress → completed). Priority-based queuing. |
| **Frontend Pages** | `/dashboard/resident/requests` (submit side), `/dashboard/volunteer` (home), `/dashboard/volunteer/requests` (claim/manage) |
| **Backend Modules** | `flood-requests/` (flood-requests.controller, flood-requests.service, flood-requests.dto) |
| **DB Tables Used** | `flood_requests` (CRUD) |
| **API Endpoints** | `POST /api/flood-requests`, `GET /api/flood-requests`, `PATCH /api/flood-requests/:id/claim`, `PATCH /api/flood-requests/:id/status` |
| **Cloud** | RDS (read/write requests), EC2 (compute) |

### Feature 2: Shelter & Relief Coordination + Photo Uploads (S3)
| Item | Detail |
|------|--------|
| **What** | Volunteers manage shelter info (capacity, location, status). Relief supply tracking. Upload photos of shelter conditions / relief distributions to S3 via presigned URLs. |
| **Frontend Pages** | `/dashboard/volunteer/shelters`, `/dashboard/volunteer/relief`, `/dashboard/volunteer/activity` |
| **Backend Modules** | `evacuation/` (evacuation.controller, evacuation.service), `uploads/` (uploads.controller, uploads.service) |
| **DB Tables Used** | `evacuation_routes` (shelters), `flood_requests` (relief tracking) |
| **API Endpoints** | `GET /api/evacuation/shelters`, `POST /api/evacuation/shelters`, `PATCH /api/evacuation/shelters/:id`, `POST /api/uploads/presign`, `GET /api/uploads/:key` |
| **Cloud (Task 2)** | **AWS S3** (presigned PUT/GET URLs for photo uploads), IAM policy for s3:PutObject/GetObject, bucket CORS configuration |
| **Task 2 Deliverable** | S3 bucket setup, presigned URL flow working end-to-end, demonstrate: volunteer uploads shelter photo → stored in S3 → viewable via presigned GET |

---

## Member 3 — Admin Role (Authority Dashboard)

### Role: Local Authority / Admin
> Government officials and emergency responders who manage the alert system.

### Feature 1: Alert Management Console + Report Review
| Item | Detail |
|------|--------|
| **What** | Admin creates/edits/escalates/resolves flood alerts for specific regions. Reviews community-submitted reports (approve/reject/verify). Region management (CRUD monitoring zones). |
| **Frontend Pages** | `/dashboard/admin` (home), `/dashboard/admin/alerts`, `/dashboard/admin/reports`, `/dashboard/admin/regions`, `/dashboard/admin/requests` |
| **Backend Modules** | `alerts/` (alerts.controller, alerts.service, alerts.dto), `reports/` (reports.controller, reports.service), `regions/` (admin CRUD) |
| **DB Tables Used** | `alerts` (CRUD), `reports` (review), `regions` (CRUD) |
| **API Endpoints** | `POST /api/alerts`, `PATCH /api/alerts/:id`, `GET /api/reports`, `PATCH /api/reports/:id`, `POST /api/regions`, `PATCH /api/regions/:id` |
| **Cloud** | RDS (read/write alerts, reports, regions), EC2 (compute) |

### Feature 2: CloudWatch Monitoring Dashboard + Alarms
| Item | Detail |
|------|--------|
| **What** | Set up CloudWatch dashboard (FloodGuard-Ops) with EC2 CPU, RDS connections, RDS storage, EB health metrics. Create alarms (CPU > 80%, storage < 2GB, health severe). Enable enhanced health + log streaming on both EB environments. |
| **Frontend Pages** | `/dashboard/admin/analytics` (display response metrics from backend) |
| **Backend Modules** | `analytics/` (analytics.controller, analytics.service) — response time metrics, alert stats |
| **DB Tables Used** | Aggregation queries across `alerts`, `reports`, `flood_requests` |
| **API Endpoints** | `GET /api/analytics/overview`, `GET /api/analytics/response-times`, `GET /api/analytics/trends` |
| **Cloud (Task 2)** | **AWS CloudWatch** — custom dashboard, 2-3 alarms, enhanced health reporting, log streaming |
| **Task 2 Deliverable** | CloudWatch dashboard with 4+ widgets (EC2 CPU, RDS CPU, RDS connections, EB health), 2+ alarms (CPU high, storage low), screenshots for report showing metrics populated |

---

## Member 4 — Super Admin / Infrastructure Lead

### Role: Super Admin + DevOps
> System administrator who manages users, system config, and handles cloud deployment.

### Feature 1: User Management + System Configuration
| Item | Detail |
|------|--------|
| **What** | Full CRUD on user accounts. Assign/change roles. View all users, filter by role/region. System config (alert thresholds, notification settings). Evacuation route management. |
| **Frontend Pages** | (Super Admin panel — new page needed, or extend admin), `/dashboard/admin/evacuation` |
| **Backend Modules** | `users/` (users.controller, users.service, users.dto), `evacuation/` (route management) |
| **DB Tables Used** | `users` (CRUD), `evacuation_routes` (CRUD) |
| **API Endpoints** | `GET /api/users`, `POST /api/users`, `PATCH /api/users/:id`, `DELETE /api/users/:id`, `GET /api/evacuation/routes`, `POST /api/evacuation/routes` |
| **Cloud** | RDS (user data), EC2 (compute) |

### Feature 2: AWS Deployment (Elastic Beanstalk) + Community Reports (Resident Side)
| Item | Detail |
|------|--------|
| **What** | Full AWS deployment of both frontend + backend on Elastic Beanstalk. Set up RDS PostgreSQL, configure security groups, environment variables, health checks. Resident report submission flow (submit flood report with location + description). |
| **Frontend Pages** | `/dashboard/resident/reports` (submit report form with location picker) |
| **Backend Modules** | `reports/` (POST endpoint — submit side), deployment configs (Procfile, .ebextensions, .platform/hooks) |
| **DB Tables Used** | `reports` (create) |
| **API Endpoints** | `POST /api/reports` (submit) |
| **Cloud (Task 2)** | **AWS Elastic Beanstalk** (2 environments), **RDS PostgreSQL** setup, **IAM roles**, security groups, Procfile, predeploy hooks |
| **Task 2 Deliverable** | Both EB environments running (green health), RDS connected, `eb deploy` workflow documented, health check passing at `/api/health` |

---

## Workload Matrix (For Report Submission)

| # | Task Category | Member 1 | Member 2 | Member 3 | Member 4 |
|---|---------------|----------|----------|----------|----------|
| 1 | **Frontend Pages** | Resident dashboard, Map, Alerts, Weather components | Volunteer dashboard, Requests, Shelters, Relief | Admin dashboard, Alert mgmt, Reports review, Regions | User mgmt panel, Report submission, Evacuation routes |
| 2 | **Backend Modules** | Weather, Notifications | Flood-requests, Uploads, Evacuation (shelters) | Alerts, Reports (review), Regions, Analytics | Users, Reports (submit), Evacuation (routes), Health |
| 3 | **Database Tables** | notifications, sensors (read) | flood_requests, evacuation_routes (shelters) | alerts, reports, regions | users, evacuation_routes (routes), reports (create) |
| 4 | **AWS — Task 1** | EC2 + RDS (shared) | EC2 + RDS (shared) | EC2 + RDS (shared) | EC2 + RDS (shared) |
| 5 | **AWS — Task 2** | SNS + SES | S3 | CloudWatch | Elastic Beanstalk deployment |
| 6 | **Unique Cloud Deliverable** | Email/SMS notifications via SNS/SES | File storage via S3 presigned URLs | Monitoring dashboard + alarms | Full deployment + infrastructure |

---

## Feature Non-Overlap Verification

| Feature | Owner | No Overlap? |
|---------|-------|-------------|
| Weather/Flood Risk display + Rainfall charts | Member 1 | Unique to M1 |
| SNS/SES notification delivery | Member 1 | Unique to M1 |
| SOS request lifecycle (submit/claim/complete) | Member 2 | Unique to M2 |
| S3 photo uploads (presigned URLs) | Member 2 | Unique to M2 |
| Alert CRUD (create/edit/resolve) | Member 3 | Unique to M3 |
| CloudWatch dashboard + alarms | Member 3 | Unique to M3 |
| User CRUD (manage accounts/roles) | Member 4 | Unique to M4 |
| EB deployment + infrastructure | Member 4 | Unique to M4 |

> Each member has 2+ distinct features that DO NOT overlap with any other member's work.

---

## AWS Services Coverage (Assessment Requirement)

| AWS Service | Who Implements | Task |
|-------------|---------------|------|
| **EC2 (via Elastic Beanstalk)** | Member 4 (setup), All (use) | Task 1 |
| **RDS PostgreSQL** | Member 4 (setup), All (use) | Task 1 |
| **S3** | Member 2 | Task 2 |
| **SNS** | Member 1 | Task 2 |
| **SES** | Member 1 | Task 2 |
| **CloudWatch** | Member 3 | Task 2 |
| **Elastic Beanstalk** | Member 4 | Task 1 + 2 |
| **IAM** | Member 4 (roles), All (policies for their service) | Task 1 + 2 |

---

## Timeline Suggestion (7 weeks: Week 7 → Week 14)

| Week | All Members | Focus |
|------|-------------|-------|
| **Week 7-8** | Backend APIs + DB schema finalized | Each member builds their backend module |
| **Week 9-10** | Frontend pages connected to APIs | Each member builds their frontend pages |
| **Week 11** | Task 2 cloud services | M1: SNS/SES, M2: S3, M3: CloudWatch, M4: EB deploy |
| **Week 12** | Integration testing + deployment | Deploy to AWS, test end-to-end |
| **Week 13** | Bug fixes + documentation | Report writing, screenshots, workload matrix |
| **Week 14** | Demo preparation + submission | Viva prep, final testing |

---

## Demo Checklist (Each Member Must Show)

- [ ] **Member 1:** Login as resident → see flood map → receive email alert when admin issues warning
- [ ] **Member 2:** Login as volunteer → claim SOS request → upload photo to S3 → view shelter list
- [ ] **Member 3:** Login as admin → create alert → review report → show CloudWatch dashboard with live metrics
- [ ] **Member 4:** Show EB environments (green health) → user management CRUD → `eb deploy` workflow

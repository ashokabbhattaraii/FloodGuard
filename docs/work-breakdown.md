# FloodGuard — Work Breakdown Structure (4 Members)
# TASK 1 ONLY — Frontend + Backend + AWS Deployment (EC2/EB + RDS + S3)

> CT071-3-3-DDAC Group Project | Problem #4: Flood Early Warning & Community Alert System
> **Task 1 (30 marks):** Frontend + Backend + AWS Compute (Elastic Beanstalk) + RDS PostgreSQL + S3
> **Task 2 (20 marks):** SNS, SES, Lambda, CloudWatch (separate scope — not in this breakdown)
> 
> Each member owns **1 distinct user role** + **minimum 2 unique, non-overlapping features** (Rule 7 & 8)

---

## Summary Matrix (Task 1)

| Member | Role Owned | Features (min 2) | Frontend | Backend | Database Tables | AWS Services |
|--------|-----------|-------------------|----------|---------|----------------|--------------|
| **Member 1** | Resident | Flood Risk Map + Weather Dashboard, Report Submission | 3 pages | 2 modules | regions, sensors, reports | EC2, RDS, S3 |
| **Member 2** | Volunteer | SOS Request Management, Shelter & Relief Coordination | 4 pages | 3 modules | flood_requests, evacuation_routes | EC2, RDS, S3 |
| **Member 3** | Admin | Alert Management, Report Review & Region Management | 5 pages | 3 modules | alerts, reports, regions | EC2, RDS, S3 |
| **Member 4** | Super Admin / Infra | User Management, System Config & Deployment | 2 pages | 2 modules | users, evacuation_routes | EC2, RDS, S3, EB (setup) |

---

## Member 1 — Resident Role (Public-Facing Features)

### Role: Public / Resident
> The everyday user who receives flood warnings and needs to stay safe.

### Feature 1: Real-Time Flood Risk Map + Weather Dashboard
| Item | Detail |
|------|--------|
| **What** | Interactive map showing flood risk zones (color-coded by severity), weather forecast display with rainfall charts, sensor gauge readings. Map component uses Mapbox/Leaflet to display regions with color-coded risk levels (low/moderate/high/severe). |
| **Frontend Pages** | `/dashboard/resident` (home with FloodRiskBanner), `/dashboard/resident/map` (interactive map), `WeatherForecast.tsx`, `RainfallChart.tsx`, `SensorGauges.tsx`, `FloodRiskBanner.tsx` |
| **Backend Modules** | `weather/` (weather.controller, weather.service — fetch weather data, rainfall predictions), `regions/` (regions.controller partial — GET endpoints for map data) |
| **DB Tables Used** | `regions` (read risk levels, geofences), `sensors` (read current readings), `alerts` (read active alerts for map overlay) |
| **API Endpoints** | `GET /api/weather/:regionId` (weather forecast + rainfall), `GET /api/regions` (list all regions with risk status), `GET /api/regions/:id/status` (detailed region status) |
| **AWS Services** | EC2 (via Elastic Beanstalk compute), RDS PostgreSQL (read regions/sensors/alerts) |
| **Lines of Code Estimate** | ~800 lines (frontend map + charts + components) + ~400 lines (backend weather module + region GET endpoints) |

### Feature 2: Community Report Submission (with photo upload to S3)
| Item | Detail |
|------|--------|
| **What** | Residents submit flood reports (location, description, severity estimate, optional photo). Upload photos to S3 using presigned URLs. View own submitted reports. Reports go to admin review queue. |
| **Frontend Pages** | `/dashboard/resident/reports` (form with location picker + photo upload, list of own reports) |
| **Backend Modules** | `reports/` (reports.controller, reports.service — POST/GET endpoints for report submission), `uploads/` (uploads.controller, uploads.service — presigned URL generation) |
| **DB Tables Used** | `reports` (create + read own reports), `users` (link report to submitter) |
| **API Endpoints** | `POST /api/reports` (submit report), `GET /api/reports/my` (list own reports), `POST /api/uploads/presign` (get S3 presigned PUT URL), `GET /api/uploads/:key` (presigned GET URL for viewing) |
| **AWS Services** | EC2 (compute), RDS PostgreSQL (store report metadata), **S3** (photo storage via presigned URLs), IAM (s3:PutObject, s3:GetObject permissions) |
| **Lines of Code Estimate** | ~500 lines (frontend form + location picker + upload UI) + ~350 lines (backend reports POST/GET + S3 presigned URL logic) |

### Shared Work
- Landing page components (can split with others)
- Auth pages (login/register) — shared foundation, but Member 4 owns user management backend

---

## Member 2 — Volunteer Role (Community Response)

### Role: Volunteer
> Community volunteers who respond to SOS requests, manage shelters, and coordinate relief.

### Feature 1: SOS Request Management (Submit + Claim + Track)
| Item | Detail |
|------|--------|
| **What** | Residents submit SOS requests (evacuation, rescue, medical, relief). Volunteers view available requests on a queue (filterable by type, priority, status), claim them (changes status to `assigned`), update status (`in_progress` → `completed`). Priority-based sorting. Real-time request counts. |
| **Frontend Pages** | `/dashboard/resident/requests` (resident submit side — form with request type, priority, location, description), `/dashboard/volunteer` (volunteer home with request summary cards), `/dashboard/volunteer/requests` (queue table with claim/update actions, status badges, filters) |
| **Backend Modules** | `flood-requests/` (flood-requests.controller, flood-requests.service, flood-requests.dto) — full CRUD, claim logic, status transitions, priority queuing |
| **DB Tables Used** | `flood_requests` (CRUD — columns: id, userId, type, priority, status, location, description, assignedVolunteerId, timestamps) |
| **API Endpoints** | `POST /api/flood-requests` (resident submit), `GET /api/flood-requests` (volunteer queue with filters), `GET /api/flood-requests/:id` (details), `PATCH /api/flood-requests/:id/claim` (assign to volunteer), `PATCH /api/flood-requests/:id/status` (update progress), `GET /api/flood-requests/stats` (counts by status) |
| **AWS Services** | EC2 (compute), RDS PostgreSQL (requests CRUD) |
| **Lines of Code Estimate** | ~900 lines (frontend: submit form + queue table + filters + status management UI) + ~600 lines (backend: CRUD + claim logic + validation) |

### Feature 2: Shelter & Relief Coordination (with photo upload to S3)
| Item | Detail |
|------|--------|
| **What** | Volunteers manage shelter information (name, location, capacity, current occupancy, status: `open`/`full`/`closed`). Relief supply tracking linked to shelters (type, quantity, arrival date). Upload photos of shelter conditions / relief distributions to S3 via presigned URLs. View shelter list with status indicators. |
| **Frontend Pages** | `/dashboard/volunteer/shelters` (shelter list + CRUD form + photo upload), `/dashboard/volunteer/relief` (relief supply management per shelter), `/dashboard/volunteer/activity` (activity log of own actions — shelter updates, request completions) |
| **Backend Modules** | `evacuation/` (evacuation.controller, evacuation.service — shelter CRUD, relief supply tracking), `uploads/` (uploads.controller, uploads.service — presigned URL generation for shelter photos, shared with Member 1 but extended for shelter use case) |
| **DB Tables Used** | `evacuation_routes` (shelters: id, name, location, capacity, currentOccupancy, status, photoUrl), `flood_requests` (relief tracking via request type filtering), `users` (volunteer activity linking) |
| **API Endpoints** | `GET /api/evacuation/shelters` (list all), `POST /api/evacuation/shelters` (create), `PATCH /api/evacuation/shelters/:id` (update capacity/status), `DELETE /api/evacuation/shelters/:id` (soft delete), `POST /api/uploads/presign` (S3 presigned PUT URL for shelter photos), `GET /api/uploads/:key` (presigned GET URL for viewing photos) |
| **AWS Services** | EC2 (compute), RDS PostgreSQL (shelter + relief data), **S3** (photo storage via presigned URLs), IAM (s3:PutObject, s3:GetObject permissions) |
| **Lines of Code Estimate** | ~700 lines (frontend: shelter CRUD forms + relief tables + photo upload UI) + ~550 lines (backend: evacuation module + S3 presigned URL extension) |

---

## Member 3 — Admin Role (Authority Dashboard)

### Role: Local Authority / Admin
> Government officials and emergency responders who manage the alert system.

### Feature 1: Alert Management Console (full CRUD + escalation)
| Item | Detail |
|------|--------|
| **What** | Admin creates flood alerts for specific regions (severity: `info`/`warning`/`severe`/`critical`, message, affected regions). Edit/escalate existing alerts (change severity, update message). Resolve/expire alerts when flood subsides. View all alerts (active + historical) with filters (region, severity, date range). Alert list shows: region name, severity badge, timestamp, status. |
| **Frontend Pages** | `/dashboard/admin` (home with active alert summary cards), `/dashboard/admin/alerts` (alert list + CRUD form), `/dashboard/admin/alerts/[id]` (alert detail page with escalation/resolution actions) |
| **Backend Modules** | `alerts/` (alerts.controller, alerts.service, alerts.dto) — full CRUD, severity escalation logic, resolution workflow, validation (admin-only, region existence check) |
| **DB Tables Used** | `alerts` (CRUD — columns: id, regionId, severity, message, issuedBy, status, createdAt, resolvedAt), `regions` (read for region dropdown), `users` (issuedBy link) |
| **API Endpoints** | `POST /api/alerts` (create), `GET /api/alerts` (list with filters), `GET /api/alerts/:id` (details), `PATCH /api/alerts/:id` (update severity/message), `PATCH /api/alerts/:id/escalate` (bump severity), `PATCH /api/alerts/:id/resolve` (close alert), `GET /api/alerts/stats` (count by severity) |
| **AWS Services** | EC2 (compute), RDS PostgreSQL (alerts CRUD) |
| **Lines of Code Estimate** | ~800 lines (frontend: alert list + create/edit forms + escalation UI + filters) + ~650 lines (backend: alerts module with full CRUD + business logic) |

### Feature 2: Report Review & Region Management
| Item | Detail |
|------|--------|
| **What** | **Report Review:** Admin reviews community-submitted reports (from Member 1's resident feature). View all reports with filters (status: `pending`/`verified`/`rejected`, region, date). Approve/verify reports (status → `verified`, adds admin note), reject reports (status → `rejected`, reason required). **Region Management:** Admin CRUD on monitoring zones (name, boundary coordinates, risk level, sensor assignments). Regions are used by alerts, map, and weather modules. |
| **Frontend Pages** | `/dashboard/admin/reports` (report list with review actions, status badges, photo preview if available), `/dashboard/admin/reports/[id]` (detailed review page with map location, full photo, approve/reject form), `/dashboard/admin/regions` (region list + CRUD form with map boundary picker), `/dashboard/admin/requests` (view all SOS requests — read-only overview for situational awareness, full management is Member 2's volunteer feature) |
| **Backend Modules** | `reports/` (reports.controller, reports.service — GET all reports, PATCH for review actions, admin-only endpoints), `regions/` (regions.controller, regions.service — full CRUD, geofence validation) |
| **DB Tables Used** | `reports` (read + update status/adminNote), `regions` (CRUD — columns: id, name, boundary (geojson), riskLevel, sensorIds, createdAt), `flood_requests` (read-only for request overview) |
| **API Endpoints** | `GET /api/reports` (admin: all reports with filters), `GET /api/reports/:id` (detail), `PATCH /api/reports/:id/verify` (approve), `PATCH /api/reports/:id/reject` (reject with reason), `POST /api/regions` (create), `GET /api/regions` (list all — shared with Member 1 map), `PATCH /api/regions/:id` (update), `DELETE /api/regions/:id` (soft delete) |
| **AWS Services** | EC2 (compute), RDS PostgreSQL (reports review + regions CRUD), S3 (read report photos via Member 1's presigned URLs — no new S3 logic needed) |
| **Lines of Code Estimate** | ~900 lines (frontend: report review UI + region CRUD forms + map boundary picker) + ~700 lines (backend: reports review module + regions full CRUD) |

---

## Member 4 — Super Admin / Infrastructure Lead

### Role: Super Admin + DevOps
> System administrator who manages users, system config, and handles cloud deployment.

### Feature 1: User Management + Role Assignment
| Item | Detail |
|------|--------|
| **What** | Full CRUD on user accounts (create, view all, update, deactivate/delete). Assign/change user roles (`resident`, `volunteer`, `admin`, `super_admin`). View all users in a table with filters (role, region, status: `active`/`inactive`). Edit user profiles (name, email, phone, assigned regions). Password reset functionality. Super admin dashboard showing user stats (total users, by role, recent registrations). |
| **Frontend Pages** | `/dashboard/super-admin` (home with user stats cards), `/dashboard/super-admin/users` (user list table + CRUD form + role assignment dropdown) |
| **Backend Modules** | `users/` (users.controller, users.service, users.dto) — full CRUD, role validation, authentication hooks (register/login endpoints, password hashing), super-admin-only guard |
| **DB Tables Used** | `users` (CRUD — columns: id, email, passwordHash, name, phone, role, assignedRegions, status, createdAt, lastLogin) |
| **API Endpoints** | `POST /api/auth/register` (create user), `POST /api/auth/login` (authenticate), `GET /api/users` (list all — super admin only), `GET /api/users/:id` (details), `PATCH /api/users/:id` (update profile/role), `DELETE /api/users/:id` (deactivate), `PATCH /api/users/:id/reset-password` (admin password reset) |
| **AWS Services** | EC2 (compute), RDS PostgreSQL (users CRUD) |
| **Lines of Code Estimate** | ~600 lines (frontend: user list + CRUD form + role selector) + ~800 lines (backend: users module + auth endpoints + JWT + guards + password hashing) |

### Feature 2: AWS Deployment (Elastic Beanstalk + RDS + S3 setup) + Evacuation Route Management
| Item | Detail |
|------|--------|
| **What** | **Deployment:** Full AWS infrastructure setup. Deploy frontend and backend on Elastic Beanstalk (2 environments: `floodguard-frontend-prod`, `floodguard-backend-prod`). Configure RDS PostgreSQL (security group, inbound rules, environment variables `DB_HOST`, `DB_PASSWORD`). Set up S3 bucket for photo uploads (CORS, IAM policy, environment variable `S3_BUCKET_NAME`). Create Procfile, `.platform/hooks/predeploy`, health check endpoint. Document `eb init`, `eb create`, `eb deploy` workflow. **Evacuation Routes:** Admin CRUD on evacuation route recommendations (start location, end location/shelter, route instructions, estimated time, safe zones). Used by residents during alerts. |
| **Frontend Pages** | `/dashboard/admin/evacuation` (route list + CRUD form with map picker for start/end points) |
| **Backend Modules** | `health/` (health.controller — `/api/health` endpoint for EB health checks), `evacuation/` (evacuation.controller, evacuation.service — route CRUD, separate from Member 2's shelter management), deployment configs (Procfile, `.ebextensions/`, `.platform/hooks/predeploy/01_migrate.sh`) |
| **DB Tables Used** | `evacuation_routes` (CRUD — columns: id, startLocation, endLocation, shelterId, instructions, estimatedTime, safeZones, createdAt) — shared table with Member 2 but different use case (routes vs shelters) |
| **API Endpoints** | `GET /api/health` (health check), `GET /api/evacuation/routes` (list all routes), `POST /api/evacuation/routes` (create), `PATCH /api/evacuation/routes/:id` (update), `DELETE /api/evacuation/routes/:id` (delete) |
| **AWS Services** | **Elastic Beanstalk** (2 environments: frontend + backend), **RDS PostgreSQL** (database setup, security groups, parameter store for credentials), **S3** (bucket creation, CORS, IAM policy), **IAM** (EB service role, EC2 instance profile, S3 access policy), EC2 (compute via EB) |
| **Lines of Code Estimate** | ~400 lines (frontend: evacuation route form + map picker) + ~500 lines (backend: health module + evacuation route CRUD + deployment scripts) + **Deployment effort:** EB setup, RDS config, S3 bucket, security groups, IAM policies, environment variables, documentation |

---

## Workload Matrix (Task 1 Only — For Report Submission)

| # | Task Category | Member 1 | Member 2 | Member 3 | Member 4 |
|---|---------------|----------|----------|----------|----------|
| **1** | **Frontend Pages** | 3 pages: Resident home, Map, Reports submit | 4 pages: Volunteer home, Requests queue, Shelters, Relief | 5 pages: Admin home, Alerts list, Alert detail, Reports review, Regions | 2 pages: Super admin home, Users list |
| **2** | **Backend Modules** | 3 modules: Weather, Regions (GET), Reports (POST), Uploads (presigned URLs) | 3 modules: Flood-requests, Evacuation (shelters), Uploads (extended) | 3 modules: Alerts, Reports (review), Regions (CRUD) | 3 modules: Users, Health, Evacuation (routes) |
| **3** | **Database Tables (Primary)** | regions (read), sensors (read), reports (create) | flood_requests (CRUD), evacuation_routes (shelters) | alerts (CRUD), reports (review), regions (CRUD) | users (CRUD), evacuation_routes (routes) |
| **4** | **API Endpoints** | 6 endpoints (weather, regions GET, reports POST, uploads presign) | 8 endpoints (flood-requests CRUD, shelters CRUD, uploads) | 11 endpoints (alerts CRUD, reports review, regions CRUD) | 6 endpoints (users CRUD, health, routes CRUD) |
| **5** | **Lines of Code (Estimate)** | ~2,050 lines (1,300 frontend + 750 backend) | ~2,250 lines (1,600 frontend + 1,150 backend) | ~2,450 lines (1,700 frontend + 1,350 backend) | ~2,300 lines (1,000 frontend + 1,300 backend + deployment) |
| **6** | **AWS Services Used** | EC2 (EB), RDS, S3 (photo upload) | EC2 (EB), RDS, S3 (shelter photos) | EC2 (EB), RDS, S3 (read report photos) | EC2 (EB), RDS, S3 (setup), **EB deployment lead** |
| **7** | **Unique Complexity** | Map integration (Mapbox/Leaflet), weather data display, rainfall charts | Priority queue logic, request lifecycle state machine, shelter capacity tracking | Alert escalation logic, report review workflow, region geofence validation | Auth system (JWT, password hashing, guards), EB + RDS + S3 infrastructure setup |

---

## Feature Non-Overlap Verification (Task 1)

| Feature | Owner | No Overlap? | Evidence |
|---------|-------|-------------|----------|
| **Flood Risk Map + Weather Dashboard** | Member 1 | ✅ Unique | Only M1 builds map component, weather module, rainfall charts, sensor gauges |
| **Community Report Submission (with S3 photo upload)** | Member 1 | ✅ Unique | Only M1 builds resident report submission form, reports POST endpoint, presigned URL generation |
| **SOS Request Management (submit/claim/complete lifecycle)** | Member 2 | ✅ Unique | Only M2 builds flood-requests module, volunteer queue, claim/status logic, priority sorting |
| **Shelter & Relief Coordination (with S3 photo upload)** | Member 2 | ✅ Unique | Only M2 builds shelter CRUD, relief tracking, shelter photo uploads (uses shared uploads module but extends it) |
| **Alert Management Console (CRUD + escalation)** | Member 3 | ✅ Unique | Only M3 builds alerts module, create/escalate/resolve workflows, severity management |
| **Report Review & Region Management** | Member 3 | ✅ Unique | Only M3 builds report review workflow (verify/reject), regions CRUD, admin oversight of requests |
| **User Management + Role Assignment** | Member 4 | ✅ Unique | Only M4 builds users module, auth system (JWT, guards), role assignment, super admin panel |
| **AWS Deployment (EB + RDS + S3 setup) + Evacuation Routes** | Member 4 | ✅ Unique | Only M4 handles infrastructure setup (EB, RDS config, S3 bucket, security groups, IAM), evacuation route CRUD |

> **Non-Overlap Summary:** Each member has 2 distinct features with NO functional overlap. Shared infrastructure (RDS, S3, EB) is used by all but OWNED by Member 4 (setup responsibility). Uploads module is SHARED (M1 creates, M2 extends) but use cases are distinct (reports vs shelters).

---

## AWS Services Coverage (Task 1 — 30 marks)

| AWS Service | Who Implements | What | Task |
|-------------|---------------|------|------|
| **Elastic Beanstalk** | Member 4 (setup + deploy), All (deployed on) | 2 environments (frontend + backend), Procfile, `.platform/hooks`, environment variables, health checks | **Task 1** ✅ |
| **EC2 (via EB)** | Member 4 (EB config), All (compute) | Auto-provisioned via EB (t3.micro or t3.small instances), security groups, SSH access | **Task 1** ✅ |
| **RDS PostgreSQL** | Member 4 (setup), All (use) | Database creation, security group (port 5432 from EB), parameter store for credentials, schema migrations | **Task 1** ✅ |
| **S3** | Member 4 (bucket setup), Member 1 & 2 (presigned URLs) | Bucket creation, CORS config, IAM policy (s3:PutObject, s3:GetObject), presigned URL generation for report + shelter photos | **Task 1** ✅ |
| **IAM** | Member 4 (roles + instance profile), All (service-specific policies) | EB service role, EC2 instance profile, S3 access policy, RDS parameter store access | **Task 1** ✅ |

> **Task 1 Deliverables:** Both EB environments (green health), RDS connected (show DB connection in app), S3 photo uploads working (presigned URLs), health check passing, `eb deploy` workflow documented.

---

## What's NOT in Task 1 (Task 2 scope — not in this breakdown)

| AWS Service | Owner (Task 2) | What |
|-------------|---------------|------|
| **SNS** | Member 1 | Topic creation, email/SMS subscriptions, publish alerts |
| **SES** | Member 1 | Email verification, send templated emails |
| **Lambda** | TBD | Serverless functions (e.g., alert processing, scheduled jobs) |
| **CloudWatch** | Member 3 | Custom dashboard, alarms (CPU, storage, health), log streaming |

---

## Timeline Suggestion (Task 1 — 5 weeks)

| Week | All Members | Member 1 | Member 2 | Member 3 | Member 4 |
|------|-------------|----------|----------|----------|----------|
| **Week 1-2** | **Backend Development** | Weather module, Reports POST, Regions GET | Flood-requests module, Evacuation (shelters) | Alerts module, Reports review, Regions CRUD | Users module, Auth (JWT), Health endpoint |
| | *Milestone* | Weather API working, report submission backend done | Request queue API working, shelter CRUD done | Alert CRUD working, report review API done | Auth working (register/login), user CRUD done |
| **Week 3-4** | **Frontend Development** | Resident home, Map (Leaflet/Mapbox), Report submit form | Volunteer home, Request queue, Shelters page | Admin home, Alerts console, Report review UI, Regions page | Super admin home, User management page |
| | *Milestone* | Map shows regions, weather dashboard displays data, report form submits to backend | Request queue shows live data, volunteers can claim/update, shelter form works | Admin can create/escalate alerts, review reports, manage regions | User CRUD UI working, role assignment functional |
| **Week 5** | **AWS Deployment + Integration** | Test report photo upload to S3 (presigned URLs) | Test shelter photo upload to S3, request lifecycle end-to-end | Test alert → region mapping, report review workflow | **Deploy both EB environments**, RDS connected, S3 bucket configured |
| | *Milestone* | Photos upload successfully, map shows real alert data | Volunteers can upload shelter photos, requests update in real-time | Alerts appear on resident map, reports flow to admin review | **Green health on EB**, all APIs accessible, database migrations run |

> **End of Task 1 Deliverable:** Both frontend + backend deployed on Elastic Beanstalk, RDS PostgreSQL connected, S3 photo uploads working, all features functional, health checks passing.

---

## Demo Checklist (Task 1 — Each Member Must Show)

### Member 1 — Resident Features
- [ ] Login as resident
- [ ] View flood risk map with color-coded regions (low/moderate/high/severe)
- [ ] See weather forecast + rainfall charts on resident dashboard
- [ ] Submit flood report (location, description, photo upload to S3)
- [ ] View own submitted reports list
- [ ] Show uploaded photo is stored in S3 (check S3 console or presigned GET URL)

### Member 2 — Volunteer Features
- [ ] Login as volunteer
- [ ] View SOS request queue (filterable by type, priority, status)
- [ ] Claim an available request (status changes to `assigned`)
- [ ] Update request status to `in_progress` → `completed`
- [ ] View shelter list, create/edit shelter (name, location, capacity, status)
- [ ] Upload shelter photo to S3 (via presigned URL)
- [ ] View uploaded shelter photo in UI

### Member 3 — Admin Features
- [ ] Login as admin
- [ ] Create new flood alert (select region, severity, message)
- [ ] Escalate existing alert (bump severity from `warning` → `severe`)
- [ ] Resolve alert (mark as closed)
- [ ] Review community-submitted reports (view all, filter by status)
- [ ] Verify/approve report OR reject with reason
- [ ] Manage regions (create new region, edit boundaries, update risk level)
- [ ] Show alert appears on resident map after creation

### Member 4 — Super Admin + Infrastructure
- [ ] Show both EB environments running (green health in EB console)
- [ ] Show RDS PostgreSQL connected (query users table via backend API or DB client)
- [ ] Show S3 bucket with uploaded photos (list objects in S3 console)
- [ ] Login as super admin
- [ ] View all users (filter by role: resident, volunteer, admin)
- [ ] Create new user with specific role
- [ ] Edit user role (change resident → volunteer)
- [ ] Manage evacuation routes (create route with start/end locations, instructions)
- [ ] Document `eb deploy` workflow (show commands, health check passing at `/api/health`)

---

## Task 1 Submission Artifacts

1. **Deployed Application URLs**
   - Frontend: `http://floodguard-frontend-prod.elasticbeanstalk.com`
   - Backend: `http://floodguard-backend-prod.elasticbeanstalk.com`
   - Health check: `http://floodguard-backend-prod.elasticbeanstalk.com/api/health` (should return `200 OK`)

2. **AWS Console Screenshots** (each member takes screenshots of their services)
   - Member 4: Elastic Beanstalk environments (green health), RDS instance (status: available), S3 bucket (with uploaded objects)
   - Member 1: S3 console showing uploaded report photos
   - Member 2: S3 console showing uploaded shelter photos
   - Member 3: CloudWatch Logs (EB log streams — if available, otherwise show RDS connection logs)

3. **Database Evidence**
   - Export sample data from each table (users, regions, alerts, reports, flood_requests, evacuation_routes)
   - Show foreign key relationships working (e.g., alert.regionId → regions.id)

4. **Code Repository**
   - Separate branches per member: `member1-resident`, `member2-volunteer`, `member3-admin`, `member4-infra`
   - Clear commit history showing each member's contributions
   - README with deployment instructions

5. **Workload Matrix** (for report)
   - Use the matrix above (Frontend Pages, Backend Modules, Database Tables, API Endpoints, Lines of Code, AWS Services, Unique Complexity)
   - Each member highlights their unique contributions

---

## Equal Division Proof (Lines of Code + Effort)

| Member | Frontend LOC | Backend LOC | Deployment Effort | Total Estimated LOC | Unique Complexity |
|--------|-------------|-------------|-------------------|---------------------|-------------------|
| **Member 1** | ~1,300 | ~750 | 0 | **~2,050** | Map integration, weather data display, S3 presigned URLs |
| **Member 2** | ~1,600 | ~1,150 | 0 | **~2,250** | Request lifecycle state machine, shelter capacity tracking, S3 presigned URLs |
| **Member 3** | ~1,700 | ~1,350 | 0 | **~2,450** | Alert escalation logic, report review workflow, region geofence validation |
| **Member 4** | ~1,000 | ~1,300 | **EB + RDS + S3 setup** | **~2,300** + deployment | Auth system (JWT, guards), infrastructure setup (EB, RDS config, S3 bucket, IAM) |

> **Conclusion:** Workload is roughly equal (~2,050-2,450 LOC per member). Member 4 has slightly fewer frontend pages but compensates with deployment responsibility (EB, RDS, S3 setup, security groups, IAM policies, health checks, Procfile, migration scripts).

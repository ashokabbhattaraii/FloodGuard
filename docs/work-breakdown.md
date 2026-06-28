# FloodGuard — Work Breakdown Structure (4 Members)
# TASK 1 ONLY — Frontend + Backend + AWS Deployment (EC2/EB + RDS + S3)

> CT071-3-3-DDAC Group Project | Problem #4: Flood Early Warning & Community Alert System
> **Task 1 (30 marks):** Frontend + Backend + AWS Compute (Elastic Beanstalk) + RDS PostgreSQL + S3
> **Task 2 (20 marks):** SNS, SES, Lambda, CloudWatch (separate scope — not in this breakdown)
> 
> Each member owns **minimum 2 unique, non-overlapping features** (Rule 7 & 8)
> **System Roles:** Public/Resident, Local Authority/Admin, Super Admin (per system.md)

---

## Summary Matrix (Task 1)

| Member | Primary Role Focus | Features (min 2) | Frontend | Backend | Database Tables | AWS Services |
|--------|-----------|-------------------|----------|---------|----------------|--------------|
| **Member 1** | Resident (Public) | Flood Risk Map + Weather Dashboard, Report Submission | 3 pages | 3 modules | regions, sensors, reports | EC2, RDS, S3 |
| **Member 2** | Resident (Emergency) | SOS Request Management, Evacuation & Shelter System | 4 pages | 2 modules | flood_requests, evacuation_routes | EC2, RDS, S3 |
| **Member 3** | Admin (Authority) | Alert Management, Report Review & Region Management | 5 pages | 3 modules | alerts, reports, regions | EC2, RDS, S3 |
| **Member 4** | Super Admin / Infra | User Management, System Config & AWS Deployment | 2 pages | 2 modules | users, system_config | EC2, RDS, S3, EB (setup) |

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

## Member 2 — Resident Emergency Response Features

### Role: Public / Resident (Emergency Response)
> Resident-facing emergency features: SOS requests and evacuation coordination during flood events.

### Feature 1: SOS Request Management (Submit + Track)
| Item | Detail |
|------|--------|
| **What** | Residents submit SOS requests for emergency help (evacuation, rescue, medical, relief supplies). Select request type, priority level, location, and description. Track status of submitted requests (pending → assigned → in_progress → completed). View request history with timestamps. Priority-based display. Admin can view and assign requests to responders. |
| **Frontend Pages** | `/dashboard/resident/requests` (submit form with request type, priority, location, description), `/dashboard/resident/requests/track` (list of own requests with status tracking), `/dashboard/resident/emergency` (emergency contact card + SOS quick actions) |
| **Backend Modules** | `flood-requests/` (flood-requests.controller, flood-requests.service, flood-requests.dto) — POST (create), GET (user's own requests), status tracking, priority validation |
| **DB Tables Used** | `flood_requests` (columns: id, userId, type, priority, status, location, description, requestedAt, respondedAt, completedAt) |
| **API Endpoints** | `POST /api/flood-requests` (resident submit), `GET /api/flood-requests/my` (user's own requests), `GET /api/flood-requests/:id` (request details), `GET /api/flood-requests/stats` (personal stats: total submitted, completed, pending) |
| **AWS Services** | EC2 (compute), RDS PostgreSQL (requests CRUD) |
| **Lines of Code Estimate** | ~700 lines (frontend: submit form + tracking UI + emergency dashboard) + ~500 lines (backend: request creation + status tracking + validation) |

### Feature 2: Evacuation Route & Shelter Finder
| Item | Detail |
|------|--------|
| **What** | Residents view evacuation routes and shelter locations during flood alerts. Interactive map showing nearest shelters with real-time capacity info (total capacity, current occupancy, status: open/full/closed). Turn-by-turn evacuation route suggestions based on current location. Shelter details: name, address, distance, estimated travel time, available facilities, contact info. Filter by distance, capacity, and open status. |
| **Frontend Pages** | `/dashboard/resident/evacuation` (map with shelter markers + route overlay), `/dashboard/resident/evacuation/routes` (list of recommended routes based on location), `/dashboard/resident/shelters` (shelter list with distance sorting, capacity indicators, directions button) |
| **Backend Modules** | `evacuation/` (evacuation.controller, evacuation.service — GET routes and shelters, distance calculation, capacity checks) |
| **DB Tables Used** | `evacuation_routes` (routes: id, startLocation, endLocation, distance, estimatedTime, instructions, isSafe), `evacuation_shelters` (shelters: id, name, location, capacity, currentOccupancy, status, facilities, contactInfo) |
| **API Endpoints** | `GET /api/evacuation/routes` (list routes by location), `GET /api/evacuation/routes/nearest` (get nearest safe route), `GET /api/evacuation/shelters` (list all shelters with filters), `GET /api/evacuation/shelters/nearest` (find nearest available shelter), `GET /api/evacuation/shelters/:id` (shelter details) |
| **AWS Services** | EC2 (compute), RDS PostgreSQL (routes + shelter data) |
| **Lines of Code Estimate** | ~800 lines (frontend: evacuation map + route display + shelter list + direction UI) + ~450 lines (backend: evacuation routing logic + distance calculation + capacity filtering) |

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
| **Frontend Pages** | `/dashboard/admin/reports` (report list with review actions, status badges, photo preview if available), `/dashboard/admin/reports/[id]` (detailed review page with map location, full photo, approve/reject form), `/dashboard/admin/regions` (region list + CRUD form with map boundary picker), `/dashboard/admin/requests` (view all SOS requests with assignment/response management) |
| **Backend Modules** | `reports/` (reports.controller, reports.service — GET all reports, PATCH for review actions, admin-only endpoints), `regions/` (regions.controller, regions.service — full CRUD, geofence validation) |
| **DB Tables Used** | `reports` (read + update status/adminNote), `regions` (CRUD — columns: id, name, boundary (geojson), riskLevel, sensorIds, createdAt), `flood_requests` (read-only for request overview) |
| **API Endpoints** | `GET /api/reports` (admin: all reports with filters), `GET /api/reports/:id` (detail), `PATCH /api/reports/:id/verify` (approve), `PATCH /api/reports/:id/reject` (reject with reason), `POST /api/regions` (create), `GET /api/regions` (list all — shared with Member 1 map), `PATCH /api/regions/:id` (update), `DELETE /api/regions/:id` (soft delete), `GET /api/flood-requests` (admin: all requests), `PATCH /api/flood-requests/:id/assign` (assign responder), `PATCH /api/flood-requests/:id/status` (update status) |
| **AWS Services** | EC2 (compute), RDS PostgreSQL (reports review + regions CRUD), S3 (read report photos via Member 1's presigned URLs — no new S3 logic needed) |
| **Lines of Code Estimate** | ~900 lines (frontend: report review UI + region CRUD forms + map boundary picker) + ~700 lines (backend: reports review module + regions full CRUD) |

---

## Member 4 — Super Admin & Infrastructure Lead

### Role: Super Admin + DevOps
> System administrator who manages users, system configuration, and AWS cloud deployment.

### Feature 1: User Management + Role Assignment
| Item | Detail |
|------|--------|
| **What** | Full CRUD on user accounts (create, view all, update, deactivate/delete). Assign/change user roles (`resident`, `admin`, `super_admin`). View all users in a table with filters (role, region, status: `active`/`inactive`). Edit user profiles (name, email, phone, assigned regions). Password reset functionality. Super admin dashboard showing user stats (total users, by role, recent registrations, active sessions). Activity logs showing user actions. |
| **Frontend Pages** | `/dashboard/super-admin` (home with user stats cards), `/dashboard/super-admin/users` (user list table + CRUD form + role assignment dropdown) |
| **Backend Modules** | `users/` (users.controller, users.service, users.dto) — full CRUD, role validation, authentication hooks (register/login endpoints, password hashing with bcrypt), super-admin-only guard |
| **DB Tables Used** | `users` (CRUD — columns: id, email, passwordHash, name, phone, role, assignedRegions, status, createdAt, lastLogin) |
| **API Endpoints** | `POST /api/auth/register` (create user), `POST /api/auth/login` (authenticate), `GET /api/users` (list all — super admin only), `GET /api/users/:id` (details), `PATCH /api/users/:id` (update profile/role), `DELETE /api/users/:id` (deactivate), `PATCH /api/users/:id/reset-password` (admin password reset) |
| **AWS Services** | EC2 (compute), RDS PostgreSQL (users CRUD) |
| **Lines of Code Estimate** | ~600 lines (frontend: user list + CRUD form + role selector) + ~800 lines (backend: users module + auth endpoints + JWT + guards + password hashing) |

### Feature 2: System Configuration + AWS Deployment (EB + RDS + S3 setup)
| Item | Detail |
|------|--------|
| **What** | **System Configuration:** Super admin manages system-wide settings: alert thresholds (water level triggers for each severity), notification preferences (email/SMS toggle), sensor data refresh intervals, default region risk levels, emergency contact information, system maintenance mode. Configuration dashboard with validation. **AWS Deployment:** Full infrastructure setup. Deploy frontend and backend on Elastic Beanstalk (2 environments: `floodguard-frontend-prod`, `floodguard-backend-prod`). Configure RDS PostgreSQL (security group, inbound rules, environment variables `DB_HOST`, `DB_PASSWORD`). Set up S3 bucket for photo uploads (CORS, IAM policy, environment variable `S3_BUCKET_NAME`). Create Procfile, `.platform/hooks/predeploy`, health check endpoint. Document `eb init`, `eb create`, `eb deploy` workflow. |
| **Frontend Pages** | `/dashboard/super-admin/config` (system configuration form with alert thresholds, notification settings, sensor intervals), `/dashboard/super-admin/aws` (AWS resource monitoring: EB health, RDS status, S3 usage) |
| **Backend Modules** | `system-config/` (system-config.controller, system-config.service — GET/PATCH config), `health/` (health.controller — `/api/health` endpoint for EB health checks), deployment configs (Procfile, `.ebextensions/`, `.platform/hooks/predeploy/01_migrate.sh`) |
| **DB Tables Used** | `system_config` (CRUD — columns: id, key, value, category, description, updatedBy, updatedAt) — stores all system-wide configuration |
| **API Endpoints** | `GET /api/system-config` (all settings — super admin only), `GET /api/system-config/:key` (single setting), `PATCH /api/system-config/:key` (update setting), `GET /api/health` (health check), `GET /api/health/detailed` (EB + RDS + S3 status) |
| **AWS Services** | **Elastic Beanstalk** (2 environments: frontend + backend), **RDS PostgreSQL** (database setup, security groups, parameter store for credentials), **S3** (bucket creation, CORS, IAM policy), **IAM** (EB service role, EC2 instance profile, S3 access policy), EC2 (compute via EB) |
| **Lines of Code Estimate** | ~500 lines (frontend: config form + AWS monitoring dashboard) + ~600 lines (backend: system-config module + health checks + deployment scripts) + **Deployment effort:** EB setup, RDS config, S3 bucket, security groups, IAM policies, environment variables, documentation |

---

## Workload Matrix (Task 1 Only — For Report Submission)

| # | Task Category | Member 1 | Member 2 | Member 3 | Member 4 |
|---|---------------|----------|----------|----------|----------|
| **1** | **Frontend Pages** | 3 pages: Resident home, Map, Reports submit | 4 pages: Resident emergency, Requests track, Evacuation map, Shelters | 5 pages: Admin home, Alerts list, Alert detail, Reports review, Regions | 2 pages: Super admin home, Users list, Config |
| **2** | **Backend Modules** | 3 modules: Weather, Regions (GET), Reports (POST), Uploads (presigned URLs) | 2 modules: Flood-requests, Evacuation (routes + shelters) | 3 modules: Alerts, Reports (review + admin request mgmt), Regions (CRUD) | 3 modules: Users, System-config, Health |
| **3** | **Database Tables (Primary)** | regions (read), sensors (read), reports (create) | flood_requests (CRUD), evacuation_routes, evacuation_shelters | alerts (CRUD), reports (review), regions (CRUD) | users (CRUD), system_config (CRUD) |
| **4** | **API Endpoints** | 6 endpoints (weather, regions GET, reports POST, uploads presign) | 9 endpoints (flood-requests CRUD, routes GET, shelters GET, nearest finder) | 14 endpoints (alerts CRUD, reports review, regions CRUD, request admin mgmt) | 9 endpoints (users CRUD, auth, health, system-config CRUD) |
| **5** | **Lines of Code (Estimate)** | ~2,050 lines (1,300 frontend + 750 backend) | ~2,150 lines (1,500 frontend + 950 backend) | ~2,500 lines (1,750 frontend + 1,400 backend) | ~2,300 lines (1,100 frontend + 1,400 backend + deployment) |
| **6** | **AWS Services Used** | EC2 (EB), RDS, S3 (photo upload) | EC2 (EB), RDS (evacuation data) | EC2 (EB), RDS, S3 (read report photos) | EC2 (EB), RDS, S3 (setup), **EB deployment lead** |
| **7** | **Unique Complexity** | Map integration (Mapbox/Leaflet), weather data display, rainfall charts, S3 presigned URLs | SOS request lifecycle, evacuation routing logic, distance calculation, shelter capacity filtering | Alert escalation logic, report review workflow, region geofence validation, admin request coordination | Auth system (JWT, password hashing, guards), system config management, EB + RDS + S3 infrastructure setup |

---

## Feature Non-Overlap Verification (Task 1)

| Feature | Owner | No Overlap? | Evidence |
|---------|-------|-------------|----------|
| **Flood Risk Map + Weather Dashboard** | Member 1 | ✅ Unique | Only M1 builds map component, weather module, rainfall charts, sensor gauges |
| **Community Report Submission (with S3 photo upload)** | Member 1 | ✅ Unique | Only M1 builds resident report submission form, reports POST endpoint, presigned URL generation |
| **SOS Request Management (submit + track)** | Member 2 | ✅ Unique | Only M2 builds flood-requests module (resident side), request submission form, status tracking, priority logic |
| **Evacuation Route & Shelter Finder** | Member 2 | ✅ Unique | Only M2 builds evacuation routing logic, shelter finder, distance calculation, route map display |
| **Alert Management Console (CRUD + escalation)** | Member 3 | ✅ Unique | Only M3 builds alerts module, create/escalate/resolve workflows, severity management |
| **Report Review & Region Management + Request Admin** | Member 3 | ✅ Unique | Only M3 builds report review workflow (verify/reject), regions CRUD, admin request assignment/coordination |
| **User Management + Role Assignment** | Member 4 | ✅ Unique | Only M4 builds users module, auth system (JWT, guards), role assignment, super admin panel |
| **System Configuration + AWS Deployment** | Member 4 | ✅ Unique | Only M4 handles system config management (alert thresholds, notifications), infrastructure setup (EB, RDS, S3, IAM) |

> **Non-Overlap Summary:** Each member has 2 distinct features with NO functional overlap. All features align with the 3 official system roles (Resident, Admin, Super Admin). Shared infrastructure (RDS, S3, EB) is used by all but OWNED by Member 4 (setup responsibility). Uploads module is SHARED (M1 creates) but used consistently across features.

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
| **Week 1-2** | **Backend Development** | Weather module, Reports POST, Regions GET, Uploads (S3) | Flood-requests module, Evacuation (routes + shelters) | Alerts module, Reports review, Regions CRUD | Users module, Auth (JWT), System-config module, Health endpoint |
| | *Milestone* | Weather API working, report submission backend done, S3 presigned URLs working | Request submission API working, evacuation routing done, shelter finder done | Alert CRUD working, report review API done, admin request mgmt done | Auth working (register/login), user CRUD done, config API ready |
| **Week 3-4** | **Frontend Development** | Resident home, Map (Leaflet/Mapbox), Report submit form | Resident emergency dashboard, Request tracking, Evacuation map, Shelter finder | Admin home, Alerts console, Report review UI, Regions page, Request admin panel | Super admin home, User management page, Config dashboard |
| | *Milestone* | Map shows regions, weather dashboard displays data, report form submits to backend, photos upload | Request tracking shows status, evacuation map displays routes, shelter list with capacity works | Admin can create/escalate alerts, review reports, manage regions, assign SOS requests | User CRUD UI working, role assignment functional, system config editable |
| **Week 5** | **AWS Deployment + Integration** | Test report photo upload to S3 (presigned URLs), verify map displays real alert data | Test evacuation routing, verify nearest shelter finder, test request lifecycle end-to-end | Test alert → region mapping, report review workflow, admin request assignment | **Deploy both EB environments**, RDS connected, S3 bucket configured, health checks passing |
| | *Milestone* | Photos upload successfully, map shows real alert data | Residents can submit SOS requests, track status, find evacuation routes and shelters | Alerts appear on resident map, reports flow to admin review, requests assigned to responders | **Green health on EB**, all APIs accessible, database migrations run, all services connected |

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

### Member 2 — Resident Emergency Features
- [ ] Login as resident
- [ ] Submit SOS request (select type: evacuation/rescue/medical/relief, priority, location, description)
- [ ] View own submitted requests with status tracking (pending → assigned → in_progress → completed)
- [ ] View personal request statistics (total submitted, completed, pending)
- [ ] View evacuation map with shelter markers and route overlay
- [ ] Find nearest available shelter with capacity info (total/current/status)
- [ ] Get turn-by-turn evacuation route recommendations based on current location
- [ ] Filter shelters by distance, capacity, and open status

### Member 3 — Admin Features
- [ ] Login as admin
- [ ] Create new flood alert (select region, severity, message)
- [ ] Escalate existing alert (bump severity from `warning` → `severe`)
- [ ] Resolve alert (mark as closed)
- [ ] Review community-submitted reports (view all, filter by status)
- [ ] Verify/approve report OR reject with reason
- [ ] Manage regions (create new region, edit boundaries, update risk level)
- [ ] Show alert appears on resident map after creation
- [ ] View all SOS requests from all residents
- [ ] Assign SOS requests to emergency responders
- [ ] Update SOS request status (admin coordination)

### Member 4 — Super Admin + Infrastructure
- [ ] Show both EB environments running (green health in EB console)
- [ ] Show RDS PostgreSQL connected (query users table via backend API or DB client)
- [ ] Show S3 bucket with uploaded photos (list objects in S3 console)
- [ ] Login as super admin
- [ ] View all users (filter by role: resident, admin, super_admin)
- [ ] Create new user with specific role
- [ ] Edit user role (change resident → admin)
- [ ] Manage system configuration (alert thresholds, notification settings, sensor intervals)
- [ ] View AWS resource monitoring (EB health, RDS status, S3 usage)
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
   - Separate branches per member: `member1-resident-info`, `member2-resident-emergency`, `member3-admin`, `member4-super-admin`
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

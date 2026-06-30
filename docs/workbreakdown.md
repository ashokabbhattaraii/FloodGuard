# FloodGuard — Balanced Work Breakdown (4 Members)
## Task 1: Frontend + Backend + AWS (Equal Distribution)

> **CT071-3-3-DDAC Group Project** | Problem #4: Flood Early Warning System
> 
> **Strategy:** Feature-based distribution aligned with actual codebase + AWS ownership
> 
> **Goal:** Equal workload, equal AWS learning, clear non-overlapping features

---

## Optimized Distribution Matrix

| Member | Role Focus | Features (2 each) | Frontend Pages | Backend Modules | DB Tables | AWS Lead | Est. LOC |
|--------|-----------|-------------------|---------------|-----------------|-----------|----------|----------|
| **M1** | Resident (Awareness) | Weather & Map, Flood Forecast | `/resident`, `/resident/map`, `/resident/alerts` | `weather`, `regions`, `flood-forecast` | regions, sensors, forecasts | **S3 + IAM** | ~2,000 |
| **M2** | Resident (Action) | Report System, SOS Requests | `/resident/reports`, `/resident/requests` | `reports`, `flood-requests`, `uploads` | reports, flood_requests | **CloudFront + VPC** | ~1,900 |
| **M3** | Admin (Operations) | Alert System, Region Management | `/admin`, `/admin/alerts`, `/admin/regions`, `/admin/reports` | `alerts`, `regions` (CRUD), `reports` (review) | alerts, regions | **EB + Security Groups** | ~2,100 |
| **M4** | Volunteer + Auth | Request Response, User & Auth System | `/volunteer`, `/volunteer/requests`, `/volunteer/shelters`, `/admin/users`, `/auth/*` | `auth`, `users`, `evacuation` | users, shelters, evacuation_routes | **RDS** | ~2,200 |

### AWS Infrastructure Responsibility Breakdown

| AWS Service | Owner | What They Configure |
|-------------|-------|--------------------|
| **S3** | M1 | `floodguard-uploads` bucket, CORS config, presigned URL setup |
| **IAM** | M1 | EC2 Instance Role, Instance Profile, S3 access policy, EB service role |
| **CloudFront** | M2 | Backend distribution (API HTTPS), Frontend distribution (web HTTPS), cache policies |
| **VPC** | M2 | VPC, Internet Gateway, 2 Subnets (2 AZs), Route Tables |
| **Elastic Beanstalk** | M3 | Backend env + Frontend env, deploy pipeline, health checks, Procfile |
| **Security Groups** | M3 | `floodguard-eb-sg` (HTTP 80), `floodguard-rds-sg` (5432 from EB + IPs) |
| **RDS** | M4 | PostgreSQL instance, DB subnet group, Prisma schema/migrations, seeding |

---

## Member 1: Resident Awareness Features + S3 + IAM Lead

### Role: Resident (Information & Awareness)
> Flood risk information, weather monitoring, and predictive forecasting

### Feature 1: Weather Dashboard & Interactive Map

**What:** Real-time flood risk map with weather integration
- Interactive map (Mapbox/Leaflet) showing regions color-coded by risk level (low/moderate/high/severe)
- Weather dashboard with current conditions, 7-day forecast, rainfall charts
- Sensor readings display (water level, rainfall gauges) with live updates
- Historical weather trends and patterns

**Frontend:**
- `/dashboard/resident` (home page with risk overview)
- `/dashboard/resident/map` (interactive flood risk map)
- `/dashboard/resident/alerts` (active alerts view for resident)

**Backend:**
- `weather/` module (weather.controller, weather.service)
  - Get current weather by region
  - Get forecast data
  - Get historical weather patterns
- `regions/` module (regions.controller, regions.service — **GET only**)
  - List all regions with current risk levels
  - Get region details
  - Get regions by risk level

**Database:** `regions` (read), `sensors` (read), `alerts` (read)

**API Endpoints:**
```
GET /api/weather/current/:regionId
GET /api/weather/forecast/:regionId
GET /api/weather/history/:regionId
GET /api/regions
GET /api/regions/:id
GET /api/regions/by-risk/:level
GET /api/sensors
GET /api/sensors/:id
```

**AWS Used:** EB (deploy), RDS (read), S3 (n/a), IAM (instance profile)

**LOC:** ~1,200 (700 frontend + 500 backend)

---

### Feature 2: Flood Forecast & Prediction System

**What:** AI/ML-based flood prediction and risk scoring
- Flood forecast algorithm based on rainfall, water levels, historical data
- Risk scoring for next 24-72 hours
- Early warning indicators (rising water, heavy rainfall, upstream alerts)
- Predictive analytics dashboard with charts

**Frontend:**
- Component: `FloodForecastCard` (on resident home)
- Component: `RiskScoreIndicator` (visual gauge 0-100)
- Component: `PredictionTimeline` (24-72h forecast)

**Backend:**
- `flood-forecast/` module (flood-forecast.controller, flood-forecast.service)
  - Calculate flood risk score based on multiple factors
  - Generate predictions (simple algorithm or mock ML)
  - Get risk trends

**Database:** `forecasts` (new table: id, regionId, riskScore, predictedAt, factors, createdAt)

**API Endpoints:**
```
GET /api/flood-forecast/:regionId
GET /api/flood-forecast/risk-score/:regionId
POST /api/flood-forecast/calculate (admin trigger)
```

**AWS Used:** EB (deploy), RDS (store forecasts), S3 (n/a), IAM (instance profile)

**LOC:** ~800 (400 frontend + 400 backend)

---

### AWS Ownership: S3 Bucket + IAM Lead

**S3 Setup Tasks:**
1. Create S3 bucket: `floodguard-uploads-prod`
2. Configure bucket policies (block public access, use presigned URLs)
3. Configure CORS for frontend domain
4. Implement presigned URL generation (PUT and GET)
5. Test upload workflow

**IAM Setup Tasks:**
1. Create IAM Role for EB EC2: `aws-elasticbeanstalk-ec2-role`
   - Trusted entity: EC2
   - Attach managed policies: `AWSElasticBeanstalkWebTier`
2. Create custom inline policy for S3 access:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
         "Resource": "arn:aws:s3:::floodguard-uploads/*"
       },
       {
         "Effect": "Allow",
         "Action": ["s3:ListBucket"],
         "Resource": "arn:aws:s3:::floodguard-uploads"
       }
     ]
   }
   ```
3. Create Instance Profile: `aws-elasticbeanstalk-ec2-role`
4. Create EB Service Role: `aws-elasticbeanstalk-service-role`
5. Share instance profile ARN with M3 for EB configuration
6. Security audit — review all IAM policies (least privilege)

**Documentation:** `docs/aws-s3-guide.md`, `docs/aws-iam-security.md`

**Deliverables:**
- Working S3 bucket accessible from EB
- Presigned URL endpoints for upload/download
- IAM role + instance profile ready for EB
- S3 access policy attached to instance role
- Members 2 & 4 can use S3 for reports, shelter photos

**Total Workload:** ~2,000 LOC + S3 + IAM setup & documentation

---

## Member 2: Resident Action Features + CloudFront + VPC Lead

### Role: Resident (Emergency Actions)
> Community reporting and SOS request submission

### Feature 1: Community Report System (with Photo Upload)

**What:** Residents submit flood incident reports with photos
- Report submission form (location picker, description, severity, photo)
- Photo upload to S3 via presigned URLs (uses M1's upload endpoint)
- View own reports list with status tracking (pending/verified/rejected)
- Report detail view with photo preview
- Admin notes visible after review

**Frontend:**
- `/dashboard/resident/reports` (report list + submit form)
- Component: `ReportSubmissionForm`
- Component: `ReportCard` (with photo thumbnail, status badge)
- Component: `PhotoUpload` (drag-drop, preview, S3 upload)

**Backend:**
- `reports/` module (reports.controller, reports.service)
  - POST create report (resident)
  - GET user's own reports
  - GET report by ID (if owner or admin)
- `uploads/` module (uploads.controller, uploads.service)
  - Generate S3 presigned PUT URL
  - Generate S3 presigned GET URL
  - Uses M1's S3 bucket

**Database:** `reports` (CRUD: id, userId, location, description, severity, photoUrl, status, adminNote, submittedAt, reviewedAt)

**API Endpoints:**
```
POST /api/reports
GET /api/reports/my
GET /api/reports/:id
POST /api/uploads/presign (generate upload URL)
GET /api/uploads/:key/url (generate download URL)
```

**AWS Used:** EB (deploy), RDS (store reports), S3 (photo storage), IAM (instance profile)

**LOC:** ~900 (500 frontend + 400 backend)

---

### Feature 2: SOS Request System (Resident Side)

**What:** Residents submit emergency SOS requests
- SOS request submission form (type: evacuation/rescue/medical/relief, priority, location, description)
- Track own request status (pending → assigned → in_progress → completed)
- View request timeline and updates
- Emergency contact quick actions

**Frontend:**
- `/dashboard/resident/requests` (submit form + own requests list)
- Component: `SOSSubmitForm` (priority selector, location picker)
- Component: `RequestStatusTracker` (timeline view)
- Component: `EmergencyContactCard`

**Backend:**
- `flood-requests/` module (flood-requests.controller, flood-requests.service)
  - POST create request (resident)
  - GET user's own requests
  - GET request by ID (if owner or volunteer)

**Database:** `flood_requests` (create/read own: id, userId, type, priority, status, location, description, assignedVolunteerId, createdAt, assignedAt, completedAt)

**API Endpoints:**
```
POST /api/flood-requests
GET /api/flood-requests/my
GET /api/flood-requests/:id
GET /api/flood-requests/stats/my
```

**AWS Used:** EB (deploy), RDS (store requests), S3 (n/a), IAM (instance profile)

**LOC:** ~1,000 (550 frontend + 450 backend)

---

### AWS Ownership: CloudFront + VPC Networking Lead

**VPC Setup Tasks:**
1. Create VPC: `floodguard-vpc` (10.0.0.0/16) with DNS hostnames enabled
2. Create Internet Gateway: `floodguard-igw`, attach to VPC
3. Create 2 public subnets in different AZs:
   - `floodguard-public-1a` (10.0.1.0/24, us-east-1a)
   - `floodguard-public-1b` (10.0.2.0/24, us-east-1b)
4. Enable auto-assign public IP on both subnets
5. Create Route Table: `floodguard-public-rt`
   - Add route: `0.0.0.0/0 → Internet Gateway`
   - Associate both subnets
6. Test: instances in subnets have internet access

**CloudFront Setup Tasks:**
1. Create Backend API distribution:
   - Origin: EB backend CNAME (HTTP only)
   - Viewer protocol: Redirect HTTP to HTTPS
   - Allowed methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
   - Cache policy: CachingDisabled (never cache API)
   - Origin request policy: AllViewer (forward Origin, Authorization, Content-Type)
2. Create Frontend distribution:
   - Origin: EB frontend CNAME (HTTP only)
   - Viewer protocol: Redirect HTTP to HTTPS
   - Cache: Disabled for dynamic pages (or Next.js-aware policy)
3. Share CloudFront domain names with team:
   - Backend CF domain → M3 sets in EB `FRONTEND_URL` for CORS
   - Frontend CF domain → baked into Next.js build as `NEXT_PUBLIC_API_URL`
4. Test CORS preflight through CloudFront
5. Document: `docs/aws-cloudfront-vpc-guide.md`

**Deliverables:**
- VPC with full networking (IGW, subnets, routes) — all members deploy into this
- CloudFront HTTPS for both backend API and frontend
- CORS working through CloudFront (OPTIONS forwarded)
- Team has HTTPS URLs for demo

**Total Workload:** ~1,900 LOC + VPC + CloudFront setup & documentation

---

## Member 3: Admin Operations + EB + Security Groups Lead

### Role: Admin (Emergency Management Operations)
> Alert creation, report review, region management

### Feature 1: Alert Management System

**What:** Complete alert lifecycle management
- Create alerts for regions (severity: info/warning/severe/critical)
- Multi-region alert support (select multiple regions)
- Edit/update alert messages
- Escalate alerts (increase severity level)
- Resolve/close alerts when flood subsides
- Alert history and timeline
- Affected population estimation

**Frontend:**
- `/dashboard/admin` (home with active alerts summary)
- `/dashboard/admin/alerts` (alert list with filters)
- Component: `AlertCreateForm` (region selector, severity, message)
- Component: `AlertCard` (severity badge, region, timestamp)
- Component: `AlertEscalateDialog` (confirm escalation)
- Component: `AlertTimeline` (status history)

**Backend:**
- `alerts/` module (alerts.controller, alerts.service, alerts.dto)
  - POST create alert (admin only)
  - GET all alerts with filters (region, severity, status, date range)
  - PATCH update alert
  - PATCH escalate (bump severity)
  - PATCH resolve
  - GET alert statistics

**Database:** `alerts` (CRUD: id, regionId, severity, message, issuedBy, status, createdAt, updatedAt, resolvedAt, affectedPopulation)

**API Endpoints:**
```
POST /api/alerts
GET /api/alerts (with filters)
GET /api/alerts/:id
PATCH /api/alerts/:id
PATCH /api/alerts/:id/escalate
PATCH /api/alerts/:id/resolve
DELETE /api/alerts/:id
GET /api/alerts/stats
```

**AWS Used:** EB (deploy), RDS (store alerts), S3 (n/a), IAM (instance profile)

**LOC:** ~1,100 (650 frontend + 450 backend)

---

### Feature 2: Report Review + Region Management

**What:** Admin oversight and data management
- **Report Review:**
  - View all community reports with filters (status, region, severity, date)
  - Photo preview and full view
  - Verify/approve reports (add admin note, change status to verified)
  - Reject reports (require reason, change status to rejected)
  - Report statistics dashboard
- **Region Management:**
  - Full CRUD on regions (create, read, update, delete)
  - Define region boundaries (GeoJSON via map picker)
  - Set risk levels (low/moderate/high/severe)
  - Assign sensors to regions
  - Population data entry
  - Region statistics (alerts count, reports count, sensors)

**Frontend:**
- `/dashboard/admin/reports` (report list with review actions)
- `/dashboard/admin/reports/[id]` (report detail with approve/reject)
- `/dashboard/admin/regions` (region list + CRUD form)
- `/dashboard/admin/regions/[id]` (region detail with stats)
- Component: `ReportReviewCard`
- Component: `RegionForm` (with map boundary picker)
- Component: `RegionStatsCard`

**Backend:**
- `reports/` module (admin endpoints)
  - GET all reports (admin only)
  - PATCH verify report
  - PATCH reject report
  - GET report statistics
- `regions/` module (CRUD — **admin only**)
  - POST create region
  - PATCH update region
  - DELETE soft delete region
  - Geofence validation (ensure valid GeoJSON)

**Database:** 
- `reports` (read all + update: status, adminNote, reviewedBy, reviewedAt)
- `regions` (CRUD: id, name, boundary, riskLevel, population, sensorIds, createdAt, updatedAt)

**API Endpoints:**
```
# Reports Admin
GET /api/reports/admin/all
GET /api/reports/:id
PATCH /api/reports/:id/verify
PATCH /api/reports/:id/reject
GET /api/reports/admin/stats

# Regions CRUD
POST /api/regions
GET /api/regions/:id/details
PATCH /api/regions/:id
DELETE /api/regions/:id
GET /api/regions/stats
```

**AWS Used:** EB (deploy), RDS (read/write), S3 (read report photos), IAM (instance profile)

**LOC:** ~1,000 (600 frontend + 400 backend)

---

### AWS Ownership: Elastic Beanstalk + Security Groups Lead

**Security Groups Setup Tasks:**
1. Create `floodguard-eb-sg`:
   - Inbound: HTTP port 80 from `0.0.0.0/0`
   - Outbound: All traffic
2. Create `floodguard-rds-sg`:
   - Inbound: PostgreSQL port 5432 from `floodguard-eb-sg` (SG reference)
   - Inbound: PostgreSQL port 5432 from team member IPs (/32)
   - Outbound: All traffic
3. Share EB SG ID with M4 (for RDS access rule)
4. Document all SG rules

**Elastic Beanstalk Setup Tasks:**
1. **Initialize EB Applications:**
   ```bash
   # Backend
   eb init floodguard-team-9 --platform "Node.js 22" --region us-east-1
   # Frontend
   eb init floodguard-team-9-web --platform "Node.js 22" --region us-east-1
   ```

2. **Create Backend Environment:**
   ```bash
   eb create floodguard-backend --instance-type t3.small --single
   ```
   - Attach IAM instance profile (from M1)
   - Set environment variables (DATABASE_URL from M4, S3_BUCKET from M1, JWT_SECRET from M4)
   - Health check path: `/api/health`

3. **Create Frontend Environment:**
   ```bash
   eb create floodguard-team-9-frontend --instance-type t3.micro --single
   ```
   - Set `NEXT_PUBLIC_API_URL` (baked at build time, not EB env var)

4. **Deployment Configuration:**
   - Create `Procfile` (backend: `web: node dist/src/main.js`)
   - Create `Procfile` (frontend: `web: PORT=8080 node .next/standalone/server.js`)
   - Create `.ebextensions/env.config` with all environment variables
   - Configure `deploy: artifact: deploy.zip` in EB config

5. **Environment Variables Coordination:**
   - Collect from all members:
     - `DATABASE_URL` (from M4)
     - `S3_BUCKET` (from M1)
     - `JWT_SECRET` (from M4)
     - `FRONTEND_URL` (CloudFront domains from M2)
     - `AWS_REGION`, `NODE_ENV`, `PORT`

6. **CloudWatch Logs:**
   - Enable log streaming in EB config
   - Set retention period: 7 days

7. **Documentation:** `docs/aws-eb-deployment.md`

**Deliverables:**
- Both EB environments running (backend + frontend) with green health
- Security groups properly configured (EB ↔ RDS connectivity)
- All environment variables set
- IAM instance profile attached
- Health check passing
- Team can deploy with `eb deploy` or artifact zip
- Deployment documentation with troubleshooting

**Total Workload:** ~2,100 LOC + EB + Security Groups setup & documentation

---

## Member 4: Volunteer Response + Auth + RDS Lead

### Role: Volunteer Response + Authentication Infrastructure
> Emergency response coordination, shelter management, and system authentication

### Feature 1: SOS Request Response System (Volunteer Side)

**What:** Volunteer request queue and response management
- View all incoming SOS requests (queue with filters)
- Filter by: type, priority, status, region
- Priority-based sorting (critical → high → medium → low)
- Claim requests (assign to self, status → assigned)
- Update status (in_progress → completed)
- Add volunteer notes/updates
- Activity log (own claimed/completed requests)
- Shelter management:
  - Create/edit shelters (name, location, capacity, facilities)
  - Update occupancy (check-in/check-out)
  - Upload shelter photos to S3 (uses M1's upload endpoint)
  - Shelter status (open/full/closed)

**Frontend:**
- `/dashboard/volunteer` (home with request stats, active assignments)
- `/dashboard/volunteer/requests` (request queue with filters, claim button)
- `/dashboard/volunteer/activity` (personal activity log)
- `/dashboard/volunteer/shelters` (shelter list + CRUD form)
- Component: `RequestQueueTable`
- Component: `ClaimRequestDialog`
- Component: `ShelterForm` (with map picker, photo upload)
- Component: `OccupancyTracker`

**Backend:**
- `flood-requests/` module (volunteer endpoints)
  - GET queue with filters (volunteer view)
  - PATCH claim request
  - PATCH update status
  - GET volunteer statistics
- `evacuation/` module (evacuation.controller, evacuation.service)
  - Shelter CRUD
  - Capacity validation (occupancy ≤ capacity)
  - GET nearest shelters

**Database:** 
- `flood_requests` (read + update: status, assignedVolunteerId, volunteerNotes)
- `shelters` (CRUD: id, name, location, capacity, currentOccupancy, status, facilities, photoUrl, managedBy, createdAt)
- `evacuation_routes` (optional: id, startLocation, endLocation, shelterId, instructions, distance)

**API Endpoints:**
```
# Request Response
GET /api/flood-requests/queue (volunteer queue)
GET /api/flood-requests/:id
PATCH /api/flood-requests/:id/claim
PATCH /api/flood-requests/:id/status
GET /api/flood-requests/volunteer/my
GET /api/flood-requests/volunteer/stats

# Shelters
POST /api/evacuation/shelters
GET /api/evacuation/shelters
GET /api/evacuation/shelters/:id
PATCH /api/evacuation/shelters/:id
DELETE /api/evacuation/shelters/:id
GET /api/evacuation/shelters/nearest
```

**AWS Used:** EB (deploy), RDS (read/write), S3 (shelter photos), IAM (instance profile)

**LOC:** ~1,200 (700 frontend + 500 backend)

---

### Feature 2: Authentication + User Management System

**What:** Complete auth infrastructure and user administration
- **Authentication:**
  - User registration (email, password, name, phone, role: resident/volunteer)
  - Login with JWT token generation
  - Password hashing (bcrypt, 10 rounds)
  - JWT middleware for protected routes
  - Role-based guards (resident/volunteer/admin)
  - Token validation and refresh
  - Logout (optional: token blacklist)
- **User Management (Admin):**
  - View all users (table with filters: role, status, region)
  - Create users manually (admin can create any role)
  - Update user details (name, email, phone, assigned regions)
  - Change user roles
  - Deactivate/reactivate accounts
  - User statistics dashboard
  - Volunteer approval system (if volunteer requires admin approval)

**Frontend:**
- `/auth/register` (registration form)
- `/auth/login` (login form)
- `/dashboard/profile` (user profile view/edit)
- `/dashboard/admin/users` (admin user management page)
- Component: `LoginForm`
- Component: `RegisterForm`
- Component: `UserTable` (with filters, role badges)
- Component: `UserEditDialog`

**Backend:**
- `auth/` module (auth.controller, auth.service)
  - POST register
  - POST login (returns JWT)
  - GET current user
  - JWT strategy for passport
- `users/` module (users.controller, users.service, users.dto)
  - GET all users (admin only)
  - GET user by ID
  - PATCH update user
  - DELETE deactivate user
  - User validation and sanitization
- `guards/` (jwt-auth.guard, roles.guard)
  - Protect routes by authentication
  - Protect routes by role
- `common/decorators/` (`@Roles()`, `@Public()`)

**Database:** `users` (CRUD: id, email, passwordHash, name, phone, role, assignedRegions[], status, isApproved, createdAt, lastLogin, updatedAt)

**API Endpoints:**
```
# Auth
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
POST /api/auth/logout
POST /api/auth/refresh

# Users (Admin)
GET /api/users
GET /api/users/:id
PATCH /api/users/:id
DELETE /api/users/:id
GET /api/users/stats
PATCH /api/users/:id/role
```

**AWS Used:** EB (deploy), RDS (store users), S3 (n/a), IAM (instance profile)

**LOC:** ~1,000 (500 frontend + 500 backend)

---

### AWS Ownership: RDS PostgreSQL Lead

**Setup Tasks:**
1. **Create DB Subnet Group:**
   - Name: `floodguard-db-subnet`
   - VPC: `floodguard-vpc` (created by M2)
   - Subnets: Both public subnets in 2 AZs (from M2)

2. **Create RDS PostgreSQL Instance:**
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier floodguard-db \
     --db-instance-class db.t3.micro \
     --engine postgres --engine-version 16 \
     --master-username floodguard_admin \
     --master-user-password 'FloodGuard2026SecurePass!' \
     --allocated-storage 20 --storage-type gp3 \
     --db-name floodguard \
     --vpc-security-group-ids <RDS_SG from M3> \
     --db-subnet-group-name floodguard-db-subnet \
     --publicly-accessible --no-multi-az \
     --backup-retention-period 7
   ```

3. **Set Up Prisma:**
   - Create `schema.prisma` with all tables (coordinate with all members)
   - Configure `prisma.config.ts` with pg driver adapter for RDS SSL
   - Run `npx prisma db push` to sync schema to RDS
   - Create seed data script (`prisma/seed-direct.ts`)
   - Test connection from local machine

4. **Prisma Schema Coordination:**
   ```prisma
   // Coordinate with all members to include:
   model User { }             // M4
   model Region { }           // M1 read, M3 CRUD
   model Sensor { }           // M1
   model Alert { }            // M3
   model Report { }           // M2 create, M3 review
   model FloodRequest { }     // M2 create, M4 respond
   model EvacuationRoute { }  // M4
   model Notification { }     // Shared
   model VolunteerHelpRequest { } // M4
   ```

5. **Share RDS Endpoint With Team:**
   - Provide `DATABASE_URL` to M3 for EB environment variable configuration
   - Ensure M3's `floodguard-rds-sg` has EB SG as allowed source

6. **Database Management:**
   - Run migrations from local: `npx prisma db push`
   - Seed data: `pnpm seed`
   - Open Prisma Studio for debugging: `npx prisma studio`

7. **Documentation:** `docs/aws-rds-guide.md`

**Deliverables:**
- RDS instance accessible from EB and local machines
- Complete Prisma schema agreed by all members
- Database seeded with demo data (admin, resident, volunteer users)
- Connection working (local Prisma + EB backend)
- RDS documentation with setup & troubleshooting

**Total Workload:** ~2,200 LOC + RDS setup & Prisma schema coordination

---

## Equal Workload Summary

| Member | Frontend LOC | Backend LOC | AWS Setup | Total LOC | AWS Complexity | Balance Factor |
|--------|-------------|-------------|-----------|-----------|----------------|----------------|
| **M1** | 700 + 400 = 1,100 | 500 + 400 = 900 | **S3 + IAM** (bucket, CORS, presigned URLs, roles, policies) | **~2,000** | High (S3 SDK + IAM policies, instance profiles) | Lowest LOC, high AWS |
| **M2** | 500 + 550 = 1,050 | 400 + 450 = 850 | **CloudFront + VPC** (2 distributions, VPC, IGW, subnets, routes) | **~1,900** | High (networking foundation + HTTPS/CDN setup) | Low LOC, high infrastructure |
| **M3** | 650 + 600 = 1,250 | 450 + 400 = 850 | **EB + Security Groups** (2 environments, SGs, deploy pipeline) | **~2,100** | Very High (deployment pipeline, env config, SG rules) | Medium LOC, highest deploy complexity |
| **M4** | 700 + 500 = 1,200 | 500 + 500 = 1,000 | **RDS** (PostgreSQL, Prisma schema/migrations, seeding) | **~2,200** | High (DB design, schema coordination, all members depend on this) | Highest LOC, high DB complexity |

**Balancing Analysis:**
- **M1:** Lowest code (2,000) but handles complex map integration + weather charts + S3 presigned URLs + IAM policies
- **M2:** Second lowest (1,900) but owns entire networking foundation (VPC) + CloudFront HTTPS (both apps depend on this)
- **M3:** Medium code (2,100) + full deployment responsibility (EB backend + frontend, security groups)
- **M4:** Highest code (2,200) + database ownership (Prisma schema coordination, all members depend on RDS)

**Total Balance:** Very fair — LOC differences (200-300 lines) are offset by AWS complexity levels

---

## Collaboration Timeline (6 Weeks)

### Week 1: AWS Infrastructure (All Collaborate Daily)

**Monday-Tuesday:**
- All: AWS account setup, install CLI tools
- M1: Create S3 bucket, configure CORS, start IAM role
- M2: Create VPC, IGW, subnets, route tables (networking foundation)
- M3: Create security groups (`floodguard-eb-sg`, `floodguard-rds-sg`)
- M4: Create RDS instance, DB subnet group, start Prisma schema

**Wednesday-Thursday:**
- M2: Share VPC/subnet IDs with team
- M4: Share RDS endpoint with team, test connection
- M1: Create IAM instance profile, attach S3 policy
- M3: Initialize EB application, create backend environment
- M3: Attach M1's instance profile to EB environment
- M3: Share EB security group ID with M4 (for RDS SG rule)
- All: Test connections (EB → RDS, EB → S3)

**Friday:**
- M4: Finalize Prisma schema (all members contribute their tables)
- M4: Run `prisma db push`, seed database, share with team
- M2: Create CloudFront distributions (backend + frontend)
- M3: Deploy test app to EB (health check only)
- M3: Set all environment variables in EB (from M1, M2, M4)
- M1: Test S3 upload from EB instance

**Weekend:**
- All: Write AWS documentation
  - M1: `docs/aws-s3-iam-guide.md`
  - M2: `docs/aws-cloudfront-vpc-guide.md`
  - M3: `docs/aws-eb-deployment.md`
  - M4: `docs/aws-rds-guide.md`

### Week 2-3: Backend Development (Parallel)

**Each member builds their backend modules:**
- M1: `weather/`, `regions/` (GET), `flood-forecast/`
- M2: `reports/`, `flood-requests/` (POST), `uploads/`
- M3: `alerts/`, `reports/` (admin), `regions/` (CRUD)
- M4: `auth/`, `users/`, `flood-requests/` (volunteer), `evacuation/`

**Daily Standup (async or 15min call):**
- Blockers?
- API endpoint conflicts?
- Prisma schema changes needed?

**Mid-Week 2:**
- All: Review Prisma schema together
- M4: Apply any schema updates, run `prisma db push`
- All: Test API endpoints with Postman/Insomnia

**End Week 3:**
- All: Backend features complete and tested locally
- All: Create Postman collection (organize by member)
- M3: Deploy backend to EB: build → zip → deploy
- All: Test deployed APIs

### Week 4-5: Frontend Development (Parallel)

**Each member builds their frontend:**
- M1: Resident home, map, weather, forecast components
- M2: Report submission, request submission, photo upload
- M3: Admin alert management, report review, region management
- M4: Auth pages, volunteer dashboard, shelter management, user management

**Shared Work:**
- M4: Auth context/provider (used by all)
- M1: Map config/utilities (used by M2, M3, M4)
- All: Consistent Tailwind styles (design system)

**Mid-Week 4:**
- M3: Deploy frontend to EB (initial version)
- All: Test frontend with deployed backend

**End Week 5:**
- All: Frontend features complete
- All: Integration testing (frontend ↔ backend)
- M3: Final frontend deployment

### Week 6: Testing, Polish & Demo Prep

**Monday-Tuesday:**
- All: End-to-end testing
  - Resident flow: register → view map → submit report → submit SOS
  - Volunteer flow: login → claim request → update status → manage shelter
  - Admin flow: create alert → review reports → manage regions → manage users
- All: Fix bugs found

**Wednesday:**
- All: Cross-feature testing
  - Admin alert → appears on resident map
  - Resident report → admin can review
  - Resident SOS → volunteer can claim
- M3: Final deployments (backend + frontend)

**Thursday:**
- All: Take AWS screenshots:
  - M1: S3 bucket with uploaded files, IAM roles and policies
  - M2: CloudFront distributions, VPC networking diagram
  - M3: EB environments (green health), security groups
  - M4: RDS instance dashboard, Prisma Studio
- All: Prepare demo scripts (what to show)

**Friday:**
- All: Record individual demo videos
- All: Final documentation review
- All: Prepare submission artifacts

**Weekend:**
- All: Write individual reflections
- All: Final code cleanup and comments
- All: Prepare presentation slides

---

## Non-Overlapping Feature Verification

| Feature | Owner | Evidence of No Overlap |
|---------|-------|----------------------|
| **Weather Dashboard & Map** | M1 | Only M1 builds map component, weather module, forecast algorithm |
| **Flood Forecast System** | M1 | Only M1 builds prediction logic, risk scoring, forecast module |
| **Report Submission System** | M2 | Only M2 builds report form, photo upload, reports POST endpoint |
| **SOS Request Submission** | M2 | Only M2 builds request form, resident request tracking |
| **Alert Management** | M3 | Only M3 builds alert CRUD, escalation logic, admin alert UI |
| **Report Review & Region CRUD** | M3 | Only M3 builds admin report review, region management, geofence validation |
| **SOS Request Response (Volunteer)** | M4 | Only M4 builds volunteer queue, claim logic, shelter management |
| **Auth & User Management** | M4 | Only M4 builds JWT auth, guards, user CRUD, admin user management |

**Shared/Coordinated Work (Not Overlaps):**
- S3 uploads: M1 creates endpoint → M2 & M4 use it (clear ownership)
- Regions: M1 reads (GET) → M3 manages (CRUD) (different operations)
- Reports: M2 creates → M3 reviews (different roles, different endpoints)
- Requests: M2 submits → M4 responds (different sides of same flow)
- Database: M4 owns schema → all use it (infrastructure, not feature overlap)

---

## Demo Checklist

### Member 1: Weather & Forecast + S3 + IAM
- [ ] Show flood risk map with color-coded regions
- [ ] Display weather dashboard with rainfall charts
- [ ] Show sensor readings (live or mock data)
- [ ] Show flood forecast with risk score (0-100)
- [ ] Show prediction timeline (24-72h)
- [ ] **AWS S3:** Open S3 console, show bucket, show uploaded photos
- [ ] **AWS S3:** Show S3 CORS configuration
- [ ] **AWS IAM:** Show IAM role in AWS console
- [ ] **AWS IAM:** Show IAM policies (S3 access, EB managed policies)
- [ ] **AWS IAM:** Show instance profile attached to EB

### Member 2: Reports & Requests + CloudFront + VPC
- [ ] Submit flood report with photo upload
- [ ] Show uploaded photo appears in S3
- [ ] View own reports with status
- [ ] Submit SOS request (evacuation type, high priority)
- [ ] Track request status
- [ ] **AWS VPC:** Show VPC in console (subnets, route tables, IGW)
- [ ] **AWS VPC:** Show networking diagram (2 subnets, 2 AZs)
- [ ] **AWS CloudFront:** Show both distributions (backend + frontend)
- [ ] **AWS CloudFront:** Show HTTPS working (browser padlock icon)
- [ ] **AWS CloudFront:** Show cache behavior settings (API = no cache)

### Member 3: Alerts & Admin + EB + Security Groups
- [ ] Login as admin
- [ ] Create flood alert for a region (warning level)
- [ ] Escalate alert to severe
- [ ] Resolve alert
- [ ] View all resident reports
- [ ] Approve a report (add admin note)
- [ ] Reject a report (with reason)
- [ ] Create new region (draw boundary on map)
- [ ] Edit region risk level
- [ ] **AWS EB:** Show EB backend environment (green health)
- [ ] **AWS EB:** Show EB frontend environment (green health)
- [ ] **AWS EB:** Show deployment history in EB console
- [ ] **AWS EB:** Show health check logs
- [ ] **AWS SG:** Show security groups (EB SG, RDS SG rules)

### Member 4: Volunteer & Auth + RDS
- [ ] Register new user (resident role)
- [ ] Login with new user (JWT issued)
- [ ] Logout and login as volunteer
- [ ] View SOS request queue
- [ ] Claim a request
- [ ] Update request status (in_progress → completed)
- [ ] View activity log
- [ ] Create shelter with photo upload
- [ ] Update shelter occupancy
- [ ] Login as admin, view all users
- [ ] Create new user via admin panel
- [ ] Change user role
- [ ] **AWS RDS:** Show RDS instance in AWS console (available status)
- [ ] **AWS RDS:** Show connection details (endpoint, port, database)
- [ ] **AWS RDS:** Show Prisma schema, run `npx prisma studio`
- [ ] **AWS RDS:** Show security group rules (EB SG allowed on 5432)

---

## Submission Artifacts

### 1. Code Repository
```
main (final merged)
├── member1-weather-forecast-s3-iam
├── member2-reports-requests-cloudfront-vpc
├── member3-alerts-admin-eb-sg
└── member4-volunteer-auth-rds
```

### 2. AWS Documentation
- `docs/aws-s3-iam-guide.md` (M1)
- `docs/aws-cloudfront-vpc-guide.md` (M2)
- `docs/aws-eb-deployment.md` (M3)
- `docs/aws-rds-guide.md` (M4)
- `docs/aws-architecture.md` (collaborative)

### 3. Deployed Application
- Frontend: `http://floodguard-frontend-prod.<region>.elasticbeanstalk.com`
- Backend: `http://floodguard-backend-prod.<region>.elasticbeanstalk.com`
- Health: `http://floodguard-backend-prod.<region>.elasticbeanstalk.com/health`

### 4. Database
- Prisma schema (`backend/prisma/schema.prisma`)
- Migrations folder (`backend/prisma/migrations/`)
- ER diagram (use Prisma Studio or dbdiagram.io)
- Sample data exports

### 5. API Documentation
- Postman collection (organized by member)
- Request/response examples
- Authentication flow diagram

### 6. AWS Screenshots
- **M1:** S3 bucket, objects list, CORS config, IAM roles, policies, instance profile
- **M2:** CloudFront distributions (both), VPC dashboard, subnets, route tables, IGW
- **M3:** EB environments (both), health checks, deployment history, security groups
- **M4:** RDS instance, connection details, Prisma Studio, DB subnet group

### 7. Individual Reflections
Each member writes (1-2 pages):
- Features built (technical details)
- AWS service owned (setup process, challenges)
- What learned from other AWS services
- Collaboration experience
- Challenges and solutions

---

## Why This Distribution Works

### 1. **Perfectly Balanced Workload**
- LOC range: 1,900 - 2,200 (15% variance is minimal)
- AWS complexity differences offset LOC differences
- Each member has 2 features (equal feature count)

### 2. **Clear AWS Ownership**
- Each member owns 2 AWS services (primary + secondary)
- All members use all services (complete learning)
- Logical pairing: M1 (S3+IAM — storage+permissions), M2 (CloudFront+VPC — networking), M3 (EB+SG — deployment+access), M4 (RDS — database)
- No bottlenecks (all can work in parallel after Week 1)

### 3. **Feature Independence**
- Members 1 & 2 work on resident features (different aspects)
- Member 3 works on admin features
- Member 4 works on volunteer + infrastructure
- Minimal coordination needed during development

### 4. **Realistic Team Dynamics**
- Mimics real software teams (specialists collaborating)
- Each member owns critical path items
- Clear dependencies and handoffs

### 5. **Assessment-Friendly**
- Individual contributions clearly visible (separate branches)
- No overlapping features (Rules 7 & 8 satisfied)
- Equal AWS experience (everyone can explain all services)
- Demo checklist proves each member's work

---

**End of Work Breakdown**

> **Summary:** 4 members, equal workload (~2,000 LOC each), full AWS learning (EB + RDS + S3 + IAM), clear non-overlapping features, realistic collaboration

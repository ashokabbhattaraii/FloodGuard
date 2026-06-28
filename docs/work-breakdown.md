# FloodGuard — Work Breakdown Structure (4 Members)
## TASK 1 — Equal Distribution with Full AWS Experience for All

> **CT071-3-3-DDAC Group Project** | Problem #4: Flood Early Warning & Community Alert System
> 
> **Task 1 (30 marks):** Frontend + Backend + AWS (EB + RDS + S3)
> 
> **Distribution Strategy:** Each member owns 2 features + 1 AWS service lead + deploys own code
> 
> **Learning Goal:** All 4 members gain hands-on experience with Elastic Beanstalk, RDS PostgreSQL, S3, and IAM

---

## AWS Ownership Matrix (Equal Learning)

| Member | Role Focus | AWS Service Lead | What They Setup | What They Learn (Everyone) |
|--------|-----------|------------------|-----------------|---------------------------|
| **Member 1** | Resident (Info) | **S3 Lead** | S3 bucket, CORS, presigned URLs, IAM policy | ✅ EB deploy, ✅ RDS connection, ✅ S3 usage, ✅ IAM |
| **Member 2** | Volunteer | **RDS Lead** | PostgreSQL instance, security groups, Prisma schema, migrations | ✅ EB deploy, ✅ RDS usage, ✅ S3 usage, ✅ IAM |
| **Member 3** | Admin | **EB Lead** | Elastic Beanstalk environments, health checks, deployment pipeline | ✅ EB deploy, ✅ RDS connection, ✅ S3 usage, ✅ IAM |
| **Member 4** | Auth/Infrastructure | **IAM/Security Lead** | IAM roles, security groups, environment variables, CloudWatch logs | ✅ EB deploy, ✅ RDS connection, ✅ S3 usage, ✅ IAM |

> **Key Principle:** One person **leads** setup of their AWS service (documents it, troubleshoots first), but **all 4 members use all services** in their own features.

---

## Summary Matrix

| Member | Role | Features (2) | Frontend Pages | Backend Modules | DB Tables | AWS Lead | LOC Est. |
|--------|------|--------------|---------------|----------------|-----------|----------|----------|
| **M1** | Resident | Map + Weather, Report Submission | 3 | 3 | regions, sensors, reports | **S3** | ~2,100 |
| **M2** | Volunteer | SOS Requests, Shelters | 4 | 2 | flood_requests, shelters | **RDS** | ~2,050 |
| **M3** | Admin | Alerts, Report Review + Regions | 5 | 3 | alerts, reports (review), regions | **EB** | ~2,400 |
| **M4** | Auth | User Management, Authentication | 3 | 2 | users, system_logs | **IAM** | ~2,150 |

---

## Member 1 — Resident (Public Features) + S3 Lead

### Role: Resident / Public
> Everyday users who need flood information and want to report incidents.

### Feature 1: Real-Time Flood Risk Map + Weather Dashboard

| Item | Detail |
|------|--------|
| **What** | Interactive map showing flood risk zones (color-coded by severity). Weather forecast with rainfall charts. Sensor gauge readings. Map uses Mapbox/Leaflet. Weather data integration with charts (Chart.js/Recharts). |
| **Frontend** | `/dashboard/resident` (home), `/dashboard/resident/map` (interactive map), `/dashboard/resident/weather` (weather dashboard with charts) |
| **Backend** | `weather/` module (weather.controller, weather.service), `regions/` module (regions.controller, regions.service — GET endpoints), `sensors/` module (sensors.controller, sensors.service — GET readings) |
| **Database** | `regions` (read: name, boundary, riskLevel), `sensors` (read: location, type, currentReading), `alerts` (read: active alerts) |
| **API Endpoints** | `GET /api/weather/:regionId`, `GET /api/weather/current`, `GET /api/regions`, `GET /api/regions/:id`, `GET /api/sensors`, `GET /api/sensors/:id` |
| **AWS Used** | EB (deploy), RDS (read data), S3 (n/a for this feature), IAM (EC2 instance profile) |
| **LOC** | ~1,400 (900 frontend + 500 backend) |

### Feature 2: Community Report Submission (with S3 photo upload)

| Item | Detail |
|------|--------|
| **What** | Residents submit flood reports (location, description, severity, photo). Photos uploaded to S3 using **presigned URLs** (secure direct upload). View own reports with status (pending/verified/rejected). |
| **Frontend** | `/dashboard/resident/reports` (form with location picker, photo upload, report list) |
| **Backend** | `reports/` module (reports.controller, reports.service — POST/GET), `uploads/` module (uploads.controller, uploads.service — S3 presigned URL generation using AWS SDK) |
| **Database** | `reports` (create/read own: id, userId, location, description, severity, photoUrl, status, submittedAt) |
| **API Endpoints** | `POST /api/reports`, `GET /api/reports/my`, `GET /api/reports/:id`, `POST /api/uploads/presign` (generate presigned PUT URL), `GET /api/uploads/:key` (presigned GET URL) |
| **AWS Used** | EB (deploy), RDS (store report metadata), **S3 (upload photos)**, IAM (S3 permissions) |
| **LOC** | ~700 (400 frontend + 300 backend) |

### AWS Service Lead: S3 Bucket Setup

**Responsibility:** Setup S3 bucket for the entire team (all photo uploads: reports, shelters)

**Tasks:**
1. Create S3 bucket: `floodguard-photos-prod`
2. Configure bucket:
   - Public access: Block all (use presigned URLs instead)
   - CORS configuration (allow PUT/GET from frontend domain)
   - Lifecycle policy (optional: delete files older than 1 year)
3. Create IAM policy for S3 access:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
         "Resource": "arn:aws:s3:::floodguard-photos-prod/*"
       }
     ]
   }
   ```
4. Attach policy to EB EC2 instance profile (work with Member 4)
5. Set environment variable: `S3_BUCKET_NAME=floodguard-photos-prod`
6. Implement presigned URL generation in backend:
   ```typescript
   import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
   import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
   // Generate presigned PUT URL (15 min expiry)
   ```
7. Test photo upload workflow (browser → S3 direct upload)
8. **Document:** S3 setup guide for team (how to use presigned URLs)

**Deliverables:**
- S3 bucket configured and accessible
- Presigned URL generation working
- Other members can use `POST /api/uploads/presign` for their features
- Documentation: `docs/aws-s3-setup.md`

---

## Member 2 — Volunteer (Emergency Response) + RDS Lead

### Role: Volunteer
> Community volunteers who respond to SOS requests and manage shelters.

### Feature 1: SOS Request Response System

| Item | Detail |
|------|--------|
| **What** | Volunteers view incoming SOS requests (evacuation, rescue, medical, relief). Request queue with filters (type, priority, status). Claim requests, update status (pending → assigned → in_progress → completed). Priority-based sorting. |
| **Frontend** | `/dashboard/volunteer` (home with stats), `/dashboard/volunteer/requests` (queue table), `/dashboard/volunteer/requests/:id` (detail), `/dashboard/volunteer/activity` (activity log) |
| **Backend** | `flood-requests/` module (flood-requests.controller, flood-requests.service, flood-requests.dto — GET queue, PATCH claim, PATCH status) |
| **Database** | `flood_requests` (read/update: id, userId, type, priority, status, location, description, assignedVolunteerId, timestamps) |
| **API Endpoints** | `GET /api/flood-requests` (queue with filters), `GET /api/flood-requests/:id`, `PATCH /api/flood-requests/:id/claim`, `PATCH /api/flood-requests/:id/status`, `GET /api/flood-requests/my` |
| **AWS Used** | EB (deploy), **RDS (read/write requests)**, S3 (n/a), IAM (instance profile) |
| **LOC** | ~1,200 (700 frontend + 500 backend) |

### Feature 2: Shelter Management (with S3 photo upload)

| Item | Detail |
|------|--------|
| **What** | Volunteers manage emergency shelters: name, location, capacity, current occupancy, status (open/full/closed). Upload shelter photos to S3 (uses Member 1's presigned URL endpoint). Capacity tracking. |
| **Frontend** | `/dashboard/volunteer/shelters` (list + CRUD form + photo upload), `/dashboard/volunteer/shelters/:id` (detail view) |
| **Backend** | `shelters/` module (shelters.controller, shelters.service — full CRUD, capacity validation) |
| **Database** | `shelters` (CRUD: id, name, location, capacity, currentOccupancy, status, facilities, photoUrl, managedBy, timestamps) |
| **API Endpoints** | `GET /api/shelters`, `POST /api/shelters`, `GET /api/shelters/:id`, `PATCH /api/shelters/:id`, `DELETE /api/shelters/:id` |
| **AWS Used** | EB (deploy), **RDS (store shelter data)**, S3 (shelter photos via M1's upload endpoint), IAM (instance profile) |
| **LOC** | ~850 (450 frontend + 400 backend) |

### AWS Service Lead: RDS PostgreSQL Setup

**Responsibility:** Setup RDS PostgreSQL database for the entire team (all tables)

**Tasks:**
1. Create RDS PostgreSQL instance:
   - Engine: PostgreSQL 15
   - Instance class: `db.t3.micro` (free tier eligible) or `db.t4g.micro`
   - Storage: 20 GB SSD
   - Database name: `floodguard`
   - Master username: `floodguard_admin`
   - Master password: (store securely)
2. Configure security:
   - Create security group: `floodguard-rds-sg`
   - Inbound rule: PostgreSQL (5432) from EB security group (coordinate with Member 3)
   - Public accessibility: No (only EB can access)
3. Set up database connection:
   - Get RDS endpoint: `floodguard-db.xxxxx.us-east-1.rds.amazonaws.com`
   - Connection string: `postgresql://floodguard_admin:PASSWORD@HOST:5432/floodguard`
4. Prisma setup:
   - Initialize Prisma: `npx prisma init`
   - Configure `schema.prisma` with all tables (coordinate with all members)
   - Create initial migration: `npx prisma migrate dev --name init`
5. Set environment variables (for all members):
   ```
   DATABASE_URL=postgresql://floodguard_admin:PASSWORD@HOST:5432/floodguard
   ```
6. Test connection from local machine (temporarily allow your IP)
7. Create deployment migration script: `.platform/hooks/predeploy/01_migrate.sh`
   ```bash
   #!/bin/bash
   cd /var/app/staging/backend
   npx prisma migrate deploy
   ```
8. Seed database with test data: `npx prisma db seed`
9. **Document:** RDS setup guide for team (connection, migrations, troubleshooting)

**Deliverables:**
- RDS instance running and accessible from EB
- Prisma schema with all tables (coordinated with all members)
- Migrations working on local + EB deploy
- Environment variables shared with team (securely)
- Documentation: `docs/aws-rds-setup.md`

---

## Member 3 — Admin (Local Authority) + EB Lead

### Role: Admin
> Government officials who manage alerts and coordinate response.

### Feature 1: Alert Management Console (CRUD + escalation)

| Item | Detail |
|------|--------|
| **What** | Admin creates/edits/escalates flood alerts for regions. Severity levels: info/warning/severe/critical. Escalate alerts (bump severity). Resolve alerts. View all alerts (active + historical) with filters. Multi-region alert support. |
| **Frontend** | `/dashboard/admin` (home with alert stats), `/dashboard/admin/alerts` (list + filters), `/dashboard/admin/alerts/new` (create form), `/dashboard/admin/alerts/:id` (detail + escalate/resolve) |
| **Backend** | `alerts/` module (alerts.controller, alerts.service, alerts.dto — full CRUD, escalation logic, admin-only guard) |
| **Database** | `alerts` (CRUD: id, regionId, severity, message, issuedBy, status, createdAt, updatedAt, resolvedAt) |
| **API Endpoints** | `POST /api/alerts`, `GET /api/alerts`, `GET /api/alerts/:id`, `PATCH /api/alerts/:id`, `PATCH /api/alerts/:id/escalate`, `PATCH /api/alerts/:id/resolve`, `DELETE /api/alerts/:id` |
| **AWS Used** | **EB (deploy)**, RDS (store alerts), S3 (n/a), IAM (instance profile) |
| **LOC** | ~1,100 (650 frontend + 450 backend) |

### Feature 2: Report Review + Region Management

| Item | Detail |
|------|--------|
| **What** | **Report Review:** Admin reviews resident reports. Verify/approve or reject with reason. Photo preview. Filters (status, region, date). **Region Management:** Full CRUD on monitoring zones. Define boundaries (GeoJSON). Update risk levels. Sensor assignments. |
| **Frontend** | `/dashboard/admin/reports` (list + review actions), `/dashboard/admin/reports/:id` (detail + approve/reject), `/dashboard/admin/regions` (list + CRUD form with map), `/dashboard/admin/regions/:id` (detail), `/dashboard/admin/requests` (SOS oversight) |
| **Backend** | `reports/` module (admin endpoints: GET all, PATCH verify, PATCH reject), `regions/` module (full CRUD: regions.controller, regions.service, geofence validation) |
| **Database** | `reports` (read/update: status, adminNote, reviewedBy), `regions` (CRUD: id, name, boundary, riskLevel, sensorIds, population) |
| **API Endpoints** | `GET /api/reports` (admin: all), `GET /api/reports/:id`, `PATCH /api/reports/:id/verify`, `PATCH /api/reports/:id/reject`, `POST /api/regions`, `GET /api/regions`, `PATCH /api/regions/:id`, `DELETE /api/regions/:id` |
| **AWS Used** | **EB (deploy)**, RDS (read/write reports + regions), S3 (read report photos), IAM (instance profile) |
| **LOC** | ~1,300 (750 frontend + 550 backend) |

### AWS Service Lead: Elastic Beanstalk Setup

**Responsibility:** Setup Elastic Beanstalk environments for the entire team (all deploy here)

**Tasks:**
1. Install EB CLI: `pip install awsebcli`
2. Initialize EB application:
   ```bash
   cd backend
   eb init floodguard-api --platform node.js --region us-east-1
   ```
3. Create production environment:
   ```bash
   eb create floodguard-backend-prod --instance-type t3.micro --envvars NODE_ENV=production
   ```
4. Configure deployment:
   - Create `Procfile`:
     ```
     web: npm run start:prod
     ```
   - Create `.platform/hooks/predeploy/01_migrate.sh` (coordinate with Member 2 for Prisma migrations)
   - Create `.ebextensions/nodecommand.config` (if needed)
5. Set up health check:
   - Create `/api/health` endpoint (coordinate with Member 4)
   - Configure EB health check path: `/api/health`
6. Configure environment variables (coordinate with all members):
   ```bash
   eb setenv DATABASE_URL=postgresql://... \
            S3_BUCKET_NAME=floodguard-photos-prod \
            JWT_SECRET=... \
            NODE_ENV=production
   ```
7. Get EB security group ID (share with Member 2 for RDS access)
8. Deploy test version:
   ```bash
   eb deploy
   ```
9. Configure auto-scaling (optional): min 1, max 2 instances
10. Set up deployment pipeline documentation
11. **Frontend EB setup** (similar process):
    ```bash
    cd ..  # root
    eb init floodguard-web --platform node.js
    eb create floodguard-frontend-prod --instance-type t3.micro
    ```
12. **Document:** EB setup guide (how to deploy, environment variables, troubleshooting)

**Deliverables:**
- Both EB environments running (backend + frontend)
- Green health status in EB console
- All members can deploy with `eb deploy`
- Deployment workflow documented
- Documentation: `docs/aws-eb-deployment.md`

---

## Member 4 — Authentication & Infrastructure + IAM Lead

### Role: Infrastructure (Cross-Cutting)
> Handles authentication, user management, and security configuration.

### Feature 1: Authentication System

| Item | Detail |
|------|--------|
| **What** | **Register:** Email, password, name, phone, role (resident/volunteer). Password hashing (bcrypt, 10 rounds). **Login:** JWT token generation (`{ sub: userId, role, email }`, 7-day expiry). **Logout:** Token invalidation (optional blacklist). JWT middleware for protected routes. Role-based guards. |
| **Frontend** | `/auth/register` (registration form), `/auth/login` (login form), `/dashboard/profile` (user profile view/edit) |
| **Backend** | `auth/` module (auth.controller, auth.service — register, login, JWT), `guards/` (jwt-auth.guard, roles.guard) |
| **Database** | `users` (create + authenticate: id, email, passwordHash, name, phone, role, status, createdAt, lastLogin) |
| **API Endpoints** | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` (current user) |
| **AWS Used** | EB (deploy), RDS (store users), S3 (n/a), **IAM (JWT secret in env vars)** |
| **LOC** | ~800 (400 frontend + 400 backend) |

### Feature 2: User Management + Health Monitoring

| Item | Detail |
|------|--------|
| **What** | **User Management:** Admin can view all users (table with filters: role, status). Create users. Update user details (name, email, role). Deactivate accounts. **Health Monitoring:** Health check endpoint (`/api/health`) for EB. Detailed health (`/api/health/detailed`) shows: DB connection, S3 access, memory, uptime. Admin health dashboard. CloudWatch log integration. |
| **Frontend** | `/dashboard/admin/users` (user list + CRUD form — admin only), `/dashboard/admin/health` (health dashboard — admin only) |
| **Backend** | `users/` module (users.controller, users.service — CRUD, admin-only guard), `health/` module (health.controller, health.service — health checks) |
| **Database** | `users` (CRUD: read all, update, soft delete), `system_logs` (optional: id, level, message, timestamp) |
| **API Endpoints** | `GET /api/users` (admin only), `GET /api/users/:id`, `PATCH /api/users/:id`, `DELETE /api/users/:id`, `GET /api/health`, `GET /api/health/detailed` (admin only) |
| **AWS Used** | EB (health check), RDS (users CRUD), S3 (health check S3 connection), **IAM (EC2 instance profile permissions)** |
| **LOC** | ~1,350 (600 frontend + 750 backend) |

### AWS Service Lead: IAM Roles & Security Configuration

**Responsibility:** Setup IAM roles, security groups, and environment security for the entire team

**Tasks:**
1. **Create IAM Role for EB EC2 Instances:**
   - Role name: `floodguard-ec2-role`
   - Trusted entity: EC2
   - Attach AWS managed policies:
     - `AWSElasticBeanstalkWebTier`
     - `AWSElasticBeanstalkWorkerTier` (if using workers)
     - `AWSElasticBeanstalkMulticontainerDocker` (if using Docker)
   - Create custom policy for S3 (coordinate with Member 1):
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
           "Resource": "arn:aws:s3:::floodguard-photos-prod/*"
         },
         {
           "Effect": "Allow",
           "Action": ["s3:ListBucket"],
           "Resource": "arn:aws:s3:::floodguard-photos-prod"
         }
       ]
     }
     ```
   - Attach custom S3 policy to role

2. **Create Instance Profile:**
   - Instance profile name: `floodguard-ec2-instance-profile`
   - Attach `floodguard-ec2-role` to instance profile
   - Assign to EB environment (coordinate with Member 3)

3. **Configure Security Groups:**
   - Get EB security group ID from Member 3
   - Ensure RDS security group (from Member 2) allows inbound from EB security group
   - Document security group rules

4. **Environment Variables (Secure Management):**
   - Generate JWT secret: `openssl rand -base64 32`
   - Coordinate with all members to collect required env vars:
     - `DATABASE_URL` (from Member 2)
     - `S3_BUCKET_NAME` (from Member 1)
     - `JWT_SECRET` (your responsibility)
     - `JWT_EXPIRY=7d`
     - `BCRYPT_ROUNDS=10`
     - `NODE_ENV=production`
   - Store sensitive values in AWS Systems Manager Parameter Store (optional but recommended):
     ```bash
     aws ssm put-parameter --name /floodguard/prod/db-password --value "..." --type SecureString
     aws ssm put-parameter --name /floodguard/prod/jwt-secret --value "..." --type SecureString
     ```
   - Share with team via secure channel (NOT git)

5. **CloudWatch Logs Configuration:**
   - Enable CloudWatch Logs for EB environments
   - Configure log streaming (application logs, access logs, error logs)
   - Create log groups: `/aws/elasticbeanstalk/floodguard-backend-prod/`
   - Set retention: 7 days (to save costs)

6. **Security Best Practices Documentation:**
   - Document: How to rotate JWT secret
   - Document: How to add new IAM permissions
   - Document: Security group rules explanation
   - Document: Environment variable management

7. **Implement Health Checks:**
   - Create `/api/health` endpoint:
     ```typescript
     @Get('health')
     async healthCheck() {
       return {
         status: 'ok',
         timestamp: new Date().toISOString(),
         uptime: process.uptime(),
       };
     }
     ```
   - Create `/api/health/detailed` (admin only):
     ```typescript
     @Get('health/detailed')
     @UseGuards(JwtAuthGuard, RolesGuard)
     @Roles('admin')
     async detailedHealth() {
       const dbStatus = await this.checkDatabase();
       const s3Status = await this.checkS3();
       return {
         database: dbStatus,
         s3: s3Status,
         memory: process.memoryUsage(),
         uptime: process.uptime(),
       };
     }
     ```

8. **Document:** IAM and security setup guide

**Deliverables:**
- IAM role with correct permissions (EB + S3 + RDS)
- Instance profile attached to EB (working with Member 3)
- Security groups configured (RDS accessible from EB)
- Environment variables documented and shared securely
- CloudWatch Logs enabled and streaming
- Health check endpoints working
- Documentation: `docs/aws-iam-security.md`

---

## Collaboration Timeline (6 Weeks)

### Week 1: AWS Infrastructure Setup (All Members Collaborate)

**Monday-Tuesday: Planning & Account Setup**
- All: AWS account access confirmed
- All: Install AWS CLI, EB CLI, configure credentials
- All: Review architecture diagram together
- Member 3: Start EB environment creation
- Member 2: Start RDS instance creation
- Member 1: Start S3 bucket creation
- Member 4: Start IAM role creation

**Wednesday-Friday: Infrastructure Integration**
- Member 3: EB environments created, get security group IDs
- Member 2: RDS instance created, configure security group (allow EB)
- Member 1: S3 bucket configured, IAM policy created
- Member 4: Attach S3 policy to IAM role, create instance profile
- All: Test connections:
  - EB → RDS connection test
  - EB → S3 connection test (upload/download test file)
  - Health check endpoint working
- Member 2: Share `DATABASE_URL` with team
- Member 1: Share `S3_BUCKET_NAME` with team
- Member 4: Share `JWT_SECRET` with team
- Member 3: Set all environment variables in EB

**Weekend: Documentation**
- Member 1: Write `docs/aws-s3-setup.md`
- Member 2: Write `docs/aws-rds-setup.md`
- Member 3: Write `docs/aws-eb-deployment.md`
- Member 4: Write `docs/aws-iam-security.md`

### Week 2-3: Backend Development (Parallel)

**All Members Work Simultaneously:**
- Member 1: Weather, Regions, Sensors GET endpoints, Reports POST, Uploads presigned URLs
- Member 2: Flood-requests (volunteer queue, claim, status), Shelters CRUD
- Member 3: Alerts CRUD + escalation, Reports admin review, Regions CRUD
- Member 4: Auth (register, login, JWT), Users CRUD, Guards, Health endpoints

**Daily Standups (15 min):**
- What I did yesterday
- What I'm doing today
- Any blockers (help needed)

**Mid-Week 2: Prisma Schema Collaboration**
- Member 2 leads: Combine all table definitions into `schema.prisma`
- All: Review and agree on schema
- Member 2: Create and run initial migration
- All: Pull latest migration, test locally

**End of Week 3 Milestone:**
- ✅ All backend endpoints working locally
- ✅ Prisma migrations applied
- ✅ Postman collection with all endpoints
- ✅ Unit tests (optional but recommended)

### Week 4-5: Frontend Development (Parallel)

**All Members Work Simultaneously:**
- Member 1: Resident home, Map (Mapbox/Leaflet), Weather dashboard, Reports page
- Member 2: Volunteer home, Requests queue, Shelters page, Activity log
- Member 3: Admin home, Alerts console, Report review, Regions manager
- Member 4: Auth pages (register, login), Profile page, Admin users page, Health dashboard

**Integration Points:**
- All: Use Member 4's auth context for login state
- Member 1 & 2: Use Member 1's upload endpoint for photos
- All: Use consistent Tailwind classes (design system)
- All: Use React Query for API calls (consistent pattern)

**End of Week 5 Milestone:**
- ✅ All frontend pages working locally
- ✅ Frontend ↔ Backend integration working
- ✅ Photos upload to S3 successfully
- ✅ Authentication flow working

### Week 6: Deployment & Testing

**Monday-Tuesday: Deployment**
- All: Deploy backend to EB:
  ```bash
  cd backend
  eb deploy floodguard-backend-prod
  ```
- All: Deploy frontend to EB:
  ```bash
  cd frontend  # or root
  eb deploy floodguard-frontend-prod
  ```
- All: Test deployed app (each member tests their features)

**Wednesday-Thursday: Integration Testing**
- Test cross-feature flows:
  - Resident submits report → Admin reviews → Resident sees verified status
  - Admin creates alert → Resident sees on map
  - Resident submits SOS → Volunteer claims → Volunteer completes
  - Volunteer adds shelter → Resident sees on evacuation map
- Fix bugs found during testing
- All: Re-deploy after fixes

**Friday: Demo Preparation**
- All: Prepare demo scripts
- All: Take AWS console screenshots:
  - Member 1: S3 bucket with photos
  - Member 2: RDS instance (available status)
  - Member 3: EB environments (green health)
  - Member 4: IAM roles and policies
- All: Record demo videos (each member shows their features)
- All: Prepare presentation slides

**Weekend: Documentation & Submission**
- All: Update README with deployment instructions
- All: Complete workload matrix (track actual hours worked)
- All: Write individual reflection (what you learned)
- All: Submit project artifacts

---

## Demo Checklist (Each Member Demonstrates)

### Member 1 Demo (Resident Info + S3)
- [ ] Login as resident
- [ ] View flood risk map with color-coded regions
- [ ] View weather dashboard with rainfall charts
- [ ] View sensor readings
- [ ] Submit flood report with photo upload
- [ ] Show photo uploaded to S3 (open S3 console, show object)
- [ ] View own reports list with status
- [ ] **AWS:** Show S3 bucket configuration (CORS, IAM policy)

### Member 2 Demo (Volunteer + RDS)
- [ ] Login as volunteer
- [ ] View SOS request queue with filters
- [ ] Claim a request (status changes)
- [ ] Update request to in_progress, then completed
- [ ] View activity log
- [ ] View shelters list
- [ ] Add new shelter with photo upload (uses M1's upload endpoint)
- [ ] Update shelter occupancy
- [ ] **AWS:** Show RDS instance (available), security groups, Prisma migrations

### Member 3 Demo (Admin + EB)
- [ ] Login as admin
- [ ] Create flood alert for a region
- [ ] Escalate alert severity (warning → severe)
- [ ] Resolve alert
- [ ] View all community reports
- [ ] Verify a report (approve with note)
- [ ] Reject a report (with reason)
- [ ] Manage regions (create, edit boundary, update risk level)
- [ ] **AWS:** Show EB environments (green health), deployment logs, health check

### Member 4 Demo (Auth + IAM)
- [ ] Register new resident user
- [ ] Register new volunteer user
- [ ] Login with registered user (JWT issued)
- [ ] View user profile
- [ ] Login as admin
- [ ] View all users list with filters
- [ ] Create new user via admin panel
- [ ] Change user role
- [ ] View health dashboard (DB, S3, memory, uptime)
- [ ] **AWS:** Show IAM roles, instance profile, security groups, CloudWatch logs

---

## Equal Workload Distribution

| Member | Frontend LOC | Backend LOC | AWS Setup | Total Work | Complexity |
|--------|-------------|-------------|-----------|------------|------------|
| **M1** | ~1,300 | ~800 | **S3 (bucket, CORS, presigned URLs)** | **~2,100 + S3 setup** | Map (Mapbox), weather charts, S3 presigned URLs (AWS SDK) |
| **M2** | ~1,150 | ~900 | **RDS (instance, schema, migrations)** | **~2,050 + RDS setup** | Request queue, claim logic, Prisma schema design, DB migrations |
| **M3** | ~1,400 | ~1,000 | **EB (2 environments, deployment)** | **~2,400 + EB setup** | Alert escalation, report review, geofence validation, EB deployment pipeline |
| **M4** | ~1,000 | ~1,150 | **IAM (roles, security groups, env vars)** | **~2,150 + IAM setup** | JWT + bcrypt, role guards, IAM policies, security configuration |

**Balancing Factor:** LOC differences are offset by AWS complexity
- M1 has slightly less code but handles complex S3 presigned URL logic
- M2 has moderate code but owns entire database design and migrations (highest DB complexity)
- M3 has most code but EB deployment is well-documented (AWS handled)
- M4 has moderate code but handles most security-critical components (JWT, IAM, guards)

---

## Learning Outcomes (All Members Gain)

### Technical Skills (Everyone)
- ✅ **Frontend:** React 19, Next.js 16 App Router, Tailwind CSS 4, TypeScript
- ✅ **Backend:** NestJS 11, TypeScript, REST APIs, DTO validation
- ✅ **Database:** PostgreSQL, Prisma ORM, migrations, schema design
- ✅ **Authentication:** JWT, bcrypt, role-based access control
- ✅ **AWS Elastic Beanstalk:** Deploy Node.js apps, environment configuration, health checks
- ✅ **AWS RDS:** PostgreSQL setup, security groups, connection management
- ✅ **AWS S3:** Bucket configuration, presigned URLs, IAM policies
- ✅ **AWS IAM:** Roles, policies, instance profiles, security best practices
- ✅ **Git:** Branching, merging, collaboration workflows

### AWS Hands-On Experience (Everyone)
| AWS Service | Everyone Uses | Lead Responsibility |
|-------------|---------------|---------------------|
| **Elastic Beanstalk** | ✅ All deploy their code with `eb deploy` | Member 3 (initial setup, troubleshooting) |
| **RDS PostgreSQL** | ✅ All connect to same DB, write to their tables | Member 2 (instance setup, schema coordination) |
| **S3** | ✅ All use photo uploads (M1 & M2 directly, M3 reads) | Member 1 (bucket setup, presigned URL implementation) |
| **IAM** | ✅ All use permissions from instance profile | Member 4 (role creation, policy management) |

---

## Submission Artifacts

### 1. Code Repository
- **Branches:**
  - `main` — final merged code
  - `member1-resident-s3` — M1's features + S3 setup
  - `member2-volunteer-rds` — M2's features + RDS setup
  - `member3-admin-eb` — M3's features + EB setup
  - `member4-auth-iam` — M4's features + IAM setup
- **Commit History:** Each member has clear commits showing their work
- **README.md:** Setup instructions, deployment guide, environment variables

### 2. AWS Documentation (by Service Lead)
- `docs/aws-s3-setup.md` (Member 1)
- `docs/aws-rds-setup.md` (Member 2)
- `docs/aws-eb-deployment.md` (Member 3)
- `docs/aws-iam-security.md` (Member 4)
- `docs/aws-architecture.md` (All collaborate)

### 3. AWS Console Screenshots
- **Member 1:** S3 bucket (objects list), CORS configuration, IAM S3 policy
- **Member 2:** RDS instance (status: available), security groups, parameter groups
- **Member 3:** EB environments (green health), deployment history, health checks
- **Member 4:** IAM roles, instance profile, CloudWatch logs, security groups

### 4. Deployed Application
- **Frontend URL:** `http://floodguard-frontend-prod.elasticbeanstalk.com`
- **Backend URL:** `http://floodguard-backend-prod.elasticbeanstalk.com`
- **Health Check:** `http://floodguard-backend-prod.elasticbeanstalk.com/api/health` (200 OK)

### 5. Database Evidence
- Prisma schema file (`schema.prisma`) showing all tables
- Sample data exports from each table
- ER diagram showing relationships

### 6. API Documentation
- Postman collection with all endpoints (organized by member)
- Example requests/responses
- Authentication flow diagram

### 7. Workload Matrix
Use the table above showing:
- Lines of code per member
- AWS service ownership
- Unique complexity per member

### 8. Individual Reflections
Each member writes 1-2 pages:
- What features you built
- What AWS service you led (what you learned, challenges faced)
- What you learned from other members' AWS services
- How you collaborated with the team
- Technical challenges and solutions

---

## Advantages of This Distribution

### 1. **Equal AWS Experience**
- Everyone deploys to EB → everyone learns deployment
- Everyone uses RDS → everyone learns databases in the cloud
- Everyone uses S3 → everyone learns object storage
- Everyone uses IAM → everyone learns cloud security

### 2. **Specialization + Knowledge Sharing**
- Each member becomes "expert" in one AWS service (lead role)
- Experts help teammates troubleshoot their service
- Documentation ensures knowledge transfer

### 3. **Parallel Development**
- All 4 members can work simultaneously (no bottlenecks)
- AWS setup in Week 1 unblocks everyone
- Backend & Frontend development happens in parallel

### 4. **Real-World Team Dynamics**
- Mimics actual software teams (specialists who collaborate)
- Daily standups keep everyone synchronized
- Shared infrastructure requires communication

### 5. **Fair Assessment**
- Equal lines of code (~2,000-2,400 per member)
- Equal AWS responsibility (1 major service each)
- Equal feature count (2 per member)
- Clear individual contributions (separate branches)

---

## Risk Mitigation

### What if one member's AWS service blocks others?

**Solution:** Week 1 is dedicated to AWS setup with checkpoints:
- If RDS setup delayed → Member 2 gets help from Member 4 (IAM expert)
- If EB setup delayed → Member 3 gets help from Member 1 (config files)
- If S3 setup delayed → Member 1 gets help from Member 4 (IAM policies)
- If IAM setup delayed → Member 4 gets help from all (security is critical)

**Backup Plan:** 
- Use local database (PostgreSQL) for weeks 2-3 if RDS delayed
- Use temporary IAM role if Member 4's role delayed
- Use public S3 bucket (temporarily) if IAM policy delayed

### What if someone can't meet the timeline?

**Solution:** 
- **Pair programming:** Two members work together on blocked feature
- **Feature swap:** Swap a smaller feature between members
- **Code review:** Other members review and suggest fixes
- **Weekend catch-up:** Extended work session with team support

---

**End of Work Breakdown**

> **Summary:** 4 members, 3 roles (Resident, Volunteer, Admin), 8 features total (2 per member), 4 AWS services (1 lead per member), equal learning opportunities for all.

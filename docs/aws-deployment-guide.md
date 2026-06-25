# FloodGuard — AWS Deployment Guide (Elastic Beanstalk)

> Cloud deployment guide for the **CT071-3-3-DDAC** group project (Problem #4: Flood Early Warning & Community Alert System).
> Target platform: **AWS** using **Elastic Beanstalk** for compute, **RDS PostgreSQL** for the database, **S3** for storage, **SNS/SES** for notifications, and **CloudWatch** for monitoring.

### Deployment Progress

| Phase | Status |
|-------|--------|
| Phase 0 — Code Changes | ✅ Done |
| Phase 1 — Prerequisites & Tooling | ✅ Done |
| Phase 2 — RDS PostgreSQL | ✅ Done (endpoint: `floodguard-db.c4t6ymcw2eqt.us-east-1.rds.amazonaws.com`) |
| Phase 3 — Backend on Elastic Beanstalk | ⬜ Next |
| Phase 4 — Frontend on Elastic Beanstalk | ⬜ Pending |
| Phase 5 — S3 for File Storage | ✅ Done (bucket: `floodguard-uploads`) |
| Phase 6 — SNS / SES for Alerts | ⬜ Pending |
| Phase 7 — CloudWatch Monitoring | ⬜ Pending |
| Phase 8 — HTTPS & Custom Domain | ⬜ Optional |

---

## Table of Contents

1. [Stack Summary](#1-stack-summary)
2. [Target Architecture](#2-target-architecture)
3. [Phase 0 — Required Code Changes Before Deploying](#phase-0--required-code-changes-before-deploying)
4. [Phase 1 — Prerequisites & Tooling](#phase-1--prerequisites--tooling)
5. [Phase 2 — RDS PostgreSQL Database](#phase-2--rds-postgresql-database)
6. [Phase 3 — Backend (NestJS) on Elastic Beanstalk](#phase-3--backend-nestjs-on-elastic-beanstalk)
7. [Phase 4 — Frontend (Next.js) on Elastic Beanstalk](#phase-4--frontend-nextjs-on-elastic-beanstalk)
8. [Phase 5 — S3 for File Storage](#phase-5--s3-for-file-storage-report-images)
9. [Phase 6 — SNS / SES for Alerts](#phase-6--sns--ses-for-alerts-task-2)
10. [Phase 7 — CloudWatch Monitoring](#phase-7--cloudwatch-monitoring-assignment-requirement)
11. [Phase 8 — HTTPS & Custom Domain](#phase-8--https--custom-domain-optional-but-recommended)
12. [Phase 9 — Redeploy / Update Workflow](#phase-9--redeploy--update-workflow)
13. [Phase 10 — Cost Control & Teardown](#phase-10--cost-control--teardown)
14. [Troubleshooting Cheat Sheet](#troubleshooting-cheat-sheet)
15. [Pre-Demo Verification Checklist](#pre-demo-verification-checklist)
16. [Appendix — Environment Variable Reference](#appendix--environment-variable-reference)

---

## 0. Why Elastic Beanstalk? — Service Selection Justification

### The Decision

We chose **AWS Elastic Beanstalk (EB)** for both the NestJS backend and Next.js frontend. This section explains why — and why we rejected other options.

### AWS Compute Services Comparison

| Service | What It Is | Pros | Cons | Why Not For Us |
|---------|-----------|------|------|----------------|
| **Elastic Beanstalk** | Managed PaaS — abstracts EC2, ALB, Auto Scaling, monitoring | Zero infrastructure code; built-in health checks, rolling deploys, env vars, log streaming; **free tier eligible** (only pay for underlying EC2) | Less fine-grained control; opinionated deployment model | **✅ CHOSEN** — best fit for a university project needing fast deployment with enterprise patterns |
| **EC2 (raw)** | Bare virtual machines — full manual setup | Complete control; cheapest long-term for predictable workloads | Must manually configure nginx, systemd, deployments, SSL, health checks, auto-scaling, monitoring | Too much ops overhead for a 7-week project; no built-in CI/CD or health management |
| **ECS (Fargate)** | Container orchestration — Docker-based | Scales to zero; excellent for microservices; no server management | Requires Dockerfiles, ECR registry, task definitions, service discovery; steep learning curve | Over-engineered for 2 services; Docker adds complexity without benefit here |
| **Lambda** | Serverless functions — per-request billing | Scales automatically; zero cost at idle; no servers | 15-min timeout; cold starts (bad for real-time alerts); NestJS doesn't natively fit Lambda; complex local dev | NestJS is a long-running server framework — Lambda's request/response model is architecturally wrong for it |
| **App Runner** | Simplified container PaaS | Even simpler than EB; auto-scales from source | Limited config options; no `.ebextensions` equivalent; less mature; fewer monitoring integrations | Less ecosystem support; can't customize nginx, hooks, or platform extensions |
| **Lightsail** | Simplified VPS (like DigitalOcean) | Fixed pricing; simple UI | No auto-scaling; no built-in deployment pipeline; manual everything beyond basic setup | Doesn't satisfy the "leverage cloud technologies for high performance and availability" requirement |

### Why EB Specifically?

**1. Matches Assignment Requirements Perfectly:**
- "Leverage cloud technologies to ensure high performance and availability" → EB provides auto-scaling, load balancing, health monitoring out of the box
- "Integrate various cloud services" → EB natively integrates with RDS, S3, CloudWatch, SNS
- "Utilize AWS monitoring tools" → EB auto-publishes metrics to CloudWatch; enhanced health gives us free monitoring dashboards

**2. Development Speed:**
- `eb deploy` = one command to ship code to production
- Environment variables via `eb setenv` — no SSM Parameter Store or Secrets Manager needed
- Predeploy hooks (`.platform/hooks/`) run Prisma migrations automatically on each deploy
- No Dockerfile, no Kubernetes manifests, no Terraform

**3. Free Tier Eligible:**
- EB itself is free — you only pay for the EC2 instances it manages
- `t3.micro` instance = Free Tier for 12 months
- Single-instance mode (no ALB) = no load balancer cost during development

**4. Production-Ready Patterns Without Complexity:**
- Nginx reverse proxy configured automatically (port 80 → 8080)
- Health check monitoring with automatic instance replacement
- Rolling deployments prevent downtime during updates
- CloudWatch log streaming with one checkbox

**5. Separation of Concerns — Two Environments:**
- Backend and frontend are independently deployable and scalable
- Backend can scale vertically (bigger instance for DB-heavy analytics) without affecting frontend
- Different health check paths (`/api/health` vs `/`)
- Independent environment variables (secrets stay in backend only)

### Why NOT a Single Server?

Running both frontend and backend on one EC2 instance would:
- Create a single point of failure (one crash kills both services)
- Make independent scaling impossible
- Mix environment variables (security risk — frontend doesn't need DB credentials)
- Make deployments riskier (updating backend shouldn't require frontend restart)
- Not demonstrate cloud architecture patterns (the point of this course)

### Why NOT Serverless (Lambda)?

- NestJS is designed as a **long-running HTTP server** with dependency injection, middleware pipelines, and connection pooling — it doesn't fit Lambda's cold-start, stateless model
- WebSocket support (future: real-time alerts) requires persistent connections
- Prisma + Lambda has known cold-start issues with connection pooling
- Our system needs to respond to weather data continuously, not just on-demand

### Why NOT Containers (ECS/Fargate)?

- **Adds complexity without benefit** for our use case:
  - Need to write and maintain Dockerfiles
  - Need ECR registry for image storage
  - Need task definitions, service configs, target groups
  - Need to understand container networking (awsvpc mode, security groups per task)
- The team has no prior Docker/container experience
- EB gives us the same outcome (scalable, managed compute) with 80% less configuration
- If we outgrow EB, migration to ECS is straightforward (just add a Dockerfile)

### Architecture Decision Record (ADR)

```
Decision: Use Elastic Beanstalk for both compute services
Date: June 2026
Status: Accepted

Context: Need to deploy a Next.js frontend + NestJS backend to AWS for DDAC group project.
Must demonstrate cloud computing concepts, high availability, and monitoring.

Constraints:
- 7-week timeline
- Team of 3-4 students with varying AWS experience
- Must use multiple AWS services (compute, DB, storage, monitoring)
- Must demonstrate deployment and operational metrics
- Budget: AWS Free Tier only

Decision: Elastic Beanstalk (Node.js platform) for both services.
- Gives us EC2, Auto Scaling, ELB, CloudWatch integration in one abstraction
- Minimal ops overhead allows team to focus on application features
- .platform hooks automate database migrations
- Enhanced health reporting satisfies monitoring requirement

Alternatives Rejected:
- Raw EC2: too much ops work for the timeline
- Lambda: architectural mismatch with NestJS
- ECS/Fargate: unnecessary container complexity
- App Runner: immature, fewer monitoring integrations

Consequences:
+ Fast deployment (1 command)
+ Free tier eligible
+ Built-in monitoring + log streaming
+ Team can focus on features, not infrastructure
- Less flexibility than raw EC2 for custom nginx config
- Deployment takes 3-5 min (vs instant for Lambda)
- Must use Node.js platform (can't mix runtimes)
```

---

## 1. Stack Summary

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + Tailwind 4 + GSAP | Runs at root `/`, port 3000 (8080 in prod). Uses `NEXT_PUBLIC_API_URL`, Recharts |
| Backend | NestJS 11 + TypeScript | Port 5001 (8080 in prod), global prefix `/api`, Swagger at `/api/docs`, JWT auth, bcrypt |
| ORM / DB | Prisma 7 + PostgreSQL | **Amazon RDS PostgreSQL** (us-east-1) ✅ Done |
| Storage | Amazon S3 | `floodguard-uploads` bucket for report photos ✅ Done |
| Package managers | bun (frontend), pnpm (backend) | |

---

## 2. Target Architecture

```
                    ┌─────────────────────────────────────────┐
   Users ──HTTPS──▶ │  Route 53 (optional) → ACM TLS cert      │
                    └─────────────────────────────────────────┘
                          │                          │
                ┌─────────▼─────────┐      ┌─────────▼─────────┐
                │  EB Env: frontend │      │  EB Env: backend  │
                │  Next.js 16       │─API─▶│  NestJS 11 /api   │
                │  (Node platform)  │      │  (Node platform)  │
                └───────────────────┘      └─────────┬─────────┘
                                                      │
                                       ┌──────────────┼──────────────┐
                                       ▼              ▼              ▼
                                 ┌──────────┐  ┌──────────┐  ┌──────────┐
                                 │ RDS      │  │ S3       │  │ SNS/SES  │
                                 │ Postgres │  │ uploads  │  │ alerts   │
                                 └──────────┘  └──────────┘  └──────────┘
                                       └────── CloudWatch (logs, metrics, alarms, dashboard) ──────┘
```

Two Beanstalk environments (frontend + backend), one RDS PostgreSQL instance, S3 for report images, SNS/SES for alerts, and CloudWatch for monitoring (satisfies the assignment's "AWS monitoring tools" requirement).

**Region:** Use **`us-east-1`** (N. Virginia) consistently across every service.

---

## Phase 0 — Required Code Changes Before Deploying

> ✅ **These are already done** in the codebase. Listed here for reference.

### 0.1 Dynamic API URL
`app/lib/axios.ts` reads `NEXT_PUBLIC_API_URL` from environment:
```ts
baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api",
```

### 0.2 Health-check endpoint
`backend/src/health.controller.ts` — `GET /api/health` returns `{"status":"ok"}`.

### 0.3 CORS locked to FRONTEND_URL
`backend/src/main.ts`:
```ts
app.enableCors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true });
```

### 0.4 Prisma migration committed
`backend/prisma/migrations/20240101000000_init/` exists. Production uses `prisma migrate deploy`.

### 0.5 Procfiles
- `backend/Procfile` → `web: node dist/main`
- `Procfile` (root) → `web: npx next start -p 8080`

### 0.6 Predeploy hook
`backend/.platform/hooks/predeploy/01_prisma.sh` runs `prisma generate` + `prisma migrate deploy` on each EB deploy.

---

## Phase 1 — Prerequisites & Tooling

### 1.1 Create an AWS Account

#### Via Browser:
1. Go to https://aws.amazon.com/ → Click **"Create an AWS Account"**
2. Enter your email, choose an account name (e.g. `floodguard-team`)
3. Verify your email with the code sent
4. Choose **Personal** account type
5. Enter payment details (a credit/debit card — you won't be charged if you stay on Free Tier)
6. Verify your phone number
7. Select the **Basic Support (Free)** plan
8. You'll land on the AWS Management Console

### 1.2 Create an IAM User (for CLI access)

#### Via Browser (AWS Console):
1. Go to **Console** → Search bar → type **"IAM"** → click **IAM**
2. Left sidebar → **Users** → click **"Create user"**
3. User name: `floodguard-deploy`
4. Check ✅ **"Provide user access to the AWS Management Console"** (optional, for team members)
5. Click **Next**
6. Select **"Attach policies directly"**
7. Search for `AdministratorAccess` → check it ✅
8. Click **Next** → **Create user**
9. **IMPORTANT:** Click on the user → **Security credentials** tab → **Create access key**
10. Select **"Command Line Interface (CLI)"**
11. Check the confirmation box → **Next** → **Create access key**
12. **COPY BOTH:**
    - Access key ID: `AKIA...`
    - Secret access key: `wJal...`
    - (Download the `.csv` file as backup)

#### Via CLI:
```bash
aws iam create-user --user-name floodguard-deploy
aws iam attach-user-policy --user-name floodguard-deploy --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
aws iam create-access-key --user-name floodguard-deploy
# Save the AccessKeyId and SecretAccessKey from the output
```

### 1.3 Install CLI Tools

```bash
# AWS CLI v2 (macOS)
brew install awscli

# Elastic Beanstalk CLI
pip install awsebcli --upgrade --user

# Verify installations
aws --version        # Should show aws-cli/2.x.x
eb --version         # Should show EB CLI 3.x.x
```

**Windows:**
- Download AWS CLI MSI installer from https://aws.amazon.com/cli/
- `pip install awsebcli --upgrade`

### 1.4 Configure AWS CLI with Your Credentials

```bash
aws configure
```

It will prompt you:
```
AWS Access Key ID [None]: AKIA...YOUR_KEY_HERE
AWS Secret Access Key [None]: wJal...YOUR_SECRET_HERE
Default region name [None]: us-east-1
Default output format [None]: json
```

### 1.5 Verify Everything Works

```bash
aws sts get-caller-identity
```

Expected output:
```json
{
    "UserId": "AIDA...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/floodguard-deploy"
}
```

---

## Phase 2 — RDS PostgreSQL Database

### 2.1 Create the Database

#### Via Browser (AWS Console):

1. Go to **Console** → Search bar → type **"RDS"** → click **Amazon RDS**
2. Click **"Create database"** (orange button)
3. Fill in the form:

| Setting | Value |
|---------|-------|
| Creation method | **Standard create** |
| Engine type | **PostgreSQL** |
| Engine version | **PostgreSQL 16.x** (latest available) |
| Templates | **Free tier** ⭐ |
| DB instance identifier | `floodguard-db` |
| Master username | `floodguard` |
| Credentials management | **Self managed** |
| Master password | Enter a strong password (save it!) |
| Confirm password | Re-enter the same password |

4. **Instance configuration:**
   - DB instance class: `db.t3.micro` (Free tier eligible)

5. **Storage:**
   - Storage type: `gp3`
   - Allocated storage: `20` GB
   - Uncheck "Enable storage autoscaling" (to avoid surprise costs)

6. **Connectivity:**
   - VPC: **Default VPC** (leave as-is)
   - Subnet group: **default**
   - Public access: **Yes** ← (temporarily, so you can run migrations from your laptop)
   - VPC security group: **Create new** → name it `floodguard-db-sg`
   - Availability Zone: No preference
   - Database port: `5432`

7. **Database authentication:** Password authentication

8. **Additional configuration:**
   - Initial database name: `floodguard` ← **IMPORTANT: type this!**
   - Uncheck "Enable automated backups" (saves cost for dev)
   - Uncheck "Enable Performance Insights"
   - Uncheck "Enable Enhanced monitoring"

9. Click **"Create database"** → Wait 5-10 minutes for status to become "Available"

#### Via CLI:
```bash
aws rds create-db-instance \
  --db-instance-identifier floodguard-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16.4 \
  --master-username floodguard \
  --master-user-password "YOUR_STRONG_PASSWORD_HERE" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --db-name floodguard \
  --publicly-accessible \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --region us-east-1 \
  --no-multi-az \
  --backup-retention-period 0

# Wait for it to be available
aws rds wait db-instance-available --db-instance-identifier floodguard-db
```

### 2.2 Get Your Database Endpoint

#### Via Browser:
1. Go to **RDS** → **Databases** → click on `floodguard-db`
2. Under **Connectivity & security** tab → copy the **Endpoint** (looks like: `floodguard-db.c4t6ymcw2eqt.us-east-1.rds.amazonaws.com`)
3. Port is `5432`

#### Via CLI:
```bash
aws rds describe-db-instances --db-instance-identifier floodguard-db \
  --query 'DBInstances[0].Endpoint.Address' --output text
# Output: floodguard-db.c4t6ymcw2eqt.us-east-1.rds.amazonaws.com
```

### 2.3 Configure Security Group (Allow Your IP)

#### Via Browser:
1. In the RDS instance page → **Connectivity & security** → click on the VPC security group link (`floodguard-db-sg`)
2. You're now in **EC2 → Security Groups**
3. Click **"Inbound rules"** tab → **"Edit inbound rules"**
4. Click **"Add rule"**:
   - Type: **PostgreSQL**
   - Port range: `5432` (auto-filled)
   - Source: **My IP** (auto-detects your current IP)
   - Description: `My laptop - temporary`
5. Click **"Save rules"**

#### Via CLI:
```bash
# Get your public IP
MY_IP=$(curl -s https://checkip.amazonaws.com)

# Find the security group ID
SG_ID=$(aws rds describe-db-instances --db-instance-identifier floodguard-db \
  --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' --output text)

# Add inbound rule for your IP
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 5432 \
  --cidr "$MY_IP/32"
```

### 2.4 Build Your DATABASE_URL

Format:
```
postgresql://USERNAME:PASSWORD@ENDPOINT:5432/DATABASE_NAME?schema=public
```

Example:
```
postgresql://floodguard:YOUR_PASSWORD@floodguard-db.c4t6ymcw2eqt.us-east-1.rds.amazonaws.com:5432/floodguard?schema=public&sslmode=require&uselibpqcompat=true
```

### 2.5 Run Migrations Against RDS

```bash
cd backend

# Set the DATABASE_URL to point to RDS (URL-encode special chars in password: # → %23, ! → %21)
export DATABASE_URL="postgresql://floodguard:YOUR_PASSWORD@floodguard-db.c4t6ymcw2eqt.us-east-1.rds.amazonaws.com:5432/floodguard?schema=public&sslmode=require&uselibpqcompat=true"

# Apply migrations
pnpm prisma migrate deploy

# (Optional) Seed data
pnpm prisma db seed
```

**Verify connection:**
```bash
pnpm prisma studio
# Opens a browser at localhost:5555 showing your RDS tables
```

### 2.6 Update Your Local .env

Edit `backend/.env`:
```env
DATABASE_URL="postgresql://floodguard:YOUR_PASSWORD@floodguard-db.c4t6ymcw2eqt.us-east-1.rds.amazonaws.com:5432/floodguard?schema=public&sslmode=require&uselibpqcompat=true"
```

> Remember to URL-encode special characters in the password: `#` → `%23`, `!` → `%21`, `@` → `%40`

---

## Phase 3 — Backend (NestJS) on Elastic Beanstalk

> ⚠️ **IAM Roles Required:** Before creating the EB environment, you need two IAM roles. If they don't exist yet (check IAM → Roles), create them first (Step 3.2).

### 3.1 Build the Backend Locally (Verify It Works)

```bash
cd backend
pnpm install
pnpm prisma generate
pnpm build          # produces dist/
node dist/main      # quick test — should start on port 5001
# Ctrl+C to stop
```

### 3.2 Create Required IAM Roles (One-Time Setup)

EB needs two roles. Check if they exist first: **IAM → Roles → search "elasticbeanstalk"**.

#### Role 1: Service Role (EB manages your environment)

1. Go to **IAM** → **Roles** → **Create role**
2. Trusted entity: **AWS service**
3. Use case: search **"Elastic Beanstalk"** → select **Elastic Beanstalk - Customizable**
4. Click **Next** → **Next**
5. Role name: `aws-elasticbeanstalk-service-role`
6. Click **Create role**

#### Role 2: EC2 Instance Profile (your app's permissions)

1. **IAM** → **Roles** → **Create role**
2. Trusted entity: **AWS service**
3. Use case: **EC2**
4. Click **Next**
5. Attach these policies (search and check each):
   - `AWSElasticBeanstalkWebTier`
   - `AWSElasticBeanstalkWorkerTier`
   - `AWSElasticBeanstalkMulticontainerDocker`
   - `AmazonS3FullAccess` (for report photo uploads)
6. Click **Next**
7. Role name: `aws-elasticbeanstalk-ec2-role`
8. Click **Create role**

#### Add Instance Profile (needed for EB to assign the role to EC2):

```bash
aws iam create-instance-profile --instance-profile-name aws-elasticbeanstalk-ec2-role
aws iam add-role-to-instance-profile \
  --instance-profile-name aws-elasticbeanstalk-ec2-role \
  --role-name aws-elasticbeanstalk-ec2-role
```

Or check if it was auto-created: **IAM → Roles → aws-elasticbeanstalk-ec2-role → Trust relationships** should show `ec2.amazonaws.com`.

### 3.3 Create .ebignore (Controls What Gets Deployed)

Create `backend/.ebignore`:
```
node_modules/
.git/
.env
src/
test/
*.spec.ts
coverage/
.eslintrc*
```

This ensures `dist/`, `package.json`, `pnpm-lock.yaml`, `Procfile`, `prisma/`, and `.platform/` are included in the deploy bundle.

### 3.4 Initialize EB Application

```bash
cd backend
eb init
```

It will ask you:
```
Select a default region: 1 (us-east-1)
Enter Application Name: floodguard-backend
It appears you are using Node.js. Is this correct? (Y/n): Y
Select a platform branch: Node.js 22 (or latest available)
Do you wish to continue with CodeCommit? (Y/n): n
Do you want to set up SSH for your instances? (Y/n): Y (recommended — helps debug)
  Select a keypair: create new or use existing
```

### 3.5 Create the Environment

#### Via CLI:
```bash
cd backend
eb create floodguard-backend-env \
  --instance-type t3.micro \
  --single \
  --envvars NODE_ENV=production,PORT=8080
```

#### Via Browser (AWS Console):
1. Search → **Elastic Beanstalk** → open the `floodguard-backend` application
2. Click **Create environment**
3. **Environment tier:** Web server environment
4. **Environment name:** `floodguard-backend-env`
5. **Platform:** Node.js (latest branch)
6. **Application code:** Upload your code OR use CLI deploy later
7. **Presets:** Single instance (free tier eligible)
8. Click **Next**

9. **Service access:**
   - Service role: `aws-elasticbeanstalk-service-role`
   - EC2 instance profile: `aws-elasticbeanstalk-ec2-role`
   - EC2 key pair: select your key pair (for SSH access)

10. **Networking:**
    - VPC: Default VPC
    - Instance subnets: check at least one
    - Public IP: ✅ Activated

11. **Instance traffic and scaling:**
    - Root volume type: General Purpose (SSD)
    - Instance type: `t3.micro`
    - Environment type: Single instance

12. **Updates, monitoring and logging:**
    - Health reporting: Basic
    - Managed updates: disable for now

13. Click **Submit** → Wait 5-10 minutes for status "OK" (green)

### 3.6 Set Environment Variables

#### Via CLI:
```bash
cd backend
eb setenv \
  DATABASE_URL="postgresql://floodguard:FloodG%232026%21Rds@floodguard-db.c4t6ymcw2eqt.us-east-1.rds.amazonaws.com:5432/floodguard?schema=public&sslmode=require&uselibpqcompat=true" \
  JWT_SECRET="floodguard-super-secret-key-change-in-production" \
  FRONTEND_URL="http://localhost:3000" \
  PORT=8080 \
  AWS_REGION=us-east-1 \
  S3_BUCKET=floodguard-uploads \
  NODE_ENV=production
```

#### Via Browser:
1. EB → `floodguard-backend-env` → **Configuration**
2. Under **Updates, monitoring, and logging** → click **Edit**
3. Scroll down to **Environment properties**
4. Add each variable:

| Name | Value |
|------|-------|
| `DATABASE_URL` | `postgresql://floodguard:FloodG%232026%21Rds@floodguard-db.c4t6ymcw2eqt.us-east-1.rds.amazonaws.com:5432/floodguard?schema=public&sslmode=require&uselibpqcompat=true` |
| `JWT_SECRET` | `floodguard-super-secret-key-change-in-production` |
| `FRONTEND_URL` | `http://localhost:3000` (update after frontend is deployed) |
| `PORT` | `8080` |
| `AWS_REGION` | `us-east-1` |
| `S3_BUCKET` | `floodguard-uploads` |
| `NODE_ENV` | `production` |

5. Click **Apply**

### 3.7 Configure Health Check Path

#### Via Browser:
1. EB → `floodguard-backend-env` → **Configuration**
2. Find **Instance traffic and scaling** → click **Edit**
3. Under **Processes** → click on **default**
4. Health check path: `/api/health`
5. Click **Save** → **Apply**

#### Or create `.ebextensions/healthcheck.config` in `backend/`:
```yaml
option_settings:
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /api/health
```

### 3.8 Connect RDS Security Group to EB

After the environment is created, allow EB instances to reach RDS:

#### Via Browser:
1. Go to **EC2** → **Security Groups**
2. Find the security group attached to your EB environment (name contains `AWSEBSecurityGroup` or your env name)
3. Copy its **Security group ID** (e.g. `sg-0abc123def456`)
4. Go to the RDS security group: `floodguard-db-sg` (sg-0af5a74df01a436d2) → **Inbound rules** → **Edit**
5. **Add rule:**
   - Type: PostgreSQL
   - Port: 5432
   - Source: paste the EB security group ID
   - Description: `Backend EB instances`
6. **Save rules**

#### Via CLI:
```bash
# Get EB security group (after environment is created)
EB_SG=$(aws elasticbeanstalk describe-environment-resources \
  --environment-name floodguard-backend-env \
  --query 'EnvironmentResources.Instances[0]' --output text | \
  xargs -I {} aws ec2 describe-instances --instance-ids {} \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)

# Allow EB → RDS (your RDS SG is sg-0af5a74df01a436d2)
aws ec2 authorize-security-group-ingress \
  --group-id sg-0af5a74df01a436d2 \
  --protocol tcp \
  --port 5432 \
  --source-group $EB_SG
```

### 3.9 Build & Deploy Your Code

> ⚠️ **IMPORTANT:** `eb create` only creates the infrastructure (EC2 instance, security group, load balancer). It does NOT deploy your code! You MUST run `eb deploy` to push your application code to the instance.

#### Step 1 — Build the backend

```bash
cd backend
pnpm install
pnpm prisma generate
pnpm build          # compiles TypeScript → dist/
```

Verify `dist/main.js` exists:
```bash
ls dist/main.js     # should show the file
```

#### Step 2 — Deploy to EB

```bash
eb deploy
```

This takes 2-5 minutes. You'll see progress messages.

> **What `eb deploy` does behind the scenes:**
> 1. Zips your project (respecting `.ebignore` — excludes `node_modules/`, `src/`, `.env`)
> 2. Uploads the zip to an S3 staging bucket
> 3. EC2 instance downloads + unzips it to `/var/app/staging/`
> 4. Runs `npm install` (installs dependencies from `package.json`)
> 5. Runs `.platform/hooks/predeploy/01_prisma.sh` → `prisma generate` + `prisma migrate deploy`
> 6. Moves code to `/var/app/current/`
> 7. Starts the app using `Procfile` → `web: node dist/main` on PORT 8080
> 8. Nginx reverse-proxies port 80 → 8080

#### Step 3 — Check deploy succeeded

```bash
eb status
# Health: Green = working
# Health: Red/Severe = check logs with `eb logs`
```

#### Redeploying After Code Changes

Every time you make changes to the backend code:
```bash
cd backend
pnpm build          # recompile
eb deploy           # push to AWS
```

### 3.10 Verify

```bash
eb status
# Should show: Status: Ready, Health: Green

eb open
# Opens the EB URL in browser

# Test health endpoint:
curl http://floodguard-backend-env.eba-xxxx.us-east-1.elasticbeanstalk.com/api/health
# → {"status":"ok"}

# Test Swagger docs:
# Open in browser: http://YOUR_EB_URL/api/docs
```

Note down your backend URL (e.g. `http://floodguard-backend-env.eba-xxxx.us-east-1.elasticbeanstalk.com`).

### 3.11 Troubleshooting EB Deploy

If health status is "Severe" or "Degraded":

```bash
# View recent logs
eb logs

# SSH into the instance
eb ssh

# Check if the app is running
sudo systemctl status web

# Check app logs directly
cat /var/log/web.stdout.log
cat /var/log/eb-engine.log
```

Common issues:
- **"npm install failed"** → make sure `pnpm-lock.yaml` is included (not in `.ebignore`)
- **"Cannot find module"** → `dist/` folder not included; check `.ebignore`
- **Port mismatch** → ensure PORT=8080 in env vars (EB's nginx proxies 80→8080)
- **Health check failing** → verify `/api/health` path is correct in Configuration

---

## Phase 4 — Frontend (Next.js) on Elastic Beanstalk

### 4.1 Build with Backend URL Baked In

`NEXT_PUBLIC_*` vars are **compiled into the bundle at build time**, not read at runtime:

```bash
cd /path/to/project-root   # (the root, not backend/)

export NEXT_PUBLIC_API_URL="http://floodguard-backend-env.eba-xxxx.us-east-1.elasticbeanstalk.com/api"

bun run build       # produces .next/
```

> Replace the URL with your actual backend EB URL from Step 3.10.

### 4.2 Initialize EB

```bash
# Make sure you're in the project ROOT (not backend/)
cd /path/to/project-root
eb init
```

Prompts:
```
Select a default region: 1 (us-east-1)
Enter Application Name: floodguard-frontend
It appears you are using Node.js. Is this correct? Y
Select a platform branch: Node.js 22 (or latest available)
CodeCommit? n
SSH? Y (recommended)
```

### 4.3 Create Environment

```bash
eb create floodguard-frontend-env \
  --instance-type t3.micro \
  --single \
  --envvars NODE_ENV=production,PORT=8080
```

### 4.4 Create .ebignore

Create `.ebignore` in the project root (controls what gets deployed — like `.gitignore` for EB):

```
node_modules/
backend/
.git/
*.md
```

This ensures `.next/`, `public/`, `package.json`, `next.config.ts`, and `Procfile` are all included in the deploy bundle.

### 4.5 Set Environment Variables

```bash
eb setenv \
  NODE_ENV=production \
  PORT=8080
```

### 4.6 Configure Health Check

#### Via Browser:
1. EB → `floodguard-frontend-env` → **Configuration**
2. Instance traffic and scaling → Processes → default
3. Health check path: `/`
4. Save → Apply

### 4.7 Deploy

```bash
eb deploy
eb open
```

### 4.8 Close the Loop — Update CORS

Now that you have both URLs, update the backend's FRONTEND_URL:

```bash
cd backend
eb setenv FRONTEND_URL="http://floodguard-frontend-env.eba-xxxx.us-east-1.elasticbeanstalk.com"
```

---

## Phase 5 — S3 for File Storage (report images)

### 5.1 Create the S3 Bucket

#### Via Browser (AWS Console):

1. Go to **Console** → Search bar → type **"S3"** → click **Amazon S3**
2. Click **"Create bucket"** (orange button)
3. Fill in:

| Setting | Value |
|---------|-------|
| Bucket name | `floodguard-uploads` (must be globally unique — add your team name if taken, e.g. `floodguard-uploads-teamX`) |
| AWS Region | **US East (N. Virginia) us-east-1** |
| Object Ownership | **ACLs disabled (recommended)** |
| Block Public Access | **✅ Block ALL public access** (keep all 4 checkboxes checked) |
| Bucket Versioning | **Disable** |
| Default encryption | **Server-side encryption with Amazon S3 managed keys (SSE-S3)** |
| Bucket Key | **Enable** |

4. Click **"Create bucket"**

#### Via CLI:
```bash
aws s3api create-bucket \
  --bucket floodguard-uploads \
  --region us-east-1

# Verify
aws s3 ls | grep floodguard
```

### 5.2 Configure CORS on the Bucket (Required for Browser Uploads)

#### Via Browser:
1. Click on your bucket → **Permissions** tab
2. Scroll down to **Cross-origin resource sharing (CORS)** → click **Edit**
3. Paste this JSON:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:5001",
      "http://floodguard-frontend-env.eba-xxxx.us-east-1.elasticbeanstalk.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

4. Click **Save changes**

#### Via CLI:
```bash
cat > /tmp/cors.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT"],
      "AllowedOrigins": ["http://localhost:3000", "http://floodguard-frontend-env.eba-xxxx.us-east-1.elasticbeanstalk.com"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

aws s3api put-bucket-cors --bucket floodguard-uploads --cors-configuration file:///tmp/cors.json
```

### 5.3 Grant the Backend EB Instance Role S3 Permissions

The backend runs on EC2 instances managed by EB. These instances use an **IAM instance profile / role** to access AWS services — no access keys needed in code.

#### Via Browser:

1. Go to **IAM** → **Roles** (left sidebar)
2. Search for `aws-elasticbeanstalk-ec2-role` (this was created when you made the EB environment)
   - If it doesn't exist, search for a role containing your environment name
3. Click on the role
4. Click **"Add permissions"** → **"Create inline policy"**
5. Click the **JSON** tab and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "FloodGuardS3Access",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::floodguard-uploads/*"
    }
  ]
}
```

6. Click **Next**
7. Policy name: `FloodGuard-S3-Access`
8. Click **"Create policy"**

#### Via CLI:
```bash
# Create the policy document
cat > /tmp/s3-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "FloodGuardS3Access",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::floodguard-uploads/*"
    }
  ]
}
EOF

# Attach to the EB instance role
aws iam put-role-policy \
  --role-name aws-elasticbeanstalk-ec2-role \
  --policy-name FloodGuard-S3-Access \
  --policy-document file:///tmp/s3-policy.json
```

### 5.4 How the Upload Flow Works (Already Implemented)

The backend has an uploads module at `backend/src/uploads/`:

**Upload flow (frontend → backend → S3):**

```
1. Frontend calls: POST /api/uploads/presign
   Body: { "filename": "flood-photo.jpg", "contentType": "image/jpeg" }

2. Backend generates a presigned PUT URL (valid 5 minutes)
   Response: { "url": "https://floodguard-uploads.s3.amazonaws.com/reports/uuid-flood-photo.jpg?X-Amz-...", "key": "reports/uuid-flood-photo.jpg" }

3. Frontend uploads directly to S3 using the presigned URL:
   PUT https://floodguard-uploads.s3.amazonaws.com/reports/... (with file body)

4. Frontend saves the `key` to the report (e.g. in the photoUrl field)

5. To view the image later:
   GET /api/uploads/reports/uuid-flood-photo.jpg
   Response: { "url": "https://...presigned-download-url..." }
```

### 5.5 Test S3 Upload (After Deployment)

```bash
# 1. Get a presigned upload URL
curl -X POST http://YOUR_BACKEND_URL/api/uploads/presign \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.jpg", "contentType": "image/jpeg"}'

# Response: {"url": "https://...", "key": "reports/uuid-test.jpg"}

# 2. Upload a file to S3 using the presigned URL
curl -X PUT "PRESIGNED_URL_FROM_STEP_1" \
  -H "Content-Type: image/jpeg" \
  --data-binary @test.jpg

# 3. Get a download URL
curl http://YOUR_BACKEND_URL/api/uploads/reports/uuid-test.jpg \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 4. Verify in S3 console or CLI
aws s3 ls s3://floodguard-uploads/reports/
```

### 5.6 Set the S3_BUCKET Env Var on EB

If you haven't already:
```bash
cd backend
eb setenv S3_BUCKET=floodguard-uploads AWS_REGION=us-east-1
```

---

## Phase 6 — SNS / SES for Alerts (Task 2)

### 6.1 Create an SNS Topic

#### Via Browser:
1. Search → **SNS** → **Topics** → **Create topic**
2. Type: **Standard**
3. Name: `floodguard-alerts`
4. Click **Create topic**
5. Copy the **ARN** (e.g. `arn:aws:sns:us-east-1:123456789012:floodguard-alerts`)

#### Via CLI:
```bash
aws sns create-topic --name floodguard-alerts --region us-east-1
# Output includes TopicArn
```

### 6.2 Subscribe to the Topic (for testing)

#### Via Browser:
1. Click on your topic → **Create subscription**
2. Protocol: **Email** (or SMS)
3. Endpoint: your email address
4. Click **Create subscription**
5. Check your email and **confirm** the subscription

#### Via CLI:
```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:floodguard-alerts \
  --protocol email \
  --notification-endpoint your@email.com
```

### 6.3 Set Up SES (Email)

#### Via Browser:
1. Search → **SES** → **Identities** → **Create identity**
2. Identity type: **Email address**
3. Enter: `alerts@yourdomain.com` (or your personal email for testing)
4. Click **Create identity**
5. Check your email and click the verification link
6. **Note:** SES starts in **sandbox mode** — you can only send to verified email addresses. For production, request production access.

#### Via CLI:
```bash
aws ses verify-email-identity --email-address alerts@yourdomain.com --region us-east-1
```

### 6.4 Grant SNS/SES Permissions to EB Role

#### Via Browser:
1. **IAM** → **Roles** → `aws-elasticbeanstalk-ec2-role`
2. **Add permissions** → **Create inline policy** → JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "FloodGuardSNS",
      "Effect": "Allow",
      "Action": "sns:Publish",
      "Resource": "arn:aws:sns:us-east-1:*:floodguard-alerts"
    },
    {
      "Sid": "FloodGuardSES",
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*"
    }
  ]
}
```

3. Policy name: `FloodGuard-Notifications`
4. Create policy

#### Via CLI:
```bash
cat > /tmp/notifications-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "FloodGuardSNS",
      "Effect": "Allow",
      "Action": "sns:Publish",
      "Resource": "arn:aws:sns:us-east-1:*:floodguard-alerts"
    },
    {
      "Sid": "FloodGuardSES",
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name aws-elasticbeanstalk-ec2-role \
  --policy-name FloodGuard-Notifications \
  --policy-document file:///tmp/notifications-policy.json
```

### 6.5 Set Environment Variables

```bash
cd backend
eb setenv \
  SNS_TOPIC_ARN="arn:aws:sns:us-east-1:123456789012:floodguard-alerts" \
  SES_FROM_EMAIL="alerts@yourdomain.com"
```

---

## Phase 7 — CloudWatch Monitoring (Assignment Requirement)

This earns the Task 2 monitoring marks — make it visible during your demo.

### 7.1 Enable Enhanced Health + Log Streaming

#### Via Browser (do this for BOTH environments):
1. EB → your environment → **Configuration**
2. Find **"Monitoring"** → click **Edit**
3. Health reporting system: **Enhanced** ✅
4. Click **Apply**
5. Go to **Configuration** → **"Updates, monitoring, and logging"** → **Edit**
6. Scroll to **"CloudWatch logs"** section
7. Check ✅ **"Instance log streaming to CloudWatch Logs"**
8. Retention: 7 days
9. Check ✅ **"Health event streaming to CloudWatch Logs"**
10. Click **Apply**

#### Via CLI:
```bash
# For backend
cd backend
eb config floodguard-backend-env

# In the editor, find and change:
# aws:elasticbeanstalk:healthreporting:system:
#   SystemType: enhanced
# aws:elasticbeanstalk:cloudwatch:logs:
#   StreamLogs: true
#   RetentionInDays: 7
```

### 7.2 Create a CloudWatch Dashboard

#### Via Browser:

1. Search → **CloudWatch** → **Dashboards** (left sidebar) → **Create dashboard**
2. Dashboard name: `FloodGuard-Ops`
3. Click **Create dashboard**
4. Now add widgets one by one:

**Widget 1 — EB Environment Health:**
1. Click **"Add widget"** → **Number** → **Next**
2. Select **"ElasticBeanstalk"** namespace
3. Metric: `EnvironmentHealth` for both environments
4. Click **Create widget**

**Widget 2 — EC2 CPU Utilization:**
1. **Add widget** → **Line** → **Next**
2. Namespace: **EC2**
3. Per-Instance Metrics → select CPU Utilization for your instances
4. Create widget

**Widget 3 — RDS Metrics:**
1. **Add widget** → **Line** → **Next**
2. Namespace: **RDS** → Per-Database Metrics
3. Select: `CPUUtilization`, `DatabaseConnections`, `FreeStorageSpace`, `ReadLatency`, `WriteLatency`
4. Create widget

**Widget 4 — ALB Request Count (if using load balancer):**
1. **Add widget** → **Line**
2. Namespace: **ApplicationELB**
3. Select: `RequestCount`, `HTTPCode_Target_4XX_Count`, `HTTPCode_Target_5XX_Count`
4. Create widget

5. Click **Save dashboard**

#### Via CLI:
```bash
aws cloudwatch put-dashboard \
  --dashboard-name FloodGuard-Ops \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "x": 0, "y": 0, "width": 12, "height": 6,
        "properties": {
          "title": "RDS CPU",
          "metrics": [["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", "floodguard-db"]],
          "period": 300,
          "region": "us-east-1"
        }
      },
      {
        "type": "metric",
        "x": 12, "y": 0, "width": 12, "height": 6,
        "properties": {
          "title": "RDS Connections",
          "metrics": [["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", "floodguard-db"]],
          "period": 300,
          "region": "us-east-1"
        }
      }
    ]
  }'
```

### 7.3 Create CloudWatch Alarms

#### Via Browser:

1. **CloudWatch** → **Alarms** → **All alarms** → **Create alarm**

**Alarm 1 — Backend CPU > 80%:**
1. Click **"Select metric"**
2. Browse: **EC2** → **Per-Instance Metrics** → find your backend instance → `CPUUtilization`
3. Click **Select metric**
4. Statistic: **Average**, Period: **5 minutes**
5. Conditions: **Greater than** → threshold: `80`
6. Click **Next**
7. Notification: **Create new topic** → name: `floodguard-ops-alerts` → email: your email
8. Click **Create topic** → confirm email subscription
9. Alarm name: `FloodGuard-Backend-CPU-High`
10. Click **Create alarm**

**Alarm 2 — RDS Free Storage < 2 GB:**
1. Create alarm → Select metric → **RDS** → Per-Database → `FreeStorageSpace`
2. Conditions: **Lower than** → `2000000000` (2 GB in bytes)
3. Notification: use existing topic `floodguard-ops-alerts`
4. Alarm name: `FloodGuard-RDS-LowStorage`
5. Create alarm

**Alarm 3 — EB Health Severe:**
1. Create alarm → Select metric → **ElasticBeanstalk** → `EnvironmentHealth`
2. Conditions: **Greater/Equal** → `25` (Severe = 25)
3. Alarm name: `FloodGuard-Backend-HealthSevere`
4. Create alarm

#### Via CLI:
```bash
# CPU Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name FloodGuard-Backend-CPU-High \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-0xxxxxxxxxxxx \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:floodguard-ops-alerts

# RDS Storage Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name FloodGuard-RDS-LowStorage \
  --namespace AWS/RDS \
  --metric-name FreeStorageSpace \
  --dimensions Name=DBInstanceIdentifier,Value=floodguard-db \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 2000000000 \
  --comparison-operator LessThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:floodguard-ops-alerts
```

### 7.4 Evidence for the Report

Screenshot these for your report submission:
- The CloudWatch dashboard with all widgets populated
- At least 2 alarms in the "Alarms" page (showing OK or In alarm state)
- EB enhanced health page showing green/healthy status

This directly maps to "utilize AWS monitoring tools to analyse performance and operational metrics."

---

## Phase 8 — HTTPS & Custom Domain (Optional but recommended)

### 8.1 Request an ACM Certificate

#### Via Browser:
1. Search → **Certificate Manager** (ACM) → **Request a certificate**
2. Certificate type: **Public**
3. Domain name: `floodguard.yourdomain.com` and `*.floodguard.yourdomain.com`
4. Validation method: **DNS validation**
5. Click **Request**
6. Click on the certificate → **Create records in Route 53** (if using Route 53)
7. Wait for status to become **Issued** (can take 5-30 minutes)

### 8.2 Add HTTPS Listener to EB Load Balancer

#### Via Browser:
1. EB → environment → **Configuration** → **Instance traffic and scaling** → **Edit**
2. Under **Listeners** → **Add listener**
3. Port: `443`, Protocol: `HTTPS`
4. SSL certificate: select your ACM cert
5. Save → Apply

### 8.3 Route 53 DNS (if you have a domain)

1. **Route 53** → **Hosted zones** → your domain → **Create record**
2. Record name: `app` (for `app.floodguard.yourdomain.com`)
3. Record type: **A**
4. Toggle **Alias**: Yes
5. Route traffic to: **Alias to Elastic Beanstalk environment** → select your frontend env
6. Create record
7. Repeat for `api.floodguard.yourdomain.com` → backend env

### 8.4 Update Frontend Build

After setting up the custom domain, rebuild with the new API URL:
```bash
export NEXT_PUBLIC_API_URL="https://api.floodguard.yourdomain.com/api"
bun run build
eb deploy
```

---

## Phase 9 — Redeploy / Update Workflow

```bash
# Backend
cd backend && pnpm build && eb deploy floodguard-backend-env

# Frontend (always rebuild with the correct NEXT_PUBLIC_API_URL)
cd ..
export NEXT_PUBLIC_API_URL="https://api.floodguard.example.com/api"
bun run build && eb deploy floodguard-frontend-env
```

---

## Phase 10 — Cost Control & Teardown

### Tips During Development
- Use `t3.micro`/`t3.small` + RDS free tier
- Run a **single instance** per env: `eb create --single` (no load balancer = cheaper)
- Turn off RDS automated backups for dev

### Tear Down After Grading

```bash
# Terminate EB environments
eb terminate floodguard-frontend-env --force
eb terminate floodguard-backend-env --force

# Delete RDS
aws rds delete-db-instance --db-instance-identifier floodguard-db --skip-final-snapshot

# Delete S3 bucket (must be empty first)
aws s3 rm s3://floodguard-uploads --recursive
aws s3api delete-bucket --bucket floodguard-uploads

# Delete SNS topic
aws sns delete-topic --topic-arn arn:aws:sns:us-east-1:123456789012:floodguard-alerts

# Delete CloudWatch alarms
aws cloudwatch delete-alarms --alarm-names FloodGuard-Backend-CPU-High FloodGuard-RDS-LowStorage FloodGuard-Backend-HealthSevere

# Delete CloudWatch dashboard
aws cloudwatch delete-dashboards --dashboard-names FloodGuard-Ops
```

---

## Troubleshooting Cheat Sheet

| Symptom | Likely cause / fix |
|---|---|
| Frontend calls `localhost:5001` in prod | `NEXT_PUBLIC_API_URL` not set at **build** time, or `app/lib/axios.ts` still hardcoded |
| Backend 502 / unhealthy | App not listening on `PORT` 8080, or health check path wrong |
| CORS errors in browser | `FRONTEND_URL` not set / `enableCors` still wide open or mismatched |
| DB connection timeout | `floodguard-db-sg` doesn't allow the backend SG on 5432 |
| Prisma "table does not exist" | `migrate deploy` didn't run — check `.platform/hooks/predeploy` logs |
| S3 "Access Denied" on upload | Instance role missing S3 policy, or bucket name wrong in `S3_BUCKET` |
| S3 CORS error in browser | Bucket CORS config missing your frontend origin |
| SNS not sending | Topic ARN wrong, or EB role missing `sns:Publish` permission |
| SES "Email address not verified" | In sandbox mode, recipient must also be verified |
| View logs | `eb logs` or CloudWatch → Log groups → `/aws/elasticbeanstalk/...` |
| EB deploy fails | `eb logs --all` to see the full error. Check Procfile and that `dist/` exists |

---

## Pre-Demo Verification Checklist

- [ ] `curl https://<backend>/api/health` → `{"status":"ok"}`
- [ ] Swagger reachable at `https://<backend>/api/docs`
- [ ] Frontend loads, login works, dashboards pull live data from RDS
- [ ] Submit a report → file lands in S3
- [ ] Trigger an alert → SNS/SES notification received
- [ ] CloudWatch dashboard + at least 2 alarms visible (screenshot for report)
- [ ] Both EB environments show **Health: Ok (green)**

---

## Appendix — Environment Variable Reference

### Backend (set via `eb setenv`)

| Variable | Example | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://floodguard:***@...rds...:5432/floodguard?schema=public` | RDS connection |
| `JWT_SECRET` | `long-random-string` | JWT signing |
| `JWT_EXPIRES_IN` | `7d` | Token expiry |
| `FRONTEND_URL` | `http://<frontend-eb-url>` | CORS allow-list |
| `PORT` | `8080` | EB nginx proxy port |
| `NODE_ENV` | `production` | Runtime mode |
| `AWS_REGION` | `us-east-1` | SDK region |
| `S3_BUCKET` | `floodguard-uploads` | Upload bucket |
| `SNS_TOPIC_ARN` | `arn:aws:sns:us-east-1:...:floodguard-alerts` | Alert publishing |
| `SES_FROM_EMAIL` | `alerts@floodguard.example.com` | Email sender |

### Frontend (set before `bun run build`)

| Variable | When read | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | **Build time** (inlined) | Backend API base URL |
| `PORT` | Runtime | EB nginx proxy port (8080) |

> **Reminder:** Any `NEXT_PUBLIC_*` change requires a **rebuild + redeploy** of the frontend, because these values are compiled into the client bundle.

---

## Appendix B — Cross-Questions & Viva Preparation

### Category 1: Why Questions (Justification)

**Q: Why did you choose Elastic Beanstalk over EC2?**
> EB abstracts away infrastructure management — it handles auto-scaling, health monitoring, rolling deployments, and nginx configuration automatically. For a 7-week project, spending time on manual server config doesn't add value. EB gives us production-grade deployment patterns (blue/green deploys, health checks, auto-recovery) without writing infrastructure code. It's also free tier eligible — we only pay for the underlying EC2 instance.

**Q: Why not use Lambda (serverless) for the backend?**
> NestJS is a long-running HTTP server framework with dependency injection, middleware pipelines, and database connection pooling. Lambda's cold-start, stateless, request/response model is architecturally incompatible. We'd need to refactor the entire app to fit Lambda. Also, Prisma ORM has known cold-start latency issues on Lambda due to connection establishment overhead. Our system needs persistent database connections for real-time alert processing.

**Q: Why not Docker/ECS?**
> Containers add a layer of complexity (Dockerfiles, ECR registry, task definitions, container networking) without providing meaningful benefit for our use case. EB's Node.js platform already gives us a managed runtime. If we needed multi-language services or complex inter-service communication, ECS would make sense. For two Node.js services, EB is the right level of abstraction.

**Q: Why two separate EB environments instead of one?**
> Separation of concerns: the backend holds database credentials and JWT secrets that the frontend must never access. Independent scaling — if the API gets heavy traffic, we scale only the backend. Independent deployments — a CSS change shouldn't restart the API server. This also mirrors real production architectures and demonstrates proper cloud design.

**Q: Why RDS instead of DynamoDB?**
> Our data model is highly relational — users have reports, reports belong to regions, alerts reference regions, SOS requests have assignees. These relationships need JOINs, transactions, and foreign key constraints. DynamoDB is a key-value/document store optimized for single-table designs with known access patterns. Trying to model our schema in DynamoDB would require denormalization, scatter-gather queries, and GSIs that increase cost and complexity. PostgreSQL on RDS fits naturally.

**Q: Why S3 with presigned URLs instead of direct upload to your server?**
> Presigned URLs let the browser upload directly to S3 without routing through our backend. This means: (1) no memory/disk pressure on the backend during large file uploads, (2) S3 handles durability (11 nines) and availability (4 nines) automatically, (3) bandwidth doesn't bottleneck through our single EC2 instance, (4) presigned URLs expire in 5 minutes so unauthorized users can't reuse them.

**Q: Why PostgreSQL 16 specifically?**
> It's the latest stable version available on RDS. We get performance improvements (parallel query execution), better JSON handling for our coordinates field, and improved connection management. Since RDS manages patching and upgrades, using the latest is risk-free.

---

### Category 2: How Questions (Technical Understanding)

**Q: How does the deployment process work?**
> `eb deploy` zips the project (excluding items in `.ebignore`), uploads to S3, EC2 downloads and extracts it to `/var/app/staging/`. Then the platform runs our predeploy hook (`.platform/hooks/predeploy/01_prisma.sh`) which generates the Prisma client and runs migrations. After hooks succeed, code moves to `/var/app/current/` and the `Procfile` command (`node dist/src/main.js`) starts the application on port 8080. Nginx reverse-proxies port 80 → 8080.

**Q: How does the frontend talk to the backend?**
> The frontend uses `NEXT_PUBLIC_API_URL` (baked in at build time) to know the backend's address. All API calls go through an Axios client (`app/lib/axios.ts`) that attaches the JWT token from localStorage to the Authorization header. The backend validates the token using Passport.js JWT strategy and returns data. CORS on the backend is configured to only accept requests from the frontend's origin.

**Q: How do presigned S3 URLs work?**
> The backend uses the AWS SDK to generate a time-limited URL (5 minutes) that grants PUT access to a specific S3 key. The URL contains a signature (HMAC-SHA256) that S3 validates. The frontend uses this URL to upload directly to S3 without needing AWS credentials. For downloads, we generate a separate presigned GET URL (1 hour expiry). If the URL expires or is tampered with, S3 rejects the request.

**Q: How does the health check work?**
> We have a `/api/health` endpoint that returns `{"status":"ok"}`. EB's load balancer/health daemon hits this every 10 seconds. If it fails 3 consecutive times, EB marks the instance unhealthy and (in auto-scaling mode) replaces it with a new one. This ensures the application is always responsive.

**Q: How do database migrations run in production?**
> During deployment, the predeploy hook runs `npx prisma migrate deploy`. This applies any pending migrations from the `prisma/migrations/` directory to the RDS database. Migrations are additive (never destructive) and idempotent — running them multiple times is safe. The Prisma migration table tracks which migrations have already been applied.

**Q: How does authentication work?**
> User registers with email/password → password is hashed with bcrypt (10 rounds) → stored in PostgreSQL. On login, we verify the hash and issue a JWT token signed with our `JWT_SECRET`. The token contains `{ sub: userId, role: 'resident'|'admin'|'volunteer' }` and expires in 7 days. Each request includes this token in the `Authorization: Bearer <token>` header. The backend's `JwtAuthGuard` validates the signature and extracts the user. `RolesGuard` checks if the user's role matches the endpoint's requirement.

**Q: How does CloudWatch monitoring work?**
> EB automatically publishes environment health metrics (request count, latency, 4xx/5xx errors). With enhanced health enabled, we also get per-instance CPU, memory, and disk metrics. We created a custom CloudWatch dashboard (`FloodGuard-Ops`) that visualizes RDS CPU, database connections, and EC2 utilization. CloudWatch Alarms trigger SNS notifications when thresholds are breached (CPU > 80%, storage < 2GB).

**Q: How does the flood risk assessment work?**
> The backend's weather service calls Open-Meteo's free API for 48-hour hourly rainfall forecasts. It accumulates precipitation over 6h, 12h, 24h, and 48h windows, then runs a scoring algorithm: heavy short-term rain (6h > 30mm) scores highest, sustained rainfall (48h > 120mm) adds more points. The score maps to risk levels: 0-19=low, 20-39=medium, 40-59=high, 60+=critical. This is displayed prominently on both dashboards.

---

### Category 3: What-If Questions (Problem Solving)

**Q: What happens if the backend crashes?**
> EB's health monitoring detects the failure within 10-30 seconds (health check fails). In single-instance mode, EB restarts the application process automatically. In auto-scaling mode, it would terminate the unhealthy instance and launch a new one. CloudWatch alarm triggers an SNS notification to the ops team. Meanwhile, the frontend shows graceful error states (loading spinners, "service unavailable" messages) rather than crashing.

**Q: What if the database runs out of storage?**
> Our CloudWatch alarm (`FloodGuard-RDS-LowStorage`) fires when free storage drops below 2GB, sending an email/SMS notification. To fix: increase storage via RDS console (storage scaling can be done without downtime on gp3). To prevent: RDS storage autoscaling can be enabled to grow automatically.

**Q: What if someone gets your JWT_SECRET?**
> They could forge tokens and impersonate any user. Mitigation: (1) rotate the secret immediately via `eb setenv JWT_SECRET=new-secret` — all existing tokens become invalid, (2) the secret is never in source code (only in EB environment variables), (3) EB env vars are encrypted at rest and only accessible to the instance role.

**Q: What if the S3 bucket is accidentally deleted?**
> All uploaded photos would be lost. Mitigation: (1) enable S3 versioning (allows recovery of deleted objects), (2) enable cross-region replication for critical data, (3) bucket policy can deny `s3:DeleteBucket` for non-admin users. Currently we accept this risk for a dev project but would add versioning in production.

**Q: How would you handle 10,000 concurrent users?**
> (1) Switch EB to load-balanced mode with auto-scaling (min 2, max 10 instances based on CPU/request count), (2) enable RDS read replicas for read-heavy queries, (3) add CloudFront CDN in front of the frontend for static asset caching, (4) add Redis/ElastiCache for session storage and API response caching, (5) the presigned S3 upload pattern already offloads file traffic from the backend.

**Q: What if Open-Meteo's weather API goes down?**
> Our weather service would return errors, and the frontend would show "Weather data unavailable" (graceful degradation). To improve: (1) cache the last successful response in the database with a TTL, (2) fall back to a secondary provider (e.g., OpenWeatherMap), (3) Lambda function on a schedule that pre-fetches and caches weather data every 15 minutes.

**Q: How do you prevent unauthorized access to admin endpoints?**
> Three layers: (1) `JwtAuthGuard` — rejects requests without a valid JWT token, (2) `RolesGuard` with `@Roles('admin')` decorator — checks the token's role claim matches the required role, (3) the admin dashboard pages are client-side route-guarded (redirect non-admins to their own dashboard). Even if someone bypasses the frontend guard, the backend rejects the API call.

---

### Category 4: Cloud Concepts

**Q: What is the difference between IaaS, PaaS, and SaaS? Where does your project fit?**
> - **IaaS** (EC2, raw VMs): You manage OS, runtime, app, data. AWS provides hardware + networking.
> - **PaaS** (Elastic Beanstalk, Heroku): You manage app + data. AWS manages OS, runtime, scaling, networking.
> - **SaaS** (Gmail, Salesforce): You just use the software. Provider manages everything.
>
> Our project uses **PaaS** (Elastic Beanstalk manages the platform) + **managed services** (RDS, S3, SNS — which are between PaaS and SaaS for specific capabilities).

**Q: What is high availability and how does your system achieve it?**
> High availability = system remains operational even when components fail. We achieve it through: (1) RDS in a single-AZ (could upgrade to Multi-AZ for automatic failover), (2) EB auto-recovery replaces failed instances, (3) S3 provides 99.999999999% durability (11 nines), (4) health checks detect failures within seconds. For full HA, we'd enable Multi-AZ RDS and load-balanced EB with instances across multiple availability zones.

**Q: What is auto-scaling? Is your system auto-scaled?**
> Auto-scaling automatically adjusts the number of compute instances based on demand (CPU, request count, custom metrics). Currently we use single-instance mode (no auto-scaling) for cost reasons during development. To enable it: change EB environment type to "Load balanced" and set scaling triggers (e.g., scale up when CPU > 70% for 5 minutes, scale down when < 30%).

**Q: What is the shared responsibility model?**
> AWS is responsible for security **of** the cloud (hardware, networking, data centers, hypervisor). We are responsible for security **in** the cloud (our application code, data, IAM policies, encryption, network configuration). Example: AWS ensures no one physically steals the RDS server; we ensure our database password is strong and security groups are properly configured.

**Q: How does your system handle data privacy?**
> (1) Passwords are bcrypt-hashed (never stored in plaintext), (2) JWT tokens expire after 7 days, (3) S3 bucket blocks all public access — only presigned URLs grant time-limited access, (4) RDS connections use SSL (`sslmode=require`), (5) Environment variables (secrets) are never in source code, (6) CORS restricts API access to our frontend origin only.

**Q: What is the CAP theorem and how does it apply?**
> CAP states a distributed system can guarantee at most 2 of: Consistency, Availability, Partition tolerance. Our system prioritizes **CP** (Consistency + Partition tolerance): PostgreSQL/RDS gives us strong consistency (ACID transactions). If a network partition occurs, we'd rather return an error than stale data (critical for flood alerts — wrong data could endanger lives). S3 is eventually consistent for overwrite operations but strongly consistent for new objects.

---

### Category 5: Cost & Optimization

**Q: How much does this system cost to run?**
> Monthly estimate (us-east-1, Free Tier):
> - EC2 t3.micro × 2 (frontend + backend): **$0** (750 hrs/month free tier, covers both)
> - RDS db.t3.micro: **$0** (750 hrs/month free tier)
> - S3 (< 5GB): **$0** (5GB free tier)
> - Data transfer (< 1GB/month): **$0**
> - **Total during free tier: $0/month**
>
> After free tier expires (~$25-35/month): EC2 ~$8.50 × 2, RDS ~$13, S3 ~$0.50, data transfer ~$2.

**Q: How would you reduce costs in production?**
> (1) Use Reserved Instances for EC2/RDS (up to 72% savings for 1-3 year commitment), (2) Enable S3 Intelligent-Tiering for infrequently accessed photos, (3) Use CloudFront CDN to cache frontend assets (reduces EC2 load), (4) Schedule non-production environments to stop overnight (EB supports scheduled scaling to 0), (5) Use spot instances for non-critical background processing.

**Q: Why not just use the free tier for everything?**
> We do use free tier where possible. But the assignment requires demonstrating multiple cloud services working together — some (like SNS publishing, CloudWatch custom dashboards) have nominal costs ($0.50/month for basic usage). The total cost for the project duration is under $5.

---

### Category 6: Security

**Q: How do you store secrets/credentials?**
> Never in source code. Database passwords, JWT secrets, and API keys are stored as EB environment variables (encrypted at rest by AWS). The `.env` file is in `.gitignore` and `.ebignore`. In production, the EC2 instance accesses these via the environment — no files on disk contain secrets.

**Q: How do you prevent SQL injection?**
> Prisma ORM uses parameterized queries exclusively — user input is never concatenated into SQL strings. Even raw queries in Prisma use `$queryRaw` with tagged template literals that auto-parameterize values. Additionally, NestJS `ValidationPipe` with `class-validator` rejects malformed input before it reaches the service layer.

**Q: How do you prevent XSS?**
> React (our frontend) auto-escapes all rendered content by default — `{userInput}` in JSX is always text, never HTML. We never use `dangerouslySetInnerHTML`. The backend sets appropriate security headers (managed by Next.js and NestJS). User-uploaded content goes to S3 (served from a different domain, can't execute scripts in our origin).

**Q: What happens if someone brute-forces login?**
> Currently: bcrypt's intentional slowness (100ms per hash) limits attempts to ~10/second per server. For production hardening: (1) add rate limiting via NestJS `@nestjs/throttler` (e.g., 5 attempts per minute per IP), (2) account lockout after 10 failed attempts, (3) CAPTCHA after 3 failures, (4) AWS WAF in front of the ALB to block suspicious IPs.

---

### Category 7: Specific to Problem #4 (Flood Warning)

**Q: How does your system address the "delayed alerts and miscommunication" problem mentioned in the brief?**
> Three mechanisms: (1) **Real-time flood risk assessment** — our backend continuously analyzes hourly rainfall data and calculates risk scores, displayed prominently on dashboards before flooding occurs, (2) **Multi-channel notifications** — when an admin issues a critical alert, SNS can push to email/SMS simultaneously, (3) **Community reporting** — residents submit geotagged reports that other residents and authorities see immediately on the map, creating a crowdsourced early warning network.

**Q: How do you handle the "vulnerable groups" concern?**
> (1) The SOS request system allows anyone to request evacuation, rescue, or medical assistance with a priority level, (2) Volunteers can claim and respond to requests — dispatched via the map, (3) Evacuation routes show capacity and nearest shelter with turn-by-turn directions, (4) Preparedness tips educate residents before emergencies occur, (5) The system is designed mobile-first so it works on basic smartphones.

**Q: How accurate is your flood prediction?**
> We use Open-Meteo's free weather API which aggregates data from national meteorological services (including ECMWF, GFS models). Our risk scoring combines: short-term intensity (6h accumulation), sustained rainfall (24-48h), and precipitation probability. It's a heuristic — not a hydrological model — but it provides actionable early warnings 24-48 hours ahead. For production, we'd integrate with the Nepal Department of Hydrology and Meteorology's river gauge data.

**Q: What's your data flow for a flood alert?**
> (1) Weather API returns high rainfall forecast → (2) Frontend displays elevated flood risk score on dashboard → (3) Admin sees the warning and issues a formal alert via the admin panel → (4) Alert is stored in PostgreSQL with severity/region → (5) Notification service notifies all residents in that region (in-app + SNS email/SMS) → (6) Residents see the alert on their dashboard with action guidance → (7) Residents can submit SOS requests if they need help → (8) Volunteers/admin see and respond to requests on the map.

**Q: How would you make this system work offline (for areas with poor connectivity)?**
> (1) Service Workers (Next.js PWA) to cache the dashboard shell and last-known alerts, (2) IndexedDB to queue SOS requests offline and sync when connectivity returns, (3) SMS-based alert delivery via SNS (doesn't require internet), (4) Low-bandwidth mode that loads text-only alerts without maps/images. This would be a future enhancement.

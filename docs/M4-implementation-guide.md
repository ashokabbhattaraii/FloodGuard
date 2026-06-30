# Member 4 — Complete Implementation Guide

## Volunteer Response + Authentication + Elastic Beanstalk + RDS/Prisma

> **Role:** Volunteer Response + Authentication Infrastructure + AWS EB Lead
> **Features:** Request Response System, User & Auth System, Shelter/Evacuation Management
> **Routes:** `/volunteer`, `/volunteer/requests`, `/volunteer/shelters`, `/admin/users`, `/auth/*`
> **Backend Modules:** `auth`, `users`, `evacuation`, `volunteer-help`, `flood-requests` (volunteer endpoints)
> **DB Tables:** `users`, `evacuation_routes`, `volunteer_help_requests`, `flood_requests` (volunteer operations)
> **AWS Lead:** Elastic Beanstalk (Backend + Frontend deployment)
> **Estimated LOC:** ~2,200

---

## Table of Contents

1. [Project Architecture Overview](#1-project-architecture-overview)
2. [AWS RDS PostgreSQL Setup](#2-aws-rds-postgresql-setup)
3. [Prisma ORM Configuration](#3-prisma-orm-configuration)
4. [Prisma Schema & Migrations](#4-prisma-schema--migrations)
5. [Authentication Module (auth/)](#5-authentication-module)
6. [Users Module (users/)](#6-users-module)
7. [Evacuation & Shelters Module (evacuation/)](#7-evacuation--shelters-module)
8. [Flood Requests — Volunteer Endpoints](#8-flood-requests--volunteer-endpoints)
9. [Volunteer Help Module (volunteer-help/)](#9-volunteer-help-module)
10. [JWT Guards & Role-Based Access](#10-jwt-guards--role-based-access)
11. [Elastic Beanstalk Deployment — Backend](#11-elastic-beanstalk-deployment--backend)
12. [Elastic Beanstalk Deployment — Frontend](#12-elastic-beanstalk-deployment--frontend)
13. [Environment Variables & Configuration](#13-environment-variables--configuration)
14. [Testing & Verification](#14-testing--verification)
15. [Demo Checklist](#15-demo-checklist)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Project Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                  AWS Cloud (us-east-1)                    │
│                                                          │
│  CloudFront (HTTPS)                                      │
│    ├── Frontend: d28cob3p1pxddd.cloudfront.net           │
│    └── Backend:  d2962fm2ka76im.cloudfront.net           │
│         │                │                               │
│         ▼                ▼                               │
│  ┌─────────────┐  ┌─────────────┐                       │
│  │  Frontend   │  │  Backend    │                       │
│  │  EB (Next)  │  │  EB (Nest)  │                       │
│  │  t3.micro   │  │  t3.small   │                       │
│  └─────────────┘  └──────┬──────┘                       │
│                          │ 5432 (SSL)                    │
│                   ┌──────▼──────┐                        │
│                   │ RDS Postgres │                        │
│                   │ (floodguard) │                        │
│                   └─────────────┘                        │
│  ┌─────────────┐                                        │
│  │  S3 Bucket  │ (uploads, presigned URLs)              │
│  └─────────────┘                                        │
└──────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 11 + TypeScript 5.7 |
| ORM | Prisma 7 with `@prisma/adapter-pg` (pure JS) |
| Database | AWS RDS PostgreSQL 16 |
| Auth | JWT via `@nestjs/jwt` + `passport-jwt` + `bcryptjs` |
| Frontend | Next.js 15 (standalone output) |
| Deployment | AWS Elastic Beanstalk (Node.js 22, Amazon Linux 2023) |
| Package Manager | pnpm |

### Key Design Decisions

- **Pre-build locally, ship artifact** — never compile TypeScript on EB instance (causes OOM/timeout)
- **Prisma with pg driver adapter** — pure JS, no native binary issues across OS
- **DB migrations run from local machine** — RDS is publicly accessible for dev convenience
- **JWT in Authorization header** — `Bearer <token>` pattern
- **Role-based access:** `resident`, `volunteer`, `admin`, `super_admin`
- **Volunteer approval flow** — volunteers register but need admin approval before full access


---

## 2. AWS RDS PostgreSQL Setup

### 2.1 Prerequisites

Before starting RDS setup, ensure you have:

- AWS account access (account ID: `679777944150`)
- AWS CLI v2 installed and configured:
  ```bash
  aws configure
  # Access Key ID: <your-key>
  # Secret Access Key: <your-secret>
  # Default region: us-east-1
  # Output format: json
  
  # Verify identity
  aws sts get-caller-identity
  ```
- A VPC with at least 2 public subnets in different Availability Zones
- Security groups created for EB and RDS

---

### 2.2 Step 1: Create the VPC Security Group for RDS

This security group controls who can connect to the database on port 5432.

#### GUI (AWS Console):

1. Go to **AWS Console** → **EC2** → **Security Groups** (left sidebar under Network & Security)
2. Click **Create security group**
3. Fill in:
   - **Security group name:** `floodguard-rds-sg`
   - **Description:** `FloodGuard RDS PostgreSQL access`
   - **VPC:** Select `floodguard-vpc` (your project VPC)
4. **Inbound rules** — click "Add rule":
   - **Rule 1 (EB access):**
     - Type: `PostgreSQL`
     - Port: `5432`
     - Source: Select **Custom** → type the EB security group ID (e.g., `sg-0abc123...` for `floodguard-eb-sg`)
     - Description: `Allow EB instances`
   - **Rule 2 (Your laptop):**
     - Type: `PostgreSQL`
     - Port: `5432`
     - Source: Select **My IP** (auto-fills your current public IP with /32)
     - Description: `Allow local development`
5. **Outbound rules:** Leave default (All traffic, 0.0.0.0/0)
6. Click **Create security group**
7. **Note down the Security Group ID** (e.g., `sg-0def456...`)

#### CLI:

```bash
# Create the RDS security group
RDS_SG=$(aws ec2 create-security-group \
  --group-name floodguard-rds-sg \
  --description "FloodGuard RDS PostgreSQL access" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)
echo "RDS_SG=$RDS_SG"

# Rule 1: Allow PostgreSQL from the EB instances security group
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp \
  --port 5432 \
  --source-group $EB_SG

# Rule 2: Allow PostgreSQL from your current laptop IP
MY_IP=$(curl -s https://checkip.amazonaws.com)
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp \
  --port 5432 \
  --cidr ${MY_IP}/32

echo "RDS Security Group created: $RDS_SG"
echo "Allowed: EB SG ($EB_SG) + Your IP ($MY_IP/32)"
```

---

### 2.3 Step 2: Create the DB Subnet Group

RDS requires a **DB Subnet Group** that spans at least 2 Availability Zones (even for single-AZ deployments).

#### GUI (AWS Console):

1. Go to **AWS Console** → **RDS** (search "RDS" in the top bar)
2. In the left sidebar, click **Subnet groups**
3. Click **Create DB subnet group**
4. Fill in:
   - **Name:** `floodguard-db-subnet`
   - **Description:** `FloodGuard database subnets`
   - **VPC:** Select `floodguard-vpc`
5. **Add subnets:**
   - **Availability Zones:** Select `us-east-1a` AND `us-east-1b`
   - **Subnets:** Check both public subnets:
     - `10.0.1.0/24` (us-east-1a) — `floodguard-public-1a`
     - `10.0.2.0/24` (us-east-1b) — `floodguard-public-1b`
6. Click **Create**

#### CLI:

```bash
# Create DB subnet group with both subnets
aws rds create-db-subnet-group \
  --db-subnet-group-name floodguard-db-subnet \
  --db-subnet-group-description "FloodGuard database subnets" \
  --subnet-ids $SUBNET_1A $SUBNET_1B

# Verify it was created
aws rds describe-db-subnet-groups \
  --db-subnet-group-name floodguard-db-subnet \
  --query 'DBSubnetGroups[0].{Name:DBSubnetGroupName,VPC:VpcId,Subnets:Subnets[].SubnetIdentifier}' \
  --output table
```

---

### 2.4 Step 3: Create the RDS PostgreSQL Instance

This is the main database instance that stores all application data.

#### GUI (AWS Console) — Detailed Step-by-Step:

1. Go to **AWS Console** → **RDS** → **Databases** (left sidebar)
2. Click **Create database**

3. **Choose a database creation method:**
   - Select: ✅ **Standard create**

4. **Engine options:**
   - Engine type: **PostgreSQL**
   - Engine version: **PostgreSQL 16.x** (latest 16.x available)

5. **Templates:**
   - Select: ✅ **Free tier** (auto-selects db.t3.micro and limits options)

6. **Settings:**
   - **DB instance identifier:** `floodguard-db`
   - **Master username:** `floodguard_admin`
   - **Credentials management:** Select "Self managed"
   - **Master password:** `FloodGuard2026SecurePass!`
   - **Confirm master password:** `FloodGuard2026SecurePass!`

7. **Instance configuration:**
   - **DB instance class:** `db.t3.micro` (2 vCPU, 1 GB RAM — included in free tier)

8. **Storage:**
   - **Storage type:** `gp3`
   - **Allocated storage:** `20` GB
   - **Storage autoscaling:** ❌ **Uncheck** "Enable storage autoscaling" (not needed for project)

9. **Connectivity:**
   - **Compute resource:** Select "Don't connect to an EC2 compute resource"
   - **Network type:** IPv4
   - **VPC:** Select `floodguard-vpc`
   - **DB subnet group:** Select `floodguard-db-subnet`
   - **Public access:** ✅ **Yes**
     > ⚠️ This allows connections from outside the VPC (your laptop). Security is enforced by the security group.
   - **VPC security group:** Select "Choose existing"
     - Remove the default SG
     - Add: `floodguard-rds-sg`
   - **Availability Zone:** No preference (or pick `us-east-1a`)
   - **Database port:** `5432` (default)

10. **Database authentication:**
    - Select: ✅ **Password authentication**

11. **Monitoring:**
    - ❌ **Uncheck** "Enable Enhanced monitoring" (saves cost)

12. **Additional configuration** (expand this section):
    - **Initial database name:** `floodguard`
      > ⚠️ **CRITICAL:** If you leave this blank, no database is created and the app gets "database does not exist" errors.
    - **DB parameter group:** default
    - **Backup:**
      - Backup retention period: `7 days`
      - Backup window: No preference
    - **Encryption:** ❌ Uncheck "Enable encryption" (free tier project)
    - **Maintenance:**
      - ❌ Uncheck "Enable auto minor version upgrade" (optional)
      - Maintenance window: No preference
    - **Deletion protection:** ❌ Uncheck (project DB — makes cleanup easier)

13. Click **Create database**

14. **Wait 5-10 minutes** for status to change from "Creating" → "Available"

15. Once available, click on `floodguard-db` → **Connectivity & security** tab:
    - Copy the **Endpoint** (e.g., `floodguard-db.c4t6ymcw2eqt.us-east-1.rds.amazonaws.com`)
    - Port: `5432`

#### CLI:

```bash
# Create the RDS instance
aws rds create-db-instance \
  --db-instance-identifier floodguard-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16 \
  --master-username floodguard_admin \
  --master-user-password 'FloodGuard2026SecurePass!' \
  --allocated-storage 20 \
  --storage-type gp3 \
  --db-name floodguard \
  --vpc-security-group-ids $RDS_SG \
  --db-subnet-group-name floodguard-db-subnet \
  --publicly-accessible \
  --no-multi-az \
  --backup-retention-period 7 \
  --no-storage-encrypted \
  --no-deletion-protection \
  --no-auto-minor-version-upgrade

echo "⏳ Waiting for RDS instance to be available (5-10 minutes)..."
aws rds wait db-instance-available --db-instance-identifier floodguard-db
echo "✅ RDS instance is available!"

# Get the endpoint address
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier floodguard-db \
  --query 'DBInstances[0].Endpoint.Address' --output text)
echo "RDS_ENDPOINT=$RDS_ENDPOINT"

# Get full connection details
aws rds describe-db-instances \
  --db-instance-identifier floodguard-db \
  --query 'DBInstances[0].{Endpoint:Endpoint.Address,Port:Endpoint.Port,Status:DBInstanceStatus,Engine:Engine,Class:DBInstanceClass}' \
  --output table
```

---

### 2.5 Step 4: Build the Connection String

Once you have the RDS endpoint, construct the DATABASE_URL:

```
postgresql://<username>:<password>@<endpoint>:<port>/<database>?sslmode=require
```

**Our actual connection string:**
```
postgresql://floodguard_admin:FloodGuard2026SecurePass!@floodguard-db.c4t6ymcw2eqt.us-east-1.rds.amazonaws.com:5432/floodguard?sslmode=require
```

**Set it in your local `.env`:**
```bash
cd backend
echo 'DATABASE_URL="postgresql://floodguard_admin:FloodGuard2026SecurePass!@floodguard-db.c4t6ymcw2eqt.us-east-1.rds.amazonaws.com:5432/floodguard?sslmode=require"' >> .env
```

---

### 2.6 Step 5: Verify the Connection

#### Method 1: Using psql (if installed)

```bash
psql "postgresql://floodguard_admin:FloodGuard2026SecurePass!@$RDS_ENDPOINT:5432/floodguard?sslmode=require"

# Inside psql:
\dt          -- List tables (empty initially)
\conninfo    -- Show connection info
\q           -- Quit
```

#### Method 2: Using Node.js

```bash
cd backend
node -e "
const { Pool } = require('pg');
let cs = process.env.DATABASE_URL.replace(/[?&]sslmode=require/, '');
const pool = new Pool({
  connectionString: cs,
  ssl: { rejectUnauthorized: false }
});
pool.query('SELECT version()')
  .then(r => {
    console.log('✅ Connected to RDS!');
    console.log('PostgreSQL version:', r.rows[0].version);
    pool.end();
  })
  .catch(e => {
    console.error('❌ Connection failed:', e.message);
    pool.end();
  });
"
```

#### Method 3: Using Prisma

```bash
cd backend
npx prisma db pull   # Should connect and pull schema (empty initially)
# Or:
npx prisma studio    # Opens web UI connected to RDS
```

---

### 2.7 Step 6: Push Schema & Seed Data

Once connected, push your Prisma schema and seed the database:

```bash
cd backend

# 1. Generate Prisma Client
npx prisma generate

# 2. Push schema to RDS (creates all tables)
npx prisma db push
# Output: "Your database is now in sync with your Prisma schema"

# 3. Verify tables were created
node -e "
const { Pool } = require('pg');
let cs = process.env.DATABASE_URL.replace(/[?&]sslmode=require/, '');
const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });
pool.query(\"SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename\")
  .then(r => {
    console.log('Tables created:');
    r.rows.forEach(t => console.log('  ✓', t.tablename));
    pool.end();
  });
"

# 4. Seed with demo data
pnpm seed
# Creates: admin user, demo residents, volunteers, regions, shelters, etc.
```

**Expected tables after `db push`:**
```
  ✓ _prisma_migrations
  ✓ alerts
  ✓ evacuation_routes
  ✓ flood_requests
  ✓ notifications
  ✓ region_volunteers
  ✓ regions
  ✓ reports
  ✓ sensors
  ✓ users
  ✓ volunteer_help_requests
```

---

### 2.8 Updating Security Group When IP Changes

Your home/office IP is dynamic. If Prisma or psql suddenly times out:

#### GUI:
1. **EC2** → **Security Groups** → find `floodguard-rds-sg`
2. **Inbound rules** → **Edit inbound rules**
3. Find the old `/32` rule with the stale IP → **Delete** it
4. **Add rule** → Type: PostgreSQL, Source: **My IP**, Description: `Local dev (updated)`
5. **Save rules**

#### CLI:
```bash
# Find your new IP
MY_IP=$(curl -s https://checkip.amazonaws.com)
echo "Your current IP: $MY_IP"

# Remove old rule (if you know the old IP)
aws ec2 revoke-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp --port 5432 --cidr <old-ip>/32

# Add new rule
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp --port 5432 --cidr ${MY_IP}/32

echo "✅ Security group updated with new IP: $MY_IP"
```

---

### 2.9 RDS Management Commands

```bash
# Check instance status
aws rds describe-db-instances \
  --db-instance-identifier floodguard-db \
  --query 'DBInstances[0].{Status:DBInstanceStatus,Endpoint:Endpoint.Address,Storage:AllocatedStorage,Class:DBInstanceClass}' \
  --output table

# Stop instance (saves cost when not in use — free tier has limits)
aws rds stop-db-instance --db-instance-identifier floodguard-db

# Start instance again
aws rds start-db-instance --db-instance-identifier floodguard-db

# Reboot (if performance issues)
aws rds reboot-db-instance --db-instance-identifier floodguard-db

# Delete instance (DESTRUCTIVE — for project cleanup)
aws rds delete-db-instance \
  --db-instance-identifier floodguard-db \
  --skip-final-snapshot
```

---

### 2.10 Important Considerations

| Concern | Decision | Reason |
|---------|----------|--------|
| **Public access** | Yes | Allows `prisma db push`/seed from laptop; locked down via security group rules |
| **SSL** | Required | App uses `ssl: { rejectUnauthorized: false }` — accepts AWS RDS self-signed certificates |
| **Instance size** | `db.t3.micro` | 2 vCPU, 1GB RAM — sufficient for this project, free tier eligible |
| **Storage** | 20 GB gp3 | Minimal, no autoscaling needed for demo workload |
| **Multi-AZ** | No | Not needed for a project (adds cost); single-AZ is fine |
| **Backups** | 7-day retention | Automated daily backups; can restore to any point in last 7 days |
| **Deletion protection** | Off | Makes cleanup easy after project submission |
| **Encryption** | Off | Simplifies setup; not required for a class project |
| **IP changes** | Re-add to SG | If Prisma/psql suddenly times out, your public IP changed |
| **Initial DB name** | `floodguard` | **MUST** be set at creation; otherwise app gets "database does not exist" |

---

### 2.11 Connecting Prisma to RDS — How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│  Your Laptop (Development)                                       │
│                                                                  │
│  .env: DATABASE_URL = postgresql://...@rds-endpoint/floodguard   │
│            │                                                     │
│            ▼                                                     │
│  prisma.config.ts                                                │
│    → Strips "?sslmode=require" from URL                          │
│    → Creates pg Pool with ssl: { rejectUnauthorized: false }     │
│    → Passes Pool to PrismaPg adapter                             │
│            │                                                     │
│            ▼                                                     │
│  Prisma Client (generated, pure JS)                              │
│    → Uses @prisma/adapter-pg (no native binary)                  │
│    → All queries go through the pg Pool                          │
│            │                                                     │
└────────────┼─────────────────────────────────────────────────────┘
             │ TCP 5432 + SSL
             ▼
┌────────────────────────────────────────────────────────────┐
│  AWS RDS PostgreSQL (floodguard-db)                        │
│  Endpoint: floodguard-db.c4t6ymcw2eqt.us-east-1.rds...   │
│  Port: 5432 | Database: floodguard | SSL: Required        │
│                                                            │
│  Security Group: floodguard-rds-sg                         │
│    Inbound: 5432 from EB SG ✓                             │
│    Inbound: 5432 from Your IP /32 ✓                       │
└────────────────────────────────────────────────────────────┘
```

The same flow works from EB instances — they connect using the `DATABASE_URL` environment variable set in `.ebextensions/env.config`, and the security group allows their SG as source.


---

## 3. Prisma ORM Configuration

### 3.1 Dependencies (already in package.json)

```json
{
  "dependencies": {
    "@prisma/adapter-pg": "^7.8.0",
    "@prisma/client": "^7.8.0",
    "pg": "^8.22.0",
    "prisma": "^7.8.0",
    "dotenv": "^17.4.2"
  }
}
```

### 3.2 Prisma Config File (`backend/prisma.config.ts`)

This file configures Prisma 7's **driver adapter** pattern — using the pure-JS `pg` library instead of the native Prisma query engine. This is critical for cross-platform compatibility (build on Mac, deploy on Linux).

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

let connectionString = process.env["DATABASE_URL"] || "";
const isRDS = connectionString.includes('rds.amazonaws.com');

// Remove sslmode parameter — we set SSL options separately in the Pool config
if (isRDS) {
  connectionString = connectionString
    .replace(/[&?]sslmode=require/g, '')
    .replace(/[&?]sslmode=verify-full/g, '');
}

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: isRDS ? { rejectUnauthorized: false } : false,
});

export const adapter = new PrismaPg(pool);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

### 3.3 PrismaService (`backend/src/prisma/prisma.service.ts`)

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### 3.4 PrismaModule (`backend/src/prisma/prisma.module.ts`)

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### 3.5 Local .env File (`backend/.env`)

```env
DATABASE_URL="postgresql://floodguard_admin:FloodGuard2026SecurePass!@floodguard-db.c4t6ymcw2eqt.us-east-1.rds.amazonaws.com:5432/floodguard?sslmode=require"
JWT_SECRET="floodguard-jwt-2026"
PORT=8080
```

### 3.6 Key Prisma Commands

```bash
cd backend

# Generate the Prisma Client (must run after schema changes)
npx prisma generate

# Push schema to database (no migration history — good for dev)
npx prisma db push

# Create a new migration (for production tracking)
npx prisma migrate dev --name <migration_name>

# Apply migrations in production
npx prisma migrate deploy

# Open Prisma Studio (GUI for browsing data)
npx prisma studio

# Reset database (DESTRUCTIVE — drops all data)
npx prisma db push --force-reset

# Seed the database
pnpm seed
```

### 3.7 Why `db push` vs `migrate`

| Command | Use Case |
|---------|----------|
| `prisma db push` | Development — syncs schema without migration files |
| `prisma migrate dev` | Creates migration SQL files for version control |
| `prisma migrate deploy` | Production — applies pending migrations |

**For this project:** We use `db push` from local since RDS is public. No on-instance migration hooks needed — this removes a whole class of deployment failures.


---

## 4. Prisma Schema & Migrations

### 4.1 Schema File (`backend/prisma/schema.prisma`)

The full schema is shared across all team members. M4 owns these models:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

// ============ ENUMS ============

enum UserRole {
  resident
  volunteer
  admin
  super_admin
}

enum RequestType {
  evacuation
  rescue
  relief
  medical
  shelter
}

enum RequestPriority {
  low
  medium
  high
  critical
}

enum RequestStatus {
  pending
  assigned
  in_progress
  completed
  cancelled
}

enum HelpRequestStatus {
  pending
  accepted
  rejected
  completed
}

// ============ M4-OWNED MODELS ============

model User {
  id                      String         @id @default(uuid())
  email                   String         @unique
  name                    String
  password                String
  role                    UserRole       @default(resident)
  isApproved              Boolean        @default(true)
  approvedAt              DateTime?
  approvedBy              String?
  regionId                String?
  notificationPreferences Json?
  createdAt               DateTime       @default(now())
  updatedAt               DateTime       @updatedAt
  reports                 Report[]
  notifications           Notification[]
  floodRequests           FloodRequest[]

  @@map("users")
}

model EvacuationRoute {
  id           String   @id @default(uuid())
  regionId     String
  region       Region   @relation(fields: [regionId], references: [id], onDelete: Cascade)
  shelterName  String
  address      String?
  latitude     Float?
  longitude    Float?
  capacity     Int
  currentCount Int      @default(0)
  routeData    Json?
  facilities   Json?
  contactPhone String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("evacuation_routes")
}

model FloodRequest {
  id           String               @id @default(uuid())
  userId       String
  user         User                 @relation(fields: [userId], references: [id])
  type         RequestType
  priority     RequestPriority      @default(medium)
  status       RequestStatus        @default(pending)
  title        String
  description  String
  location     String
  latitude     Float?
  longitude    Float?
  peopleCount  Int                  @default(1)
  contactPhone String?
  regionId     String?
  assignedTo   String?
  notes        String?
  createdAt    DateTime             @default(now())
  updatedAt    DateTime             @updatedAt
  helpRequests VolunteerHelpRequest[] @relation("RequestHelpRequests")

  @@map("flood_requests")
}

model VolunteerHelpRequest {
  id               String            @id @default(uuid())
  floodRequestId   String
  floodRequest     FloodRequest      @relation("RequestHelpRequests", fields: [floodRequestId], references: [id], onDelete: Cascade)
  requestedBy      String
  requestedTo      String
  message          String
  status           HelpRequestStatus @default(pending)
  responseMessage  String?
  respondedAt      DateTime?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  @@index([requestedTo, status])
  @@index([floodRequestId])
  @@map("volunteer_help_requests")
}
```

### 4.2 Migration History

```
backend/prisma/migrations/
├── 20240101000000_init/migration.sql          # Initial schema (all tables)
├── 20260627123654_update_schema/migration.sql # Schema updates
├── 20260628034757_add_volunteer_approval/     # Added isApproved, approvedAt, approvedBy
└── migration_lock.toml
```

### 4.3 Creating a New Migration

```bash
cd backend

# 1. Edit schema.prisma with your changes

# 2. Generate migration SQL (creates file in migrations/)
npx prisma migrate dev --name add_volunteer_help_requests

# 3. This automatically:
#    - Creates migration SQL
#    - Applies it to your local/RDS database
#    - Regenerates the Prisma Client
```

### 4.4 Applying Migrations to RDS (From Local)

```bash
# Ensure .env has the RDS DATABASE_URL
cd backend

# Option A: Push schema directly (no migration files)
npx prisma db push

# Option B: Apply pending migration files
npx prisma migrate deploy
```

### 4.5 Seeding the Database

```bash
# Run the seed script (creates demo users, regions, shelters, etc.)
pnpm seed

# This runs: npx tsx --env-file=.env prisma/seed-direct.ts
```

**Demo users created by seed:**

| Email | Password | Role |
|-------|----------|------|
| `admin@floodguard.np` | `12345678` | admin |
| `user@gmail.com` | `12345678` | resident |
| `volunteer1@gmail.com` | `12345678` | volunteer |

### 4.6 Verifying Database State

```bash
# Open Prisma Studio (browser GUI)
npx prisma studio

# Or query directly
node -e "
const {Pool}=require('pg');
let cs=process.env.DATABASE_URL.replace(/[?&]sslmode=require/,'');
const p=new Pool({connectionString:cs,ssl:{rejectUnauthorized:false}});
p.query('SELECT tablename FROM pg_tables WHERE schemaname=\\'public\\'')
  .then(r=>{console.log('Tables:',r.rows.map(t=>t.tablename));p.end();});
"
```


---

## 5. Authentication Module

### 5.1 Module Structure

```
backend/src/auth/
├── auth.module.ts         # Module definition with JWT config
├── auth.controller.ts     # POST /register, POST /login, GET /me
├── auth.service.ts        # Business logic (hash, verify, token)
├── auth.dto.ts            # RegisterDto, LoginDto with validation
├── jwt.strategy.ts        # Passport JWT strategy
├── jwt-auth.guard.ts      # Guard to protect routes
└── roles.guard.ts         # Role-based access control guard
```

### 5.2 Auth Module (`auth.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '7d') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

### 5.3 Auth Service (`auth.service.ts`)

```typescript
import {
  Injectable, UnauthorizedException, ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if email already exists
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('Email already registered');

    // Volunteers need admin approval; residents/admins are auto-approved
    const isApproved = dto.role !== 'volunteer';

    const user = await this.prisma.user.create({
      data: {
        ...dto,
        password: await bcrypt.hash(dto.password, 10),
        isApproved,
        approvedAt: isApproved ? new Date() : null,
      },
    });
    return this.buildToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Volunteers can log in even if pending — frontend shows status banner
    return this.buildToken(user);
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, role: true,
        regionId: true, notificationPreferences: true,
        isApproved: true, approvedAt: true, approvedBy: true, createdAt: true,
      },
    });
  }

  private buildToken(user: { id: string; email: string; name: string; role: string; isApproved?: boolean; approvedAt?: Date | null }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id, email: user.email, name: user.name,
        role: user.role, isApproved: user.isApproved ?? true, approvedAt: user.approvedAt,
      },
    };
  }
}
```

### 5.4 Auth Controller (`auth.controller.ts`)

```typescript
import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login and receive JWT token' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }
}
```

### 5.5 DTOs with Validation (`auth.dto.ts`)

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

export enum UserRole {
  resident = 'resident',
  volunteer = 'volunteer',
  admin = 'admin',
}

export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: UserRole, required: false, default: UserRole.resident })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class LoginDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;
}
```

### 5.6 JWT Strategy (`jwt.strategy.ts`)

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET', 'fallback-secret'),
    });
  }

  // This returned object becomes `req.user`
  validate(payload: { sub: string; email: string; role: string }) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

### 5.7 API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login, returns JWT |
| GET | `/api/auth/me` | Bearer Token | Get current user profile |

### 5.8 Auth Flow Diagram

```
Client                          Backend                         Database
  │                               │                               │
  │── POST /auth/register ───────►│                               │
  │   {name,email,password,role}  │── Check email unique ────────►│
  │                               │◄── Not found ─────────────────│
  │                               │── Hash password (bcrypt 10) ──│
  │                               │── Create user ───────────────►│
  │                               │── Sign JWT ───────────────────│
  │◄── { access_token, user } ────│                               │
  │                               │                               │
  │── POST /auth/login ──────────►│                               │
  │   {email, password}           │── Find user by email ────────►│
  │                               │── bcrypt.compare() ───────────│
  │                               │── Sign JWT ───────────────────│
  │◄── { access_token, user } ────│                               │
  │                               │                               │
  │── GET /auth/me ──────────────►│                               │
  │   Authorization: Bearer xxx   │── Verify JWT (passport) ──────│
  │                               │── Lookup user by id ─────────►│
  │◄── { user profile } ──────────│                               │
```


---

## 6. Users Module

### 6.1 Module Structure

```
backend/src/users/
├── users.module.ts       # Module definition
├── users.controller.ts   # Admin-only user management endpoints
├── users.service.ts      # CRUD + volunteer approval logic
└── users.dto.ts          # UpdateUserDto
```

### 6.2 Users Controller (`users.controller.ts`)

All endpoints are **admin-only** (protected by `JwtAuthGuard` + `RolesGuard`).

```typescript
import { Controller, Get, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './users.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List all users (admin only)' })
  findAll() { return this.usersService.findAll(); }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  findOne(@Param('id') id: string) { return this.usersService.findOne(id); }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update user (admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete user (admin only)' })
  remove(@Param('id') id: string) { return this.usersService.remove(id); }

  @Get('pending/volunteers')
  @Roles('admin')
  @ApiOperation({ summary: 'Get pending volunteer approvals' })
  getPendingVolunteers() { return this.usersService.findPendingVolunteers(); }

  @Patch(':id/approve')
  @Roles('admin')
  @ApiOperation({ summary: 'Approve volunteer' })
  approveVolunteer(@Param('id') id: string, @Request() req: any) {
    return this.usersService.approveVolunteer(id, req.user.id);
  }

  @Delete(':id/reject')
  @Roles('admin')
  @ApiOperation({ summary: 'Reject volunteer application' })
  rejectVolunteer(@Param('id') id: string) {
    return this.usersService.rejectVolunteer(id);
  }
}
```

### 6.3 Users Service (`users.service.ts`)

Key methods:

- **`findAll()`** — Returns all users (excludes password)
- **`findPendingVolunteers()`** — Volunteers where `isApproved = false`
- **`approveVolunteer(userId, adminId)`** — Sets `isApproved=true`, records who approved
- **`rejectVolunteer(userId)`** — Deletes the unapproved volunteer account
- **`update(id, dto)`** — Update name, role, or assigned region
- **`remove(id)`** — Hard delete user

### 6.4 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | Admin | List all users |
| GET | `/api/users/:id` | Admin | Get user details |
| PATCH | `/api/users/:id` | Admin | Update user (name, role, region) |
| DELETE | `/api/users/:id` | Admin | Delete user |
| GET | `/api/users/pending/volunteers` | Admin | List unapproved volunteers |
| PATCH | `/api/users/:id/approve` | Admin | Approve volunteer |
| DELETE | `/api/users/:id/reject` | Admin | Reject volunteer (deletes account) |

### 6.5 Volunteer Approval Flow

```
1. User registers with role=volunteer → isApproved=false, no approvedAt
2. Volunteer can still login (frontend shows "pending approval" banner)
3. Admin sees them in GET /users/pending/volunteers
4. Admin approves → PATCH /users/:id/approve → isApproved=true, approvedAt=now
5. OR Admin rejects → DELETE /users/:id/reject → account deleted
```

---

## 7. Evacuation & Shelters Module

### 7.1 Module Structure

```
backend/src/evacuation/
├── evacuation.module.ts      # Module definition
├── evacuation.controller.ts  # CRUD endpoints for shelters/routes
├── evacuation.service.ts     # Business logic
└── evacuation.dto.ts         # Create/Update DTOs
```

### 7.2 Evacuation Controller (`evacuation.controller.ts`)

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EvacuationService } from './evacuation.service';
import { CreateEvacuationRouteDto, UpdateEvacuationRouteDto } from './evacuation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@ApiTags('Evacuation Routes')
@Controller('evacuation-routes')
export class EvacuationController {
  constructor(private evacuationService: EvacuationService) {}

  @Get()
  @ApiOperation({ summary: 'List all evacuation routes and shelters' })
  findAll() { return this.evacuationService.findAll(); }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific evacuation route/shelter' })
  findOne(@Param('id') id: string) { return this.evacuationService.findOne(id); }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new shelter (admin only)' })
  create(@Body() dto: CreateEvacuationRouteDto) { return this.evacuationService.create(dto); }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a shelter (admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateEvacuationRouteDto) {
    return this.evacuationService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a shelter (admin only)' })
  remove(@Param('id') id: string) { return this.evacuationService.remove(id); }
}
```

### 7.3 DTOs (`evacuation.dto.ts`)

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsObject, Min } from 'class-validator';

export class CreateEvacuationRouteDto {
  @ApiProperty({ example: 'region-uuid-here' })
  @IsString()
  regionId: string;

  @ApiProperty({ example: 'Metro Sports Complex' })
  @IsString()
  shelterName: string;

  @ApiProperty({ example: 500 })
  @IsInt()
  @Min(0)
  capacity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  routeData?: object;
}

export class UpdateEvacuationRouteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  regionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shelterName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  routeData?: object;
}
```

### 7.4 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/evacuation-routes` | Public | List all shelters |
| GET | `/api/evacuation-routes/:id` | Public | Get shelter details |
| POST | `/api/evacuation-routes` | Admin | Create shelter |
| PATCH | `/api/evacuation-routes/:id` | Admin | Update shelter |
| DELETE | `/api/evacuation-routes/:id` | Admin | Delete shelter |


---

## 8. Flood Requests — Volunteer Endpoints

### 8.1 Context

The `flood-requests` module is shared between M2 (resident side: create/track) and M4 (volunteer side: claim/respond). M4 owns these specific endpoints.

### 8.2 Volunteer Endpoints in FloodRequests Controller

```typescript
// Already in: backend/src/flood-requests/flood-requests.controller.ts

@Get('unclaimed')
@ApiOperation({ summary: 'List unclaimed / pending flood requests' })
findUnclaimed() {
  return this.service.findUnclaimed();
}

@Get('assigned-to-me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Get requests assigned to the current volunteer' })
assignedToMe(@Request() req: { user: { id: string } }) {
  return this.service.assignedToMe(req.user.id);
}

@Patch(':id/claim')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Volunteer claims an unclaimed request (atomic)' })
claim(@Param('id') id: string, @Request() req: { user: { id: string } }) {
  return this.service.claimRequest(id, req.user.id);
}

@Patch(':id')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Update request status (volunteer updates progress)' })
update(@Param('id') id: string, @Body() dto: UpdateFloodRequestDto) {
  return this.service.update(id, dto);
}
```

### 8.3 Key Service Methods (Volunteer Side)

```typescript
// Atomic claim — prevents double-claims using updateMany with condition
async claimRequest(id: string, volunteerId: string) {
  const result = await this.prisma.floodRequest.updateMany({
    where: { id, status: 'pending' },  // Only claim if still pending
    data: { status: 'assigned', assignedTo: volunteerId },
  });

  if (result.count === 0) {
    throw new ConflictException('Request has already been claimed or does not exist');
  }

  // Notify resident that help is on the way
  const claimed = await this.prisma.floodRequest.findUnique({ where: { id } });
  if (claimed) {
    await this.notifications.notify(claimed.userId, {
      type: 'request',
      title: 'A volunteer is responding',
      message: `Your request "${claimed.title}" has been claimed by a responder.`,
    });
  }
  return claimed;
}

// List only pending requests for volunteer queue
findUnclaimed() {
  return this.prisma.floodRequest.findMany({
    where: { status: 'pending' },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    include: { user: { select: { name: true, email: true } } },
  });
}

// List requests assigned to a specific volunteer
assignedToMe(volunteerId: string) {
  return this.prisma.floodRequest.findMany({
    where: { assignedTo: volunteerId },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true, email: true } } },
  });
}
```

### 8.4 Request Lifecycle (Volunteer Perspective)

```
pending → [Volunteer claims] → assigned → [Updates status] → in_progress → completed
                                    ↓
                              [Admin assigns]
```

### 8.5 API Endpoints (M4's Portion)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/flood-requests/unclaimed` | Public | Volunteer queue (pending requests) |
| GET | `/api/flood-requests/assigned-to-me` | Bearer | My assigned requests |
| PATCH | `/api/flood-requests/:id/claim` | Bearer | Claim a pending request |
| PATCH | `/api/flood-requests/:id` | Bearer | Update status/notes |
| PATCH | `/api/flood-requests/:id/assign` | Admin | Admin assigns to volunteer |

---

## 9. Volunteer Help Module

### 9.1 Purpose

Allows volunteers to request help from other volunteers for complex flood requests. A volunteer assigned to a task can ask other nearby/available volunteers to assist.

### 9.2 Module Structure

```
backend/src/volunteer-help/
├── volunteer-help.module.ts      # Module with PrismaModule + NotificationsModule
├── volunteer-help.controller.ts  # All endpoints (volunteer-only)
├── volunteer-help.service.ts     # Business logic + notifications
└── volunteer-help.dto.ts         # CreateHelpRequestDto, RespondToHelpRequestDto
```

### 9.3 Controller (`volunteer-help.controller.ts`)

All endpoints require `volunteer` role.

```typescript
@Controller('volunteer-help')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('volunteer')
export class VolunteerHelpController {
  constructor(private readonly service: VolunteerHelpService) {}

  @Get('nearby/:floodRequestId')
  findNearbyVolunteers(@Param('floodRequestId') id: string, @Req() req) {
    return this.service.findNearbyVolunteers(id, req.user.sub);
  }

  @Post()
  createHelpRequest(@Body() dto: CreateHelpRequestDto, @Req() req) {
    return this.service.createHelpRequest(dto, req.user.sub);
  }

  @Get('received')
  getReceivedHelpRequests(@Query('status') status: string, @Req() req) {
    return this.service.getReceivedHelpRequests(req.user.sub, status);
  }

  @Get('sent')
  getSentHelpRequests(@Req() req) {
    return this.service.getSentHelpRequests(req.user.sub);
  }

  @Get('task/:floodRequestId')
  getHelpRequestsForTask(@Param('floodRequestId') id: string, @Req() req) {
    return this.service.getHelpRequestsForTask(id, req.user.sub);
  }

  @Patch(':id/respond')
  respondToHelpRequest(@Param('id') id: string, @Body() dto: RespondToHelpRequestDto, @Req() req) {
    return this.service.respondToHelpRequest(id, dto, req.user.sub);
  }

  @Get('stats')
  getHelpRequestStats(@Req() req) {
    return this.service.getHelpRequestStats(req.user.sub);
  }
}
```

### 9.4 DTOs (`volunteer-help.dto.ts`)

```typescript
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class CreateHelpRequestDto {
  @IsString() @IsNotEmpty()
  floodRequestId: string;

  @IsString() @IsNotEmpty()
  requestedTo: string;   // volunteer ID to ask for help

  @IsString() @IsNotEmpty()
  message: string;       // why help is needed
}

export class RespondToHelpRequestDto {
  @IsEnum(['accepted', 'rejected'])
  status: 'accepted' | 'rejected';

  @IsString() @IsOptional()
  responseMessage?: string;
}
```

### 9.5 Key Business Rules

1. **Only assigned volunteer can request help** — must be `floodRequest.assignedTo === requestedBy`
2. **No duplicate pending requests** — can't ask same volunteer twice for same task
3. **Only target volunteer can respond** — `helpRequest.requestedTo === volunteerId`
4. **Notifications sent** on create (to target) and respond (to requester)

### 9.6 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/volunteer-help/nearby/:floodRequestId` | Volunteer | Find available volunteers |
| POST | `/api/volunteer-help` | Volunteer | Request help from another volunteer |
| GET | `/api/volunteer-help/received` | Volunteer | Inbox (requests sent TO me) |
| GET | `/api/volunteer-help/sent` | Volunteer | Outbox (requests I sent) |
| GET | `/api/volunteer-help/task/:floodRequestId` | Volunteer | Help requests for a task |
| PATCH | `/api/volunteer-help/:id/respond` | Volunteer | Accept/reject help request |
| GET | `/api/volunteer-help/stats` | Volunteer | My help request statistics |


---

## 10. JWT Guards & Role-Based Access

### 10.1 JwtAuthGuard (`jwt-auth.guard.ts`)

Simplest guard — just activates the Passport JWT strategy:

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

**Usage:** Add `@UseGuards(JwtAuthGuard)` to any endpoint that requires authentication.

### 10.2 RolesGuard (`roles.guard.ts`)

Checks if the authenticated user has the required role(s):

```typescript
import { SetMetadata, Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;  // No roles specified = allow all authenticated
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

### 10.3 Usage Patterns

```typescript
// Public endpoint (no guards)
@Get('shelters')
findAll() { ... }

// Authenticated only (any role)
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@Request() req) { ... }

// Admin only
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Get('users')
findAllUsers() { ... }

// Volunteer only
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('volunteer')
@Patch(':id/claim')
claimRequest() { ... }

// Multiple roles
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'volunteer')
@Get('requests')
getRequests() { ... }

// Class-level guard (applies to all endpoints in controller)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('users')
export class UsersController { ... }
```

### 10.4 How `req.user` is Populated

```
Request with "Authorization: Bearer <token>"
    ↓
JwtAuthGuard triggers Passport JWT Strategy
    ↓
JwtStrategy.validate() extracts payload
    ↓
Returns { id: payload.sub, email: payload.email, role: payload.role }
    ↓
This becomes req.user
    ↓
RolesGuard checks req.user.role against @Roles() metadata
```

### 10.5 JWT Token Payload Structure

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "volunteer",
  "iat": 1719700000,
  "exp": 1720304800
}
```


---

## 11. Elastic Beanstalk Deployment — Backend

### 11.1 Deployment Philosophy

> **CRITICAL:** Build locally, ship the compiled `dist/` folder. NEVER compile on the EB instance.

| ❌ Don't | ✅ Do |
|---|---|
| Run `nest build` on EB (postinstall/Buildfile) | Build locally, zip `dist/`, deploy artifact |
| `npm install` full dev dependencies on EB | Only install prod deps + `prisma generate` |
| Migrate DB from EB hooks | Run `prisma db push` from your laptop |
| Use git-based `eb deploy` of source | Use explicit artifact zip |

**Why:** TypeScript compilation on a 2GB `t3.small` pegs CPU/RAM → deploy hangs 35 min → aborts → environment gets wedged. Pre-building makes deploys take 2-3 minutes.

### 11.2 Required Deployment Files

```
backend/
├── .elasticbeanstalk/config.yml   # EB CLI config (artifact: deploy.zip)
├── .ebextensions/env.config       # Environment variables + instance config
├── Procfile                       # web: node dist/src/main.js
├── package.json                   # postinstall: prisma generate (NO nest build)
├── dist/                          # PRE-BUILT locally
├── prisma/schema.prisma           # Needed for prisma generate
└── prisma.config.ts               # Prisma driver adapter config
```

### 11.3 Procfile

```
web: node dist/src/main.js
```

### 11.4 EB CLI Config (`.elasticbeanstalk/config.yml`)

```yaml
branch-defaults:
  dev:
    environment: floodguard-backend
  main:
    environment: floodguard-backend
deploy:
  artifact: deploy.zip
global:
  application_name: floodguard-team-9
  default_platform: Node.js 22 running on 64bit Amazon Linux 2023
  default_region: us-east-1
  sc: git
```

### 11.5 Environment Config (`.ebextensions/env.config`)

```yaml
option_settings:
  aws:elasticbeanstalk:command:
    Timeout: "1800"
  aws:autoscaling:launchconfiguration:
    InstanceType: "t3.small"
  aws:elasticbeanstalk:application:environment:
    DATABASE_URL: "postgresql://floodguard_admin:FloodGuard2026SecurePass!@floodguard-db.c4t6ymcw2eqt.us-east-1.rds.amazonaws.com:5432/floodguard"
    FRONTEND_URL: "https://d28cob3p1pxddd.cloudfront.net,https://d4p5fmacpt873.cloudfront.net,http://localhost:3000"
    JWT_SECRET: "floodguard-jwt-2026"
    NODE_ENV: "production"
    PORT: "8080"
    AWS_REGION: "us-east-1"
    S3_BUCKET: "floodguard-uploads"
```

### 11.6 Build & Package Locally

```bash
cd backend

# 1. Generate Prisma client
npx prisma generate

# 2. Build NestJS (produces dist/)
npx nest build

# 3. Create deployment zip
rm -f deploy.zip
zip -r -q deploy.zip \
  dist prisma package.json pnpm-lock.yaml Procfile prisma.config.ts \
  tsconfig.json tsconfig.build.json .ebextensions \
  -x "prisma/seed*.ts" -x "dist/**/*.map"

du -sh deploy.zip   # Should be ~240 KB (no node_modules!)
```

### 11.7 Deploy via S3 + Application Version (Recommended)

```bash
# Get EB's S3 artifact bucket
BUCKET=$(aws elasticbeanstalk create-storage-location --query S3Bucket --output text)
KEY="floodguard-team-9/backend-$(date +%s).zip"

# Upload artifact
aws s3 cp deploy.zip "s3://$BUCKET/$KEY"

# Create application version
VERSION="prebuilt-$(date +%y%m%d_%H%M%S)"
aws elasticbeanstalk create-application-version \
  --application-name floodguard-team-9 \
  --version-label "$VERSION" \
  --source-bundle S3Bucket="$BUCKET",S3Key="$KEY"

# Deploy to environment
aws elasticbeanstalk update-environment \
  --environment-name floodguard-backend \
  --version-label "$VERSION"
```

### 11.8 Deploy via EB CLI (Alternative)

```bash
cd backend
# config.yml already has: deploy: artifact: deploy.zip
eb deploy
```

### 11.9 First-Time Environment Creation

```bash
# Create the EB application (one time)
aws elasticbeanstalk create-application --application-name floodguard-team-9

# Create the environment
aws elasticbeanstalk create-environment \
  --application-name floodguard-team-9 \
  --environment-name floodguard-backend \
  --solution-stack-name "64bit Amazon Linux 2023 v6.x running Node.js 22" \
  --option-settings file://.ebextensions/env.config \
  --version-label "$VERSION"
```

### 11.10 Health Check

The app exposes `/api/health`:

```typescript
// backend/src/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  check() { return { status: 'ok', timestamp: new Date() }; }
}
```

Configure in EB: Configuration → Health → Health check path: `/api/health`

### 11.11 Check Deployment Status

```bash
# Status
aws elasticbeanstalk describe-environments \
  --environment-name floodguard-backend \
  --query 'Environments[0].[Status,Health,VersionLabel]' --output text

# Logs (if something fails)
aws elasticbeanstalk request-environment-info \
  --environment-name floodguard-backend --info-type tail
aws elasticbeanstalk retrieve-environment-info \
  --environment-name floodguard-backend --info-type tail \
  --query "EnvironmentInfo[].Message" --output text

# Or via EB CLI
eb status
eb logs
```

### 11.12 Rollback

```bash
# List available versions
aws elasticbeanstalk describe-application-versions \
  --application-name floodguard-team-9 \
  --query "ApplicationVersions[].VersionLabel" --output text

# Rollback to previous version
aws elasticbeanstalk update-environment \
  --environment-name floodguard-backend \
  --version-label <older-version-label>
```


---

## 12. Elastic Beanstalk Deployment — Frontend

### 12.1 Key Difference from Backend

`NEXT_PUBLIC_*` environment variables are **baked into the JS at build time**. You MUST build with the correct API URL — it cannot be changed via EB env vars after deployment.

### 12.2 Frontend Deployment Files

```
frontend/
├── .elasticbeanstalk/config.yml   # EB config
├── .ebextensions/env.config       # Minimal env config
├── Procfile                       # web: PORT=8080 node .next/standalone/server.js
├── Buildfile                      # (empty or minimal — NOT for building)
└── .next/standalone/              # Pre-built Next.js standalone output
```

### 12.3 Procfile

```
web: PORT=8080 node .next/standalone/server.js
```

### 12.4 Frontend Build & Package

```bash
cd frontend

# 1. Build with the correct API URL baked in
NEXT_PUBLIC_API_URL=https://d2962fm2ka76im.cloudfront.net/api npx next build

# 2. Copy static assets into standalone bundle
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# 3. Create deployment zip
rm -f deploy.zip
zip -r -q deploy.zip .next/standalone Procfile
du -sh deploy.zip   # ~13 MB
```

### 12.5 Deploy Frontend

```bash
BUCKET=$(aws elasticbeanstalk create-storage-location --query S3Bucket --output text)
KEY="floodguard-team-9-web/frontend-$(date +%s).zip"
aws s3 cp deploy.zip "s3://$BUCKET/$KEY"

VERSION="fe-$(date +%y%m%d_%H%M%S)"
aws elasticbeanstalk create-application-version \
  --application-name floodguard-team-9-web \
  --version-label "$VERSION" \
  --source-bundle S3Bucket="$BUCKET",S3Key="$KEY"

aws elasticbeanstalk update-environment \
  --environment-name floodguard-team-9-frontend \
  --version-label "$VERSION"
```

### 12.6 Frontend EB Config (`.elasticbeanstalk/config.yml`)

```yaml
deploy:
  artifact: deploy.zip
global:
  application_name: floodguard-team-9-web
  default_platform: Node.js 22 running on 64bit Amazon Linux 2023
  default_region: us-east-1
```

### 12.7 Verify Correct API URL in Deployed JS

```bash
# After deploy, confirm the baked-in API URL is correct
curl -s https://d28cob3p1pxddd.cloudfront.net/ | grep -o 'd2962fm2ka76im' | head -1
# Should output: d2962fm2ka76im
```

### 12.8 Common Frontend Deployment Mistake

> **If you change the backend CloudFront domain, you MUST rebuild the frontend.**
> The old domain is compiled into the JS chunks. A simple `eb deploy` without rebuilding will still point to the old API.


---

## 13. Environment Variables & Configuration

### 13.1 Backend Environment Variables

| Variable | Value | Source |
|----------|-------|--------|
| `DATABASE_URL` | `postgresql://floodguard_admin:...@floodguard-db...rds.amazonaws.com:5432/floodguard` | M2 (RDS Lead) |
| `JWT_SECRET` | `floodguard-jwt-2026` | M4 (you) |
| `JWT_EXPIRES_IN` | `7d` | M4 |
| `PORT` | `8080` | EB default |
| `NODE_ENV` | `production` | Standard |
| `FRONTEND_URL` | `https://d28cob3p1pxddd.cloudfront.net,...` | Comma-separated origins for CORS |
| `AWS_REGION` | `us-east-1` | Region |
| `S3_BUCKET` | `floodguard-uploads` | M1 (S3 Lead) |

### 13.2 Frontend Environment Variables

| Variable | Value | Note |
|----------|-------|------|
| `NEXT_PUBLIC_API_URL` | `https://d2962fm2ka76im.cloudfront.net/api` | **Build-time only** |

### 13.3 Setting EB Environment Variables via CLI

```bash
# Set/update single variable
aws elasticbeanstalk update-environment \
  --environment-name floodguard-backend \
  --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=JWT_SECRET,Value=new-secret

# Set multiple at once
eb setenv JWT_SECRET=new-secret FRONTEND_URL=https://example.com
```

### 13.4 CORS Configuration (`main.ts`)

```typescript
app.enableCors({
  origin: (process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((o) => o.trim()),
  credentials: true,
});
```

The `FRONTEND_URL` must include ALL frontend origins (CloudFront domains + localhost for dev).

---

## 14. Testing & Verification

### 14.1 Local Development Testing

```bash
cd backend

# Start dev server
pnpm start:dev

# Test auth endpoints
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123","role":"resident"}'

curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Save token
TOKEN="<paste access_token from login response>"

# Test authenticated endpoint
curl http://localhost:8080/api/auth/me -H "Authorization: Bearer $TOKEN"

# Test volunteer endpoints
curl http://localhost:8080/api/flood-requests/unclaimed
curl http://localhost:8080/api/evacuation-routes
```

### 14.2 Production Smoke Tests

```bash
API=https://d2962fm2ka76im.cloudfront.net/api
FE=https://d28cob3p1pxddd.cloudfront.net

# Health check
curl -s -o /dev/null -w "health: %{http_code}\n" $API/health

# Public endpoints
curl -s -o /dev/null -w "shelters: %{http_code}\n" $API/evacuation-routes
curl -s -o /dev/null -w "unclaimed: %{http_code}\n" $API/flood-requests/unclaimed

# Login and get token
TOKEN=$(curl -s -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@floodguard.np","password":"12345678"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# Authenticated endpoints
curl -s -o /dev/null -w "me: %{http_code}\n" $API/auth/me -H "Authorization: Bearer $TOKEN"
curl -s -o /dev/null -w "users: %{http_code}\n" $API/users -H "Authorization: Bearer $TOKEN"

# Frontend
curl -s -o /dev/null -w "frontend: %{http_code}\n" $FE/

echo "All tests passed if all return 200"
```

### 14.3 CORS Verification

```bash
# Test preflight request
curl -s -D - -o /dev/null -X OPTIONS \
  https://d2962fm2ka76im.cloudfront.net/api/auth/login \
  -H "Origin: https://d28cob3p1pxddd.cloudfront.net" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  | grep -i access-control

# Expected output:
# access-control-allow-origin: https://d28cob3p1pxddd.cloudfront.net
# access-control-allow-credentials: true
```

### 14.4 Database Verification

```bash
cd backend

# Open Prisma Studio
npx prisma studio

# Or check table counts
node -e "
const {Pool}=require('pg');
let cs=process.env.DATABASE_URL.replace(/[?&]sslmode=require/,'');
const p=new Pool({connectionString:cs,ssl:{rejectUnauthorized:false}});
Promise.all([
  p.query('SELECT count(*) FROM users'),
  p.query('SELECT count(*) FROM flood_requests'),
  p.query('SELECT count(*) FROM evacuation_routes'),
]).then(([u,f,e])=>{
  console.log('Users:',u.rows[0].count);
  console.log('Flood Requests:',f.rows[0].count);
  console.log('Shelters:',e.rows[0].count);
  p.end();
});
"
```

### 14.5 EB Environment Status

```bash
# Both environments should show Status=Ready, Health=Green
aws elasticbeanstalk describe-environments \
  --query "Environments[?starts_with(ApplicationName,'floodguard')].{App:ApplicationName,Env:EnvironmentName,Status:Status,Health:Health,Version:VersionLabel}" \
  --output table
```


---

## 15. Demo Checklist

### Authentication & Users

- [ ] Register a new user (resident role) → receives JWT token
- [ ] Login with new user → token returned with user info
- [ ] Call `/auth/me` with Bearer token → profile returned
- [ ] Register as volunteer → `isApproved: false` in response
- [ ] Login as admin (`admin@floodguard.np` / `12345678`)
- [ ] View all users → GET `/users` returns user list
- [ ] View pending volunteers → GET `/users/pending/volunteers`
- [ ] Approve a volunteer → PATCH `/users/:id/approve`
- [ ] Change a user's role → PATCH `/users/:id` with `{"role":"admin"}`
- [ ] Delete a user → DELETE `/users/:id`

### Volunteer Request Response

- [ ] Login as volunteer (`volunteer1@gmail.com` / `12345678`)
- [ ] View SOS request queue → GET `/flood-requests/unclaimed`
- [ ] Claim a pending request → PATCH `/flood-requests/:id/claim`
- [ ] View my assigned requests → GET `/flood-requests/assigned-to-me`
- [ ] Update request status → PATCH `/flood-requests/:id` with `{"status":"in_progress"}`
- [ ] Complete request → PATCH `/flood-requests/:id` with `{"status":"completed"}`

### Volunteer Help System

- [ ] Find nearby volunteers → GET `/volunteer-help/nearby/:floodRequestId`
- [ ] Request help → POST `/volunteer-help`
- [ ] View received help requests → GET `/volunteer-help/received`
- [ ] Accept a help request → PATCH `/volunteer-help/:id/respond` with `{"status":"accepted"}`
- [ ] View help stats → GET `/volunteer-help/stats`

### Evacuation & Shelters

- [ ] List all shelters → GET `/evacuation-routes`
- [ ] Get shelter details → GET `/evacuation-routes/:id`
- [ ] Create shelter (admin) → POST `/evacuation-routes`
- [ ] Update shelter → PATCH `/evacuation-routes/:id`
- [ ] Delete shelter → DELETE `/evacuation-routes/:id`

### AWS Elastic Beanstalk

- [ ] Show EB backend environment in console → Green health status
- [ ] Show EB frontend environment in console → Green health status
- [ ] Show deployment history in EB console
- [ ] Show health check endpoint working: `curl $API/health`
- [ ] Show CloudWatch logs (or `eb logs`)
- [ ] Demonstrate deploy workflow: build → zip → deploy → verify

### AWS RDS

- [ ] Show RDS instance in AWS console → Status "Available"
- [ ] Show security groups (EB SG → RDS allowed)
- [ ] Show Prisma Studio with live data from RDS
- [ ] Show connection from local machine works

---

## 16. Troubleshooting

### 16.1 Common Issues & Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Deploy hangs 35+ min, fails | TypeScript compiling on EB instance | Build locally, ship `dist/` in zip. Remove any `Buildfile` that runs `nest build` |
| Env stuck `Updating`/Grey | Previous deploy wedged the instance | Terminate the EC2 instance manually; ASG launches fresh one |
| `Can't reach database server` from EB | RDS SG missing EB SG as source | Add inbound rule: port 5432, source = EB security group |
| Local Prisma times out | Your home IP changed | Re-add current IP to RDS security group |
| `database "floodguard" does not exist` | RDS created without `--db-name` | `CREATE DATABASE floodguard;` via psql or recreate |
| Frontend API calls fail (network error) | Wrong `NEXT_PUBLIC_API_URL` baked in | Rebuild frontend with correct URL, redeploy |
| CORS error in browser | Backend `FRONTEND_URL` missing the frontend origin | Add origin to `FRONTEND_URL`, redeploy backend |
| 502 Bad Gateway | App crashed on startup | Check `eb logs` — usually bad env var (DB URL, JWT_SECRET) |
| `unknown option '--skip-generate'` | Prisma 7 removed it | Run `prisma db push` without `--skip-generate` |
| JWT "Unauthorized" on all requests | `JWT_SECRET` mismatch between local and EB | Ensure same secret in `.env` and EB env vars |
| Volunteer can't claim request | Request already claimed (race condition) | Expected — atomic claim prevents double-claims; show ConflictException |

### 16.2 Getting EB Logs

```bash
# Method 1: EB CLI
eb logs

# Method 2: AWS CLI
aws elasticbeanstalk request-environment-info \
  --environment-name floodguard-backend --info-type tail
# Wait 30 seconds, then:
aws elasticbeanstalk retrieve-environment-info \
  --environment-name floodguard-backend --info-type tail \
  --query "EnvironmentInfo[].Message" --output text
```

### 16.3 Recovering a Wedged Environment

If the EB environment is stuck (can't deploy, can't abort):

```bash
# 1. Find the EC2 instance
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:elasticbeanstalk:environment-name,Values=floodguard-backend" \
            "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)

# 2. Terminate it (ASG will launch a fresh one)
aws ec2 terminate-instances --instance-ids $INSTANCE_ID

# 3. Wait for new instance and environment to recover (~5 min)
# 4. Deploy the correct (pre-built) version
```

### 16.4 Quick Deploy Script

Save this as `deploy-backend.sh`:

```bash
#!/bin/bash
set -e
cd backend

echo "→ Generating Prisma client..."
npx prisma generate

echo "→ Building NestJS..."
npx nest build

echo "→ Creating deploy.zip..."
rm -f deploy.zip
zip -r -q deploy.zip \
  dist prisma package.json pnpm-lock.yaml Procfile prisma.config.ts \
  tsconfig.json tsconfig.build.json .ebextensions \
  -x "prisma/seed*.ts" -x "dist/**/*.map"

echo "→ Uploading to S3..."
BUCKET=$(aws elasticbeanstalk create-storage-location --query S3Bucket --output text)
KEY="floodguard-team-9/backend-$(date +%s).zip"
aws s3 cp deploy.zip "s3://$BUCKET/$KEY"

echo "→ Creating application version..."
VERSION="prebuilt-$(date +%y%m%d_%H%M%S)"
aws elasticbeanstalk create-application-version \
  --application-name floodguard-team-9 \
  --version-label "$VERSION" \
  --source-bundle S3Bucket="$BUCKET",S3Key="$KEY"

echo "→ Deploying to EB..."
aws elasticbeanstalk update-environment \
  --environment-name floodguard-backend \
  --version-label "$VERSION"

echo "✅ Deploy initiated: $VERSION"
echo "   Monitor: aws elasticbeanstalk describe-environments --environment-name floodguard-backend --query 'Environments[0].[Status,Health]' --output text"
```

### 16.5 Reference URLs

| Resource | URL |
|----------|-----|
| Backend API | `https://d2962fm2ka76im.cloudfront.net/api` |
| Frontend | `https://d28cob3p1pxddd.cloudfront.net` |
| Backend EB | `floodguard-backend.eba-p2pusqhe.us-east-1.elasticbeanstalk.com` |
| Frontend EB | `floodguard-team-9-frontend.eba-is2mssus.us-east-1.elasticbeanstalk.com` |
| RDS Endpoint | `floodguard-db.c4t6ymcw2eqt.us-east-1.rds.amazonaws.com:5432` |
| S3 Bucket | `floodguard-uploads` |
| Swagger Docs | `https://d2962fm2ka76im.cloudfront.net/api/docs` |
| Health Check | `https://d2962fm2ka76im.cloudfront.net/api/health` |

---

## Summary: M4 Contribution Breakdown

| Component | Files | LOC (approx) |
|-----------|-------|-------------|
| Auth module (auth/) | 7 files | ~350 |
| Users module (users/) | 4 files | ~250 |
| Evacuation module (evacuation/) | 4 files | ~200 |
| Flood Requests volunteer endpoints | Shared module | ~200 |
| Volunteer Help module (volunteer-help/) | 4 files | ~350 |
| Prisma schema (M4-owned models) | schema.prisma | ~100 |
| EB deployment config | 4 files | ~50 |
| Frontend auth/volunteer pages | Multiple | ~700 |
| **Total** | | **~2,200** |

### AWS Services Used

| Service | M4's Role |
|---------|-----------|
| **Elastic Beanstalk** | **Lead** — Deploy both backend + frontend environments |
| RDS | Consumer — auth/users data stored in PostgreSQL |
| S3 | Consumer — shelter photos via presigned URLs |
| IAM | Consumer — uses instance profile created by M3 |
| CloudFront | Consumer — HTTPS termination for both apps |

---

*End of Member 4 Implementation Guide*

# FloodGuard — AWS RDS PostgreSQL Setup Guide

> Step-by-step guide to create an Amazon RDS PostgreSQL instance and connect it to the FloodGuard NestJS backend using Prisma ORM.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Create the RDS Instance (Console)](#2-create-the-rds-instance-console)
3. [Create the RDS Instance (CLI Alternative)](#3-create-the-rds-instance-cli-alternative)
4. [Configure Security Group](#4-configure-security-group)
5. [Get Your Connection Endpoint](#5-get-your-connection-endpoint)
6. [Build the DATABASE_URL](#6-build-the-database_url)
7. [Connect Prisma to RDS](#7-connect-prisma-to-rds)
8. [Run Migrations](#8-run-migrations)
9. [Seed Initial Data](#9-seed-initial-data)
10. [Verify the Connection](#10-verify-the-connection)
11. [Connect From Elastic Beanstalk (Production)](#11-connect-from-elastic-beanstalk-production)
12. [Security Best Practices](#12-security-best-practices)
13. [Monitoring & Maintenance](#13-monitoring--maintenance)
14. [Cost Management](#14-cost-management)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Prerequisites

Before starting, ensure you have:

- An **AWS Account** (Free Tier eligible accounts get 12 months of `db.t3.micro`)
- **AWS CLI** installed and configured (`aws configure` with your access key)
- **Node.js 18+** and **pnpm** installed locally
- The FloodGuard backend cloned and dependencies installed:
  ```bash
  cd backend
  pnpm install
  ```

### AWS Region

This guide uses **ap-southeast-1 (Singapore)**. Use the same region for all services (RDS, EC2, S3) to minimize latency and avoid cross-region data transfer charges.

---

## 2. Create the RDS Instance (Console)

### Step 2.1 — Open RDS Dashboard

1. Log in to the [AWS Management Console](https://console.aws.amazon.com)
2. In the search bar at the top, type **"RDS"** and click **Amazon RDS**
3. Make sure your region (top-right dropdown) is set to **Asia Pacific (Singapore) ap-southeast-1**

### Step 2.2 — Launch the Create Wizard

1. In the left sidebar, click **Databases**
2. Click the orange **"Create database"** button

### Step 2.3 — Engine & Method

| Setting | Value |
|---------|-------|
| Engine type | **PostgreSQL** (top-right option with elephant logo) |
| Database creation method | **Full configuration** (left option) |
| Engine version | **PostgreSQL 17.x** (latest available) |

> Do NOT select Aurora (PostgreSQL Compatible) — it's serverless and expensive. Pick the plain **PostgreSQL** engine.
> "Full configuration" gives you control over instance size, Free Tier template, public access, and security groups. "Easy create" hides these options.

### Step 2.4 — Templates

Select: **Free tier** (rightmost option)

This automatically constrains instance class to `db.t3.micro` and disables Multi-AZ (both fine for development/demo).

### Step 2.5 — Settings

| Setting | Value |
|---------|-------|
| DB instance identifier | `floodguard-db` |
| Master username | `floodguard` |
| Credentials management | **Self managed** |
| Master password | A strong password (e.g., `FloodG#2026!Rds`) |
| Confirm password | Re-enter the same password |

> **Save this password somewhere safe** (password manager, `.env.local` file NOT committed to git). You cannot retrieve it later — only reset it.

### Step 2.6 — Instance Configuration

| Setting | Value |
|---------|-------|
| DB instance class | **db.t3.micro** (2 vCPU, 1 GB RAM) |

This is Free Tier eligible for 750 hours/month for 12 months.

### Step 2.7 — Storage

| Setting | Value |
|---------|-------|
| Storage type | **General Purpose SSD (gp3)** |
| Allocated storage | **20 GB** |
| Storage autoscaling | **Uncheck** "Enable storage autoscaling" |

> Disabling autoscaling prevents surprise charges during development.

### Step 2.8 — Connectivity

| Setting | Value |
|---------|-------|
| Compute resource | **Don't connect to an EC2 compute resource** |
| Network type | **IPv4** |
| VPC | **Default VPC** |
| DB subnet group | **default** |
| Public access | **Yes** |
| VPC security group | **Create new** |
| New VPC security group name | `floodguard-db-sg` |
| Availability Zone | **No preference** |
| Database port | `5432` |

> **Public access = Yes** is needed temporarily so you can connect from your local machine to run Prisma migrations. We'll lock it down with security group rules in Step 4.

### Step 2.9 — Database Authentication

Select: **Password authentication**

### Step 2.10 — Additional Configuration

Expand the "Additional configuration" section:

| Setting | Value |
|---------|-------|
| Initial database name | `floodguard` |
| DB parameter group | **default.postgres16** |
| Enable automated backups | **Uncheck** (saves cost for dev) |
| Backup retention period | 0 days |
| Enable Performance Insights | **Uncheck** |
| Enable Enhanced monitoring | **Uncheck** |
| Enable deletion protection | **Uncheck** (so you can delete after demo) |
| Log exports | Leave all unchecked |

> **IMPORTANT:** You MUST type `floodguard` in the "Initial database name" field. If left blank, AWS creates the instance without a database, and your connection URL won't work.

### Step 2.11 — Create

1. Review the **Estimated monthly costs** panel (should show "Free tier eligible")
2. Click **"Create database"**
3. Wait **5-10 minutes** for status to change from "Creating" → "Available"

---

## 3. Create the RDS Instance (CLI Alternative)

If you prefer the command line:

```bash
# Create the instance
aws rds create-db-instance \
  --db-instance-identifier floodguard-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 17 \
  --master-username floodguard \
  --master-user-password "FloodG#2026!Rds" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --db-name floodguard \
  --publicly-accessible \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --region ap-southeast-1 \
  --no-multi-az \
  --backup-retention-period 0 \
  --no-deletion-protection

# Wait for it to become available (~5-10 min)
aws rds wait db-instance-available --db-instance-identifier floodguard-db
echo "RDS instance is ready!"
```

Replace `sg-xxxxxxxxx` with your default VPC security group ID (find it with `aws ec2 describe-security-groups --query 'SecurityGroups[?GroupName==`default`].GroupId' --output text`).

---

## 4. Configure Security Group

The security group controls who can connect to your database.

### Step 4.1 — Find the Security Group

1. Go to **RDS** → **Databases** → click `floodguard-db`
2. Under the **Connectivity & security** tab, find **VPC security groups**
3. Click the security group link (e.g., `sg-0abc123def456`) — this opens **EC2 → Security Groups**

### Step 4.2 — Add Your Local IP

1. Click the **Inbound rules** tab
2. Click **Edit inbound rules**
3. Click **Add rule**:

| Type | Port Range | Source | Description |
|------|-----------|--------|-------------|
| PostgreSQL | 5432 | **My IP** | Local development |

4. Click **Save rules**

> "My IP" auto-detects your current public IP. If your IP changes (e.g., different WiFi), you'll need to update this rule.

### Step 4.3 — CLI Alternative

```bash
# Get your public IP
MY_IP=$(curl -s https://checkip.amazonaws.com)

# Get the RDS security group ID
SG_ID=$(aws rds describe-db-instances --db-instance-identifier floodguard-db \
  --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' --output text)

# Allow your IP on port 5432
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 5432 \
  --cidr "$MY_IP/32" \
  --tag-specifications "ResourceType=security-group-rule,Tags=[{Key=Name,Value=local-dev}]"

echo "Allowed $MY_IP to access RDS on port 5432"
```

---

## 5. Get Your Connection Endpoint

### Via Console:

1. Go to **RDS** → **Databases** → click `floodguard-db`
2. Under **Connectivity & security** tab:
   - **Endpoint:** `floodguard-db.c9abcdefghij.ap-southeast-1.rds.amazonaws.com`
   - **Port:** `5432`

### Via CLI:

```bash
aws rds describe-db-instances --db-instance-identifier floodguard-db \
  --query 'DBInstances[0].Endpoint.Address' --output text
```

Output example:
```
floodguard-db.c9abcdefghij.ap-southeast-1.rds.amazonaws.com
```

---

## 6. Build the DATABASE_URL

Prisma uses a connection string in this format:

```
postgresql://USERNAME:PASSWORD@ENDPOINT:PORT/DATABASE?schema=public
```

For FloodGuard:

```
postgresql://floodguard:FloodG#2026!Rds@floodguard-db.c9abcdefghij.ap-southeast-1.rds.amazonaws.com:5432/floodguard?schema=public
```

### Breaking it down:

| Component | Value | Source |
|-----------|-------|--------|
| Protocol | `postgresql://` | Always this for PostgreSQL |
| Username | `floodguard` | Set in Step 2.5 (Master username) |
| Password | `FloodG#2026!Rds` | Set in Step 2.5 (Master password) |
| Endpoint | `floodguard-db.c9ab...rds.amazonaws.com` | From Step 5 |
| Port | `5432` | Default PostgreSQL port |
| Database | `floodguard` | Set in Step 2.10 (Initial database name) |
| Schema | `public` | Prisma default schema |

> **Special characters in password:** If your password contains `@`, `/`, or `%`, you must URL-encode them (`@` → `%40`, `/` → `%2F`, `%` → `%25`).

---

## 7. Connect Prisma to RDS

### Step 7.1 — Update the .env File

Edit `backend/.env`:

```env
# Database (PostgreSQL) — AWS RDS
DATABASE_URL="postgresql://floodguard:FloodG#2026!Rds@floodguard-db.c9abcdefghij.ap-southeast-1.rds.amazonaws.com:5432/floodguard?schema=public"
```

> **Never commit this file to git.** The `.gitignore` already excludes `.env`.

### Step 7.2 — Verify Prisma Can Connect

```bash
cd backend

# Quick connection test
pnpm prisma db pull

# If successful, you'll see:
# "Prisma schema loaded from prisma/schema.prisma"
# "Datasource "db": PostgreSQL database "floodguard"..."
```

If this fails, check:
- The RDS instance status is "Available"
- Your IP is in the security group inbound rules
- The password is correct and properly URL-encoded
- The endpoint hostname is copied exactly

---

## 8. Run Migrations

### Step 8.1 — Deploy Existing Migrations

```bash
cd backend

# Apply all migrations to the RDS database
pnpm prisma migrate deploy
```

Expected output:
```
1 migration found in prisma/migrations

Applying migration `20240101000000_init`

The following migration have been applied:

migrations/
  └─ 20240101000000_init/
    └─ migration.sql

All migrations have been successfully applied.
```

### Step 8.2 — Generate the Prisma Client

```bash
pnpm prisma generate
```

This regenerates the Prisma Client to match your schema — needed after any schema change.

### What if migrations fail?

If you get an error like "database already contains objects":

```bash
# Reset the database (WARNING: deletes all data)
pnpm prisma migrate reset

# Or force-mark migrations as applied (if tables already exist)
pnpm prisma migrate resolve --applied 20240101000000_init
```

---

## 9. Seed Initial Data

The FloodGuard backend includes a seed script that creates demo data (regions, sensors, users, sample alerts).

```bash
cd backend

# Run the seed script
pnpm prisma db seed
```

This populates the database with:
- Default regions (with coordinates)
- Sensor readings (water_level, rainfall)
- Sample admin and resident users
- Demo alerts and reports

### Verify seeded data:

```bash
pnpm prisma studio
```

This opens a visual database browser at `http://localhost:5555` showing all tables and records in your RDS instance.

---

## 10. Verify the Connection

### Test 1 — Prisma Studio

```bash
cd backend
pnpm prisma studio
```

Opens `http://localhost:5555`. You should see all tables: users, regions, alerts, reports, sensors, evacuation_routes, notifications, flood_requests.

### Test 2 — Start the Backend

```bash
cd backend
pnpm start:dev
```

Expected output:
```
[Nest] LOG [NestApplication] Nest application successfully started
[Nest] LOG Application is running on: http://localhost:5001
```

If Prisma can't connect to RDS, you'll see a connection error immediately on startup.

### Test 3 — Hit the Health Endpoint

```bash
curl http://localhost:5001/api/health
# Expected: {"status":"ok","database":"connected"}
```

### Test 4 — Direct psql Connection (Optional)

If you have `psql` installed:

```bash
psql "postgresql://floodguard:FloodG#2026!Rds@floodguard-db.c9abcdefghij.ap-southeast-1.rds.amazonaws.com:5432/floodguard"
```

```sql
-- List all tables
\dt

-- Check regions
SELECT id, name, "riskLevel" FROM regions;

-- Check sensors
SELECT id, type, "currentValue", threshold FROM sensors;
```

---

## 11. Connect From Elastic Beanstalk (Production)

When deploying to Elastic Beanstalk, the backend runs on EC2 instances that need access to RDS.

### Step 11.1 — Set Environment Variable in EB

```bash
# Set DATABASE_URL as an environment variable in Elastic Beanstalk
eb setenv DATABASE_URL="postgresql://floodguard:FloodG#2026!Rds@floodguard-db.c9abcdefghij.ap-southeast-1.rds.amazonaws.com:5432/floodguard?schema=public"
```

Or via Console:
1. Go to **Elastic Beanstalk** → Your environment → **Configuration**
2. Under **Software** → click **Edit**
3. Scroll to **Environment properties**
4. Add: `DATABASE_URL` = your full connection string
5. Click **Apply**

### Step 11.2 — Allow EB Security Group to Access RDS

1. Go to **EC2** → **Security Groups**
2. Find the Elastic Beanstalk instance security group (named like `awseb-e-xxxx-stack-AWSEBSecurityGroup-xxxxx`)
3. Copy its **Security Group ID** (e.g., `sg-0def456abc789`)
4. Go to the RDS security group (`floodguard-db-sg`) → **Inbound rules** → **Edit**
5. Add rule:

| Type | Port | Source | Description |
|------|------|--------|-------------|
| PostgreSQL | 5432 | `sg-0def456abc789` | Elastic Beanstalk |

6. **Save rules**

### Step 11.3 — Disable Public Access (Production)

Once EB can connect via the security group, disable public access:

1. Go to **RDS** → **Databases** → `floodguard-db` → **Modify**
2. Under Connectivity, set **Public access** to **No**
3. Click **Continue** → **Apply immediately**

> After this, only resources within the same VPC (your EB instances) can reach the database. You'll need to re-enable public access or use an SSH tunnel to run migrations from your laptop.

### Step 11.4 — Run Migrations in Production

Option A — Run before deploying (while public access is still enabled):
```bash
cd backend
DATABASE_URL="postgresql://..." pnpm prisma migrate deploy
```

Option B — SSH into the EB instance:
```bash
eb ssh
cd /var/app/current
npx prisma migrate deploy
```

---

## 12. Security Best Practices

### Do

- Use a strong password (16+ characters, mixed case, numbers, symbols)
- Restrict security group inbound rules to specific IPs/security groups only
- Disable public access once EB is connected
- Rotate passwords periodically
- Use AWS Secrets Manager for production credentials (optional for this project)

### Don't

- Never commit `DATABASE_URL` or passwords to git
- Never use `0.0.0.0/0` (open to the world) in security group rules
- Never use the master password as a JWT secret or elsewhere
- Never share RDS credentials in Slack/Discord/email

### For This Project (Assessment Demo)

Since this is a university project, these are acceptable shortcuts:
- Public access enabled during development
- Password stored in `.env` file (not committed)
- No encryption at rest (Free Tier doesn't include it)
- No Multi-AZ (single availability zone is fine for demos)

---

## 13. Monitoring & Maintenance

### CloudWatch Metrics (Free)

RDS automatically sends metrics to CloudWatch:
- **CPUUtilization** — should stay under 80%
- **FreeableMemory** — alert if below 100MB
- **DatabaseConnections** — monitor for connection leaks
- **FreeStorageSpace** — alert if below 2GB

To view: **RDS** → `floodguard-db` → **Monitoring** tab

### Connection Pooling

For production with multiple EB instances, add connection pooling to the DATABASE_URL:

```env
DATABASE_URL="postgresql://floodguard:PASSWORD@ENDPOINT:5432/floodguard?schema=public&connection_limit=10&pool_timeout=30"
```

Prisma defaults to `num_cpus * 2 + 1` connections. The `db.t3.micro` supports up to ~80 connections total.

---

## 14. Cost Management

### Free Tier (First 12 Months)

| Resource | Free Allowance |
|----------|---------------|
| db.t3.micro | 750 hours/month |
| Storage | 20 GB gp2/gp3 |
| Backups | 20 GB (if enabled) |

**You won't be charged** if:
- You use `db.t3.micro`
- Storage is ≤ 20 GB
- You're within your first 12 months

### After Free Tier / If Limits Exceeded

| Resource | Cost (ap-southeast-1) |
|----------|----------------------|
| db.t3.micro | ~$0.026/hour (~$19/month) |
| Storage (gp3) | ~$0.133/GB/month |
| Data transfer out | $0.12/GB after first 1 GB |

### Teardown After Demo

To avoid any charges after your assessment:

```bash
# Delete the RDS instance (irreversible!)
aws rds delete-db-instance \
  --db-instance-identifier floodguard-db \
  --skip-final-snapshot \
  --delete-automated-backups

# Verify it's gone
aws rds describe-db-instances --db-instance-identifier floodguard-db 2>&1
# Should return: "DBInstance floodguard-db not found"
```

Or via Console: **RDS** → **Databases** → `floodguard-db` → **Actions** → **Delete** → Uncheck "Create final snapshot" → Confirm.

---

## 15. Troubleshooting

### "Connection timed out"

**Cause:** Security group doesn't allow your IP.

**Fix:**
```bash
# Check your current IP
curl -s https://checkip.amazonaws.com

# Verify it's in the security group
aws ec2 describe-security-groups --group-ids $SG_ID \
  --query 'SecurityGroups[0].IpPermissions[?ToPort==`5432`].IpRanges'
```

If your IP changed (new WiFi, VPN), update the inbound rule.

### "Password authentication failed"

**Cause:** Wrong password or username.

**Fix:**
- Double-check the password in your `.env` file
- Ensure special characters are URL-encoded
- If you forgot the password, reset it:
  ```bash
  aws rds modify-db-instance \
    --db-instance-identifier floodguard-db \
    --master-user-password "NewP@ssword123!"
  ```

### "Database 'floodguard' does not exist"

**Cause:** You left the "Initial database name" field blank during creation.

**Fix:** Connect as the master user and create it:
```bash
psql "postgresql://floodguard:PASSWORD@ENDPOINT:5432/postgres"
```
```sql
CREATE DATABASE floodguard;
\q
```

### "Too many connections"

**Cause:** Prisma opens a connection pool per process. Multiple restarts without cleanup can exhaust connections.

**Fix:**
```bash
# Restart the NestJS server (kills old connections)
# Or add connection_limit to DATABASE_URL:
DATABASE_URL="...?schema=public&connection_limit=5"
```

### "Prisma migrate deploy" hangs

**Cause:** Usually a network/firewall issue.

**Fix:**
1. Verify you can reach the endpoint: `nc -zv ENDPOINT 5432`
2. Check RDS instance status is "Available" (not "Modifying" or "Backing-up")
3. Try with a direct `psql` connection first

### "SSL connection required"

If RDS enforces SSL (not default for Free Tier):

```env
DATABASE_URL="postgresql://...?schema=public&sslmode=require"
```

---

## Quick Reference Card

```bash
# === Local Development ===

# Switch to RDS
export DATABASE_URL="postgresql://floodguard:PASSWORD@floodguard-db.xxxx.ap-southeast-1.rds.amazonaws.com:5432/floodguard?schema=public"

# Apply migrations
cd backend && pnpm prisma migrate deploy

# Seed data
pnpm prisma db seed

# Visual browser
pnpm prisma studio

# Start backend (reads DATABASE_URL from .env)
pnpm start:dev


# === Useful AWS CLI Commands ===

# Check instance status
aws rds describe-db-instances --db-instance-identifier floodguard-db \
  --query 'DBInstances[0].DBInstanceStatus' --output text

# Get endpoint
aws rds describe-db-instances --db-instance-identifier floodguard-db \
  --query 'DBInstances[0].Endpoint.Address' --output text

# Stop instance (saves cost, keeps data)
aws rds stop-db-instance --db-instance-identifier floodguard-db

# Start instance
aws rds start-db-instance --db-instance-identifier floodguard-db

# Delete (permanent!)
aws rds delete-db-instance --db-instance-identifier floodguard-db \
  --skip-final-snapshot --delete-automated-backups
```

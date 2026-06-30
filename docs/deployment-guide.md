# FloodGuard AWS Deployment Guide (Detailed)

End-to-end, **GUI + CLI** guide for deploying FloodGuard on AWS — from the VPC and subnets all the way to RDS, Elastic Beanstalk, S3 and CloudFront. Every section has **Console steps**, **CLI steps**, and **Things to consider**.

> This guide reflects the **actual working deployment** (us-east-1, account `679777944150`). The single most important lesson is in [Deployment philosophy](#deployment-philosophy): **build locally and ship a pre-built artifact — never compile on the EB instance.** The earlier approach (compiling on the box) reliably timed out and wedged the environment.

---

## Deployment philosophy (read this first)

| ❌ Don't | ✅ Do |
|---|---|
| Run `nest build` / `next build` on the EB instance (postinstall/Buildfile) | Build locally, zip the compiled output, ship that |
| Put dev tooling work on a `t3.small` | Let the instance only `npm install --production` + start |
| Rely on a predeploy hook to migrate the DB | Run `prisma db push` / seed from your laptop (RDS is public) |
| `git`-based `eb deploy` of source | `create-application-version` from an explicit artifact zip |

**Why:** TypeScript compilation on a 2 GB `t3.small` pegs CPU/RAM, the EB command hangs for ~35 min, the deploy aborts, and the environment can get **wedged** (control plane stops accepting `abort`/`update`). Recovery required terminating the EC2 instance by hand. Pre-building locally makes deploys take ~2–3 min and removes the entire class of failure.

---

## Architecture Overview

```
                    ┌──────────────────────────────────────────────┐
                    │              AWS Cloud (us-east-1)            │
  Users ──HTTPS───► │  CloudFront (CDN, TLS termination)           │
                    │    ├── Frontend: d28cob3p1pxddd.cloudfront.net│
                    │    │            d4p5fmacpt873.cloudfront.net  │
                    │    └── Backend:  d2962fm2ka76im.cloudfront.net│
                    │         │                │                    │
                    │         ▼ http           ▼ http               │
                    │  ┌─────────────┐  ┌─────────────┐            │
                    │  │  Frontend   │  │  Backend    │            │
                    │  │  EB (Next)  │  │  EB (Nest)  │            │
                    │  │  t3.micro   │  │  t3.small   │            │
                    │  └─────────────┘  └──────┬──────┘            │
                    │                          │ 5432 (SSL)         │
                    │         ┌────────────────┼────────────┐      │
                    │         │     VPC 10.0.0.0/16          │      │
                    │         │  public subnets in 2 AZs     │      │
                    │         │         ┌──────▼──────┐      │      │
                    │         │         │ RDS Postgres │      │      │
                    │         │         │ (floodguard) │      │      │
                    │         │         └─────────────┘      │      │
                    │         └─────────────────────────────┘      │
                    │  ┌─────────────┐                             │
                    │  │  S3 Bucket  │ (uploads, presigned URLs)   │
                    │  └─────────────┘                             │
                    └──────────────────────────────────────────────┘
```

**Request flow:** Browser → CloudFront (HTTPS) → EB load balancer/instance (HTTP) → app. The backend talks to RDS over the VPC on 5432 with SSL. The browser never talks to EB or RDS directly.

---

## Table of Contents

0. [Prerequisites & Tooling](#0-prerequisites--tooling)
1. [VPC](#1-vpc)
2. [Internet Gateway](#2-internet-gateway)
3. [Subnets](#3-subnets)
4. [Route Tables](#4-route-tables)
5. [Security Groups](#5-security-groups)
6. [IAM Roles & Instance Profiles](#6-iam-roles--instance-profiles)
7. [RDS PostgreSQL](#7-rds-postgresql)
8. [S3 Bucket](#8-s3-bucket)
9. [Database Schema & Seed (from local)](#9-database-schema--seed-from-local)
10. [Backend — Build & Deploy](#10-backend--build--deploy)
11. [Frontend — Build & Deploy](#11-frontend--build--deploy)
12. [CloudFront](#12-cloudfront)
13. [Wiring It Together (CORS + API URL)](#13-wiring-it-together-cors--api-url)
14. [Verification / Smoke Tests](#14-verification--smoke-tests)
15. [Troubleshooting (real issues hit)](#15-troubleshooting-real-issues-hit)
16. [Day-2 Operations](#16-day-2-operations-redeploy-rollback-logs-teardown)
17. [Cost & Security Considerations](#17-cost--security-considerations)
18. [Reference: Names, IDs, URLs](#18-reference-names-ids-urls)
19. [Deployment Checklist](#19-deployment-checklist)

---

## 0. Prerequisites & Tooling

### Install

```bash
# AWS CLI v2
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"   # macOS
sudo installer -pkg AWSCLIV2.pkg -target /
aws --version            # aws-cli/2.x

# EB CLI (optional — we mostly use raw aws + S3 artifact)
pip install awsebcli
eb --version

# Node toolchain for local builds
node --version           # v22+ recommended
```

### Configure credentials

```bash
aws configure            # set Access Key, Secret, region=us-east-1, output=json
aws sts get-caller-identity   # confirm account + identity
```

### Things to consider
- **Region discipline.** Everything here is `us-east-1`. CloudFront is global, but ACM certs for CloudFront *must* be in `us-east-1` anyway — convenient.
- **IAM permissions.** The deploying identity needs EC2 (VPC), RDS, S3, Elastic Beanstalk, CloudFront, and IAM (to create the EB roles). For a class/project, an admin user is fine; for production, scope it down.
- **Set a default region** so you don't pass `--region` everywhere: `export AWS_DEFAULT_REGION=us-east-1`.
- Keep a scratch file of resource IDs as you go (VPC id, subnet ids, SG ids) — almost every later command needs them.

---

## 1. VPC

The VPC is the private network that contains the EB instances and RDS.

### Console
1. **VPC → Your VPCs → Create VPC**.
2. Choose **VPC only** (we'll create the pieces explicitly so you understand each one; "VPC and more" auto-builds them).
3. Name `floodguard-vpc`, IPv4 CIDR `10.0.0.0/16`, no IPv6, tenancy **Default**.
4. Create. Then **Actions → Edit VPC settings → enable DNS hostnames** and **DNS resolution**.

### CLI
```bash
VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=floodguard-vpc}]' \
  --query 'Vpc.VpcId' --output text)
echo "VPC_ID=$VPC_ID"

# RDS needs DNS hostnames/resolution ON to hand out a resolvable endpoint
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support
```

### Things to consider
- **CIDR sizing.** `/16` gives 65k addresses — plenty. Don't pick something that overlaps a network you might VPC-peer with later.
- **DNS hostnames must be enabled** or RDS publicly-accessible endpoints won't resolve and EB DNS can misbehave.
- **One VPC for everything here.** Frontend EB, backend EB and RDS all live in it. CloudFront and S3 are *outside* the VPC (they're public AWS services reached over the internet/AWS backbone).

---

## 2. Internet Gateway

Gives resources in public subnets a route to the internet.

### Console
**VPC → Internet gateways → Create** → name `floodguard-igw` → **Actions → Attach to VPC** → `floodguard-vpc`.

### CLI
```bash
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=floodguard-igw}]' \
  --query 'InternetGateway.InternetGatewayId' --output text)
aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID
echo "IGW_ID=$IGW_ID"
```

### Things to consider
- An IGW is free; you pay only for data transfer.
- A subnet is only "public" once its **route table** has `0.0.0.0/0 → IGW` (Step 4). The IGW alone does nothing.

---

## 3. Subnets

We use **public subnets in two Availability Zones** (simple, works for a project). At least two AZs are required because **RDS requires a DB subnet group spanning ≥2 AZs**, even for single-AZ instances.

### Console
**VPC → Subnets → Create subnet** (run twice):
- `floodguard-public-1a` — VPC `floodguard-vpc`, AZ `us-east-1a`, CIDR `10.0.1.0/24`
- `floodguard-public-1b` — AZ `us-east-1b`, CIDR `10.0.2.0/24`

Then for each: **Actions → Edit subnet settings → Enable auto-assign public IPv4**.

### CLI
```bash
SUBNET_1A=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=floodguard-public-1a}]' \
  --query 'Subnet.SubnetId' --output text)

SUBNET_1B=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=floodguard-public-1b}]' \
  --query 'Subnet.SubnetId' --output text)

aws ec2 modify-subnet-attribute --subnet-id $SUBNET_1A --map-public-ip-on-launch
aws ec2 modify-subnet-attribute --subnet-id $SUBNET_1B --map-public-ip-on-launch
echo "SUBNET_1A=$SUBNET_1A SUBNET_1B=$SUBNET_1B"
```

### Things to consider
- **Public vs private trade-off.** Public subnets + "publicly accessible RDS" is the simplest setup and lets you run `prisma db push`/seed from your laptop. The hardening alternative is **private subnets for RDS + a NAT gateway** for the EB instances' outbound traffic — more secure, but a NAT gateway costs ~$32/mo and you then can't reach RDS directly from your laptop without a bastion/VPN.
- **Two AZs minimum** for the DB subnet group (Step 7). Don't put both subnets in the same AZ.
- **Non-overlapping CIDRs** within the VPC (`/24` blocks: `.1.0`, `.2.0`, …).

---

## 4. Route Tables

### Console
**VPC → Route tables → Create** → name `floodguard-public-rt`, VPC `floodguard-vpc`.
- **Routes → Edit → Add route**: Destination `0.0.0.0/0`, Target **Internet Gateway → floodguard-igw**.
- **Subnet associations → Edit** → associate both public subnets.

### CLI
```bash
RT_ID=$(aws ec2 create-route-table --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=floodguard-public-rt}]' \
  --query 'RouteTable.RouteTableId' --output text)

aws ec2 create-route --route-table-id $RT_ID \
  --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID

aws ec2 associate-route-table --route-table-id $RT_ID --subnet-id $SUBNET_1A
aws ec2 associate-route-table --route-table-id $RT_ID --subnet-id $SUBNET_1B
```

### Things to consider
- The VPC's **main** route table stays local-only; we attach an explicit public RT to our subnets so intent is obvious.
- If a freshly launched instance has no internet, **99% of the time the route table association is missing** or the `0.0.0.0/0` route is absent.

---

## 5. Security Groups

Design SGs **before** RDS/EB so you can reference them. Create empty SGs first, then add rules.

### Console
**EC2 → Security Groups → Create** (×2):
- `floodguard-eb-sg` — for the EB instances. Inbound: HTTP 80 from `0.0.0.0/0` (or from the EB load balancer SG if using a load-balanced env). Outbound: all.
- `floodguard-rds-sg` — for RDS. Inbound: PostgreSQL 5432 **from `floodguard-eb-sg`** and **from your office/home IP /32**. Outbound: all.

### CLI
```bash
EB_SG=$(aws ec2 create-security-group --group-name floodguard-eb-sg \
  --description "FloodGuard EB instances" --vpc-id $VPC_ID --query 'GroupId' --output text)

RDS_SG=$(aws ec2 create-security-group --group-name floodguard-rds-sg \
  --description "FloodGuard RDS" --vpc-id $VPC_ID --query 'GroupId' --output text)

# EB: allow inbound HTTP
aws ec2 authorize-security-group-ingress --group-id $EB_SG \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

# RDS: allow Postgres from the EB SG (app traffic)
aws ec2 authorize-security-group-ingress --group-id $RDS_SG \
  --protocol tcp --port 5432 --source-group $EB_SG

# RDS: allow Postgres from your current IP (local prisma push/seed)
MY_IP=$(curl -s https://checkip.amazonaws.com)
aws ec2 authorize-security-group-ingress --group-id $RDS_SG \
  --protocol tcp --port 5432 --cidr ${MY_IP}/32
echo "EB_SG=$EB_SG RDS_SG=$RDS_SG"
```

### Things to consider
- **Reference SGs, not CIDRs, for app→DB.** `--source-group $EB_SG` means any instance in the EB SG can reach RDS regardless of its IP — survives instance replacement.
- **Your home IP changes.** If local `prisma` suddenly times out, re-run the `MY_IP` rule; the old `/32` is stale. (Revoke stale ones to keep the list clean.)
- **Don't open 5432 to `0.0.0.0/0`.** Even on a "public" RDS, restrict to known IPs + the EB SG.
- EB may also create its own managed SG when you create the environment. You can either let EB manage it or pin EB to `floodguard-eb-sg` via a config option (`aws:autoscaling:launchconfiguration / SecurityGroups`).

---

## 6. IAM Roles & Instance Profiles

Elastic Beanstalk needs two IAM identities. If you've used EB in this account before, these may already exist.

| Role | Used by | Managed policies |
|---|---|---|
| `aws-elasticbeanstalk-ec2-role` (instance profile) | the EC2 instances | `AWSElasticBeanstalkWebTier`, `AWSElasticBeanstalkMulticontainerDocker`, plus **S3 access** for uploads |
| `aws-elasticbeanstalk-service-role` | the EB service | `AWSElasticBeanstalkEnhancedHealth`, `AWSElasticBeanstalkManagedUpdatesCustomerRolePolicy` |

### Console
**IAM → Roles → Create role** → trusted entity **EC2** → attach `AWSElasticBeanstalkWebTier` (+ an S3 policy for the uploads bucket) → name `aws-elasticbeanstalk-ec2-role`. Repeat for the service role with trusted entity **Elastic Beanstalk**.

### CLI (instance profile)
```bash
cat > ec2-trust.json <<'JSON'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}
JSON

aws iam create-role --role-name aws-elasticbeanstalk-ec2-role \
  --assume-role-policy-document file://ec2-trust.json
aws iam attach-role-policy --role-name aws-elasticbeanstalk-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/AWSElasticBeanstalkWebTier
aws iam create-instance-profile --instance-profile-name aws-elasticbeanstalk-ec2-role
aws iam add-role-to-instance-profile \
  --instance-profile-name aws-elasticbeanstalk-ec2-role \
  --role-name aws-elasticbeanstalk-ec2-role
```

### Things to consider
- **Least privilege for S3.** Instead of `AmazonS3FullAccess`, attach an inline policy scoped to `arn:aws:s3:::floodguard-uploads/*` (`GetObject`, `PutObject`, `DeleteObject`) so the backend can generate presigned URLs.
- **No DB credentials in IAM here** — the app reaches RDS with the `DATABASE_URL` env var. (You *could* use RDS IAM auth, but it's overkill for this project.)
- If `eb create` complains about a missing instance profile, it's this step.

---

## 7. RDS PostgreSQL

### 7a. DB subnet group (Console)
**RDS → Subnet groups → Create** → name `floodguard-db-subnet`, VPC `floodguard-vpc`, add both AZs and both public subnets.

### 7a. DB subnet group (CLI)
```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name floodguard-db-subnet \
  --db-subnet-group-description "FloodGuard DB subnets" \
  --subnet-ids $SUBNET_1A $SUBNET_1B
```

### 7b. Create the instance (Console)
**RDS → Create database**:
- Method **Standard create**, Engine **PostgreSQL** (16.x).
- Templates **Free tier** (or Dev/Test).
- Identifier `floodguard-db`; master user `floodguard_admin`; set a strong password.
- Instance `db.t3.micro`; storage **20 GB gp3**; **disable** storage autoscaling for a project.
- Connectivity: VPC `floodguard-vpc`; subnet group `floodguard-db-subnet`; **Public access = Yes**; existing SG `floodguard-rds-sg`; port `5432`.
- Additional config: **Initial database name `floodguard`**; backups 7 days; disable enhanced monitoring to save cost.

### 7b. Create the instance (CLI)
```bash
aws rds create-db-instance \
  --db-instance-identifier floodguard-db \
  --db-instance-class db.t3.micro \
  --engine postgres --engine-version 16 \
  --master-username floodguard_admin \
  --master-user-password 'FloodGuard2026SecurePass!' \
  --allocated-storage 20 --storage-type gp3 \
  --db-name floodguard \
  --vpc-security-group-ids $RDS_SG \
  --db-subnet-group-name floodguard-db-subnet \
  --publicly-accessible --no-multi-az \
  --backup-retention-period 7

aws rds wait db-instance-available --db-instance-identifier floodguard-db

RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier floodguard-db \
  --query 'DBInstances[0].Endpoint.Address' --output text)
echo "RDS_ENDPOINT=$RDS_ENDPOINT"
```

### Connection string
```
postgresql://floodguard_admin:FloodGuard2026SecurePass!@<RDS_ENDPOINT>:5432/floodguard?sslmode=require
```

### Things to consider
- **SSL.** RDS presents an AWS-signed cert. This project connects with Prisma's **`pg` driver adapter** and `ssl: { rejectUnauthorized: false }` (see `backend/prisma.config.ts`), and strips `sslmode=require` from the string before handing it to `pg`. If you switch to strict verification, bundle the RDS CA bundle and set `rejectUnauthorized: true`.
- **Initial DB name matters.** If you forget `--db-name floodguard`, no `floodguard` database exists and the app gets `database "floodguard" does not exist`. Either recreate or `CREATE DATABASE floodguard;` manually.
- **Public access is a deliberate trade-off** (lets you seed from your laptop). Lock it down with the SG; for production, prefer private subnets + bastion.
- **`db.t3.micro` is fine** for this workload; the bottleneck in this project was never the DB.
- **Password special chars.** `!` etc. are fine in the URL here, but if you ever URL-encode, `@`/`/`/`:` in a password must be percent-encoded.
- **Backups & deletion protection.** Keep 7-day backups; enable deletion protection for anything you care about (a project demo DB can skip it).

---

## 8. S3 Bucket

Used for user uploads via presigned URLs.

### Console
**S3 → Create bucket** → `floodguard-uploads`, region `us-east-1`, **Block all public access = ON** (objects are served via presigned URLs, not public ACLs).

### CLI
```bash
aws s3 mb s3://floodguard-uploads --region us-east-1
aws s3api put-public-access-block --bucket floodguard-uploads \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### Things to consider
- **CORS on the bucket** if the browser PUTs directly to a presigned URL — add an S3 CORS rule allowing your CloudFront frontend origin, `PUT`/`POST`/`GET`, and the needed headers.
- The backend reads `S3_BUCKET` and `AWS_REGION` from env and uses the instance profile's credentials (Step 6) — **no access keys in code**.
- Consider a **lifecycle rule** to expire old/temp uploads and keep storage cost near zero.

---

## 9. Database Schema & Seed (from local)

Because RDS is publicly reachable and the app uses a **pure-JS Prisma driver adapter** (no native query engine), you can manage the schema entirely from your laptop. **Do this instead of an on-instance migration hook.**

```bash
cd backend

# .env points at RDS:
# DATABASE_URL=postgresql://floodguard_admin:...@<RDS_ENDPOINT>:5432/floodguard?sslmode=require

npx prisma generate          # generate client locally
npx prisma db push           # create/sync tables  (Prisma 7: no --skip-generate flag)
pnpm seed                    # seed regions, sensors, shelters, alerts, demo users
```

Verify:
```bash
node -e "const {Pool}=require('pg');
let cs=process.env.DATABASE_URL.replace(/[?&]sslmode=require/,'');
const p=new Pool({connectionString:cs,ssl:{rejectUnauthorized:false}});
p.query('select count(*) from regions').then(r=>{console.log('regions',r.rows[0].count);p.end();});"
```

Demo logins after seeding (password `12345678`): `admin@floodguard.np`, `user@gmail.com`, `volunteer1@gmail.com`.

### Things to consider
- **`db push` vs `migrate deploy`.** `db push` is fine for a project (no migration history). For production, use real migrations (`prisma migrate deploy`).
- **Prisma 7 removed `--skip-generate`** on `db push` — passing it errors. Just run `db push`.
- **Run seed once.** `seed-direct.ts` is destructive-ish (recreates demo data). Don't run it against a DB with real data.
- Keeping migrations local means the EB deploy has **no DB dependency** and can't hang on a DB connection.

---

## 10. Backend — Build & Deploy

NestJS app. **Compile locally; ship `dist/`; EB only installs prod deps + runs `prisma generate` + starts.**

### Required files
```
backend/
├── .ebextensions/env.config        # env vars + instance type + command timeout
├── .elasticbeanstalk/config.yml     # EB CLI config (+ artifact: deploy.zip)
├── .platform/hooks/predeploy/       # (empty — DB migrated from local)
├── Procfile                         # web: node dist/src/main.js
├── package.json                     # postinstall: prisma generate  (NO nest build)
├── prisma/ , prisma.config.ts       # schema + pg-adapter config (compiled to dist/)
├── dist/                            # PRE-BUILT locally, shipped in the zip
└── tsconfig*.json
```

**Procfile**
```
web: node dist/src/main.js
```

**package.json (critical)** — postinstall must NOT build:
```json
{ "scripts": { "postinstall": "prisma generate", "build": "nest build" } }
```
> `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`, `bcryptjs` are all in **`dependencies`** and **pure JS**, so a mac-built tree *could* run on Linux — but we still let EB run `npm install` on the box for correct-arch deps, and only `prisma generate` in postinstall.

**.ebextensions/env.config**
```yaml
option_settings:
  aws:elasticbeanstalk:command:
    Timeout: "1800"
  aws:autoscaling:launchconfiguration:
    InstanceType: "t3.small"
  aws:elasticbeanstalk:application:environment:
    DATABASE_URL: "postgresql://floodguard_admin:...@<RDS_ENDPOINT>:5432/floodguard"
    FRONTEND_URL: "https://d28cob3p1pxddd.cloudfront.net,https://d4p5fmacpt873.cloudfront.net,http://localhost:3000"
    JWT_SECRET: "change-me"
    NODE_ENV: "production"
    PORT: "8080"
    AWS_REGION: "us-east-1"
    S3_BUCKET: "floodguard-uploads"
```

### Build & package locally
```bash
cd backend
npx prisma generate
npx nest build                       # produces dist/

rm -f deploy.zip
zip -r -q deploy.zip \
  dist prisma package.json Procfile prisma.config.ts \
  tsconfig.json tsconfig.build.json .ebextensions .platform \
  -x "prisma/seed*.ts" -x "dist/**/*.map"
du -sh deploy.zip                    # ~240 KB (no node_modules)
```

### Deploy via S3 + application version (recommended)
```bash
BUCKET=$(aws elasticbeanstalk create-storage-location --query S3Bucket --output text)
KEY="floodguard-team-9/backend-$(date +%s).zip"
aws s3 cp deploy.zip "s3://$BUCKET/$KEY"

VERSION="prebuilt-$(date +%y%m%d_%H%M%S)"
aws elasticbeanstalk create-application-version \
  --application-name floodguard-team-9 \
  --version-label "$VERSION" \
  --source-bundle S3Bucket="$BUCKET",S3Key="$KEY"

# First time: create the environment
aws elasticbeanstalk create-environment \
  --application-name floodguard-team-9 \
  --environment-name floodguard-backend \
  --solution-stack-name "64bit Amazon Linux 2023 v6.x running Node.js 22" \
  --option-settings file://.ebextensions/env.config \
  --version-label "$VERSION"

# Subsequent deploys: update to the new version (env must be Status=Ready)
aws elasticbeanstalk update-environment \
  --environment-name floodguard-backend --version-label "$VERSION"
```

### Deploy via EB CLI (alternative)
Point EB at the artifact in `.elasticbeanstalk/config.yml`:
```yaml
deploy:
  artifact: deploy.zip
```
then `eb deploy` ships `deploy.zip` instead of a git archive (important — `dist/` is gitignored, so a plain git-based `eb deploy` would omit it).

### Things to consider
- **`update-environment` requires `Status=Ready`.** A deploy is rejected while the env is `Updating`.
- **Health check path** is `/api/health` (global prefix `api`). The app listens on `PORT=8080`.
- **CloudFront forwards `Host`;** NestJS doesn't care, so it's fine.
- **Watch the version flip**, not just status:
  ```bash
  aws elasticbeanstalk describe-environments --environment-name floodguard-backend \
    --query 'Environments[0].[Status,Health,VersionLabel]' --output text
  ```

---

## 11. Frontend — Build & Deploy

Next.js with `output: 'standalone'`. **`NEXT_PUBLIC_*` is inlined at BUILD time**, so the API URL must be set *before* `next build`, not as an EB env var.

### Build with the correct API URL baked in
```bash
cd frontend
NEXT_PUBLIC_API_URL=https://d2962fm2ka76im.cloudfront.net/api npx next build
```

### Assemble the self-contained bundle
```bash
# standalone server needs static + public copied next to it
rm -rf .next/standalone/.next/static .next/standalone/public
cp -r .next/static  .next/standalone/.next/static
cp -r public        .next/standalone/public

rm -f deploy.zip
zip -r -q deploy.zip .next/standalone Procfile
du -sh deploy.zip                    # ~13 MB
```
**Procfile**
```
web: PORT=8080 node .next/standalone/server.js
```

### Deploy (same S3 → version → update flow)
```bash
BUCKET=$(aws elasticbeanstalk create-storage-location --query S3Bucket --output text)
KEY="floodguard-team-9-web/frontend-$(date +%s).zip"
aws s3 cp deploy.zip "s3://$BUCKET/$KEY"
VERSION="fe-$(date +%y%m%d_%H%M%S)"
aws elasticbeanstalk create-application-version \
  --application-name floodguard-team-9-web --version-label "$VERSION" \
  --source-bundle S3Bucket="$BUCKET",S3Key="$KEY"
aws elasticbeanstalk update-environment \
  --environment-name floodguard-team-9-frontend --version-label "$VERSION"
```

### Things to consider
- **Changing the API URL requires a rebuild**, because it's compiled into the JS. (This is exactly the bug we fixed — the old build had a non-existent CloudFront domain baked in.) Verify after deploy:
  ```bash
  CHUNK=$(grep -rl "d2962fm2ka76im" .next/static/chunks/*.js | head -1 | sed 's|.*/static/|/_next/static/|')
  curl -s "https://d28cob3p1pxddd.cloudfront.net$CHUNK" | grep -o 'd2962fm2ka76im' | head -1
  ```
- **`t3.micro` is enough** for the frontend — it only runs `node server.js`.
- The standalone bundle includes its own minimal `node_modules`; no `npm install` of the full Next tree on the instance.

---

## 12. CloudFront

Two distributions: one for the frontend, one for the backend API. CloudFront gives you **HTTPS** in front of the HTTP-only EB origins (browsers block HTTP calls from an HTTPS page — *mixed content* — so the API needs HTTPS).

### Console (backend API distribution)
**CloudFront → Create distribution**:
- Origin domain: `floodguard-backend.eba-p2pusqhe.us-east-1.elasticbeanstalk.com`; protocol **HTTP only**.
- Viewer protocol policy: **Redirect HTTP to HTTPS**.
- Allowed methods: **GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE**.
- Cache policy: **CachingDisabled**; Origin request policy: **AllViewer** (or forward `Origin, Authorization, Accept, Content-Type, Host` + all query strings + cookies).
- Price class: **Use only North America & Europe** (PriceClass_100).

Repeat for the **frontend** with origin `floodguard-team-9-frontend.eba-is2mssus...` (caching can stay disabled for dynamic Next pages, or use a Next-aware cache policy).

### CLI (backend API)
```bash
aws cloudfront create-distribution --distribution-config '{
  "CallerReference": "floodguard-backend-'"$(date +%s)"'",
  "Comment": "FloodGuard Backend API",
  "Enabled": true, "PriceClass": "PriceClass_100",
  "Origins": {"Quantity":1,"Items":[{
    "Id":"floodguard-backend-eb",
    "DomainName":"floodguard-backend.eba-p2pusqhe.us-east-1.elasticbeanstalk.com",
    "CustomOriginConfig":{"HTTPPort":80,"HTTPSPort":443,"OriginProtocolPolicy":"http-only"}
  }]},
  "DefaultCacheBehavior": {
    "TargetOriginId":"floodguard-backend-eb",
    "ViewerProtocolPolicy":"redirect-to-https",
    "AllowedMethods":{"Quantity":7,"Items":["GET","HEAD","OPTIONS","PUT","POST","PATCH","DELETE"],
      "CachedMethods":{"Quantity":2,"Items":["GET","HEAD"]}},
    "ForwardedValues":{"QueryString":true,"Cookies":{"Forward":"all"},
      "Headers":{"Quantity":5,"Items":["Origin","Authorization","Accept","Host","Content-Type"]}},
    "MinTTL":0,"DefaultTTL":0,"MaxTTL":0,"Compress":true
  }
}'
```

### Things to consider
- **Never cache the API** (`MinTTL/DefaultTTL/MaxTTL = 0`, CachingDisabled). Otherwise POST responses or auth'd GETs leak across users.
- **Forward `Origin` + `Authorization`** or CORS preflight and bearer auth break at the edge.
- **`OPTIONS` must be allowed** for CORS preflight to reach NestJS.
- **Distribution deploy takes 5–15 min.** `Status: Deployed` ≠ instant; give it time.
- **Invalidate after a frontend redeploy** if you cache static assets: `aws cloudfront create-invalidation --distribution-id <id> --paths "/*"`. (With caching disabled you don't need this.)
- The current **`ForwardedValues` is the legacy style**; the modern equivalent is cache/origin-request **policies**. Either works; AllViewer origin-request policy is the easy button.

---

## 13. Wiring It Together (CORS + API URL)

Two independent links must both be correct:

1. **Frontend → Backend URL** (build-time): `NEXT_PUBLIC_API_URL=https://d2962fm2ka76im.cloudfront.net/api` baked into the Next build (Step 11).
2. **Backend → CORS allow-list** (runtime env): backend `FRONTEND_URL` must contain **every** frontend origin (both CloudFront domains + localhost). `main.ts` splits it on commas and sets `Access-Control-Allow-Origin` with `credentials: true`.

Confirm the preflight:
```bash
curl -s -D - -o /dev/null -X OPTIONS https://d2962fm2ka76im.cloudfront.net/api/auth/login \
  -H "Origin: https://d28cob3p1pxddd.cloudfront.net" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" | grep -i access-control
# expect: access-control-allow-origin: https://d28cob3p1pxddd.cloudfront.net
#         access-control-allow-credentials: true
```

### Things to consider
- **The #1 wiring bug** here was a frontend built against a CloudFront domain that didn't exist. Always verify the **deployed** JS, not just `.env`.
- If you add a third frontend origin later, you must update **both** the build (rebuild frontend) only if its own URL changes, **and** the backend `FRONTEND_URL` (then redeploy/restart backend so the new env var loads).
- With `credentials: true` you cannot use `Access-Control-Allow-Origin: *` — the exact origin must be echoed, which `main.ts` does.

---

## 14. Verification / Smoke Tests

```bash
API=https://d2962fm2ka76im.cloudfront.net/api
FE=https://d28cob3p1pxddd.cloudfront.net

curl -s -o /dev/null -w "health: %{http_code}\n"        $API/health
curl -s -o /dev/null -w "stats:  %{http_code}\n"        $API/public/stats
curl -s -o /dev/null -w "front:  %{http_code}\n"        $FE/

TOKEN=$(curl -s -X POST $API/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@floodguard.np","password":"12345678"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
curl -s -o /dev/null -w "authed: %{http_code}\n" $API/users -H "Authorization: Bearer $TOKEN"
```
All should be `200` (frontend may be `200`/`304`). Final env state:
```bash
aws elasticbeanstalk describe-environments \
  --query "Environments[?ApplicationName=='floodguard-team-9' || ApplicationName=='floodguard-team-9-web'].{Name:EnvironmentName,Status:Status,Health:Health,Version:VersionLabel}" \
  --output table
```

---

## 15. Troubleshooting (real issues hit)

| Symptom | Cause | Fix |
|---|---|---|
| **Deploy hangs ~35 min then "Failed / aborting"; "instances not sending data"** | `nest build` running on the `t3.small` (postinstall/Buildfile) — OOM/CPU peg | **Build locally, ship `dist/`**; postinstall = `prisma generate` only; delete `Buildfile` |
| **Env stuck `Updating`/`Grey` for 30+ min; `abort-environment-update` and `update-environment` both rejected** | Control plane wedged behind a dead on-instance command | `aws ec2 terminate-instances --instance-ids <id>` → ASG launches a fresh box; env recovers, then deploy the good version |
| **Frontend can't reach API / network errors in browser** | `NEXT_PUBLIC_API_URL` baked to a **non-existent** CloudFront domain (`dlac70vtxl3w4…`) | Rebuild frontend with the real domain `d2962fm2ka76im…`, redeploy, verify the served JS |
| **CORS error in browser** | Backend `FRONTEND_URL` missing the frontend origin, or CloudFront not forwarding `Origin`/`OPTIONS` | Add origin to `FRONTEND_URL` + redeploy; ensure CF allows OPTIONS and forwards `Origin` |
| `unknown option '--skip-generate'` | Prisma 7 removed it from `db push` | run `prisma db push` plain |
| `Can't reach database server` from EB | RDS SG missing the EB SG as source | `authorize-security-group-ingress --group-id $RDS_SG --port 5432 --source-group $EB_SG` |
| local `prisma` times out | your IP changed / not in RDS SG | re-add `MY_IP/32` to `floodguard-rds-sg` |
| `database "floodguard" does not exist` | created RDS without `--db-name` | `CREATE DATABASE floodguard;` or recreate instance |
| Mixed-content blocked | calling `http://…EB…/api` from an HTTPS page | call the **HTTPS CloudFront** API URL |
| 502 Bad Gateway | app crashed on boot | `eb logs` / `web.stdout.log`; usually a bad env var (DB URL, JWT) |

### Getting logs
```bash
aws elasticbeanstalk request-environment-info  --environment-name floodguard-backend --info-type tail
aws elasticbeanstalk retrieve-environment-info --environment-name floodguard-backend --info-type tail \
  --query "EnvironmentInfo[].Message" --output text     # (env must be Ready to request)
# or:  eb logs
```

---

## 16. Day-2 Operations (redeploy, rollback, logs, teardown)

```bash
# Redeploy backend: rebuild dist → zip → S3 → create-application-version → update-environment
# Rollback: just point the env at a previous version label
aws elasticbeanstalk update-environment --environment-name floodguard-backend \
  --version-label <older-version-label>

# List versions
aws elasticbeanstalk describe-application-versions --application-name floodguard-team-9 \
  --query "ApplicationVersions[].VersionLabel" --output text

# Restart app process without redeploying
aws elasticbeanstalk restart-app-server --environment-name floodguard-backend

# Change an env var (triggers an env update)
aws elasticbeanstalk update-environment --environment-name floodguard-backend \
  --option-settings Namespace=aws:elasticbeanstalk:application:environment,OptionName=JWT_SECRET,Value=newsecret

# Teardown (reverse order): envs → CloudFront (disable then delete) → RDS → S3 → SGs → subnets → IGW → VPC
aws elasticbeanstalk terminate-environment --environment-name floodguard-backend
aws elasticbeanstalk terminate-environment --environment-name floodguard-team-9-frontend
aws rds delete-db-instance --db-instance-identifier floodguard-db --skip-final-snapshot
```

### Things to consider
- **Rollback is instant** because old application versions stay in S3 — keep a few around.
- **Teardown order matters**: you can't delete a VPC while RDS/EB ENIs still reference its subnets/SGs. Delete compute first.
- CloudFront must be **disabled and fully deployed** before it can be deleted (~15 min).

---

## 17. Cost & Security Considerations

**Cost (rough, us-east-1, on-demand):**
- EB `t3.small` backend ≈ $15/mo, `t3.micro` frontend ≈ $7.5/mo (free-tier eligible for 12 mo).
- RDS `db.t3.micro` + 20 GB gp3 ≈ $15/mo (free-tier eligible).
- CloudFront/S3: pennies at project scale.
- **A NAT gateway (if you go private-subnet) is ~$32/mo** — the single biggest line item; avoided here by using public subnets.

**Security hardening (beyond this project's defaults):**
- Move RDS to **private subnets**; reach it via bastion/SSM, not public access.
- **Rotate `JWT_SECRET`/DB password**; store secrets in **SSM Parameter Store / Secrets Manager**, not plaintext in `env.config` (which is committed).
- Scope the EC2 instance profile to the **specific S3 bucket/actions**.
- Add a **custom domain + ACM cert** on CloudFront; enable **WAF** for rate limiting.
- Turn on **RDS encryption at rest**, deletion protection, and automated minor-version upgrades.
- Strict TLS to RDS (`rejectUnauthorized: true` + CA bundle).

---

## 18. Reference: Names, IDs, URLs

| Thing | Value |
|---|---|
| Region / Account | `us-east-1` / `679777944150` |
| Backend app / env | `floodguard-team-9` / `floodguard-backend` |
| Frontend app / env | `floodguard-team-9-web` / `floodguard-team-9-frontend` |
| Backend CloudFront | `d2962fm2ka76im.cloudfront.net` (id `E2GXLT0ENOWPY1`) → API base `…/api` |
| Frontend CloudFront | `d28cob3p1pxddd.cloudfront.net` (`ECFVCCNOWAYCM`), `d4p5fmacpt873.cloudfront.net` (`E3NF4Y2LLLZBQN`) |
| Backend EB CNAME | `floodguard-backend.eba-p2pusqhe.us-east-1.elasticbeanstalk.com` |
| Frontend EB CNAME | `floodguard-team-9-frontend.eba-is2mssus.us-east-1.elasticbeanstalk.com` |
| RDS endpoint | `floodguard-db.c4t6ymcw2eqt.us-east-1.rds.amazonaws.com:5432` (db `floodguard`) |
| S3 uploads | `floodguard-uploads` |
| EB artifact bucket | `elasticbeanstalk-us-east-1-679777944150` |
| Swagger | `…/api/docs` on the backend |

---

## 19. Deployment Checklist

- [ ] VPC `10.0.0.0/16` with DNS hostnames enabled
- [ ] IGW attached; public route table `0.0.0.0/0 → IGW` associated to both subnets
- [ ] Two public subnets in two AZs, auto-assign public IP on
- [ ] SGs: `floodguard-eb-sg` (HTTP 80 in), `floodguard-rds-sg` (5432 from EB SG + your IP)
- [ ] EB IAM instance profile + service role exist (with S3 access)
- [ ] DB subnet group spanning 2 AZs; RDS PostgreSQL `floodguard` created & available
- [ ] S3 `floodguard-uploads` with public access blocked
- [ ] Schema pushed + DB seeded **from local**
- [ ] Backend built **locally**; postinstall = `prisma generate` only; no Buildfile; artifact zipped & deployed; `/api/health` = 200
- [ ] Frontend built **with correct `NEXT_PUBLIC_API_URL`**; standalone bundle deployed
- [ ] CloudFront (backend + frontend); caching disabled for API; Origin/Authorization/OPTIONS forwarded
- [ ] Backend `FRONTEND_URL` includes all frontend origins (CORS)
- [ ] Smoke tests pass: health, public stats, login, authed call, frontend loads
- [ ] Deployed frontend JS verified to contain the correct API URL
```

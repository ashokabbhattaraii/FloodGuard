# Complete AWS RDS PostgreSQL Setup Guide for FloodGuard

**Version:** 1.0  
**Last Updated:** June 28, 2026  
**Difficulty:** Intermediate  
**Estimated Time:** 30-45 minutes

---

## 📚 Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Architecture Overview](#architecture-overview)
4. [Part 1: Create DB Subnet Group](#part-1-create-db-subnet-group)
5. [Part 2: Create Parameter Group](#part-2-create-parameter-group)
6. [Part 3: Create RDS Database](#part-3-create-rds-database)
7. [Part 4: Configure Security](#part-4-configure-security)
8. [Part 5: Test Database Connection](#part-5-test-database-connection)
9. [Part 6: Database Migration](#part-6-database-migration)
10. [Backup and Recovery](#backup-and-recovery)
11. [Monitoring and Maintenance](#monitoring-and-maintenance)
12. [Troubleshooting](#troubleshooting)
13. [Cost Optimization](#cost-optimization)
14. [Security Best Practices](#security-best-practices)
15. [Cleanup Instructions](#cleanup-instructions)

---

## Introduction

### What is Amazon RDS?

**Amazon RDS (Relational Database Service)** is a managed database service that makes it easy to set up, operate, and scale a relational database in the cloud. AWS handles:
- ✅ Automated backups
- ✅ Software patching
- ✅ Automatic failure detection
- ✅ Recovery
- ✅ Multi-AZ deployments

### Why RDS for FloodGuard?

- **High Availability**: Multi-AZ deployment for automatic failover
- **Automatic Backups**: Daily snapshots with point-in-time recovery
- **Scalability**: Easy to scale compute and storage
- **Security**: Encryption at rest and in transit
- **Performance**: Optimized for PostgreSQL workloads
- **Managed Service**: No need to manage OS, patches, or maintenance

### What We'll Build

```
┌─────────────────────────────────────────────────────────┐
│                 FloodGuard VPC                          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Private Subnet 1a (us-east-1a)          │   │
│  │                                                 │   │
│  │  ┌──────────────────────────────────────────┐  │   │
│  │  │    RDS PostgreSQL Primary Instance       │  │   │
│  │  │    - db.t3.micro                         │  │   │
│  │  │    - PostgreSQL 15                       │  │   │
│  │  │    - 20 GB gp3 SSD                       │  │   │
│  │  │    - Automated backups enabled           │  │   │
│  │  └──────────────────────────────────────────┘  │   │
│  │              ↕ Synchronous Replication         │   │
│  └─────────────────────────────────────────────────┘   │
│                         │                               │
│  ┌─────────────────────┴───────────────────────────┐   │
│  │         Private Subnet 1b (us-east-1b)          │   │
│  │                                                 │   │
│  │  ┌──────────────────────────────────────────┐  │   │
│  │  │    RDS PostgreSQL Standby Instance       │  │   │
│  │  │    - Auto-failover enabled               │  │   │
│  │  │    - Same specs as primary               │  │   │
│  │  │    - Only activates on failure           │  │   │
│  │  └──────────────────────────────────────────┘  │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Security: FloodGuard-DB-SG (Port 5432)                │
│  Access: From App-SG and Web-SG only                   │
└─────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Resources

- ✅ VPC with private subnets (from previous guide)
- ✅ Security groups configured
- ✅ AWS CLI configured
- ✅ Database credentials planned

### Load VPC Configuration

If using CLI, load the VPC configuration first:

```bash
# Load VPC config
source floodguard-vpc-config.sh

# Verify variables are set
echo "VPC ID: $VPC_ID"
echo "Private Subnet 1: $PRIVATE_SUBNET_1"
echo "Private Subnet 2: $PRIVATE_SUBNET_2"
echo "DB Security Group: $DB_SG"
```

### Database Planning

Before creating the database, decide on:

| Parameter | Development | Production | FloodGuard Choice |
|-----------|-------------|------------|-------------------|
| **Instance Class** | db.t3.micro | db.t3.medium+ | db.t3.micro (dev) |
| **Storage** | 20 GB | 100+ GB | 20 GB gp3 |
| **Multi-AZ** | No | Yes | Yes (for HA) |
| **Backup Retention** | 1 day | 7-30 days | 7 days |
| **Encryption** | Optional | Required | Yes |
| **Public Access** | No | No | No |

### Database Credentials

**⚠️ IMPORTANT: Keep these secure!**

```bash
# Database credentials (CHANGE THESE!)
DB_USERNAME="floodguard_admin"
DB_PASSWORD="YourSecurePassword123!"  # Must be 8+ chars
DB_NAME="floodguard"
DB_IDENTIFIER="floodguard-db"
```

**Password Requirements:**
- At least 8 characters
- Cannot contain `/`, `@`, or `"`
- Should include uppercase, lowercase, numbers, and symbols

---

## Architecture Overview

### Multi-AZ Deployment

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   Availability Zone A          Availability Zone B      │
│   (us-east-1a)                 (us-east-1b)             │
│                                                          │
│   ┌────────────────┐           ┌────────────────┐       │
│   │   Primary DB   │═══════════│   Standby DB   │       │
│   │                │ Sync Rep  │                │       │
│   │   ACTIVE       │<=========>│   STANDBY      │       │
│   │                │ Auto-fail │                │       │
│   └────────────────┘           └────────────────┘       │
│         │                              │                │
│         └──────────────┬───────────────┘                │
│                        │                                │
│              ┌─────────▼──────────┐                     │
│              │  Single Endpoint   │                     │
│              │  (DNS name)        │                     │
│              └─────────┬──────────┘                     │
│                        │                                │
│              ┌─────────▼──────────┐                     │
│              │   Applications     │                     │
│              │   (Backend API)    │                     │
│              └────────────────────┘                     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Key Features

1. **Automatic Failover**: If primary fails, standby promoted automatically (< 2 min)
2. **Synchronous Replication**: Data replicated to standby in real-time
3. **Single Endpoint**: Application uses one DNS name, AWS handles routing
4. **Zero Data Loss**: Synchronous replication ensures no data loss

---

## Part 1: Create DB Subnet Group

### What is a DB Subnet Group?

A **DB Subnet Group** is a collection of subnets that you create in a VPC and designate for your DB instances. Each DB subnet group should have at least two subnets in two different Availability Zones.

### Method A: AWS Console (UI)

#### Step 1.1: Navigate to RDS Dashboard

1. Sign in to **AWS Console**: https://console.aws.amazon.com
2. Search for: `RDS`
3. Click **RDS** under Services

![RDS Dashboard](Screenshot: RDS main dashboard)

#### Step 1.2: Create Subnet Group

1. In the left sidebar, click **Subnet groups**
2. Click **Create DB subnet group** (orange button)

![Subnet Groups](Screenshot: Subnet groups page)

#### Step 1.3: Configure Subnet Group

**Subnet group details:**
- **Name**: `floodguard-db-subnet-group`
- **Description**: `Subnet group for FloodGuard RDS database`
- **VPC**: Select `FloodGuard-VPC` (vpc-07d2b4c43ff041146)

**Add subnets:**
- **Availability Zones**: Select both `us-east-1a` and `us-east-1b`

For **us-east-1a**:
- Select subnet: `FloodGuard-Private-Subnet-1a` (10.0.11.0/24)

For **us-east-1b**:
- Select subnet: `FloodGuard-Private-Subnet-1b` (10.0.12.0/24)

![Subnet Group Config](Screenshot: Add subnets dialog)

**Tags:**
- Key: `Project`, Value: `FloodGuard`

#### Step 1.4: Create Subnet Group

Click **Create** (bottom right)

Success message: ✅ "Successfully created subnet group floodguard-db-subnet-group"

### Method B: AWS CLI

#### Step 1.1: Create DB Subnet Group

```bash
# Create DB Subnet Group
aws rds create-db-subnet-group \
  --db-subnet-group-name floodguard-db-subnet-group \
  --db-subnet-group-description "Subnet group for FloodGuard RDS database" \
  --subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2 \
  --tags "Key=Project,Value=FloodGuard" "Key=Name,Value=floodguard-db-subnet-group"

echo "✅ DB Subnet Group created"
```

#### Step 1.2: Verify Subnet Group

```bash
# Describe the subnet group
aws rds describe-db-subnet-groups \
  --db-subnet-group-name floodguard-db-subnet-group \
  --query 'DBSubnetGroups[0].[DBSubnetGroupName,VpcId,Subnets[*].SubnetIdentifier]' \
  --output table
```

**Expected Output:**
```
------------------------------------------------------------------------------------
|                         DescribeDBSubnetGroups                                   |
+--------------------------------+-----------------+--------------------------------+
|  floodguard-db-subnet-group    |  vpc-07d2b4... |                                |
+--------------------------------+-----------------+--------------------------------+
||                                 Subnets                                        ||
|+--------------------------------------------------------------------------------+|
||  subnet-00229db6e6d13c216                                                     ||
||  subnet-0adbb4338e964368d                                                     ||
|+--------------------------------------------------------------------------------+|
```

### ✅ Part 1 Checklist

- [ ] DB Subnet Group created
- [ ] Two private subnets included
- [ ] Both subnets in different AZs
- [ ] VPC association verified

---

## Part 2: Create Parameter Group

### What is a Parameter Group?

A **DB Parameter Group** acts as a container for database engine configuration values. You can customize settings for performance, connections, and other database behaviors.

### Method A: AWS Console (UI)

#### Step 2.1: Navigate to Parameter Groups

1. In RDS Dashboard left sidebar
2. Click **Parameter groups**
3. Click **Create parameter group** (orange button)

#### Step 2.2: Create Parameter Group

**Parameter group details:**
- **Parameter group family**: Select `postgres15`
- **Type**: DB Parameter Group
- **Group name**: `floodguard-postgres15-params`
- **Description**: `Custom parameters for FloodGuard PostgreSQL 15`

**Tags:**
- Key: `Project`, Value: `FloodGuard`

Click **Create**

![Parameter Group](Screenshot: Create parameter group form)

#### Step 2.3: Modify Parameters (Optional)

For production optimization:

1. Select the parameter group
2. Click **Edit parameters**
3. Search and modify these parameters:

| Parameter | Default | Recommended | Purpose |
|-----------|---------|-------------|---------|
| `max_connections` | 100 | 200 | More concurrent connections |
| `shared_buffers` | 128MB | 256MB | Better caching |
| `work_mem` | 4MB | 8MB | Faster queries |
| `maintenance_work_mem` | 64MB | 128MB | Faster maintenance |
| `effective_cache_size` | 4GB | 1GB | Query planner optimization |
| `log_statement` | none | ddl | Log schema changes |

4. Click **Save changes**

### Method B: AWS CLI

#### Step 2.1: Create Parameter Group

```bash
# Create DB Parameter Group
aws rds create-db-parameter-group \
  --db-parameter-group-name floodguard-postgres15-params \
  --db-parameter-group-family postgres15 \
  --description "Custom parameters for FloodGuard PostgreSQL 15" \
  --tags "Key=Project,Value=FloodGuard"

echo "✅ Parameter Group created"
```

#### Step 2.2: Modify Parameters (Optional)

```bash
# Modify parameters for better performance
aws rds modify-db-parameter-group \
  --db-parameter-group-name floodguard-postgres15-params \
  --parameters \
    "ParameterName=max_connections,ParameterValue=200,ApplyMethod=pending-reboot" \
    "ParameterName=shared_buffers,ParameterValue=262144,ApplyMethod=pending-reboot" \
    "ParameterName=work_mem,ParameterValue=8192,ApplyMethod=immediate" \
    "ParameterName=log_statement,ParameterValue=ddl,ApplyMethod=immediate"

echo "✅ Parameters modified"
```

#### Step 2.3: Verify Parameter Group

```bash
# Describe parameter group
aws rds describe-db-parameter-groups \
  --db-parameter-group-name floodguard-postgres15-params \
  --query 'DBParameterGroups[0].[DBParameterGroupName,DBParameterGroupFamily,Description]' \
  --output table
```

### ✅ Part 2 Checklist

- [ ] Parameter group created for PostgreSQL 15
- [ ] Optional parameters configured
- [ ] Parameter group verified

---

## Part 3: Create RDS Database

### Database Configuration

We'll create a PostgreSQL 15 database with:
- **Instance**: db.t3.micro (1 vCPU, 1 GB RAM)
- **Storage**: 20 GB gp3 SSD
- **Multi-AZ**: Yes (high availability)
- **Backups**: 7-day retention
- **Encryption**: Yes
- **Public Access**: No

### Method A: AWS Console (UI)

#### Step 3.1: Start Database Creation

1. In RDS Dashboard
2. Click **Databases** (left sidebar)
3. Click **Create database** (orange button)

![Create Database](Screenshot: Create database button)

#### Step 3.2: Choose Creation Method

- Select **Standard create** (not Easy create)
  - Gives us full control over all settings

![Creation Method](Screenshot: Standard create selected)

#### Step 3.3: Engine Options

**Engine type:**
- Select **PostgreSQL**

**Engine Version:**
- Select **PostgreSQL 15.5-R2** (or latest 15.x version)

![Engine Selection](Screenshot: PostgreSQL selected)

#### Step 3.4: Templates

- Select **Production** (enables Multi-AZ by default)
  - For development, you can choose "Dev/Test" to save costs

![Template](Screenshot: Production template)

#### Step 3.5: Settings

**DB instance identifier:**
- Enter: `floodguard-db`

**Credentials Settings:**
- **Master username**: `floodguard_admin`
- **Master password**: `YourSecurePassword123!`
- **Confirm password**: `YourSecurePassword123!`

⚠️ **Save these credentials securely!**

![Credentials](Screenshot: Database credentials form)

#### Step 3.6: Instance Configuration

**DB instance class:**
- Select **Burstable classes (includes t classes)**
- Choose **db.t3.micro** (1 vCPU, 1 GiB RAM)
  - For production, consider db.t3.small or larger

![Instance Class](Screenshot: db.t3.micro selected)

#### Step 3.7: Storage

**Storage type:**
- Select **General Purpose SSD (gp3)**

**Allocated storage:**
- Enter: `20` GiB

**Storage autoscaling:**
- ✅ Check **Enable storage autoscaling**
- **Maximum storage threshold**: `100` GiB

![Storage Config](Screenshot: Storage settings)

#### Step 3.8: Availability & Durability

**Multi-AZ deployment:**
- ✅ Select **Create a standby instance**
  - This creates a standby in a different AZ
  - Automatic failover in case of failure

![Multi-AZ](Screenshot: Multi-AZ enabled)

#### Step 3.9: Connectivity

**Compute resource:**
- Select **Don't connect to an EC2 compute resource**

**Network type:**
- Select **IPv4**

**Virtual private cloud (VPC):**
- Select **FloodGuard-VPC** (vpc-07d2b4c43ff041146)

**DB Subnet group:**
- Select **floodguard-db-subnet-group**

**Public access:**
- Select **No** ⚠️ Important for security!

**VPC security group:**
- Select **Choose existing**
- Select **FloodGuard-DB-SG** (sg-01633b6bfc23f1cfc)
- Remove any default security groups

![Connectivity](Screenshot: VPC and security group settings)

**Availability Zone:**
- Select **No preference** (AWS will choose)

**RDS Proxy:**
- Leave unchecked for now (optional for connection pooling)

#### Step 3.10: Database Authentication

**Database authentication:**
- Select **Password authentication**
  - (IAM authentication can be enabled later if needed)

![Authentication](Screenshot: Password authentication)

#### Step 3.11: Monitoring

**Enhanced monitoring:**
- ✅ Check **Enable Enhanced Monitoring**
- **Granularity**: `60 seconds`
- **Monitoring Role**: Use default or create new

![Monitoring](Screenshot: Enhanced monitoring enabled)

#### Step 3.12: Additional Configuration

Click **Additional configuration** to expand

**Database options:**
- **Initial database name**: `floodguard`
  - This creates the initial database

**DB parameter group:**
- Select **floodguard-postgres15-params**

**Option group:**
- Leave as default

![Additional Config](Screenshot: Additional configuration expanded)

**Backup:**
- ✅ **Enable automatic backups**
- **Backup retention period**: `7` days
- **Backup window**: No preference (or choose off-peak hours)
- **Copy tags to snapshots**: ✅ Check

**Encryption:**
- ✅ **Enable encryption**
- **AWS KMS key**: (default) aws/rds

**Performance Insights:**
- ✅ **Enable Performance Insights**
- **Retention period**: `7` days (free tier)

**Maintenance:**
- ✅ **Enable auto minor version upgrade**
- **Maintenance window**: No preference

**Deletion protection:**
- ✅ **Enable deletion protection** (for production)
  - Prevents accidental deletion

![Backup and Maintenance](Screenshot: Backup and encryption settings)

#### Step 3.13: Estimate Costs

Click **Estimate monthly costs** link to see pricing

**Expected costs for db.t3.micro:**
- Instance: ~$13/month
- Storage (20 GB): ~$2.30/month
- Multi-AZ: ~$13/month (doubles instance cost)
- **Total: ~$28-30/month**

#### Step 3.14: Create Database

1. Review all settings
2. Click **Create database** (bottom right)

⏳ **This takes 10-15 minutes!**

Progress indicators:
- Creating database...
- Backing up...
- Available ✅

![Database Creating](Screenshot: Database creation progress)

### Method B: AWS CLI

#### Step 3.1: Set Variables

```bash
# Database configuration
DB_IDENTIFIER="floodguard-db"
DB_USERNAME="floodguard_admin"
DB_PASSWORD="YourSecurePassword123!"  # CHANGE THIS!
DB_NAME="floodguard"
DB_INSTANCE_CLASS="db.t3.micro"
ALLOCATED_STORAGE=20
ENGINE="postgres"
ENGINE_VERSION="15.5"
```

#### Step 3.2: Create RDS Instance

```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier $DB_IDENTIFIER \
  --db-instance-class $DB_INSTANCE_CLASS \
  --engine $ENGINE \
  --engine-version $ENGINE_VERSION \
  --master-username $DB_USERNAME \
  --master-user-password $DB_PASSWORD \
  --allocated-storage $ALLOCATED_STORAGE \
  --storage-type gp3 \
  --storage-encrypted \
  --db-name $DB_NAME \
  --vpc-security-group-ids $DB_SG \
  --db-subnet-group-name floodguard-db-subnet-group \
  --db-parameter-group-name floodguard-postgres15-params \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --multi-az \
  --auto-minor-version-upgrade \
  --publicly-accessible false \
  --enable-cloudwatch-logs-exports '["postgresql"]' \
  --deletion-protection \
  --tags "Key=Name,Value=floodguard-db" "Key=Project,Value=FloodGuard" "Key=Environment,Value=Production"

echo "✅ RDS instance creation started"
echo "⏳ This will take 10-15 minutes..."
```

#### Step 3.3: Wait for Database

```bash
# Wait for the database to be available
aws rds wait db-instance-available --db-instance-identifier $DB_IDENTIFIER

echo "✅ Database is now available!"
```

#### Step 3.4: Get Database Endpoint

```bash
# Get the database endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier $DB_IDENTIFIER \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

DB_PORT=$(aws rds describe-db-instances \
  --db-instance-identifier $DB_IDENTIFIER \
  --query 'DBInstances[0].Endpoint.Port' \
  --output text)

echo "Database Endpoint: $DB_ENDPOINT"
echo "Database Port: $DB_PORT"

# Save to file
cat >> floodguard-db-config.sh << EOF
#!/bin/bash
# FloodGuard Database Configuration

export DB_ENDPOINT="$DB_ENDPOINT"
export DB_PORT="$DB_PORT"
export DB_NAME="$DB_NAME"
export DB_USERNAME="$DB_USERNAME"
export DB_PASSWORD="$DB_PASSWORD"

# Connection string
export DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_ENDPOINT}:${DB_PORT}/${DB_NAME}?sslmode=require"

echo "FloodGuard Database Configuration Loaded"
EOF

chmod +x floodguard-db-config.sh
echo "✅ Configuration saved to floodguard-db-config.sh"
```

#### Step 3.5: Verify Database

```bash
# Describe the database instance
aws rds describe-db-instances \
  --db-instance-identifier $DB_IDENTIFIER \
  --query 'DBInstances[0].[DBInstanceIdentifier,DBInstanceStatus,Engine,EngineVersion,DBInstanceClass,MultiAZ,Endpoint.Address]' \
  --output table
```

**Expected Output:**
```
-------------------------------------------------------------------------------------------------
|                                    DescribeDBInstances                                        |
+----------------+-----------+----------+---------+-------------+---------+------------------------+
|  floodguard-db | available | postgres |  15.5   | db.t3.micro |  True   | floodguard-db.xxx...   |
+----------------+-----------+----------+---------+-------------+---------+------------------------+
```

### ✅ Part 3 Checklist

- [ ] Database instance created
- [ ] Multi-AZ deployment enabled
- [ ] Encryption enabled
- [ ] Automatic backups configured
- [ ] Database endpoint noted down
- [ ] Status shows "available"

---

## Part 4: Configure Security

### Update Environment Variables

#### Step 4.1: Backend Environment Variables

Update `backend/.env`:

```bash
# Database Configuration
DATABASE_URL="postgresql://floodguard_admin:YourSecurePassword123!@floodguard-db.xxx.us-east-1.rds.amazonaws.com:5432/floodguard?sslmode=require"

# Individual components (if needed)
DB_HOST="floodguard-db.xxx.us-east-1.rds.amazonaws.com"
DB_PORT="5432"
DB_USERNAME="floodguard_admin"
DB_PASSWORD="YourSecurePassword123!"
DB_NAME="floodguard"
DB_SSL="require"
```

**⚠️ Security Notes:**
- Never commit `.env` files to git
- Use AWS Secrets Manager or Parameter Store in production
- Rotate passwords regularly

#### Step 4.2: Use AWS Secrets Manager (Recommended)

Store database credentials securely:

```bash
# Create secret in AWS Secrets Manager
aws secretsmanager create-secret \
  --name floodguard/db/credentials \
  --description "FloodGuard database credentials" \
  --secret-string "{\"username\":\"$DB_USERNAME\",\"password\":\"$DB_PASSWORD\",\"host\":\"$DB_ENDPOINT\",\"port\":$DB_PORT,\"dbname\":\"$DB_NAME\"}"

echo "✅ Credentials stored in Secrets Manager"

# Get secret ARN
SECRET_ARN=$(aws secretsmanager describe-secret \
  --secret-id floodguard/db/credentials \
  --query 'ARN' \
  --output text)

echo "Secret ARN: $SECRET_ARN"
```

In your application, retrieve credentials:

```typescript
// backend/src/config/database.config.ts
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

async function getDatabaseCredentials() {
  const client = new SecretsManagerClient({ region: "us-east-1" });
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: "floodguard/db/credentials" })
  );
  return JSON.parse(response.SecretString);
}
```

### SSL/TLS Configuration

#### Step 4.3: Download RDS CA Certificate

```bash
# Download RDS CA certificate bundle
cd backend
curl -o rds-ca-2019-root.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

echo "✅ RDS CA certificate downloaded"
```

Update Prisma schema or connection:

```prisma
// backend/prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // SSL configuration handled via connection string
}
```

Connection string with SSL:
```
postgresql://user:pass@host:5432/db?sslmode=require&sslrootcert=./rds-ca-2019-root.pem
```

### ✅ Part 4 Checklist

- [ ] Environment variables configured
- [ ] Credentials stored in Secrets Manager
- [ ] SSL certificate downloaded
- [ ] Connection string includes SSL

---

## Part 5: Test Database Connection

### Method A: Using psql (PostgreSQL Client)

#### Step 5.1: Install psql

**macOS:**
```bash
brew install postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql-client
```

**Windows:**
Download from: https://www.postgresql.org/download/windows/

#### Step 5.2: Connect to Database

```bash
# Load database config
source floodguard-db-config.sh

# Connect using psql
psql "postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_ENDPOINT}:${DB_PORT}/${DB_NAME}?sslmode=require"
```

If successful, you'll see:
```
psql (15.5)
SSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, bits: 256, compression: off)
Type "help" for help.

floodguard=>
```

#### Step 5.3: Run Test Queries

```sql
-- Check PostgreSQL version
SELECT version();

-- List databases
\l

-- Create a test table
CREATE TABLE health_check (
  id SERIAL PRIMARY KEY,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO health_check DEFAULT VALUES;

-- Query test data
SELECT * FROM health_check;

-- Drop test table
DROP TABLE health_check;

-- Exit
\q
```

### Method B: Using Node.js Script

#### Step 5.4: Create Test Script

```bash
# In backend directory
cd backend

# Install pg library if not already installed
pnpm add pg

# Create test script
cat > test-db-connection.js << 'EOF'
const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Test query
    const result = await client.query('SELECT version()');
    console.log('📊 PostgreSQL version:');
    console.log(result.rows[0].version);

    // Test table creation
    await client.query(`
      CREATE TABLE IF NOT EXISTS health_check (
        id SERIAL PRIMARY KEY,
        checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Test table created');

    // Insert test data
    await client.query('INSERT INTO health_check DEFAULT VALUES');
    console.log('✅ Test data inserted');

    // Query test data
    const data = await client.query('SELECT * FROM health_check');
    console.log('✅ Test data retrieved:', data.rows.length, 'rows');

    // Clean up
    await client.query('DROP TABLE health_check');
    console.log('✅ Test table dropped');

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Connection closed');
  }
}

testConnection();
EOF
```

#### Step 5.5: Run Test Script

```bash
# Set environment variables
export DB_HOST="floodguard-db.xxx.us-east-1.rds.amazonaws.com"
export DB_PORT="5432"
export DB_USERNAME="floodguard_admin"
export DB_PASSWORD="YourSecurePassword123!"
export DB_NAME="floodguard"

# Run test
node test-db-connection.js
```

**Expected Output:**
```
🔌 Connecting to database...
✅ Connected successfully!
📊 PostgreSQL version:
PostgreSQL 15.5 on x86_64-pc-linux-gnu...
✅ Test table created
✅ Test data inserted
✅ Test data retrieved: 1 rows
✅ Test table dropped
🔌 Connection closed
```

### Method C: Using Prisma

#### Step 5.6: Test with Prisma

```bash
# In backend directory
cd backend

# Update DATABASE_URL in .env
echo "DATABASE_URL=postgresql://floodguard_admin:YourSecurePassword123!@floodguard-db.xxx.us-east-1.rds.amazonaws.com:5432/floodguard?sslmode=require" > .env

# Test Prisma connection
pnpm prisma db pull

# Should output:
# Introspecting based on datasource...
# ✔ Introspected 0 models and 0 enums
```

### ✅ Part 5 Checklist

- [ ] psql connection successful
- [ ] Test queries executed
- [ ] Node.js connection test passed
- [ ] Prisma connection verified
- [ ] SSL connection confirmed

---

## Part 6: Database Migration

### Run Prisma Migrations

#### Step 6.1: Update DATABASE_URL

```bash
# In backend/.env
DATABASE_URL="postgresql://floodguard_admin:YourSecurePassword123!@floodguard-db.xxx.us-east-1.rds.amazonaws.com:5432/floodguard?sslmode=require"
```

#### Step 6.2: Generate Prisma Client

```bash
cd backend

# Generate Prisma Client
pnpm prisma generate
```

#### Step 6.3: Run Migrations

```bash
# Apply all migrations
pnpm prisma migrate deploy

# Or for development (with migration history)
pnpm prisma migrate dev
```

**Expected Output:**
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "floodguard"

10 migrations found in prisma/migrations

Applying migration `20260101000000_init`
Applying migration `20260102000000_add_users`
Applying migration `20260103000000_add_alerts`
...

The following migration(s) have been applied:

migrations/
  └─ 20260101000000_init/
  └─ 20260102000000_add_users/
  └─ 20260103000000_add_alerts/

✔ Generated Prisma Client
```

#### Step 6.4: Seed Database

```bash
# Run seed script
pnpm prisma db seed

# Or manually
cd prisma
npx tsx seed-realistic.ts
```

#### Step 6.5: Verify Schema

```bash
# Check database schema
pnpm prisma db pull

# Open Prisma Studio to view data
pnpm prisma studio
```

Prisma Studio will open at: http://localhost:5555

### ✅ Part 6 Checklist

- [ ] Migrations applied successfully
- [ ] Database seeded with initial data
- [ ] Schema verified in Prisma Studio
- [ ] All tables created

---

## Backup and Recovery

### Automated Backups

RDS automatically creates:
- **Daily snapshots** during backup window
- **Transaction logs** for point-in-time recovery
- **Retention**: 7 days (configurable)

### Manual Snapshot

#### Method A: AWS Console

1. RDS Dashboard → **Databases**
2. Select `floodguard-db`
3. **Actions** → **Take snapshot**
4. **Snapshot name**: `floodguard-db-manual-snapshot-YYYYMMDD`
5. Click **Take snapshot**

#### Method B: AWS CLI

```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier floodguard-db \
  --db-snapshot-identifier floodguard-db-snapshot-$(date +%Y%m%d-%H%M%S)

echo "✅ Manual snapshot created"
```

### Point-in-Time Recovery

Restore to any point within the retention period:

```bash
# Restore to specific time
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier floodguard-db \
  --target-db-instance-identifier floodguard-db-restored \
  --restore-time 2026-06-28T10:00:00Z \
  --db-subnet-group-name floodguard-db-subnet-group \
  --vpc-security-group-ids $DB_SG
```

### Export Snapshot to S3

```bash
# Export snapshot to S3 bucket
aws rds start-export-task \
  --export-task-identifier floodguard-export-$(date +%Y%m%d) \
  --source-arn arn:aws:rds:us-east-1:ACCOUNT_ID:snapshot:floodguard-db-snapshot \
  --s3-bucket-name floodguard-db-backups \
  --iam-role-arn arn:aws:iam::ACCOUNT_ID:role/rds-s3-export-role \
  --kms-key-id arn:aws:kms:us-east-1:ACCOUNT_ID:key/KMS_KEY_ID
```

### Backup Best Practices

1. **Regular Testing**: Test restore process monthly
2. **Multiple Copies**: Keep snapshots in different regions
3. **Automation**: Use Lambda to automate snapshot management
4. **Documentation**: Document restore procedures
5. **Monitoring**: Set up CloudWatch alarms for backup failures

---

## Monitoring and Maintenance

### CloudWatch Metrics

Key metrics to monitor:

| Metric | Description | Alarm Threshold |
|--------|-------------|-----------------|
| **CPUUtilization** | CPU usage | > 80% for 5 min |
| **FreeableMemory** | Available RAM | < 200 MB |
| **FreeStorageSpace** | Available disk | < 2 GB |
| **DatabaseConnections** | Active connections | > 150 (of 200 max) |
| **ReadLatency** | Read response time | > 100 ms |
| **WriteLatency** | Write response time | > 100 ms |
| **NetworkReceiveThroughput** | Network in | Monitor trends |
| **NetworkTransmitThroughput** | Network out | Monitor trends |

### Create CloudWatch Alarms

```bash
# CPU Utilization Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name floodguard-db-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=DBInstanceIdentifier,Value=floodguard-db

# Storage Space Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name floodguard-db-low-storage \
  --alarm-description "Alert when storage below 2GB" \
  --metric-name FreeStorageSpace \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 2000000000 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=DBInstanceIdentifier,Value=floodguard-db
```

### Performance Insights

View in AWS Console:
1. RDS Dashboard → **Databases** → `floodguard-db`
2. Click **Monitoring** tab
3. View **Performance Insights** section

Shows:
- Top SQL queries by execution time
- Database load over time
- Wait events
- Active sessions

### Maintenance Windows

```bash
# Modify maintenance window
aws rds modify-db-instance \
  --db-instance-identifier floodguard-db \
  --preferred-maintenance-window "mon:03:00-mon:04:00" \
  --apply-immediately
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Cannot Connect to Database

**Symptoms:**
```
Error: connect ETIMEDOUT
```

**Solutions:**
1. Check security group rules
```bash
aws ec2 describe-security-groups --group-ids $DB_SG
```

2. Verify database is in private subnet
3. Check if connecting from allowed source (Web-SG or App-SG)
4. Verify VPC routing

#### Issue 2: "Too Many Connections"

**Error:**
```
FATAL: sorry, too many clients already
```

**Solutions:**
1. Check current connections:
```sql
SELECT count(*) FROM pg_stat_activity;
```

2. Increase max_connections:
```bash
# Modify parameter group
aws rds modify-db-parameter-group \
  --db-parameter-group-name floodguard-postgres15-params \
  --parameters "ParameterName=max_connections,ParameterValue=200,ApplyMethod=pending-reboot"

# Reboot database
aws rds reboot-db-instance --db-instance-identifier floodguard-db
```

3. Implement connection pooling (PgBouncer, RDS Proxy)

#### Issue 3: Slow Query Performance

**Solutions:**
1. Enable slow query log:
```sql
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s
SELECT pg_reload_conf();
```

2. Check query execution plans:
```sql
EXPLAIN ANALYZE SELECT * FROM your_table WHERE condition;
```

3. Add indexes:
```sql
CREATE INDEX idx_column_name ON table_name(column_name);
```

4. Update table statistics:
```sql
ANALYZE your_table;
```

#### Issue 4: High CPU Usage

**Solutions:**
1. Identify expensive queries in Performance Insights
2. Optimize queries with indexes
3. Increase instance size if needed:
```bash
aws rds modify-db-instance \
  --db-instance-identifier floodguard-db \
  --db-instance-class db.t3.small \
  --apply-immediately
```

#### Issue 5: Storage Full

**Solutions:**
1. Enable storage autoscaling (should prevent this)
2. Clean up old data
3. Increase allocated storage:
```bash
aws rds modify-db-instance \
  --db-instance-identifier floodguard-db \
  --allocated-storage 40 \
  --apply-immediately
```

---

## Cost Optimization

### Monthly Cost Breakdown

**For db.t3.micro with Multi-AZ:**

| Component | Cost |
|-----------|------|
| Instance (db.t3.micro × 2) | $26.28/month |
| Storage (20 GB gp3 × 2) | $4.60/month |
| Backup storage (7 days) | ~$0.50/month |
| Data transfer | Variable |
| **Total** | **~$31-35/month** |

### Cost Optimization Strategies

#### 1. Right-Size Instance

```bash
# Monitor CPU and memory usage for 1 week
# If consistently < 20%, downsize to db.t3.micro
# If consistently > 80%, upgrade to db.t3.small
```

#### 2. Disable Multi-AZ for Development

For non-production environments:
```bash
aws rds modify-db-instance \
  --db-instance-identifier floodguard-db-dev \
  --no-multi-az \
  --apply-immediately

# Savings: ~50% on instance costs
```

#### 3. Use Reserved Instances

For production (1-year commitment):
- **Savings**: 30-40% vs on-demand
- **Best for**: Stable, long-running databases

#### 4. Optimize Storage

- Use gp3 instead of io1 (unless high IOPS needed)
- Clean up old backups:
```bash
# List snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier floodguard-db

# Delete old snapshot
aws rds delete-db-snapshot \
  --db-snapshot-identifier old-snapshot-name
```

#### 5. Stop/Start for Development

```bash
# Stop database (can be stopped for up to 7 days)
aws rds stop-db-instance --db-instance-identifier floodguard-db-dev

# Start database
aws rds start-db-instance --db-instance-identifier floodguard-db-dev
```

---

## Security Best Practices

### Checklist

- [ ] **No Public Access**: Database in private subnets
- [ ] **Encryption**: At rest and in transit enabled
- [ ] **Strong Passwords**: 16+ characters, rotate quarterly
- [ ] **IAM Authentication**: Consider enabling for applications
- [ ] **Secrets Manager**: Store credentials securely
- [ ] **Security Groups**: Restrict to application security groups only
- [ ] **SSL/TLS**: Enforce SSL connections
- [ ] **Audit Logging**: Enable PostgreSQL audit extension
- [ ] **Parameter Groups**: Disable dangerous functions
- [ ] **Network Isolation**: Use VPC endpoints for AWS services
- [ ] **Regular Updates**: Enable auto minor version upgrades
- [ ] **Monitoring**: CloudWatch alarms for suspicious activity

### Enable IAM Database Authentication

```bash
# Enable IAM authentication
aws rds modify-db-instance \
  --db-instance-identifier floodguard-db \
  --enable-iam-database-authentication \
  --apply-immediately
```

Create IAM policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rds-db:connect"
      ],
      "Resource": [
        "arn:aws:rds-db:us-east-1:ACCOUNT_ID:dbuser:db-RESOURCEID/iam_user"
      ]
    }
  ]
}
```

### Rotate Credentials

```bash
# Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# Update master password
aws rds modify-db-instance \
  --db-instance-identifier floodguard-db \
  --master-user-password "$NEW_PASSWORD" \
  --apply-immediately

# Update in Secrets Manager
aws secretsmanager update-secret \
  --secret-id floodguard/db/credentials \
  --secret-string "{\"username\":\"$DB_USERNAME\",\"password\":\"$NEW_PASSWORD\",\"host\":\"$DB_ENDPOINT\",\"port\":$DB_PORT,\"dbname\":\"$DB_NAME\"}"
```

---

## Cleanup Instructions

### ⚠️ WARNING: This deletes your database!

**Before deletion:**
1. ✅ Create final snapshot
2. ✅ Export important data
3. ✅ Verify backup in S3
4. ✅ Update applications to use different database

### Disable Deletion Protection

```bash
# Disable deletion protection first
aws rds modify-db-instance \
  --db-instance-identifier floodguard-db \
  --no-deletion-protection \
  --apply-immediately
```

### Create Final Snapshot

```bash
# Create final snapshot before deletion
aws rds create-db-snapshot \
  --db-instance-identifier floodguard-db \
  --db-snapshot-identifier floodguard-db-final-snapshot
```

### Delete Database

```bash
# Delete database (with final snapshot)
aws rds delete-db-instance \
  --db-instance-identifier floodguard-db \
  --final-db-snapshot-identifier floodguard-db-final-snapshot-$(date +%Y%m%d) \
  --delete-automated-backups

echo "⏳ Deleting database..."
aws rds wait db-instance-deleted --db-instance-identifier floodguard-db
echo "✅ Database deleted"
```

### Delete Related Resources

```bash
# Delete subnet group
aws rds delete-db-subnet-group \
  --db-subnet-group-name floodguard-db-subnet-group

# Delete parameter group
aws rds delete-db-parameter-group \
  --db-parameter-group-name floodguard-postgres15-params

# Delete snapshots (optional)
aws rds delete-db-snapshot \
  --db-snapshot-identifier snapshot-name

echo "✅ Cleanup complete"
```

---

## Next Steps

### 1. Deploy Backend to Elastic Beanstalk

Now that the database is ready, deploy the backend:
- See: `AWS-EB-SETUP-GUIDE.md`

### 2. Update Backend Configuration

```typescript
// backend/src/config/database.config.ts
export const databaseConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,
  },
  pool: {
    max: 20,
    min: 5,
    idle: 10000,
  },
};
```

### 3. Set Up Connection Pooling

For production, consider RDS Proxy:
```bash
aws rds create-db-proxy \
  --db-proxy-name floodguard-db-proxy \
  --engine-family POSTGRESQL \
  --auth "{\"IAMAuth\":\"DISABLED\",\"SecretArn\":\"$SECRET_ARN\"}" \
  --role-arn arn:aws:iam::ACCOUNT_ID:role/RDSProxyRole \
  --vpc-subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2
```

### 4. Configure Read Replicas (Optional)

For read-heavy workloads:
```bash
aws rds create-db-instance-read-replica \
  --db-instance-identifier floodguard-db-read-replica \
  --source-db-instance-identifier floodguard-db \
  --db-instance-class db.t3.micro
```

---

## Quick Reference Card

```
┌──────────────────────────────────────────────────────────┐
│         FloodGuard RDS Quick Reference                   │
├──────────────────────────────────────────────────────────┤
│ DB Identifier:   floodguard-db                           │
│ Engine:          PostgreSQL 15.5                         │
│ Instance Class:  db.t3.micro                             │
│ Storage:         20 GB gp3 (auto-scaling to 100 GB)     │
│ Multi-AZ:        Yes                                     │
│ Encryption:      Yes (aws/rds)                           │
│                                                          │
│ Endpoint:        floodguard-db.xxx.rds.amazonaws.com    │
│ Port:            5432                                    │
│ Database:        floodguard                              │
│ Username:        floodguard_admin                        │
│                                                          │
│ Subnet Group:    floodguard-db-subnet-group              │
│ Security Group:  FloodGuard-DB-SG (sg-01633b6b...)      │
│                                                          │
│ Backup:          7 days retention                        │
│ Maintenance:     Monday 03:00-04:00 UTC                  │
│                                                          │
│ Cost:            ~$31-35/month                           │
└──────────────────────────────────────────────────────────┘

Connection String:
postgresql://floodguard_admin:PASSWORD@floodguard-db.xxx.us-east-1.rds.amazonaws.com:5432/floodguard?sslmode=require
```

---

**Document Version:** 1.0  
**Last Updated:** June 28, 2026  
**Maintained By:** FloodGuard DevOps Team

**Next Guide:** [AWS Elastic Beanstalk Setup Guide](./AWS-EB-SETUP-GUIDE.md)

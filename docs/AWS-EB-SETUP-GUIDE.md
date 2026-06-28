# Complete AWS Elastic Beanstalk Setup Guide for FloodGuard

**Version:** 1.0  
**Last Updated:** June 28, 2026  
**Estimated Time:** 60-90 minutes

---

## 📚 Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Architecture Overview](#architecture-overview)
4. [Part 1: Install EB CLI](#part-1-install-eb-cli)
5. [Part 2: Prepare Backend for Deployment](#part-2-prepare-backend-for-deployment)
6. [Part 3: Deploy Backend](#part-3-deploy-backend)
7. [Part 4: Prepare Frontend for Deployment](#part-4-prepare-frontend-for-deployment)
8. [Part 5: Deploy Frontend](#part-5-deploy-frontend)
9. [Part 6: Configure Environment Variables](#part-6-configure-environment-variables)
10. [Part 7: Set Up Load Balancer & SSL](#part-7-set-up-load-balancer--ssl)
11. [Part 8: Configure Auto Scaling](#part-8-configure-auto-scaling)
12. [Monitoring & Logs](#monitoring--logs)
13. [CI/CD Pipeline](#cicd-pipeline)
14. [Troubleshooting](#troubleshooting)
15. [Cost Optimization](#cost-optimization)

---

## Introduction

### What is AWS Elastic Beanstalk?

**Elastic Beanstalk** is a Platform as a Service (PaaS) that handles:
- ✅ Load balancing
- ✅ Auto-scaling  
- ✅ Health monitoring
- ✅ Platform updates
- ✅ Capacity provisioning

You upload code → AWS handles infrastructure

### What We'll Deploy

```
┌─────────────────────────────────────────────────────────────┐
│                    Internet                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴──────────┐
         │  Route 53 (DNS)      │
         │  floodguard.com      │
         └───────────┬──────────┘
                     │
    ┌────────────────┴────────────────┐
    │  CloudFront (CDN - Optional)    │
    └────────────────┬────────────────┘
                     │
         ┌───────────┴──────────────────────┐
         │                                  │
    ┌────▼─────────────┐        ┌──────────▼────────┐
    │  Frontend ALB    │        │   Backend ALB      │
    │  Port 80/443     │        │   Port 3001       │
    └────┬─────────────┘        └──────────┬────────┘
         │                                  │
    ┌────┴─────────────┐        ┌──────────┴────────┐
    │  Auto Scaling    │        │  Auto Scaling     │
    │  Group           │        │  Group            │
    │  (2-4 instances) │        │  (2-4 instances)  │
    └────┬─────────────┘        └──────────┬────────┘
         │                                  │
    ┌────▼─────────────┐        ┌──────────▼────────┐
    │  Next.js         │        │   NestJS API      │
    │  EC2 Instances   │◄───────┤   EC2 Instances   │
    │  (Frontend)      │        │   (Backend)       │
    └──────────────────┘        └──────────┬────────┘
                                           │
                                  ┌────────▼────────┐
                                  │  RDS PostgreSQL │
                                  │  (Multi-AZ)     │
                                  └─────────────────┘
```

---

## Prerequisites

### Required Tools

```bash
# Check versions
node --version    # v20+
npm --version     # v10+
git --version     # v2+
aws --version     # AWS CLI v2+
```

### Load VPC Configuration

```bash
# Load VPC and DB configs
source floodguard-vpc-config.sh
source floodguard-db-config.sh

# Verify
echo "VPC: $VPC_ID"
echo "DB Endpoint: $DB_ENDPOINT"
echo "Public Subnets: $PUBLIC_SUBNET_1, $PUBLIC_SUBNET_2"
echo "Private Subnets: $PRIVATE_SUBNET_1, $PRIVATE_SUBNET_2"
```

---

## Part 1: Install EB CLI

### macOS

```bash
# Using Homebrew
brew install awsebcli

# Verify
eb --version
# EB CLI 3.20.x (Python 3.x.x)
```

### Linux

```bash
# Using pip
pip install awsebcli --upgrade --user

# Add to PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify
eb --version
```

### Windows

```powershell
# Using pip
pip install awsebcli --upgrade

# Verify
eb --version
```

### Configure EB CLI

```bash
# Already configured if AWS CLI is set up
aws configure list
```

---

## Part 2: Prepare Backend for Deployment

### Step 2.1: Update package.json

```bash
cd backend
```

Edit `backend/package.json`:

```json
{
  "name": "floodguard-backend",
  "version": "1.0.0",
  "scripts": {
    "build": "nest build",
    "start": "node dist/main",
    "start:prod": "node dist/main",
    "prebuild": "prisma generate",
    "postinstall": "prisma generate"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

### Step 2.2: Create Procfile

```bash
cat > Procfile << 'EOF'
web: npm run start:prod
EOF
```

### Step 2.3: Create .ebignore

```bash
cat > .ebignore << 'EOF'
# Development files
node_modules/
.git/
.gitignore

# Environment files
.env
.env.local
.env.*

# IDE
.vscode/
.idea/

# Logs
logs/
*.log

# Tests
test/
coverage/

# Build artifacts (we'll build on deployment)
# Don't ignore dist/ - we need it!
EOF
```

### Step 2.4: Create Environment Config

```bash
cat > .env.production << 'EOF'
# Will be replaced by EB environment variables
NODE_ENV=production
PORT=8080

# Database (set via EB console)
DATABASE_URL=

# AWS (auto-configured by EB)
AWS_REGION=us-east-1
EOF
```

### Step 2.5: Update main.ts for EB

Edit `backend/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS for frontend
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://floodguard.com',
      'https://*.elasticbeanstalk.com'
    ],
    credentials: true,
  });

  // Use PORT from environment (EB uses 8080)
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Backend running on port ${port}`);
}
bootstrap();
```

### Step 2.6: Build Backend

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma generate

# Build
pnpm build

# Test locally
NODE_ENV=production PORT=8080 npm run start:prod
```

Test: http://localhost:8080/health

---

## Part 3: Deploy Backend

### Step 3.1: Initialize EB Application

```bash
cd backend

# Initialize EB
eb init

# Follow prompts:
# Select region: 3) us-east-1
# Application name: FloodGuard-Backend
# Platform: Node.js
# Platform version: Node.js 20 running on 64bit Amazon Linux 2023
# SSH: Yes (for debugging)
# Keypair: Select existing or create new
```

Creates `.elasticbeanstalk/config.yml`

### Step 3.2: Create EB Environment (CLI)

```bash
# Create production environment
eb create floodguard-backend-prod \
  --vpc.id $VPC_ID \
  --vpc.elbsubnets $PUBLIC_SUBNET_1,$PUBLIC_SUBNET_2 \
  --vpc.ec2subnets $PRIVATE_SUBNET_1,$PRIVATE_SUBNET_2 \
  --vpc.securitygroups $APP_SG \
  --vpc.elbpublic \
  --instance-type t3.small \
  --platform "Node.js 20" \
  --envvars \
    NODE_ENV=production,\
    PORT=8080,\
    DATABASE_URL=$DATABASE_URL \
  --tags Project=FloodGuard,Environment=Production
```

⏳ **Takes 5-10 minutes**

### Step 3.3: Configure Load Balancer

```bash
# Set health check
eb config --cfg production-backend

# In editor, update:
aws:elasticbeanstalk:application:
  Application Healthcheck URL: /health

aws:elb:loadbalancer:
  CrossZone: true
  
aws:elb:policies:
  ConnectionDrainingEnabled: true
  ConnectionDrainingTimeout: 20

aws:elasticbeanstalk:environment:
  LoadBalancerType: application
  ServiceRole: aws-elasticbeanstalk-service-role

aws:elbv2:listener:default:
  ListenerEnabled: true
  Protocol: HTTP
  Port: 80

aws:autoscaling:launchconfiguration:
  IamInstanceProfile: aws-elasticbeanstalk-ec2-role
  InstanceType: t3.small
  SecurityGroups: $APP_SG

aws:autoscaling:asg:
  MinSize: 2
  MaxSize: 4
```

### Step 3.4: Deploy Backend

```bash
# Deploy application
eb deploy floodguard-backend-prod

# Check status
eb status

# View URL
eb open
```

### Step 3.5: Test Backend Deployment

```bash
# Get URL
BACKEND_URL=$(eb status | grep CNAME | awk '{print $2}')

# Test health endpoint
curl http://$BACKEND_URL/health

# Expected: {"status":"ok"}
```

---

## Part 4: Prepare Frontend for Deployment

### Step 4.1: Update next.config.ts

```bash
cd ../frontend
```

Edit `frontend/next.config.ts`:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  
  // API endpoint
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  
  // Disable image optimization for EB
  images: {
    unoptimized: true,
  },
  
  // Compress
  compress: true,
  
  // Headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### Step 4.2: Update package.json

Edit `frontend/package.json`:

```json
{
  "name": "floodguard-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start -p $PORT",
    "start:prod": "node .next/standalone/server.js"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

### Step 4.3: Create Procfile

```bash
cat > Procfile << 'EOF'
web: npm run start
EOF
```

### Step 4.4: Create .ebignore

```bash
cat > .ebignore << 'EOF'
# Development
node_modules/
.next/cache
.git/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/

# Tests
coverage/
*.test.*

# Logs
*.log
EOF
```

### Step 4.5: Build Frontend

```bash
# Set API URL
export NEXT_PUBLIC_API_URL="http://floodguard-backend-prod.us-east-1.elasticbeanstalk.com"

# Install
bun install

# Build
bun run build

# Test standalone
PORT=8080 node .next/standalone/server.js
```

Test: http://localhost:8080

---

## Part 5: Deploy Frontend

### Step 5.1: Initialize EB

```bash
cd frontend

eb init

# Prompts:
# Region: us-east-1
# Application: FloodGuard-Frontend
# Platform: Node.js 20
# SSH: Yes
```

### Step 5.2: Create Frontend Environment

```bash
eb create floodguard-frontend-prod \
  --vpc.id $VPC_ID \
  --vpc.elbsubnets $PUBLIC_SUBNET_1,$PUBLIC_SUBNET_2 \
  --vpc.ec2subnets $PRIVATE_SUBNET_1,$PRIVATE_SUBNET_2 \
  --vpc.securitygroups $WEB_SG \
  --vpc.elbpublic \
  --instance-type t3.medium \
  --platform "Node.js 20" \
  --envvars \
    NODE_ENV=production,\
    PORT=8080,\
    NEXT_PUBLIC_API_URL=http://floodguard-backend-prod.us-east-1.elasticbeanstalk.com \
  --tags Project=FloodGuard,Environment=Production
```

### Step 5.3: Configure Frontend ALB

```bash
eb config --cfg production-frontend

# Update:
aws:elasticbeanstalk:application:
  Application Healthcheck URL: /

aws:elb:loadbalancer:
  CrossZone: true

aws:autoscaling:asg:
  MinSize: 2
  MaxSize: 4

aws:autoscaling:launchconfiguration:
  InstanceType: t3.medium
```

### Step 5.4: Deploy Frontend

```bash
eb deploy floodguard-frontend-prod

# Check status
eb status

# Open in browser
eb open
```

---

## Part 6: Configure Environment Variables

### Backend Environment Variables

```bash
cd backend

# Set via CLI
eb setenv \
  NODE_ENV=production \
  PORT=8080 \
  DATABASE_URL="postgresql://floodguard_admin:PASSWORD@$DB_ENDPOINT:5432/floodguard?sslmode=require" \
  JWT_SECRET="your-jwt-secret-here" \
  AWS_REGION=us-east-1 \
  AWS_S3_BUCKET=floodguard-uploads

# Or via Console:
# EB Dashboard → Environments → Configuration → Software → Environment properties
```

### Frontend Environment Variables

```bash
cd frontend

eb setenv \
  NODE_ENV=production \
  PORT=8080 \
  NEXT_PUBLIC_API_URL="https://api.floodguard.com" \
  NEXT_PUBLIC_MAPBOX_TOKEN="your-mapbox-token"
```

### Using AWS Secrets Manager

```bash
# Store secrets
aws secretsmanager create-secret \
  --name floodguard/backend/env \
  --secret-string file://secrets.json

# IAM policy for EB instances
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "secretsmanager:GetSecretValue",
    "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:floodguard/*"
  }]
}
```

---

## Part 7: Set Up Load Balancer & SSL

### Step 7.1: Request SSL Certificate

```bash
# Request certificate from ACM
aws acm request-certificate \
  --domain-name floodguard.com \
  --subject-alternative-names "*.floodguard.com" \
  --validation-method DNS \
  --region us-east-1

# Get certificate ARN
CERT_ARN=$(aws acm list-certificates \
  --query 'CertificateSummaryList[?DomainName==`floodguard.com`].CertificateArn' \
  --output text)

echo "Certificate ARN: $CERT_ARN"
```

### Step 7.2: Validate Certificate

1. Go to **ACM Console**
2. Click certificate
3. Click **Create records in Route 53** (if using Route 53)
4. Wait for validation (5-30 minutes)

### Step 7.3: Add HTTPS Listener to ALB

#### Backend:

```bash
cd backend

# Add HTTPS listener
eb config

# Add:
aws:elbv2:listener:443:
  ListenerEnabled: true
  Protocol: HTTPS
  SSLCertificateArns: $CERT_ARN
  Rules: ""

# Redirect HTTP to HTTPS
aws:elbv2:listener:default:
  ListenerEnabled: true
  Protocol: HTTP
  DefaultProcess: default
  Rules: 'default,action=redirect,protocol=HTTPS,port=443,statusCode=301'
```

#### Frontend:

```bash
cd frontend

# Same configuration
eb config

# Add HTTPS listener with certificate
```

### Step 7.4: Configure Route 53

```bash
# Get ALB DNS names
FRONTEND_ALB=$(eb status | grep CNAME | awk '{print $2}')
BACKEND_ALB=$(cd ../backend && eb status | grep CNAME | awk '{print $2}')

# Create hosted zone (if not exists)
aws route53 create-hosted-zone \
  --name floodguard.com \
  --caller-reference $(date +%s)

# Get hosted zone ID
ZONE_ID=$(aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='floodguard.com.'].Id" \
  --output text | cut -d'/' -f3)

# Create A records
cat > route53-changes.json << EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "floodguard.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "$FRONTEND_ALB",
          "EvaluateTargetHealth": true
        }
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.floodguard.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "$BACKEND_ALB",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch file://route53-changes.json
```

---

## Part 8: Configure Auto Scaling

### Backend Auto Scaling

```bash
cd backend

# Create scaling configuration
cat > .ebextensions/autoscaling.config << EOF
option_settings:
  aws:autoscaling:asg:
    MinSize: 2
    MaxSize: 4
  aws:autoscaling:trigger:
    MeasureName: CPUUtilization
    Statistic: Average
    Unit: Percent
    LowerThreshold: 20
    UpperThreshold: 70
    LowerBreachScaleIncrement: -1
    UpperBreachScaleIncrement: 1
EOF

eb deploy
```

### Frontend Auto Scaling

```bash
cd frontend

# Similar configuration
cat > .ebextensions/autoscaling.config << EOF
option_settings:
  aws:autoscaling:asg:
    MinSize: 2
    MaxSize: 6
  aws:autoscaling:trigger:
    MeasureName: CPUUtilization
    Statistic: Average
    Unit: Percent
    LowerThreshold: 20
    UpperThreshold: 70
EOF

eb deploy
```

---

## Monitoring & Logs

### View Logs

```bash
# Backend logs
cd backend
eb logs

# Follow logs in real-time
eb logs --stream

# Download logs
eb logs --all --cloudwatch-logs

# Frontend logs
cd frontend
eb logs --stream
```

### CloudWatch Monitoring

```bash
# List metrics
aws cloudwatch list-metrics \
  --namespace AWS/ElasticBeanstalk \
  --dimensions Name=EnvironmentName,Value=floodguard-backend-prod

# Get CPU usage
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElasticBeanstalk \
  --metric-name CPUUtilization \
  --dimensions Name=EnvironmentName,Value=floodguard-backend-prod \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

### Health Checks

```bash
# Check health
eb health

# Detailed health
eb health --view-request
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Elastic Beanstalk

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        working-directory: ./backend
        run: |
          npm install -g pnpm
          pnpm install
      
      - name: Build
        working-directory: ./backend
        run: pnpm build
      
      - name: Deploy to EB
        uses: einaregilsson/beanstalk-deploy@v21
        with:
          aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          application_name: FloodGuard-Backend
          environment_name: floodguard-backend-prod
          region: us-east-1
          version_label: ${{ github.sha }}
          deployment_package: backend

  deploy-frontend:
    runs-on: ubuntu-latest
    needs: deploy-backend
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Bun
        uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        working-directory: ./frontend
        run: bun install
      
      - name: Build
        working-directory: ./frontend
        run: bun run build
      
      - name: Deploy to EB
        uses: einaregilsson/beanstalk-deploy@v21
        with:
          aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          application_name: FloodGuard-Frontend
          environment_name: floodguard-frontend-prod
          region: us-east-1
          version_label: ${{ github.sha }}
          deployment_package: frontend
```

---

## Troubleshooting

### Issue 1: Deployment Failed

```bash
# Check logs
eb logs

# Common causes:
# - Missing dependencies in package.json
# - Build errors
# - Port mismatch (must use PORT env var)
```

### Issue 2: Health Check Failing

```bash
# Test health endpoint locally
curl http://localhost:8080/health

# Update health check path
eb config
# Set: Application Healthcheck URL: /health
```

### Issue 3: Database Connection Error

```bash
# Check security group
aws ec2 describe-security-groups --group-ids $DB_SG

# Ensure EB instances can reach RDS
# EB instances should be in App-SG which is allowed in DB-SG
```

### Issue 4: 502 Bad Gateway

```bash
# Check if app is listening on correct port
# Must use: process.env.PORT || 8080

# Check process is running
eb ssh
ps aux | grep node
```

---

## Cost Optimization

### Monthly Cost Estimate

**Backend (t3.small × 2):**
- EC2: ~$30/month
- ALB: ~$22/month
- Data transfer: ~$10/month
- **Subtotal: ~$62/month**

**Frontend (t3.medium × 2):**
- EC2: ~$60/month
- ALB: ~$22/month
- Data transfer: ~$15/month
- **Subtotal: ~$97/month**

**Total EB: ~$160/month**

### Optimization Tips

1. **Use Spot Instances** (70% savings)
2. **Reserved Instances** (40% savings, 1-year)
3. **Right-size instances** (monitor CPU/RAM)
4. **Single ALB** for both apps (save $22/month)
5. **Reduce min instances** in dev/staging

---

## Quick Reference

```bash
# Deploy
eb deploy

# Check status
eb status

# View logs
eb logs --stream

# SSH into instance
eb ssh

# Set environment variables
eb setenv KEY=value

# Scale instances
eb scale 3

# Restart app
eb restart

# Terminate environment
eb terminate floodguard-backend-prod
```

---

**Complete! Both frontend and backend are now deployed to AWS Elastic Beanstalk.**

**Next:** Configure CloudFront CDN for better performance

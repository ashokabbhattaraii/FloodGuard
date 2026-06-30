# Fix Backend Deployment - Make Load Balancer Public

## Problem
The backend load balancer is "internal" and not accessible from the internet.

## Solution Steps

### 1. Wait for current update to finish
```bash
aws elasticbeanstalk describe-environments \
  --environment-names floodguard-team9-backend \
  --region us-east-1 \
  --query 'Environments[0].Status'
```

### 2. Terminate the current environment
```bash
cd backend
eb terminate floodguard-team9-backend --force
```

### 3. Create a new environment with correct settings
```bash
eb create floodguard-team9-backend-v2 \
  --instance-types t3.small \
  --envvars DATABASE_URL=$DATABASE_URL \
  --database.username=postgres \
  --database.password=<your-db-password>
```

### 4. Update DNS/Frontend
Update the frontend environment variable to point to the new backend URL.

## Files Updated
- `.ebextensions/01_vpc.config` - Configures internet-facing load balancer
- `.ebextensions/env.config` - Environment variables

## Alternative: AWS Console
1. Go to Elastic Beanstalk Console
2. Select "floodguard-team9-backend" environment
3. Click "Terminate Environment"
4. Create new environment with "internet-facing" load balancer option

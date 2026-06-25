# FloodGuard — S3 Bucket Setup Guide

> Step-by-step guide to create and configure the S3 bucket used for flood report image uploads.

---

## What You'll Create

- An S3 bucket named `floodguard-uploads` in `ap-southeast-1` (Singapore)
- Private bucket (no public access) — files are accessed via presigned URLs
- CORS configured so the frontend can upload directly from the browser
- IAM permissions so the backend (on Elastic Beanstalk) can generate presigned URLs

---

## Option A — AWS Console (Browser)

### Step 1: Open S3

1. Log in to https://console.aws.amazon.com/
2. In the search bar at the top, type **S3**
3. Click **"S3"** from the results

### Step 2: Create Bucket

1. Click the **"Create bucket"** button (orange)

2. **General configuration:**
   - Bucket name: `floodguard-uploads`
     - ⚠️ Bucket names are globally unique. If taken, use `floodguard-uploads-your-team-name`
   - AWS Region: **Asia Pacific (Singapore) ap-southeast-1**

3. **Object Ownership:**
   - Select: **ACLs disabled (recommended)** ✅

4. **Block Public Access settings for this bucket:**
   - Keep **ALL checkboxes checked** ✅ (Block *all* public access)
   - Check the acknowledgment box that appears

5. **Bucket Versioning:**
   - Select: **Disable**

6. **Tags (optional):**
   - Key: `Project` | Value: `FloodGuard`

7. **Default encryption:**
   - Encryption type: **Server-side encryption with Amazon S3 managed keys (SSE-S3)**
   - Bucket Key: **Enable**

8. Click **"Create bucket"**

✅ You should see a green banner: "Successfully created bucket floodguard-uploads"

### Step 3: Configure CORS

1. Click on your new bucket name (`floodguard-uploads`) to open it
2. Click the **"Permissions"** tab
3. Scroll down to **"Cross-origin resource sharing (CORS)"**
4. Click **"Edit"**
5. Paste this JSON (replace the frontend URL with yours):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:5001",
      "http://floodguard-frontend-env.eba-xxxx.ap-southeast-1.elasticbeanstalk.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

6. Click **"Save changes"**

### Step 4: Create IAM Policy for Backend Access

1. In the search bar, type **IAM** → click **IAM**
2. Left sidebar → **Roles**
3. Search for: `aws-elasticbeanstalk-ec2-role`
   - (This role was auto-created when you set up Elastic Beanstalk)
   - If not found, look for a role with "elasticbeanstalk" in the name
4. Click on the role name to open it
5. Click **"Add permissions"** → **"Create inline policy"**
6. Click the **"JSON"** tab (top right of the policy editor)
7. Delete the existing content and paste:

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

> ⚠️ If you used a different bucket name, replace `floodguard-uploads` in the Resource ARN.

8. Click **"Next"**
9. Policy name: `FloodGuard-S3-Access`
10. Click **"Create policy"**

✅ Done! The backend can now read/write/delete files in the bucket.

### Step 5: Set Environment Variable on EB

1. Go to **Elastic Beanstalk** → your backend environment
2. **Configuration** → **Updates, monitoring, and logging** → **Edit**
3. Scroll to **Environment properties**
4. Add:
   - Name: `S3_BUCKET` | Value: `floodguard-uploads`
   - Name: `AWS_REGION` | Value: `ap-southeast-1`
5. Click **Apply**

---

## Option B — AWS CLI (Terminal)

### Step 1: Create the Bucket

```bash
aws s3api create-bucket \
  --bucket floodguard-uploads \
  --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1
```

Expected output:
```json
{
    "Location": "http://floodguard-uploads.s3.amazonaws.com/"
}
```

### Step 2: Verify It Exists

```bash
aws s3 ls | grep floodguard
# Output: 2026-06-24 12:00:00 floodguard-uploads
```

### Step 3: Block All Public Access (confirm)

```bash
aws s3api put-public-access-block \
  --bucket floodguard-uploads \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### Step 4: Configure CORS

```bash
aws s3api put-bucket-cors \
  --bucket floodguard-uploads \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT"],
        "AllowedOrigins": [
          "http://localhost:3000",
          "http://localhost:5001",
          "http://floodguard-frontend-env.eba-xxxx.ap-southeast-1.elasticbeanstalk.com"
        ],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3600
      }
    ]
  }'
```

### Step 5: Attach S3 Policy to EB Role

```bash
aws iam put-role-policy \
  --role-name aws-elasticbeanstalk-ec2-role \
  --policy-name FloodGuard-S3-Access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "FloodGuardS3Access",
        "Effect": "Allow",
        "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
        "Resource": "arn:aws:s3:::floodguard-uploads/*"
      }
    ]
  }'
```

### Step 6: Set EB Environment Variables

```bash
cd backend
eb setenv S3_BUCKET=floodguard-uploads AWS_REGION=ap-southeast-1
```

---

## Verify Everything Works

### Test Upload from CLI

```bash
# Create a test file
echo "test" > /tmp/test.txt

# Upload directly (to verify permissions)
aws s3 cp /tmp/test.txt s3://floodguard-uploads/test/test.txt

# List files
aws s3 ls s3://floodguard-uploads/test/
# Output: 2026-06-24 12:00:00  5 test.txt

# Clean up
aws s3 rm s3://floodguard-uploads/test/test.txt
```

### Test Presigned URL from Backend

Once the backend is running:

```bash
# 1. Login to get a JWT token
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@floodguard.com","password":"yourpass"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2. Request a presigned upload URL
curl -X POST http://localhost:5001/api/uploads/presign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename":"flood-photo.jpg","contentType":"image/jpeg"}'
```

Expected response:
```json
{
  "url": "https://floodguard-uploads.s3.ap-southeast-1.amazonaws.com/reports/abc123-flood-photo.jpg?X-Amz-Algorithm=...",
  "key": "reports/abc123-flood-photo.jpg"
}
```

---

## Folder Structure in the Bucket

```
floodguard-uploads/
  └── reports/
      ├── a1b2c3d4-flood-photo-1.jpg
      ├── e5f6g7h8-water-level.png
      └── ...
```

All uploads go under the `reports/` prefix automatically (set in `uploads.service.ts`).

---

## Quick Reference

| Item | Value |
|------|-------|
| Bucket name | `floodguard-uploads` |
| Region | `ap-southeast-1` |
| Public access | ❌ Blocked |
| Access method | Presigned URLs (5 min upload, 1 hour download) |
| Backend env var | `S3_BUCKET=floodguard-uploads` |
| IAM policy | `FloodGuard-S3-Access` on `aws-elasticbeanstalk-ec2-role` |
| Upload endpoint | `POST /api/uploads/presign` |
| Download endpoint | `GET /api/uploads/:key` |
| Delete endpoint | `DELETE /api/uploads/:key` |

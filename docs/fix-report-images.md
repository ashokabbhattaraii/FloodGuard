# Fix Report Evidence Images Not Displaying

## Problem

Report photos are not displaying because the `photoUrl` field contains only the S3 key (e.g., `reports/demo-1234.../screenshot.png`) instead of a full URL.

## Solution

I've updated the backend to automatically generate **signed URLs** for report images. This is more secure than making the S3 bucket public.

---

## Changes Made

### 1. Updated `reports.service.ts`

**Added:**
- `UploadsService` injection to generate signed URLs
- `transformPhotoUrl()` method that converts S3 keys to signed URLs
- Modified `findAll()` to transform all photoUrls before returning

**How it works:**
```typescript
// Before: photoUrl = "reports/demo-1234.../screenshot.png"
// After:  photoUrl = "https://floodguard-uploads.s3.us-east-1.amazonaws.com/reports/...?X-Amz-Signature=..."
```

### 2. Updated `reports.module.ts`

**Added:**
- Imported `UploadsModule` to access `UploadsService`

### 3. Added `.env` configuration

**Added:**
- `CLOUDFRONT_DOMAIN` (optional) for CloudFront distributions

---

## How to Apply the Fix

### Step 1: Ensure Backend Changes Are Deployed

The code changes are already in place. Once you run the Prisma migration (for the region enhancements), the backend will compile successfully.

```bash
cd backend

# Run Prisma migration first (this fixes the TypeScript errors)
pnpm prisma migrate deploy

# Then rebuild
pnpm build

# Restart backend
pnpm start:dev
```

### Step 2: Verify S3 Bucket Permissions

The signed URL approach works with **private** S3 buckets (no public access needed).

**Check your S3 bucket settings:**
1. Go to AWS Console → S3 → `floodguard-uploads`
2. Permissions tab
3. Bucket policy should allow AWS SDK access (already configured if uploads work)

### Step 3: Test Image Display

1. Navigate to: `http://localhost:3000/dashboard/admin/reports`
2. Find a report with an attached photo
3. The image should now display correctly
4. Open browser DevTools → Network tab
5. Find the image request → Should show signed URL like:
   ```
   https://floodguard-uploads.s3.us-east-1.amazonaws.com/reports/...?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=...
   ```

---

## Alternative: Use CloudFront for S3 Assets

If you want to use CloudFront instead of direct S3 signed URLs (for better performance and caching):

### Create CloudFront Distribution for S3

1. Go to **AWS Console > CloudFront**
2. Click **Create Distribution**
3. **Origin Settings:**
   - Origin Domain: `floodguard-uploads.s3.us-east-1.amazonaws.com`
   - Origin Path: Leave empty
   - Origin Access: **Origin Access Control (OAC)** — recommended
     - Create new OAC
     - Sign requests: Yes
   - OR use **Legacy Origin Access Identity (OAI)**

4. **Default Cache Behavior:**
   - Viewer Protocol Policy: **Redirect HTTP to HTTPS**
   - Allowed HTTP Methods: **GET, HEAD, OPTIONS**
   - Cache Policy: **CachingOptimized**
   - Origin Request Policy: **CORS-S3Origin**

5. **Settings:**
   - Price Class: **Use only North America and Europe**
   - SSL Certificate: **Default CloudFront certificate**

6. Click **Create Distribution**

7. Wait ~5-10 minutes for deployment

8. Copy the **Distribution Domain Name** (e.g., `d1234abcd.cloudfront.net`)

### Update S3 Bucket Policy

CloudFront needs permission to read from S3. AWS will show you the policy to add:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::floodguard-uploads/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::YOUR-ACCOUNT-ID:distribution/YOUR-DISTRIBUTION-ID"
        }
      }
    }
  ]
}
```

### Update Backend Environment Variable

```bash
# In backend/.env
CLOUDFRONT_DOMAIN=d1234abcd.cloudfront.net
```

Restart backend:
```bash
pnpm start:dev
```

Now images will be served via CloudFront:
```
https://d1234abcd.cloudfront.net/reports/demo-1234.../screenshot.png
```

---

## Troubleshooting

### Issue: Images still not showing

**Check 1: Backend logs**
```bash
cd backend
pnpm logs
```

Look for errors like "Error generating signed URL"

**Check 2: AWS credentials**
```bash
aws s3 ls s3://floodguard-uploads/reports/
```

If this fails, your AWS credentials aren't configured.

**Check 3: S3 bucket exists**
```bash
aws s3 ls | grep floodguard
```

Should show `floodguard-uploads`

**Check 4: Browser console**
Open DevTools → Console. Look for:
- CORS errors → Update S3 CORS policy
- 403 Forbidden → Bucket permissions issue
- Invalid signature → AWS credentials mismatch

### Issue: CORS errors

Update S3 CORS policy:

1. Go to S3 → `floodguard-uploads` → Permissions → CORS
2. Add:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://d1brawvkbdw12u.cloudfront.net",
      "https://d2rcbc2k3a39go.cloudfront.net"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### Issue: Signed URLs expire too quickly

Signed URLs expire after 1 hour (3600 seconds). If you need longer:

Edit `backend/src/uploads/uploads.service.ts`:

```typescript
const url = await getSignedUrl(this.s3, command, { 
  expiresIn: 3600  // Change to 86400 for 24 hours
});
```

---

## Performance Considerations

### Signed URLs (Current Approach)
- ✅ **Pros:** Secure, no public bucket needed, works immediately
- ⚠️ **Cons:** Backend generates URL for each request, URLs expire

### CloudFront with OAC (Recommended for Production)
- ✅ **Pros:** Fast, cached, secure, no expiry
- ✅ **Pros:** Reduces load on S3 and backend
- ⚠️ **Cons:** Requires CloudFront setup (~10 min)

---

## Summary

**Current Status:**
- ✅ Backend code updated to generate signed URLs
- ✅ Reports module imports UploadsModule
- ⏳ Waiting for Prisma migration to run (fixes TypeScript errors)

**Next Steps:**
1. Run Prisma migration: `pnpm prisma migrate deploy`
2. Rebuild backend: `pnpm build`
3. Restart backend: `pnpm start:dev`
4. Test image display in browser
5. (Optional) Set up CloudFront for better performance

**Estimated Time:** 5 minutes (or 15 with CloudFront)

---

## Testing Checklist

After applying the fix:

- [ ] Backend starts without errors
- [ ] Navigate to `/dashboard/admin/reports`
- [ ] Reports with photos show images
- [ ] Image URL in DevTools Network tab is signed URL
- [ ] No CORS errors in browser console
- [ ] Images load in < 2 seconds

---

**Status:** ✅ Code changes complete, waiting for Prisma migration

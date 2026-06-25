# Free SSL with CloudFront + Elastic Beanstalk

Enable HTTPS for your FloodGuard app without buying a domain — using CloudFront's free `*.cloudfront.net` SSL.

---

## Prerequisites

- AWS account with access to CloudFront and ACM
- Your EB environments are running:
  - Frontend: `http://floodguard-frontend-env.eba-sfpvamy6.us-east-1.elasticbeanstalk.com`
  - Backend: `http://Floodguard-backend-env-env.eba-uhm53rb8.us-east-1.elasticbeanstalk.com`

---

## Step 1: Create a CloudFront Distribution

1. Go to **AWS Console > CloudFront**
2. Click **"Create Distribution"**

### Origin Type

> **IMPORTANT:** Do NOT select "Amazon S3" — your app runs on Elastic Beanstalk, not S3.

Select **"Other"** — this is for any publicly resolvable URL like your EB environment.

### Origin Settings

| Field | Value |
|-------|-------|
| Origin type | **Other** |
| Origin domain | `floodguard-frontend-env.eba-sfpvamy6.us-east-1.elasticbeanstalk.com` |
| Protocol | **HTTP only** (EB is serving on port 80) |
| HTTP port | `80` |
| Origin path | Leave empty |
| Name | `floodguard-frontend` (auto-filled) |

### Default Cache Behavior Settings

| Field | Value |
|-------|-------|
| Viewer protocol policy | **Redirect HTTP to HTTPS** |
| Allowed HTTP methods | **GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE** |
| Cache policy | `CachingDisabled` (for dynamic app) |
| Origin request policy | `AllViewer` |

> **Important:** Since this is a dynamic Next.js app, disable caching. If you want to cache static assets later, create a separate behavior for `/_next/static/*`.

### Web Application Firewall (WAF)

- Select **"Do not enable security protections"** (to stay free)

### Settings

| Field | Value |
|-------|-------|
| Price class | **Use only North America and Europe** (cheapest) |
| Alternate domain name (CNAME) | Leave empty (use default cloudfront.net domain) |
| SSL certificate | **Default CloudFront certificate (*.cloudfront.net)** |
| Default root object | Leave empty |

3. Click **"Create Distribution"**
4. Wait ~5-10 minutes for deployment (status changes from "Deploying" to "Enabled")

---

## Step 2: Get Your HTTPS URL

Once deployed, find your distribution's **Domain Name** in the CloudFront dashboard:

```
https://d1a2b3c4d5e6f7.cloudfront.net
```

This is your new HTTPS-enabled URL — free, no domain required.

---

## Step 3: Create a Backend CloudFront Distribution

Your backend also needs HTTPS. Create a **second** CloudFront distribution for the backend EB environment.

1. Go to **CloudFront > Create Distribution**

### Origin Settings

| Field | Value |
|-------|-------|
| Origin type | **Other** |
| Origin domain | `Floodguard-backend-env-env.eba-uhm53rb8.us-east-1.elasticbeanstalk.com` |
| Protocol | **HTTP only** |
| HTTP port | `80` |
| Origin path | Leave empty |

### Default Cache Behavior

| Field | Value |
|-------|-------|
| Viewer protocol policy | **Redirect HTTP to HTTPS** |
| Allowed HTTP methods | **GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE** |
| Cache policy | `CachingDisabled` |
| Origin request policy | `AllViewer` |

### WAF & Settings

- WAF: **Do not enable security protections**
- Price class: **Use only North America and Europe**
- SSL certificate: **Default CloudFront certificate (*.cloudfront.net)**

2. Click **"Create Distribution"** and wait for deployment (~5-10 min)

Your backend HTTPS URL:
```
https://d2rcbc2k3a39go.cloudfront.net
```

---

## Step 4: Update S3 CORS

Add your CloudFront URLs to the S3 bucket CORS so image uploads work:

Go to **S3 > floodguard-uploads > Permissions > CORS** and update:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "DELETE"],
    "AllowedOrigins": [
      "https://d1brawvkbdw12u.cloudfront.net",
      "https://d2rcbc2k3a39go.cloudfront.net",
      "http://floodguard-frontend-env.eba-sfpvamy6.us-east-1.elasticbeanstalk.com",
      "http://localhost:3000",
      "http://localhost:3001"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## Step 5: Update Backend CORS

The backend must allow requests from the frontend CloudFront URL. 

Update the `FRONTEND_URL` environment variable on your backend EB environment:

**EB Console > Floodguard-backend-env-env > Configuration > Software > Environment properties:**

```
FRONTEND_URL=https://d1brawvkbdw12u.cloudfront.net,http://floodguard-frontend-env.eba-sfpvamy6.us-east-1.elasticbeanstalk.com,http://localhost:3000,http://localhost:3001
```

This is already handled in `backend/src/main.ts` — it splits `FRONTEND_URL` by commas.

---

## Step 6: Update Frontend API URL

Update your frontend's API base URL to point to the backend CloudFront distribution:

**EB Console > floodguard-frontend-env > Configuration > Software > Environment properties:**

```
NEXT_PUBLIC_API_URL=https://d2rcbc2k3a39go.cloudfront.net/api
```

> The `/api` suffix is needed because the backend uses the `api` global prefix.
> **IMPORTANT:** `NEXT_PUBLIC_*` vars are baked in at **build time** in Next.js. After changing this, you must **rebuild and redeploy** the frontend.

### Actual URLs

| Service | HTTP (EB) | HTTPS (CloudFront) |
|---------|-----------|-------------------|
| Frontend | `http://floodguard-frontend-env.eba-sfpvamy6.us-east-1.elasticbeanstalk.com` | `https://d1brawvkbdw12u.cloudfront.net` |
| Backend | `http://Floodguard-backend-env-env.eba-uhm53rb8.us-east-1.elasticbeanstalk.com/api` | `https://d2rcbc2k3a39go.cloudfront.net/api` |

---

## Costs

| Service | Free Tier | After Free Tier |
|---------|-----------|-----------------|
| CloudFront | 1 TB transfer + 10M requests/month (first 12 months) | ~$0.085/GB |
| ACM Certificate | Always free | Always free |
| EB (unchanged) | Same as before | Same as before |

For a university project, you will almost certainly stay within the free tier.

---

## Troubleshooting

### "502 Bad Gateway" from CloudFront
- Ensure your EB environment is healthy and responding on port 80
- Check that the origin domain is correct (no `https://` prefix in the origin field)

### CORS errors on file upload
- Make sure you added the CloudFront URL to S3 CORS (Step 3)

### Pages return old content
- If you enabled caching by accident, go to **Invalidations** tab and create an invalidation with path `/*`

### WebSocket or SSE not working
- CloudFront supports WebSockets by default, but ensure "Allowed HTTP methods" includes all methods

---

## Quick Reference

```
Your HTTPS URL:  https://<distribution-id>.cloudfront.net
CloudFront Console: https://console.aws.amazon.com/cloudfront/
ACM Console: https://console.aws.amazon.com/acm/
```

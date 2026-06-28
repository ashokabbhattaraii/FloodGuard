# Elastic Beanstalk Deployment Fix Guide

## Issues Found

### Frontend Issues (RESOLVED)
1. **Missing `.next/standalone` folder** - The deployment was looking for `.next/standalone/server.js` but it wasn't being uploaded
2. **Symlinked node_modules** - bun creates pnpm-style symlinked node_modules that don't zip properly for EB deployment
3. **Missing static assets** - `public/` and `.next/static/` need to be copied into the standalone folder

### Backend Issues (IN PROGRESS)
1. **Application failing health checks** - The backend is returning Red health status
2. **Possible startup errors** - Need to verify the application is starting correctly

## Solutions Implemented

### Frontend Fix

**Step 1: Switch from bun to npm for production builds**
```bash
# bun creates symlinked node_modules that break EB zip packaging
npm install
npm run build
```

**Step 2: Copy static assets to standalone folder**
```bash
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/
```

**Step 3: Updated Procfile**
```
web: cd .next/standalone && HOSTNAME=0.0.0.0 PORT=8080 node server.js
```

**Step 4: Updated .ebignore**
```
# Exclude development files
backend/
.git/
.env.local
docs/
*.md
bun.lockb
.claude/
.antigravitycli/
.agents/
node_modules/
*.log
.DS_Store
.next/cache/
.next/trace
.next/diagnostics/
```

### Backend Fix

**Verified configurations:**
- ✅ Health check endpoint exists at `/api/health`
- ✅ Environment variables are set (DATABASE_URL, S3_BUCKET, etc.)
- ✅ Build artifacts exist in `dist/` folder
- ✅ Procfile points to correct entry: `web: node dist/src/main.js`

**Deployment command:**
```bash
cd backend
pnpm build
eb deploy --label "backend-fix-$(date +%Y%m%d-%H%M%S)"
```

## Quick Deployment Guide

### Frontend Deployment (npm-based)
```bash
# From project root
npm install
npm run build
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/
eb deploy
```

### Backend Deployment
```bash
# From backend/
pnpm install
pnpm build
eb deploy
```

## Environment Status Commands

```bash
# Check frontend status
eb status

# Check backend status
cd backend && eb status

# View environment variables
eb printenv

# View recent logs
eb logs --all

# Monitor health in real-time
eb health --refresh
```

## Architecture Confirmation

Both frontend and backend are deployed on **Elastic Beanstalk**, which provides:
- ✅ Auto-scaling (EC2 instances)
- ✅ Load balancing (Application Load Balancer)
- ✅ Health monitoring (CloudWatch integration)
- ✅ Rolling deployments
- ✅ Managed platform updates

This meets the project requirements for:
- **Task 1**: Cloud compute (EC2 via EB) + Database (RDS PostgreSQL)
- **Task 2**: Additional services (S3, SNS/SES, Lambda, CloudWatch monitoring)

## Deployment Files Structure

```
problem-4/
├── .next/standalone/          # Built Next.js app (deployed)
│   ├── .next/
│   │   └── static/           # Copied from build
│   ├── public/               # Copied from source
│   ├── node_modules/         # npm dependencies (no symlinks)
│   └── server.js
├── .ebextensions/
│   └── env.config           # Environment variables
├── .platform/
│   └── hooks/
│       └── predeploy/
│           └── 01_copy_static.sh
├── Procfile                  # web: cd .next/standalone && node server.js
└── .ebignore                # Excludes source, keeps build output

backend/
├── dist/                     # Built NestJS app (deployed)
│   └── src/
│       └── main.js
├── .ebextensions/
│   ├── env.config           # Environment variables
│   └── healthcheck.config   # /api/health endpoint
├── Procfile                  # web: node dist/src/main.js
└── .ebignore                # Excludes source, keeps dist/
```

## Troubleshooting

### If frontend is still degraded:
1. Check logs: `eb logs --all`
2. Verify `.next/standalone` folder exists: `ls -la .next/standalone/`
3. Ensure no symlinks: `find .next/standalone -type l`
4. Check Procfile syntax
5. Verify port 8080 is used (EB requirement)

### If backend is still red:
1. Check logs: `cd backend && eb logs --all`
2. Test health endpoint locally: `curl http://localhost:8080/api/health`
3. Verify DATABASE_URL is set: `eb printenv | grep DATABASE_URL`
4. Check RDS security group allows EB security group
5. Verify Prisma schema is generated: `pnpm prisma generate`

## Next Steps After Deployment

1. Wait for environments to stabilize (5-10 minutes)
2. Check health status: Both should show "Green"
3. Test endpoints:
   - Frontend: `http://floodguard-frontend-env.eba-sfpvamy6.us-east-1.elasticbeanstalk.com`
   - Backend: `http://Floodguard-backend-env-env.eba-uhm53rb8.us-east-1.elasticbeanstalk.com/api/health`
4. Monitor CloudWatch metrics
5. Update CLAUDE.md with deployment lessons learned

## Key Lessons

1. **Use npm for EB deployments**, not bun - symlinks break zip packaging
2. **Always copy static assets** to standalone folder
3. **Test locally first**: `cd .next/standalone && PORT=3000 node server.js`
4. **Health checks are critical** - EB marks as degraded if endpoint fails
5. **Environment variables** must be set before deployment

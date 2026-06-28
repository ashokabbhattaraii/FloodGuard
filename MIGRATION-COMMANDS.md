# Region Enhancement Migration — Commands to Run

## ⚠️ Prerequisites
- AWS RDS database must be accessible
- Backend environment variables configured
- You're logged into AWS with proper credentials

---

## Step 1: Run Database Migration

```bash
cd backend

# This will create the migration and apply it to the database
pnpm prisma migrate deploy
```

If that fails with "P1001 Can't reach database", the migration is already generated at:
- `backend/prisma/migrations/[timestamp]_enhance_regions_with_coordinates_sensors_volunteers/migration.sql`

You can manually apply it to your RDS database when accessible.

---

## Step 2: Seed Realistic Malaysian Regions

```bash
# Still in backend directory
pnpm tsx prisma/seed-realistic.ts
```

This will create:
- ✅ 5 realistic Malaysian flood-prone regions
- ✅ 14 sensors with real coordinates
- ✅ 5 evacuation centers
- ✅ 2 volunteer assignments
- ✅ 2 active alerts

**Regions created:**
1. Klang River Valley (KL) — Critical risk
2. Shah Alam Industrial Zone — High risk
3. Penang Georgetown Coastal — Medium risk
4. Johor Bahru City Center — Medium risk
5. Petaling Jaya Highlands — Low risk

---

## Step 3: Verify Backend

```bash
# Restart backend server
pnpm start:dev
```

Test endpoints:
```bash
# List all regions
curl http://localhost:3001/api/regions

# Get region details
curl http://localhost:3001/api/regions/{regionId}

# Get region status (with sensor data)
curl http://localhost:3001/api/regions/{regionId}/status
```

---

## Step 4: Test Frontend

```bash
# In root directory (not backend)
cd ..
bun dev
```

Navigate to:
```
http://localhost:3000/dashboard/admin/regions
```

**What you'll see:**
- Grid of 5 Malaysian regions with risk-based colors
- Sensor counts, alert counts, volunteer counts, shelter counts
- Click any card to open detailed modal with tabs:
  - **Sensors:** Real sensor readings with status (normal/warning/critical)
  - **Volunteers:** Assigned volunteers with dates
  - **Evacuation Centers:** Shelters with capacity and contact info
  - **Details:** Full region metadata and coordinates

---

## Login Credentials

| Role      | Email                   | Password  |
|-----------|-------------------------|-----------|
| Admin     | admin@gmail.com         | 12345678  |
| Volunteer | volunteer1@gmail.com    | 12345678  |
| Resident  | user@gmail.com          | 12345678  |

---

## If Migration Fails

If you get database connection errors:

### Option 1: Use Local PostgreSQL

```bash
# Install PostgreSQL locally
brew install postgresql@16
brew services start postgresql@16

# Create local database
createdb floodguard

# Update .env.local
DATABASE_URL="postgresql://postgres:password@localhost:5432/floodguard?schema=public"

# Run migration
pnpm prisma migrate dev
```

### Option 2: Deploy to AWS First

```bash
# Push schema directly to RDS (no migration files)
pnpm prisma db push

# Then seed
pnpm tsx prisma/seed-realistic.ts
```

---

## What Changed

### Database Schema
- **Region**: Added `description`, `centerLat`, `centerLng`, `population`, `area`, volunteers relation
- **RegionVolunteer**: New junction table for volunteer assignments
- **Sensor**: Added `name`, `latitude`, `longitude`, `unit`, `isActive`, `createdAt`
- **EvacuationRoute**: Added `address`, `latitude`, `longitude`, `currentCount`, `facilities`, `contactPhone`, `isActive`, timestamps

### Backend API
- 10+ new endpoints for region, sensor, and volunteer management
- Auto-calculated risk levels based on sensor thresholds
- Sensor status mapping (normal/warning/critical)

### Frontend
- Enhanced region management page with modal details
- 3 new components: RegionCard, RegionDetailsModal, CreateRegionModal
- Tabbed interface for sensors, volunteers, shelters
- Real-time sensor status visualization

---

## Quick Test Checklist

After migration completes:

- [ ] Backend starts without errors
- [ ] `/api/regions` returns 5 regions
- [ ] Frontend loads region grid
- [ ] Clicking region card opens modal
- [ ] "Sensors" tab shows sensor readings with colors
- [ ] "Volunteers" tab shows 2 assignments
- [ ] "Evacuation Centers" tab shows 5 shelters
- [ ] "Add Region" button opens creation form

---

## Troubleshooting

**Error: Can't reach database**
- Check AWS security group allows your IP
- Verify RDS instance is running
- Test connection: `psql $DATABASE_URL`

**Error: Migration failed**
- Use `pnpm prisma db push` instead (skips migration history)
- Or manually run SQL from generated migration file

**Seed script fails**
- Check if data already exists (upsert should handle this)
- Clear database: `pnpm prisma migrate reset --force`

**Frontend shows no regions**
- Check browser console for API errors
- Verify backend is running on port 3001
- Check CORS settings in backend

---

## Next Steps After Migration

1. **Test the UI** — Open region details, verify all tabs work
2. **Test sensor updates** — Update a sensor value via API, see risk recalculate
3. **Test volunteer assignment** — Assign/remove volunteers via UI (TODO: add UI)
4. **Add map integration** — Display regions on Mapbox/Leaflet
5. **Simulate sensor data** — Create Lambda function to update sensor readings

---

## Files Changed

**Backend:**
- `prisma/schema.prisma` — Enhanced schema
- `prisma/seed-realistic.ts` — New seed with Malaysian regions
- `src/regions/regions.dto.ts` — New DTOs
- `src/regions/regions.service.ts` — Enhanced service
- `src/regions/regions.controller.ts` — New endpoints

**Frontend:**
- `app/(dashboard)/dashboard/admin/regions/page.tsx` — Main page
- `app/(dashboard)/dashboard/admin/regions/_components/RegionCard.tsx` — Card component
- `app/(dashboard)/dashboard/admin/regions/_components/RegionDetailsModal.tsx` — Details modal
- `app/(dashboard)/dashboard/admin/regions/_components/CreateRegionModal.tsx` — Create form
- `app/services/regions.ts` — Enhanced API client

**Docs:**
- `docs/region-enhancement-migration.md` — Full migration guide
- `MIGRATION-COMMANDS.md` — This file

---

**Ready to migrate?** Run Step 1 above when your database is accessible! 🚀

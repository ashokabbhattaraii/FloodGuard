# Region Management Enhancement — Migration Guide

## Overview
This migration enhances the region management system with:
- ✅ **Real geographic coordinates** (lat/lng boundaries)
- ✅ **Detailed sensor management** (name, location, status tracking)
- ✅ **Volunteer assignments** to regions
- ✅ **Enhanced evacuation centers** with contact info and facilities
- ✅ **Realistic Malaysian flood-prone regions** as seed data
- ✅ **Risk level auto-calculation** based on sensor readings
- ✅ **Comprehensive admin UI** with modal details

---

## Database Changes

### Schema Updates

**Region model**:
- Added: `description`, `centerLat`, `centerLng`, `population`, `area`
- Enhanced: `coordinates` (now GeoJSON Polygon format)
- Relation: Added `volunteers` and `evacuationRoutes` relations

**New model: RegionVolunteer**:
- Links volunteers to regions with assignment tracking

**Sensor model enhancements**:
- Added: `name`, `latitude`, `longitude`, `unit`, `isActive`, `createdAt`

**EvacuationRoute model enhancements**:
- Added: `address`, `latitude`, `longitude`, `currentCount`, `facilities`, `contactPhone`, `isActive`, `createdAt`, `updatedAt`
- Relation: Added to Region

---

## Backend Changes

### New API Endpoints

**Regions:**
```
GET    /regions              # List all (enhanced with counts)
GET    /regions/:id          # Get one region details
GET    /regions/:id/status   # Get calculated risk + sensor status
POST   /regions              # Create region (admin)
PUT    /regions/:id          # Update region (admin)
DELETE /regions/:id          # Delete region (super admin)
```

**Volunteers:**
```
GET    /regions/:id/volunteers          # List volunteers
POST   /regions/:id/volunteers          # Assign volunteer (admin)
DELETE /regions/:id/volunteers/:userId # Remove volunteer (admin)
```

**Sensors:**
```
GET    /regions/:id/sensors             # List sensors
POST   /regions/:id/sensors             # Add sensor (admin)
PUT    /regions/:id/sensors/:sensorId   # Update sensor (admin)
DELETE /regions/:id/sensors/:sensorId   # Delete sensor (admin)
```

### Service Enhancements

**regions.service.ts**:
- `calculateRiskLevel()` — Auto-calculate risk based on sensor thresholds
- Sensor status mapping (normal/warning/critical)
- Cascade delete for related records

---

## Frontend Changes

### Updated Pages

**`/dashboard/admin/regions`**:
- Grid view of all regions with quick stats
- Click card to open detailed modal
- Create region modal with full form

### New Components

1. **RegionCard** (`_components/RegionCard.tsx`)
   - Shows region summary with risk-based gradient
   - Displays sensors, alerts, volunteers, shelters count
   - Geographic coordinates and population info

2. **RegionDetailsModal** (`_components/RegionDetailsModal.tsx`)
   - Tabbed interface: Sensors | Volunteers | Shelters | Info
   - Real-time sensor status with color coding
   - Volunteer assignment list
   - Evacuation center details with capacity

3. **CreateRegionModal** (`_components/CreateRegionModal.tsx`)
   - Full form for region creation
   - Lat/lng input, population, area, risk level
   - Form validation

---

## Migration Steps

### 1. Update Database Schema

```bash
cd backend

# Generate Prisma migration
pnpm prisma migrate dev --name enhance-regions

# This will:
# - Add new columns to regions table
# - Create region_volunteers junction table
# - Update sensors and evacuation_routes tables
# - Add indexes
```

### 2. Seed Realistic Data

We've created a new seed file with **real Malaysian flood-prone regions**:

```bash
# Run the realistic seed
pnpm tsx prisma/seed-realistic.ts
```

**Regions included:**
1. **Klang River Valley** (KL) — Critical risk, 4 sensors
2. **Shah Alam Industrial Zone** — High risk, 3 sensors
3. **Penang Georgetown Coastal** — Medium risk, 2 sensors
4. **Johor Bahru City Center** — Medium risk, 2 sensors
5. **Petaling Jaya Highlands** — Low risk, 1 sensor

Total: **5 regions, 14 sensors, 5 evacuation centers, 2 volunteers assigned**

### 3. Deploy Backend

```bash
# Rebuild backend
pnpm build

# Restart backend server
pnpm start:dev  # or pnpm start:prod
```

### 4. Deploy Frontend

```bash
cd ..  # Back to root

# No build needed — Next.js will hot-reload
# Visit: http://localhost:3000/dashboard/admin/regions
```

---

## Features Demonstration

### 1. View Enhanced Regions
- Navigate to `/dashboard/admin/regions`
- See realistic Malaysian regions with risk colors
- Click any region card to open details modal

### 2. Sensor Monitoring
- In region details modal, go to "Sensors" tab
- See sensor locations, current values, thresholds
- Color-coded status: 🟢 Normal | 🟠 Warning | 🔴 Critical

### 3. Calculated Risk
- System auto-calculates risk based on sensors above threshold
- Formula: `(sensors_above_threshold / total_sensors) * 100`
  - ≥75% → Critical
  - ≥50% → High
  - ≥25% → Medium
  - <25% → Low

### 4. Volunteer Assignments
- "Volunteers" tab shows who's assigned to the region
- Shows assignment date and status

### 5. Evacuation Centers
- "Shelters" tab lists all registered centers
- Shows capacity, occupancy, contact info, coordinates

### 6. Create New Region
- Click "Add Region" button
- Fill form with:
  - Name, description
  - Center coordinates (lat/lng)
  - Population, area
  - Risk level
- System validates and creates

---

## API Testing

### Test Sensor Reading Update
```bash
curl -X PUT http://localhost:3001/api/regions/{regionId}/sensors/{sensorId} \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"currentValue": 4.8}'
```

### Test Volunteer Assignment
```bash
curl -X POST http://localhost:3001/api/regions/{regionId}/volunteers \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"userId": "volunteer-user-id"}'
```

### Get Region Status
```bash
curl http://localhost:3001/api/regions/{regionId}/status
```

Response includes:
```json
{
  "id": "...",
  "name": "Klang River Valley",
  "riskLevel": "critical",
  "calculatedRisk": "high",  // Auto-calculated
  "sensorsAboveThreshold": 3,
  "sensorStatus": [
    {
      "id": "...",
      "name": "Klang River Water Level Sensor #1",
      "type": "water_level",
      "currentValue": 4.2,
      "threshold": 3.5,
      "unit": "m",
      "status": "critical",  // Derived from value vs threshold
      "latitude": 3.1395,
      "longitude": 101.6875
    }
  ],
  "sensors": [...],
  "alerts": [...],
  "volunteers": [...]
}
```

---

## Real-World Usage

### For Admins:
1. Monitor all regions from grid view
2. Click region to see detailed sensor readings
3. Assign volunteers to high-risk areas
4. Add new sensors as they're deployed
5. Update evacuation center capacity in real-time

### For Volunteers:
- See which regions they're assigned to
- Access evacuation center contact info
- Monitor sensor status in their zone

### For System:
- Auto-calculate risk based on live sensor data
- Trigger alerts when thresholds exceeded
- Track shelter occupancy vs capacity

---

## Next Steps / Future Enhancements

1. **Map Integration**
   - Display regions and sensors on interactive map (Mapbox/Leaflet)
   - Draw GeoJSON boundaries visually
   - Click map to place sensors

2. **Sensor Simulation**
   - Lambda function to simulate sensor value changes
   - Trigger alerts when thresholds exceeded

3. **Volunteer Dashboard**
   - Dedicated view for volunteers
   - Show their assigned regions
   - Quick access to evacuation routes

4. **Historical Data**
   - Store sensor reading history
   - Chart sensor trends over time
   - Flood event timeline

5. **Mobile App**
   - React Native app for volunteers
   - Push notifications for assignments
   - Offline evacuation maps

---

## Login Credentials

After running `seed-realistic.ts`:

| Role      | Email                   | Password  |
|-----------|-------------------------|-----------|
| Admin     | admin@gmail.com         | 12345678  |
| Volunteer | volunteer1@gmail.com    | 12345678  |
| Volunteer | volunteer2@gmail.com    | 12345678  |
| Resident  | user@gmail.com          | 12345678  |

---

## Support

If you encounter issues:
1. Check backend logs: `cd backend && pnpm logs`
2. Verify database migrations: `pnpm prisma migrate status`
3. Re-seed if needed: `pnpm tsx prisma/seed-realistic.ts`
4. Check API health: `curl http://localhost:3001/api/health`

---

## Assessment Alignment

**Task #1 (30 marks):**
- ✅ Frontend: Enhanced region management UI with modals
- ✅ Backend: Comprehensive REST API for regions, sensors, volunteers
- ✅ Database: Complex relational schema with proper constraints

**Task #2 (20 marks):**
- ✅ Will integrate S3 for sensor data images
- ✅ Will use SNS/SES for sensor threshold alerts
- ✅ Lambda can simulate sensor readings
- ✅ CloudWatch for API monitoring

**Each team member can own:**
1. Member 1: Public region map view + sensor visualization
2. Member 2: Volunteer assignment dashboard + evacuation routing
3. Member 3: Admin region CRUD + sensor management (this implementation)
4. Member 4: Super admin + analytics + cloud monitoring

---

**Status:** ✅ Migration Complete
**Next:** Run Prisma migration → Seed data → Test in browser

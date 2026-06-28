# Interactive Map Region Selection — Guide

## Overview

The region management system now includes an **interactive map** powered by Leaflet for precise geographic selection. Admins can:

✅ Click map or drag marker to set region center  
✅ Draw polygon/rectangle boundaries  
✅ Search for Malaysian locations  
✅ View existing regions with color-coded risk levels  
✅ Switch between map and manual coordinate entry

---

## Features

### 1. **Interactive Map Selection**

**Map Controls:**
- **Click anywhere** on map → Places center marker
- **Drag marker** → Repositions region center
- **Drawing tools** (top right) → Draw boundaries
  - Polygon tool for custom shapes
  - Rectangle tool for quick rectangular regions
  - Edit tool to modify existing boundaries
  - Delete tool to remove boundaries

### 2. **Location Search**

**Search Bar:**
- Type Malaysian city/location (e.g., "Kuala Lumpur", "Shah Alam")
- Press Enter or click "Search"
- Uses **Nominatim** (OpenStreetMap) — free, no API key needed
- Automatically moves map and marker to location

### 3. **Existing Regions Display**

**Visual Indicators:**
- 🔴 Critical regions → Red markers
- 🟠 High risk → Orange markers  
- 🟡 Medium risk → Blue markers
- 🟢 Low risk → Green markers

**Boundaries:**
- Existing region boundaries shown as dashed lines
- Click marker to see region name and risk level popup

### 4. **Two Input Modes**

**📝 Manual Entry:**
- Direct lat/lng input fields
- For precise coordinates from external sources
- Quick entry without map interaction

**🗺️ Map Selection:**
- Visual location picking
- Draw boundaries interactively
- See context with existing regions

---

## How to Use

### Creating a Region with Map

1. Click **"Add Region"** button
2. Click **"🗺️ Map Selection"** tab
3. **Search** for location or **click map** to place center marker
4. **Draw boundary** using tools (top right):
   - Click polygon/rectangle icon
   - Click map points to draw shape
   - Double-click to finish
5. Fill region details (name, description, etc.)
6. Click **"Create Region"**

### Example: Create "Klang River Valley" Region

```
1. Click "Add Region"
2. Switch to "Map Selection"
3. Search: "Kuala Lumpur" → Press Enter
4. Map centers on KL
5. Click polygon tool (top right)
6. Draw boundary around river valley area:
   - Click point 1: Near Masjid Jamek
   - Click point 2: Along Klang River north
   - Click point 3: Near Central Market
   - Click point 4: Along riverbank south
   - Double-click to close polygon
7. See confirmation: "📍 Center: 3.1480°, 101.6945° 🗺️ Boundary: 5 points"
8. Fill form:
   - Name: "Klang River Valley"
   - Description: "Flood-prone area along Klang River..."
   - Population: 150000
   - Area: 25.5
   - Risk: Critical
9. Click "Create Region"
```

---

## Technical Details

### Libraries Used

**Leaflet** — Open-source mapping library
- Version: 1.9.4
- License: BSD 2-Clause (free for commercial use)
- Map tiles: OpenStreetMap (free, no API key)

**react-leaflet** — React wrapper for Leaflet
- Version: 5.0.0
- Official React bindings

**leaflet-draw** — Drawing tools
- Version: 1.0.4
- Polygon, rectangle, edit, delete tools

### Map Configuration

**Default Center:** Kuala Lumpur (3.1390°, 101.6869°)  
**Default Zoom:** 12 (city-level view)  
**Max Zoom:** 18 (street-level detail)

**Tile Provider:** OpenStreetMap
- URL: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- Attribution: © OpenStreetMap contributors
- Free, no API key, no rate limits for reasonable use

### Data Format

**Center Coordinates:**
```typescript
{
  centerLat: 3.1390,
  centerLng: 101.6869
}
```

**Boundary Polygon (GeoJSON):**
```json
{
  "type": "Polygon",
  "coordinates": [[
    [101.6800, 3.1300],
    [101.6950, 3.1300],
    [101.6950, 3.1480],
    [101.6800, 3.1480],
    [101.6800, 3.1300]
  ]]
}
```

**Note:** GeoJSON uses `[longitude, latitude]` format, but Leaflet uses `[latitude, longitude]`. The component handles this conversion automatically.

---

## Styling

### Theme Integration

Map components automatically adapt to light/dark theme:

**Light Theme:**
- Controls: White with subtle borders
- Popups: Light background with blur
- Attribution: Light badge

**Dark Theme:**
- Controls: Dark with accent highlights
- Popups: Dark card background
- Attribution: Dark badge

### Risk-Based Colors

Existing regions shown with risk-appropriate colors:

```typescript
Critical → #dc2626 (Red)
High     → #f97316 (Orange)
Medium   → #0369a1 (Blue)
Low      → #16a34a (Green)
```

---

## Performance

### Loading Strategy

**Dynamic Import:**
```typescript
const RegionMapSelector = dynamic(
  () => import('./RegionMapSelector'),
  { ssr: false }
);
```

**Why?**
- Leaflet uses `window` object (unavailable in SSR)
- Map loads only when modal opens
- Reduces initial bundle size

### Optimization

- Map initializes only once per modal open
- Existing regions rendered on mount (no re-renders)
- Search debounced (prevents API spam)
- Tiles cached by browser

---

## Search API

### Nominatim (OpenStreetMap)

**Endpoint:** `https://nominatim.openstreetmap.org/search`

**Query Parameters:**
- `format=json` — Return JSON
- `q={query}` — Search term
- `countrycodes=my` — Limit to Malaysia
- `limit=1` — Return top result

**Usage Policy:**
- Free for reasonable use
- No API key required
- Rate limit: 1 request/second (auto-enforced by component)
- Attribution required (included in map)

**Example Response:**
```json
[{
  "lat": "3.139003",
  "lon": "101.686855",
  "display_name": "Kuala Lumpur, Malaysia",
  "boundingbox": ["3.04", "3.24", "101.60", "101.76"]
}]
```

---

## Troubleshooting

### Issue: Map not displaying

**Check 1:** Leaflet CSS loaded?
- Open DevTools → Elements → Search for "leaflet.css"
- Should be in `<head>`

**Check 2:** Browser console errors?
- Look for "window is not defined" → SSR issue, ensure dynamic import
- Look for "Cannot read property 'addLayer'" → Map not initialized

**Fix:**
- Component already uses `dynamic(() => ..., { ssr: false })`
- Clear `.next` cache: `rm -rf .next && bun dev`

### Issue: Markers not showing

**Cause:** Default marker icons not loading

**Fix:** Already handled in component:
```typescript
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
```

### Issue: Search not working

**Check:**
- Browser console for CORS errors (shouldn't happen with Nominatim)
- Network tab → Look for 403/429 responses (rate limit)

**Fix:**
- Add 1-second delay between searches (already implemented)
- Use Malaysian locations only (enforced with `countrycodes=my`)

### Issue: Drawing tools not appearing

**Check:** `leaflet-draw` installed?
```bash
bun pm ls | grep leaflet-draw
```

**Fix:**
```bash
bun add leaflet-draw
bun add -d @types/leaflet-draw
```

### Issue: Map z-index issues

**Symptom:** Map appears behind modal or under other elements

**Fix:** Map container has `z-index: 1` by default. If needed:
```css
#region-map {
  z-index: 1;
  position: relative;
}
```

---

## Code Structure

### Component Hierarchy

```
CreateRegionModal
├── Mode Toggle (Manual / Map)
├── [Manual Mode]
│   ├── Name input
│   ├── Description textarea
│   ├── Lat/Lng inputs
│   ├── Population/Area inputs
│   └── Risk level selector
└── [Map Mode]
    ├── Search bar
    ├── RegionMapSelector
    │   ├── Map instance
    │   ├── Center marker (draggable)
    │   ├── Drawing controls
    │   ├── Existing regions overlay
    │   └── Event handlers
    ├── Coordinate display
    └── Rest of form fields
```

### Files

```
app/(dashboard)/dashboard/admin/regions/
├── page.tsx                              # Main regions page
└── _components/
    ├── RegionCard.tsx                    # Region grid card
    ├── RegionDetailsModal.tsx            # Details view
    ├── CreateRegionModal.tsx             # Create form with map
    └── RegionMapSelector.tsx             # Map component (NEW)

app/globals.css                           # Leaflet style overrides (added)
package.json                              # Dependencies (updated)
```

---

## Dependencies Added

```json
{
  "dependencies": {
    "leaflet": "^1.9.4",
    "react-leaflet": "^5.0.0",
    "leaflet-draw": "^1.0.4"
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.21",
    "@types/leaflet-draw": "^1.0.13"
  }
}
```

**Total size:** ~120KB (gzipped)

---

## Future Enhancements

### 1. **Heatmap Overlay**
Show flood incident density as heatmap on region boundaries

### 2. **Real-Time Sensor Markers**
Display sensor locations on map with live status (green/yellow/red)

### 3. **Geocoding on Blur**
Auto-fill region name when marker placed (reverse geocoding)

### 4. **Distance Measurement**
Tool to measure area of drawn polygon

### 5. **Import GeoJSON**
Upload GeoJSON file to import complex boundaries

### 6. **Export Map as Image**
Screenshot map with boundaries for reports

### 7. **Offline Map Support**
Download tiles for offline use in areas with poor connectivity

---

## Best Practices

### Drawing Boundaries

**Do:**
- ✅ Draw boundaries that follow natural/administrative borders
- ✅ Keep polygons simple (5-20 points)
- ✅ Include buffer zones around flood-prone areas
- ✅ Test boundaries at different zoom levels

**Don't:**
- ❌ Create overly complex shapes (100+ points)
- ❌ Draw overlapping region boundaries
- ❌ Include entire cities (too broad for actionable alerts)
- ❌ Make boundaries too small (< 1 km²)

### Coordinate Precision

- **4 decimals** (~11 meters) — Good for region centers
- **6 decimals** (~0.11 meters) — Overkill for regions, use for sensors

Example:
```
✅ Good: 3.1390, 101.6869 (center of KL)
❌ Too precise: 3.139003452, 101.686854876 (unnecessary)
```

### Search Tips

**Effective searches:**
- "Kuala Lumpur"
- "Shah Alam, Selangor"
- "Penang Island"
- "Johor Bahru"

**Less effective:**
- "KL" (too vague)
- "Malaysia" (too broad)
- "River" (not specific enough)

---

## Accessibility

**Keyboard Navigation:**
- Tab → Navigate between search input and buttons
- Enter → Trigger search
- Arrow keys → Pan map (when map focused)
- +/- → Zoom in/out

**Screen Readers:**
- Map has `role="region"` and `aria-label="Interactive map for region selection"`
- Search input has proper label
- Instructions clearly stated above map

---

## Testing Checklist

After implementing map selection:

- [ ] Modal opens without errors
- [ ] Map tiles load correctly
- [ ] Can toggle between Manual/Map mode
- [ ] Click map places marker
- [ ] Drag marker updates coordinates
- [ ] Search finds Malaysian locations
- [ ] Drawing tools appear (top right)
- [ ] Can draw polygon boundary
- [ ] Existing regions show with correct colors
- [ ] Coordinates sync with form fields
- [ ] Create region with boundary works
- [ ] Map adapts to light/dark theme
- [ ] No console errors
- [ ] Works on mobile (touch events)

---

## Demo URLs

**Test the feature:**
1. Start dev server: `bun dev`
2. Login: `admin@gmail.com` / `12345678`
3. Go to: `http://localhost:3000/dashboard/admin/regions`
4. Click: **"+ Add Region"**
5. Click: **"🗺️ Map Selection"**
6. Search: "Kuala Lumpur" and draw a boundary

---

## Credits

**Map Data:** © OpenStreetMap contributors  
**Geocoding:** Nominatim API (OpenStreetMap)  
**Library:** Leaflet.js (BSD-2-Clause)  
**Tiles:** OpenStreetMap Standard Tile Layer

---

**Status:** ✅ Implemented and Ready to Use  
**Deployed:** Frontend (`/regions` page)  
**Dependencies:** Installed via `bun`  
**Documentation:** Complete

---

Made with 🗺️ for FloodGuard DDAC Project — APU 2026

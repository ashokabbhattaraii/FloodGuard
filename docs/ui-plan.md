# FloodGuard — UI Plan
## Problem 4: Flood Early Warning & Community Alert System

---

## System Overview

A cloud-based flood monitoring and early warning web application. The system aggregates real-time water level data, weather forecasts, and community reports to alert residents, coordinate evacuations, and reduce flood-related casualties.

**User Roles:**
- **Public / Resident** — receives alerts, submits reports, views flood maps
- **Local Authority / Admin** — manages alerts, reviews reports, monitors dashboards
- **Super Admin** — manages users, system config, cloud services

---

## Design System (from `design.md` — Torivo Dark Indigo)

| Token | Value |
|---|---|
| Background | `#08081e` (deep navy) |
| Primary Text | `#f6f6f6` (off-white) |
| Accent | `#7c7cff` (brand purple) |
| Muted Text | `#b5b5bb` |
| Border | `#474c84` |
| Card Radius | `14px` |
| Pill Radius | `100px` |
| Input Radius | `8px` |
| Headline Font | Geist (sans) + Instrument Serif (italic accent) |
| Body Font | Geist |

Hero gradient: `radial from #191960 to #08081e`
Glow shadow: `0px 0px 18px 5px rgba(124, 124, 255, 0.5)`

---

## Pages & Screens

---

### 1. Landing Page (`/`)

**Purpose:** Public-facing marketing/info page. Communicates urgency, builds trust, drives sign-up.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  [Navbar — frosted glass pill]                      │
│  Logo    Home  About  Alerts  Report    [Get Access]│
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   HERO SECTION                      │
│         radial gradient #191960 → #08081e           │
│                                                     │
│   Stay ahead of                                     │
│   the *flood.*          ← Instrument Serif italic   │
│                                                     │
│   Real-time flood alerts for your community.        │
│   Know before the water rises.                      │
│                                                     │
│   [View Live Alerts]    [Report an Incident]        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                  STATS STRIP                        │
│   12 Active Alerts  |  4 Regions  |  2.3K Reports  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                HOW IT WORKS                         │
│                                                     │
│  [Card 1]          [Card 2]          [Card 3]       │
│  Monitor           Alert             Respond        │
│  Real-time         Push notify       Evac routes    │
│  water sensors     residents         & shelters     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              LIVE ALERT PREVIEW                     │
│   Interactive map embed (read-only, public)         │
│   Shows current flood risk zones by color           │
│   [See Full Map →]                                  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│           COMMUNITY TRUST SECTION                   │
│   "Trusted by local authorities across 4 regions"  │
│   Logo strip + testimonial card                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                    FOOTER                           │
│   About | Contact | Privacy | Emergency Hotline    │
└─────────────────────────────────────────────────────┘
```

**Key Components:**
- Frosted-glass pill navbar (fixed, floats over hero)
- 100px Geist headline + Instrument Serif italic accent word
- Two pill CTA buttons (primary + ghost)
- 3-column feature cards (radius-card `14px`, glow shadow on hover)
- Public map embed (Leaflet.js / Mapbox)
- Stats strip with animated counters

---

### 2. Login Page (`/login`)

**Purpose:** Unified login for all roles. Role is resolved after auth and user is redirected accordingly.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  [Logo]                          [Back to Home →]   │
│                                                     │
│         ┌──────────────────────────────┐            │
│         │  Sign in to FloodGuard       │            │
│         │                              │            │
│         │  Email                       │            │
│         │  ┌────────────────────────┐  │            │
│         │  │                        │  │            │
│         │  └────────────────────────┘  │            │
│         │                              │            │
│         │  Password                    │            │
│         │  ┌────────────────────────┐  │            │
│         │  │                        │  │            │
│         │  └────────────────────────┘  │            │
│         │                              │            │
│         │  [Sign In ──────────────────]│            │
│         │                              │            │
│         │  Forgot password?            │            │
│         │  Don't have an account?      │            │
│         │  [Request Access]            │            │
│         └──────────────────────────────┘            │
│                                                     │
│  Background: deep navy radial gradient              │
└─────────────────────────────────────────────────────┘
```

**Key Components:**
- Centered card (`radius-card 14px`, subtle indigo border, frosted glass)
- Inputs: `radius-input 8px`, border `#474c84`, focus glow `#7c7cff`
- Primary sign-in button: full-width pill
- No role selector — redirect after auth based on DB role
- Public registration is limited (residents can self-register; authorities are provisioned by admin)

---

### 3. Resident Dashboard (`/dashboard`)

**Purpose:** Personalized view for community members. Shows their area's current risk, active alerts, and lets them submit reports.

**Layout:**

```
┌──────────┬──────────────────────────────────────────┐
│          │  [Top Bar]  FloodGuard    🔔 3   [Avatar]│
│ Sidebar  ├──────────────────────────────────────────┤
│          │                                          │
│ Overview │  RISK LEVEL BANNER (dynamic color)       │
│ Alerts   │  ⚠ HIGH RISK — Klang Valley Region       │
│ Map      │  Last updated: 2 min ago                 │
│ Report   │                                          │
│ Shelters │  ┌────────┐ ┌────────┐ ┌────────┐       │
│ Profile  │  │Water   │ │Rain    │ │Alert   │       │
│          │  │Level   │ │fall    │ │Status  │       │
│          │  │4.2m ↑  │ │82mm    │ │ACTIVE  │       │
│          │  └────────┘ └────────┘ └────────┘       │
│          │                                          │
│          │  FLOOD MAP (interactive)                 │
│          │  ┌──────────────────────────────────┐   │
│          │  │  [Map with zone overlays]        │   │
│          │  │  🔴 High  🟡 Moderate  🟢 Safe  │   │
│          │  └──────────────────────────────────┘   │
│          │                                          │
│          │  ACTIVE ALERTS FEED                      │
│          │  ┌──────────────────────────────────┐   │
│          │  │ 🔴 Flash flood warning — Subang  │   │
│          │  │ Issued 14:32 · Authority: JPBD   │   │
│          │  └──────────────────────────────────┘   │
│          │  ┌──────────────────────────────────┐   │
│          │  │ 🟡 Water level rising — PJ area  │   │
│          │  └──────────────────────────────────┘   │
│          │                                          │
│          │  [+ Submit Flood Report]                 │
└──────────┴──────────────────────────────────────────┘
```

**Key Components:**
- Collapsible left sidebar (dark, `#08081e` with `#474c84` dividers)
- Dynamic risk banner: red/amber/green background based on severity
- Stat cards (3-col grid, radius-card, glow on active alert state)
- Interactive Leaflet map with flood zone color overlays
- Alert feed (chronological, color-coded by severity)
- Floating pill button: "Submit Flood Report" → opens modal/drawer

**Submit Report Modal:**
```
┌────────────────────────────────────┐
│  Report a Flood Incident           │
│                                    │
│  Location (auto-detect / manual)   │
│  [📍 Use My Location]              │
│                                    │
│  Severity  ○ Low  ○ Moderate  ● High│
│                                    │
│  Description                       │
│  ┌──────────────────────────────┐  │
│  │                              │  │
│  └──────────────────────────────┘  │
│                                    │
│  Upload Photo (optional)           │
│  [📷 Choose File]                  │
│                                    │
│  [Cancel]        [Submit Report]   │
└────────────────────────────────────┘
```

---

### 4. Authority / Admin Dashboard (`/admin`)

**Purpose:** Local authority operators manage alerts, validate community reports, monitor sensor data, and coordinate response.

**Layout:**

```
┌──────────┬──────────────────────────────────────────┐
│          │  [Top Bar]                  [Admin Name] │
│ Sidebar  ├──────────────────────────────────────────┤
│          │                                          │
│ Overview │  OVERVIEW STATS ROW                      │
│ Alerts   │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│ Reports  │  │Active│ │Sensor│ │Comm. │ │Evac  │  │
│ Map      │  │Alerts│ │Online│ │Rprts │ │Sites │  │
│ Sensors  │  │  7   │ │ 23/25│ │  41  │ │  3   │  │
│ Evacuate │  └──────┘ └──────┘ └──────┘ └──────┘  │
│ Users    │                                          │
│ Settings │  TWO-COLUMN LAYOUT                       │
│          │  ┌─────────────────┐ ┌────────────────┐ │
│          │  │ ALERT MANAGER   │ │ SENSOR FEED    │ │
│          │  │                 │ │                │ │
│          │  │ [+ New Alert]   │ │ Station A: 4.2m│ │
│          │  │                 │ │ Station B: 2.1m│ │
│          │  │ ● Flash Flood   │ │ Station C: 3.8m│ │
│          │  │   Subang · LIVE │ │ Station D: 1.4m│ │
│          │  │   [Edit][End]   │ │                │ │
│          │  │                 │ │ [View All →]   │ │
│          │  │ ● Rising Water  │ │                │ │
│          │  │   PJ · ACTIVE   │ └────────────────┘ │
│          │  │   [Edit][End]   │                    │
│          │  └─────────────────┘                    │
│          │                                          │
│          │  COMMUNITY REPORTS QUEUE                 │
│          │  ┌──────────────────────────────────┐   │
│          │  │ Report #041 · High · Subang Jaya │   │
│          │  │ Submitted 14:22 · Photo attached  │   │
│          │  │ [View] [Verify] [Dismiss]         │   │
│          │  └──────────────────────────────────┘   │
└──────────┴──────────────────────────────────────────┘
```

**Key Components:**
- 4-stat overview row (animated numbers, icon per stat)
- Alert Manager panel: CRUD for alerts, live status badges
- Sensor Feed panel: real-time water level readings, color-coded thresholds
- Community Reports queue: verify/dismiss workflow
- Map view tab: full-screen map with sensor pins + alert overlays
- Evacuation Sites tab: manage shelter capacity and status

---

### 5. Super Admin Dashboard (`/superadmin`)

**Purpose:** System-level management — users, regions, cloud config, audit logs.

**Layout:**

```
┌──────────┬──────────────────────────────────────────┐
│          │  System Health                           │
│ Sidebar  │  ┌────────┐ ┌────────┐ ┌────────┐      │
│          │  │AWS EC2 │ │RDS DB  │ │S3      │      │
│ Users    │  │ Online │ │ 98% up │ │ 2.3GB  │      │
│ Regions  │  └────────┘ └────────┘ └────────┘      │
│ Alerts   │                                          │
│ Logs     │  USER MANAGEMENT TABLE                  │
│ Cloud    │  Name | Email | Role | Region | Status  │
│ Config   │  ─────────────────────────────────────  │
│          │  John  | ...  | Auth | KV     | Active  │
│          │  [+ Add User]  [Export]                 │
│          │                                          │
│          │  AUDIT LOG                               │
│          │  14:32 Admin@PJ issued Alert #7          │
│          │  14:10 Sensor Station C went offline     │
│          │  13:55 Report #041 verified by John      │
└──────────┴──────────────────────────────────────────┘
```

---

## Page Route Map

| Route | Page | Access |
|---|---|---|
| `/` | Landing | Public |
| `/login` | Login | Public |
| `/register` | Self-registration | Public |
| `/dashboard` | Resident dashboard | Resident |
| `/dashboard/alerts` | My alerts feed | Resident |
| `/dashboard/map` | Flood map | Resident |
| `/dashboard/report` | Submit report | Resident |
| `/dashboard/shelters` | Evacuation shelters | Resident |
| `/admin` | Authority overview | Authority |
| `/admin/alerts` | Alert management | Authority |
| `/admin/reports` | Community report queue | Authority |
| `/admin/sensors` | Sensor monitoring | Authority |
| `/admin/map` | Full admin map | Authority |
| `/admin/evacuate` | Evacuation site mgmt | Authority |
| `/superadmin` | System overview | Super Admin |
| `/superadmin/users` | User management | Super Admin |
| `/superadmin/logs` | Audit logs | Super Admin |
| `/superadmin/cloud` | Cloud config | Super Admin |

---

## Component Library (shared)

| Component | Description |
|---|---|
| `Navbar` | Frosted glass pill, fixed top, collapses on mobile |
| `Sidebar` | Collapsible left nav for dashboard layouts |
| `StatCard` | Dark card with icon, number, label, trend arrow |
| `AlertBadge` | Color pill: red/amber/green by severity |
| `FloodMap` | Leaflet map with zone overlays and sensor pins |
| `AlertFeed` | Chronological list of alert cards |
| `ReportModal` | Slide-up drawer for submitting community reports |
| `SensorRow` | Real-time sensor reading with threshold color |
| `RiskBanner` | Full-width dynamic banner (color by risk level) |
| `PillButton` | Primary and ghost variants, radius-pill 100px |
| `FormInput` | Dark input, radius-input 8px, purple focus ring |
| `DataTable` | Sortable/filterable table for admin views |

---

## Color Usage in UI States

| State | Color |
|---|---|
| High risk / critical alert | `#ff4c4c` (red — added for semantic use) |
| Moderate risk | `#f5a623` (amber) |
| Low risk / safe | `#4caf50` (green) |
| Active accent / focus | `#7c7cff` (brand purple) |
| Default text | `#f6f6f6` |
| Muted / secondary | `#b5b5bb` |
| Card background | `rgba(255,255,255,0.05)` on `#08081e` |
| Border default | `rgba(71, 76, 132, 0.3)` |

---

## Responsive Behavior

- **Mobile (< 768px):** Sidebar collapses to bottom tab bar; map goes full-screen; stat cards stack 2x2; hero text scales to 52px
- **Tablet (768–991px):** Sidebar icon-only; 2-col card grid; map at 50% width
- **Desktop (≥ 992px):** Full layout as designed above

---

## Tech Mapping

| UI Element | Implementation |
|---|---|
| Map | Leaflet.js + OpenStreetMap tiles |
| Real-time alerts | AWS SNS → WebSocket (API Gateway) |
| Sensor data | AWS IoT Core → DynamoDB → REST API |
| Auth | AWS Cognito (role-based user pools) |
| File uploads (reports) | AWS S3 presigned URLs |
| Notifications | Browser push + AWS SNS SMS |
| Deployment | AWS Amplify / EC2 + CloudFront CDN |

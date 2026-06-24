# FEWCRS — Flood Early Warning & Community Response System
## System Overview Document

---

## 1. Problem Statement Alignment

Selected Problem Background: **#4 — Flooding**

| Gap identified in problem background | How FEWCRS addresses it |
|---|---|
| Inaccurate/delayed flood forecasting and alerts | Automated risk calculation from live weather/river data, pushed to residents in real time |
| Poor coordination between weather agencies and local authorities | Centralized Admin dashboard aggregating forecast data, ground reports, and response status |
| No centralized reporting system | Crowdsourced, geotagged flood reports submitted by residents |
| Vulnerable groups unprepared / uninformed | Simple one-tap SOS, zone-based alerts, accessible evacuation center info |
| Fragmented, delayed emergency response | Push-to-nearest-volunteer notification + claim system with timeout escalation |

---

## 2. User Roles

The system has **three roles**, each with independent, non-overlapping functionality (per project requirement: each team member owns one role with 2+ unique features).

1. **Resident** — public user, requests help, reports flooding, receives alerts
2. **Volunteer** — field responder, claims and resolves help requests
3. **Admin (Disaster Management Officer)** — oversees zones, alerts, evacuation centers, and response coordination

---

## 3. Dashboards

Each dashboard below is broken down by **sidebar/top menu items**, with the exact features under each menu and the **package/library/service** used to implement it.

### 3.1 Resident Dashboard

**Purpose:** Personal safety and situational awareness.

#### Menu: 🏠 Home / Overview
| Feature | Details | Package / Service Used |
|---|---|---|
| Risk banner | Current risk level for resident's zone (Green/Yellow/Orange/Red), last-updated timestamp | Backend: data pulled from `zones` table via REST endpoint (Node.js/Express or Django REST Framework) |
| Status summary cards | Counts: active alerts for zone, my open requests | React (frontend), `axios`/`fetch` for API calls |

#### Menu: 🗺️ Live Map
| Feature | Details | Package / Service Used |
|---|---|---|
| Zone boundary view | Highlights resident's registered zone | `Leaflet.js` or `react-leaflet` (free, open-source map library) with **Amazon Location Service** tiles |
| Evacuation centers layer | Pins showing nearby centers + capacity status | Same map library, custom marker layer |
| Nearby reports layer | Pins of recent flood reports from other residents | GeoJSON rendering via `Leaflet.js` |

#### Menu: 🔔 Alerts
| Feature | Details | Package / Service Used |
|---|---|---|
| Alert feed | List of official alerts issued by Admin for their zone, newest first | REST API + **Amazon SNS** (delivery), data stored in `alerts` table |
| Notification settings | Toggle SMS/email/push preferences | **Amazon SNS** topic subscription management |

#### Menu: 📝 Report Flooding
| Feature | Details | Package / Service Used |
|---|---|---|
| Submit report form | Water level estimate, optional photo upload, auto GPS capture | `react-hook-form` (form handling), HTML5 Geolocation API |
| Photo upload | Image attached to report | **Amazon S3** (storage), `multer` (Node.js upload middleware) or Django's file handling |

#### Menu: 🆘 SOS / Help Request
| Feature | Details | Package / Service Used |
|---|---|---|
| One-tap SOS button | Auto-captures GPS, creates `sos_requests` record | HTML5 Geolocation API, REST POST endpoint |
| Mark Myself Safe | Status toggle visible to Admin | Simple PATCH endpoint, stored in `users.status` |
| My Requests history | Status tracking: Pending / Claimed / En Route / Resolved | Frontend table component, polling via `setInterval` + `axios` |

#### Menu: ⚙️ Settings
| Feature | Details | Package / Service Used |
|---|---|---|
| Profile & home zone | Update contact info, home/work zone | PostgreSQL `users`/`zones` tables via ORM (e.g. `Sequelize`/`SQLAlchemy`/Django ORM) |
| Auth | Login/logout/session | **Amazon Cognito** |

---

### 3.2 Admin Dashboard

**Purpose:** Centralized command and coordination.

#### Menu: 📊 Overview
| Feature | Details | Package / Service Used |
|---|---|---|
| Stat widgets | Active alerts, pending SOS count, today's reports, high-risk zone count | Chart/stat components via `Chart.js` or `Recharts` |
| Live risk map | All zones color-coded by risk; click to drill into zone detail | `react-leaflet` + Amazon Location Service |

#### Menu: 📢 Alert Management
| Feature | Details | Package / Service Used |
|---|---|---|
| Create/edit/expire alerts | Per-zone alert with severity + message | REST API, **Amazon SNS** (publish to zone topic) |
| Alert history | Past alerts log, filterable by zone/date | PostgreSQL query + paginated table component |

#### Menu: 🆘 SOS Queue
| Feature | Details | Package / Service Used |
|---|---|---|
| Sortable request list | By urgency/time, with location | `react-table` (or similar data-grid component) |
| Manual assign/reassign | Admin override on any request | Atomic SQL `UPDATE ... WHERE status=` pattern (race-safe) |
| Escalation flags | Highlights unclaimed/timed-out requests | Backend scheduled job (cron via **EventBridge + Lambda**, or `node-cron` on Beanstalk instance) |

#### Menu: 🏕️ Evacuation Centers
| Feature | Details | Package / Service Used |
|---|---|---|
| Center CRUD | Location, capacity, current occupancy | REST CRUD endpoints, PostgreSQL `evacuation_centers` table |
| Capacity visualization | Progress bar per center | `Recharts` or simple CSS progress component |

#### Menu: 📥 Reports Feed
| Feature | Details | Package / Service Used |
|---|---|---|
| Incoming flood reports | Verify/dismiss resident-submitted reports | REST API, **Amazon S3** for attached photos |

#### Menu: 📈 Analytics
| Feature | Details | Package / Service Used |
|---|---|---|
| Historical charts | Reports/alerts over time per zone | `Recharts` / `Chart.js` |
| Response time stats | Avg time SOS created → resolved | SQL aggregate queries (PostgreSQL `EXTRACT`/`AVG`) |
| Export | CSV/PDF export of reports | `pdfkit` / `jsPDF` (PDF), native CSV generation |

#### Menu: 🖥️ System Monitoring *(optional, ties to Task 2 marks)*
| Feature | Details | Package / Service Used |
|---|---|---|
| Infra health snapshot | API latency, DB load, error rate | **Amazon CloudWatch** dashboard embedded/linked |

---

### 3.3 Volunteer Dashboard

**Purpose:** Field operations and task execution.

#### Menu: 📋 My Tasks
| Feature | Details | Package / Service Used |
|---|---|---|
| Assigned/notified tasks | SOS requests pushed to them (nearest-N), sorted by distance/urgency | Backend Haversine distance calc (plain JS/Python function), **Amazon SNS** for push notification |
| Status update controls | Claimed → En Route → Resolved | REST PATCH endpoint |

#### Menu: 🙋 Open Requests (Claim View)
| Feature | Details | Package / Service Used |
|---|---|---|
| Unclaimed nearby requests | List/map of open SOS requests | `react-leaflet` map view |
| Claim button | Atomic claim action, race-condition safe | SQL conditional `UPDATE ... WHERE status='PENDING'` |

#### Menu: 🏕️ Evacuation Centers (Reference)
| Feature | Details | Package / Service Used |
|---|---|---|
| Nearby centers list | Location + current capacity, read-only | REST GET endpoint, shared map component |

#### Menu: 📦 Relief Log
| Feature | Details | Package / Service Used |
|---|---|---|
| Post-resolution form | Supplies given, headcount helped, notes | `react-hook-form`, PostgreSQL `relief_logs` table |

#### Menu: 📜 My Activity
| Feature | Details | Package / Service Used |
|---|---|---|
| Completed task history | Total people helped, past logs | Paginated table component |

#### Menu: ⚙️ Availability
| Feature | Details | Package / Service Used |
|---|---|---|
| On-duty/off-duty toggle | Controls whether they receive SNS notifications | Updates `volunteer_locations.on_duty` flag |
| Location ping | Periodic GPS update while on duty | HTML5 Geolocation API + `setInterval`, PATCH to backend |

---

## 4. Core Workflow — SOS Request Lifecycle

```
Resident creates SOS request
        ↓
System calculates nearest available volunteers (Haversine distance)
        ↓
Top N nearest volunteers notified (SNS push/SMS/email)  [status: PENDING]
        ↓
   ┌─────────────────────────────┐
   │ First volunteer to claim    │ → status: CLAIMED (atomic DB update,
   │ wins (race-condition safe)  │   prevents double-claim)
   └─────────────────────────────┘
        ↓ (if not claimed within timeout, e.g. 3–5 min)
   ESCALATED → wider radius notified + flagged on Admin dashboard
        ↓
   Admin can manually assign/reassign at any point
        ↓
   Volunteer updates: CLAIMED → EN_ROUTE → RESOLVED
        ↓
   Resident notified at each stage; Relief log recorded
```

**Key design decisions:**
- **Atomic claim update** — `UPDATE sos_requests SET status='CLAIMED', volunteer_id=? WHERE id=? AND status='PENDING'` — prevents two volunteers claiming the same request simultaneously.
- **Push + Pull hybrid** — nearest volunteers are actively notified (push), but all volunteers can also browse and claim open requests (pull) — improves resilience if nearest volunteers are unavailable.
- **Timeout escalation** — unclaimed requests automatically widen their notification radius and flag to Admin, avoiding requests being silently missed.

---

## 5. Flood Risk Data Pipeline

```
Open-Meteo Weather + Flood API (free, no key)
        ↓ (scheduled polling, e.g. hourly cron on Beanstalk/EC2 or Lambda)
Rainfall + river discharge data per zone coordinate
        ↓
Risk calculation engine (rule-based thresholds, e.g. rainfall mm/hr,
discharge level → Low/Medium/High/Severe)
        ↓
Zone risk_level updated in database
        ↓
If risk level crosses threshold → auto-generate alert → SNS to zone subscribers
```

**Data sources:**
- **Open-Meteo Flood API / Weather API** — primary, free, no API key required
- **OpenWeatherMap free tier** — secondary cross-reference signal (reduces false alerts)
- **data.gov.my** — historical rainfall/water-level CSV datasets, used to seed analytics/trend data
- **publicinfobanjir.water.gov.my** — reference for realistic Malaysian monitoring station structure

---

## 6. AWS Architecture

### Task 1 — Frontend, Backend, Compute & Database

| Component | AWS Service |
|---|---|
| Application hosting (frontend + backend) | Elastic Beanstalk |
| Database | RDS (PostgreSQL) |
| Authentication & role management | Amazon Cognito (Resident / Volunteer / Admin groups) |

### Task 2 — Other Cloud Services & Monitoring

| Need | AWS Service |
|---|---|
| Photo storage (flood reports) | S3 |
| Alerts (SMS/email/push) | SNS (+ SES for email) |
| Scheduled data polling | EventBridge (cron trigger) + Lambda, or cron job within Beanstalk instance |
| Maps/geolocation | Amazon Location Service |
| Monitoring & metrics | CloudWatch (dashboards + alarms: API latency, DB load, error rates, EB health) |
| Access control | IAM roles & policies |

---

## 7. Data Model (Core Tables — PostgreSQL)

| Table | Key Fields |
|---|---|
| `users` | id, name, role, zone_id, contact, status |
| `zones` | id, name, geo-boundary/centroid, current_risk_level |
| `flood_reports` | id, user_id, zone_id, water_level, photo_url, timestamp |
| `alerts` | id, zone_id, message, severity, issued_by, timestamp |
| `sos_requests` | id, user_id, location, status, assigned_volunteer_id, created_at, resolved_at |
| `evacuation_centers` | id, name, location, capacity, current_occupancy |
| `relief_logs` | id, volunteer_id, sos_request_id, supplies, headcount, notes, timestamp |
| `volunteer_locations` | volunteer_id, lat, lng, last_updated, on_duty (boolean) |

---

## 8. Why This Design Meets the Marking Criteria

- **CLO1 (cloud paradigm concepts):** demonstrated through use of managed compute (Beanstalk), managed DB (RDS), pub/sub messaging (SNS), and object storage (S3) — a realistic multi-service cloud architecture.
- **CLO2 (performance-oriented design):** Beanstalk auto-scaling under load, CloudWatch-monitored metrics, async alert dispatch via SNS rather than blocking requests.
- **CLO3 (appropriate, cost-effective service selection):** free-tier-friendly external data sources, managed AWS services chosen over self-hosted alternatives to reduce operational overhead and cost.
- **Originality/problem-solving (65%+ band):** atomic claim mechanism (concurrency handling), push+pull hybrid notification model, timeout-based escalation — these go beyond a basic CRUD app and show deliberate handling of real-world race conditions and failure modes.

---

## 9. Suggested Role Split (4-Person Team)

| Member | Owns | Core Functionalities (2+ each) |
|---|---|---|
| 1 | Resident module | SOS request creation, flood report submission, alert subscription |
| 2 | Volunteer module | Task claim system, relief logging, availability management |
| 3 | Admin module | Alert management, evacuation center management, SOS queue/reassignment |
| 4 | Data & Infrastructure | Weather/flood data pipeline, risk calculation engine, CloudWatch monitoring setup, analytics/reporting |


OpenStreetMap should be used
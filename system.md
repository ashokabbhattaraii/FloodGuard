# FloodGuard — System Documentation

## 1. Problem Statement

**Source:** CT071-3-3-DDAC Group Project — Problem Background #4

Flooding is one of the most destructive and recurring natural disasters, impacting millions yearly. Key challenges:

- **Unpredictable weather patterns** amplified by climate change make it harder to anticipate floods
- **Inadequate early warning systems** in vulnerable communities (low-lying, river-adjacent areas)
- **Poor coordination** between weather agencies and local authorities causes delayed alerts
- **Residents uninformed** about storm severity or water level changes until too late to evacuate
- **Vulnerable groups** (children, elderly, disabled) face greater risk due to non-inclusive emergency planning
- **Lack of educational outreach** and accessible flood information leaves communities unprepared
- **Urban poor drainage** and rural limited communication tools compound the risk
- **Long-term impacts:** displacement, income loss, public health risks

**Core Gap:** Persistent gaps in awareness, access to timely information, and infrastructure needed to manage and reduce flood risk.

---

## 2. Solution: FloodGuard

A cloud-based flood monitoring and early warning web application that aggregates real-time water level data, weather forecasts, and community reports to alert residents, coordinate evacuations, and reduce flood-related casualties.

### System Name: **FloodGuard**
### Tagline: *Stay ahead of the flood.*

---

## 3. User Roles

| Role | Description | Key Capabilities |
|------|-------------|-----------------|
| **Public / Resident** | General users in flood-prone areas | Receive alerts, submit incident reports, view flood risk maps, access evacuation routes |
| **Local Authority / Admin** | Government officials, emergency responders | Manage/issue alerts, review community reports, monitor dashboards, coordinate response |
| **Super Admin** | System administrator | Manage users, system configuration, cloud service management, analytics |

---

## 4. Core Features

### 4.1 Public / Resident Features
1. **Real-Time Flood Map** — Interactive map showing current flood risk zones by severity level (color-coded)
2. **Alert Notifications** — Push/email/SMS notifications when flood risk escalates in user's registered area
3. **Community Incident Reporting** — Submit flood reports with photos, location, water level estimates
4. **Evacuation Route Finder** — View nearest shelters and safe routes during active alerts
5. **Weather Dashboard** — Current weather conditions, forecasts, and river/water level data
6. **Educational Resources** — Flood preparedness guides, emergency checklists

### 4.2 Admin / Local Authority Features
1. **Alert Management Console** — Create, edit, escalate, and resolve flood alerts for specific regions
2. **Community Report Review** — Approve/flag/respond to citizen-submitted incident reports
3. **Monitoring Dashboard** — Real-time metrics: active alerts, affected areas, evacuation status, sensor readings
4. **Region Management** — Define and manage geographic monitoring zones
5. **Report Analytics** — Historical flood data, incident patterns, response time metrics

### 4.3 Super Admin Features
1. **User Management** — CRUD operations on all user accounts and role assignments
2. **System Configuration** — Alert thresholds, notification settings, API integrations
3. **Cloud Service Monitoring** — AWS resource utilization, costs, performance metrics
4. **Audit Logs** — Track all system actions for accountability

---

## 5. System Architecture

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  Next.js 16 (React 19) — App Router — Tailwind CSS 4 — GSAP    │
│  Pages: Landing, Dashboard, Alerts, Map, Reports, Admin         │
└─────────────────────────┬───────────────────────────────────────┘
                          │ REST API / WebSocket
┌─────────────────────────▼───────────────────────────────────────┐
│                       API LAYER                                   │
│  NestJS 11 — TypeScript — JWT Auth — Role Guards                 │
│  Modules: Auth, Users, Alerts, Reports, Regions, Weather         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                     AWS CLOUD SERVICES                            │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │ EC2/ECS  │  │   RDS    │  │    S3    │  │    SNS/SES   │    │
│  │ Compute  │  │ Database │  │ Storage  │  │ Notifications│    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │CloudWatch│  │  Lambda  │  │ Cognito  │  │  API Gateway │    │
│  │Monitoring│  │ Serverless│  │   Auth   │  │              │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16, React 19, TypeScript | UI, SSR, routing |
| Styling | Tailwind CSS 4, GSAP | Design system, animations |
| Backend | NestJS 11, TypeScript | REST API, business logic |
| Database | AWS RDS (PostgreSQL) or DynamoDB | Data persistence |
| Storage | AWS S3 | Images (reports), static assets |
| Auth | AWS Cognito or JWT (NestJS) | Authentication & authorization |
| Notifications | AWS SNS + SES | Push notifications, email alerts |
| Compute | AWS EC2 / ECS / Lambda | Application hosting |
| Monitoring | AWS CloudWatch | Performance metrics, logging |
| CDN | AWS CloudFront | Asset delivery, caching |

### 5.3 Data Flow

```
Weather API ──┐
              ├──► NestJS Backend ──► RDS/DynamoDB
Sensors ──────┘         │
                        ├──► SNS/SES (Alerts to users)
                        ├──► S3 (Media storage)
                        │
Community Reports ──────┘
         ▲
         │
    Next.js Frontend ◄──── CloudFront CDN
```

---

## 6. Database Schema (Key Entities)

| Entity | Key Fields |
|--------|-----------|
| **User** | id, email, name, role, region_id, notification_preferences |
| **Region** | id, name, coordinates (polygon), risk_level, admin_id |
| **Alert** | id, region_id, severity (low/medium/high/critical), title, description, issued_by, status, created_at, resolved_at |
| **Report** | id, user_id, region_id, description, photo_url, location (lat/lng), water_level, status (pending/verified/rejected), created_at |
| **Sensor** | id, region_id, type (water_level/rainfall), current_value, threshold, last_updated |
| **EvacuationRoute** | id, region_id, route_data (GeoJSON), shelter_name, capacity |
| **Notification** | id, user_id, alert_id, channel (push/email/sms), sent_at, read_at |

---

## 7. API Endpoints (Key Routes)

### Auth
- `POST /auth/register` — User registration
- `POST /auth/login` — Login, return JWT
- `GET /auth/me` — Current user profile

### Alerts
- `GET /alerts` — List active alerts (public)
- `GET /alerts/:id` — Alert detail
- `POST /alerts` — Create alert (admin)
- `PATCH /alerts/:id` — Update/resolve alert (admin)

### Reports
- `GET /reports` — List reports (filtered by region/status)
- `POST /reports` — Submit new report (resident)
- `PATCH /reports/:id` — Review report (admin)

### Regions
- `GET /regions` — List monitored regions
- `GET /regions/:id/status` — Region risk status + sensor data

### Weather
- `GET /weather/:region_id` — Current weather + forecast for region

---

## 8. AWS Services Integration

| Service | Usage | Justification |
|---------|-------|---------------|
| **EC2 / ECS** | Host NestJS backend | Scalable compute |
| **RDS** | PostgreSQL database | Relational data with geospatial support |
| **S3** | Store report images, static assets | Durable, cheap object storage |
| **CloudFront** | CDN for frontend assets | Low-latency global delivery |
| **SNS** | Push notifications | Fan-out alerts to subscribers |
| **SES** | Email notifications | Transactional emails |
| **Cognito** | User authentication | Managed auth with MFA |
| **CloudWatch** | Monitoring & logging | Performance analysis, alarms |
| **Lambda** | Background tasks (weather fetch, threshold checks) | Event-driven, cost-efficient |
| **API Gateway** | (Optional) API rate limiting, caching | Security & performance |

---

## 9. Deployment Strategy

1. **Frontend:** Next.js deployed on AWS Amplify or EC2 behind CloudFront
2. **Backend:** NestJS on ECS (Fargate) or EC2 with auto-scaling
3. **Database:** RDS PostgreSQL (Multi-AZ for HA)
4. **CI/CD:** GitHub Actions → ECR → ECS deployment
5. **Monitoring:** CloudWatch dashboards, alarms for CPU/memory/response time

---

## 10. Performance & Availability Requirements

- **Response Time:** API < 500ms p95
- **Availability:** 99.9% uptime (Multi-AZ deployment)
- **Scalability:** Auto-scaling based on request load
- **Alert Delivery:** < 30 seconds from trigger to notification
- **Data Retention:** 2+ years of historical flood data
- **Concurrent Users:** Support 1000+ simultaneous users

---

## 11. Security Considerations

- JWT/Cognito token-based authentication
- Role-based access control (RBAC) via NestJS guards
- HTTPS everywhere (TLS certificates via ACM)
- Input validation and sanitization
- S3 bucket policies — no public write access
- API rate limiting to prevent abuse
- Audit logging for admin actions

---

## 12. Assessment Alignment

### Task #1 — Frontend & Backend with Cloud Compute + Database (30 Marks)
- Next.js frontend with full UI (landing, dashboard, maps, reports)
- NestJS backend with REST API
- AWS EC2/ECS for compute
- AWS RDS for database
- User authentication and role-based features

### Task #2 — Other Cloud Services + Monitoring (20 Marks)
- AWS S3 for file storage
- AWS SNS/SES for notifications
- AWS Lambda for background processing
- AWS CloudWatch for monitoring and performance analysis
- CloudFront for CDN

---

## 13. Team Workload Division (3-4 Members)

| Member | Role Focus | Min Features |
|--------|-----------|--------------|
| Member 1 | Public/Resident role: Flood map, alert subscriptions | 2+ unique features |
| Member 2 | Community reporting: Submit reports, photo upload, status tracking | 2+ unique features |
| Member 3 | Admin role: Alert management console, dashboard analytics | 2+ unique features |
| Member 4 (if applicable) | Super Admin: User management, cloud monitoring, system config | 2+ unique features |

Each member owns distinct features with no overlap per project rules.

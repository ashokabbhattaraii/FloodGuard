# Member 2 — Demo Scripts
## Samir | Resident Action Features + CloudFront + VPC

> **Legend**
> `[SHOW]` → what to have on screen
> `[SAY]` → what to say (read naturally, not word-for-word)
> `[CLICK]` → where to click or navigate
> `⏱` → time checkpoint

---

---

# VIDEO 1 — Group Demo (5 min)
### UI Flows + AWS High-Level Architecture

---

## INTRO ⏱ 0:00 – 0:25

`[SHOW]` FloodGuard homepage or a clean browser window

`[SAY]`
> "Hi, I'm Samir pokhrel 6th Semister Student on Studing on LBEF. on the FloodGuard team. My part of the system is about what a resident actually *does* during a flood — submitting a report when they see flooding, and sending an SOS when they need rescue. I also owned the AWS networking layer: the VPC that connects everything, and the CloudFront distributions that give our app HTTPS. Let me walk you through it."

---

## SECTION 1 — Live Login as Resident ⏱ 0:25 – 1:00

`[SHOW]` Browser at the login page

`[CLICK]` Log in with:
- Email: `user@gmail.com`
- Password: `12345678`

`[SAY]`
> "I'm logging in as a resident — the role of someone living in a flood-affected area. Once logged in, I land on my dashboard."

`[SHOW]` Resident dashboard after login

`[SAY]`
> "From here I have two main actions: reporting what I see, and requesting help. Let me start with reporting."

---

## SECTION 2 — Community Report Submission ⏱ 1:00 – 2:15

`[CLICK]` Navigate to `/dashboard/resident/reports`

`[SHOW]` The reports page with the submission form on the left, report list on the right

`[SAY]`
> "This is the flood report page. As a resident, I can document what I'm seeing on the ground — water levels, road damage, anything that needs to reach the admin team."

**Walk through the form:**

`[CLICK]` The location section — show the map pin and GPS detect button

`[SAY]`
> "The app automatically detects my GPS location and pins it on the map. I can also drag the pin or type an address manually. This gives admins exact coordinates, not just a description."

`[CLICK]` Click the severity buttons — cycle through Low → Medium → High → Critical

`[SAY]`
> "I choose the severity — from minor waterlogging all the way up to life-threatening. Each level is color coded so it's immediately clear on the admin side."

`[CLICK]` Type a description:
> *"Water is knee-deep on the main road. Three houses flooded in Ward 7. Elderly couple may be trapped."*

`[CLICK]` Click the photo upload area, select any image file

`[SAY]`
> "I can attach a photo as proof — drag and drop or click to upload. This goes straight to S3 in the background."

`[CLICK]` Hit **Submit Flood Report**

`[SHOW]` Success toast notification appears: *"Report submitted successfully"*

`[SAY]`
> "The moment I hit submit, the report is saved and every admin in the system gets an in-app notification. The report shows up in my list below with a 'pending' status badge."

`[SHOW]` The report card appearing in the "My reports" list with the yellow `pending` badge

---

## SECTION 3 — SOS Request + One-Tap SOS ⏱ 2:15 – 3:15

`[CLICK]` Navigate to `/dashboard/resident/requests`

`[SHOW]` The requests page — red SOS button prominent at the top

`[SAY]`
> "Now for emergency situations. This is the SOS request page. There are two ways to ask for help."

**One-Tap SOS:**

`[POINT TO]` The large red SOS button

`[SAY]`
> "The first is the one-tap SOS. No form, no typing. You press this button, it captures your exact GPS coordinates, and immediately fires a CRITICAL priority rescue request to every admin and volunteer online. This is for when you are stranded and have seconds, not minutes."

*(Don't actually press it in the demo — just show it and explain)*

**Full Request Form:**

`[SCROLL DOWN]` to the "Request Relief, Shelter, or Support" form

`[SAY]`
> "For non-emergency situations, there's a full form. Let me fill one out."

`[CLICK]` Type selector → choose **Medical**
`[CLICK]` Priority → **High**
`[CLICK]` Title: `Clean water needed urgently`
`[CLICK]` Description: `Family of 6 including an infant. No clean water for 2 days. Located near the bridge.`
`[CLICK]` Location: `Kathmandu Ward 12, near Bagmati Bridge`
`[CLICK]` People count: `6`

`[CLICK]` **Submit Help Request**

`[SHOW]` Toast: *"Emergency responders have been notified"*

`[SHOW]` Request appearing in "My Requests" list below with `pending` status

`[SAY]`
> "Once a volunteer claims this request, I'll see the status update in real-time — from pending, to assigned, to in progress, to completed. And I get a notification at each stage."

`[POINT TO]` The safety status toggle (Safe / Awaiting Rescue)

`[SAY]`
> "There's also a safety toggle. When I'm rescued, I mark myself safe — and it offers to cancel any open requests automatically."

---

## SECTION 4 — AWS High-Level Architecture ⏱ 3:15 – 5:00

`[SHOW]` Draw or display this diagram (can show the ASCII version from the deployment guide, or a slide):

```
Browser
  │ HTTPS
  ▼
CloudFront (my responsibility)
  ├── Frontend Distribution  → Elastic Beanstalk (Next.js)
  └── Backend Distribution   → Elastic Beanstalk (NestJS)
                                        │
                                  VPC (my responsibility)
                                  10.0.0.0/16
                                  2 Public Subnets (us-east-1a, 1b)
                                        │ port 5432
                                        ▼
                                  RDS PostgreSQL
                                  (floodguard DB)

  S3 Bucket ← presigned URLs ← Backend
  (photo uploads, direct from browser)
```

`[SAY]`
> "Here's the AWS architecture at a high level. I own two parts: the VPC — which is the private network that holds everything together — and CloudFront — which is the CDN layer that gives us HTTPS."

`[POINT TO CloudFront]`
> "The browser never talks to Elastic Beanstalk directly. All traffic goes through CloudFront. This solves two problems: first, EB only speaks HTTP, but browsers require HTTPS for secure pages — CloudFront handles TLS termination. Second, it protects the origin from direct exposure."

`[POINT TO VPC]`
> "Inside the VPC, I created two public subnets across two availability zones — that's required by AWS for RDS. The backend EB instance sits in this VPC and reaches RDS over port 5432. The security group on RDS only allows traffic from the EB security group — so nothing can reach the database except the app itself."

`[POINT TO S3]`
> "Photos don't go through the backend at all. When a resident uploads a photo, the backend generates a presigned PUT URL — a temporary, one-time upload link straight to S3. The browser uploads directly. This keeps the server fast and cheap."

`[SAY]`
> "So to summarize my AWS role: I built the networking foundation the entire team deploys into, and I put HTTPS in front of both the frontend and the backend API. Every request from the browser in production passes through my CloudFront setup."

---

---

# VIDEO 2 — Individual Deep Dive (5–6 min)
### Code, Packages, and AWS Console Walkthrough

---

## INTRO ⏱ 0:00 – 0:15

`[SHOW]` VS Code with the FloodGuard repo open

`[SAY]`
> "I'm Samir, Member 2. I'll walk through my code — three backend modules, the S3 upload flow, and then my AWS setup: VPC and CloudFront."

---

## SECTION 1 — My Three Modules ⏱ 0:15 – 1:15

`[SHOW]` VS Code file tree — expand `backend/src/`, point to the three folders

`[SAY]`
> "Three modules: reports, uploads, and flood-requests. Let me open the reports controller."

`[CLICK]` Open `backend/src/reports/reports.controller.ts` — scroll to the `create` method

```ts
@Post()
@UseGuards(JwtAuthGuard)
create(@Body() dto: CreateReportDto, @Request() req) {
  return this.reportsService.create(dto, req.user.id);
}
```

`[SAY]`
> "NestJS uses decorators. `@UseGuards(JwtAuthGuard)` means you must be logged in to hit this endpoint. `@Body()` takes the incoming JSON and validates it against the DTO using the `class-validator` package — invalid fields are rejected before the service even runs. The user ID comes from the JWT token, not the body — a resident can never fake who they are."

`[CLICK]` Open `backend/src/uploads/uploads.service.ts` — highlight the imports

```ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
```

`[SAY]`
> "`@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` — these two packages handle photo uploads. The backend generates a presigned PUT URL: a temporary, one-time link that lets the browser upload directly to S3. No image bytes pass through our server."

`[SHOW]` `generateUploadUrl` — the `expiresIn: 300` line

`[SAY]`
> "The URL expires in 5 minutes. After the browser uploads, it gets back the S3 key — a short path like `reports/uuid-photo.jpg` — and that key is what gets saved to the database, never a permanent URL."

---

## SECTION 2 — SOS: Atomic Claim ⏱ 1:15 – 2:00

`[CLICK]` Open `backend/src/flood-requests/flood-requests.service.ts` — scroll to `claimRequest`

```ts
const result = await this.prisma.floodRequest.updateMany({
  where: { id, status: 'pending' },
  data: { status: 'assigned', assignedTo: volunteerId },
});
if (result.count === 0) {
  throw new ConflictException('Request has already been claimed');
}
```

`[SAY]`
> "This is the volunteer claim logic. If two volunteers try to claim the same SOS at the same time, only one should win. `updateMany` with `status: 'pending'` in the WHERE clause is atomic — the database only updates if the row is still pending. If `count` comes back zero, someone else got there first and we return a 409 Conflict. No race condition, no double assignment."

`[CLICK]` Scroll up to `create` — show the two `notifyRole` lines

`[SAY]`
> "When a resident submits an SOS, admins and all volunteers get notified instantly — that's how volunteers know there's a new request to claim."

---

## SECTION 3 — AWS: VPC ⏱ 2:00 – 3:15

`[SWITCH]` Browser → AWS Console → VPC

`[CLICK]` Your VPCs → `floodguard-vpc`

`[SAY]`
> "This is the VPC — CIDR `10.0.0.0/16`. The private network the whole application runs inside."

`[CLICK]` Subnets → filter by VPC → show both subnets

`[SAY]`
> "Two public subnets: `floodguard-public-1a` in `us-east-1a`, `floodguard-public-1b` in `us-east-1b`. Two AZs are required by AWS to create a DB subnet group for RDS. If one zone goes down, we're spread across both."

`[CLICK]` Route Tables → `floodguard-public-rt` → Routes tab

`[SHOW]` The route `0.0.0.0/0 → floodguard-igw`

`[SAY]`
> "This route is what makes the subnets public. Any outbound traffic routes through the Internet Gateway. Without this, nothing in the VPC can reach the internet."

---

## SECTION 4 — AWS: CloudFront ⏱ 3:15 – 5:30

`[CLICK]` AWS Console → CloudFront → Distributions → show both listed

`[SAY]`
> "Two CloudFront distributions — backend API and frontend. The reason we need CloudFront: Elastic Beanstalk only speaks HTTP, but browsers block HTTP calls from an HTTPS page. CloudFront handles TLS and sits in front of both."

`[CLICK]` Open `d2962fm2ka76im.cloudfront.net` → Origins tab

`[SHOW]` Origin: EB URL, protocol: HTTP only

`[SAY]`
> "Origin is the EB URL on plain HTTP. CloudFront terminates HTTPS on the browser side and forwards over HTTP internally."

`[CLICK]` Behaviors tab → Default

`[SHOW]` Allowed methods, Cache policy: CachingDisabled

`[SAY]`
> "All HTTP methods allowed — GET through DELETE — otherwise POST and PATCH would be blocked. Cache is fully disabled for the API. You never want a cached response served to the wrong user."

`[CLICK]` Back → open frontend distribution `d28cob3p1pxddd.cloudfront.net` → same settings

`[SAY]`
> "Frontend distribution — same setup. One lesson learned here: `NEXT_PUBLIC_API_URL` gets baked into the Next.js build at compile time. It has to point to this CloudFront domain. We initially built it pointing at the raw EB URL — browsers blocked every API call as mixed content. Rebuilding with the correct CloudFront URL fixed it."

`[SAY]`
> "So — three backend modules, S3 presigned uploads, atomic SOS claiming, VPC networking, and CloudFront HTTPS. That's my full contribution to FloodGuard."

---

## QUICK REFERENCE — Files & Packages

| What | File |
|---|---|
| Report API | `backend/src/reports/reports.controller.ts` |
| Report logic + photo URL | `backend/src/reports/reports.service.ts` |
| Report validation | `backend/src/reports/reports.dto.ts` |
| S3 presigned URLs | `backend/src/uploads/uploads.service.ts` |
| SOS request API | `backend/src/flood-requests/flood-requests.controller.ts` |
| SOS logic + notifications | `backend/src/flood-requests/flood-requests.service.ts` |
| Frontend: report page | `frontend/app/(dashboard)/dashboard/resident/reports/page.tsx` |
| Frontend: SOS page | `frontend/app/(dashboard)/dashboard/resident/requests/page.tsx` |
| Frontend: upload client | `frontend/app/services/uploads.ts` |

| Package | Used for |
|---|---|
| `@aws-sdk/client-s3` | S3 PutObject / GetObject commands |
| `@aws-sdk/s3-request-presigner` | Generating presigned PUT/GET URLs |
| `@nestjs/common` | Controllers, guards, decorators |
| `@nestjs/config` | Reading env vars (S3_BUCKET, AWS_REGION) |
| `@nestjs/swagger` | Auto-generated API docs at `/api/docs` |
| `class-validator` | DTO field validation (`@IsString`, `@IsOptional`) |
| `class-transformer` | Transforms plain objects to DTO class instances |
| `@prisma/client` | Database queries (ORM) |
| `@prisma/adapter-pg` | pg driver adapter for Prisma (needed for RDS SSL) |
| `pg` | PostgreSQL connection pool |
| `uuid` | Generates unique S3 object keys |

## AWS Reference

| Resource | Name / Value |
|---|---|
| VPC | `floodguard-vpc` — `10.0.0.0/16` |
| Subnet 1 | `floodguard-public-1a` — `10.0.1.0/24` — `us-east-1a` |
| Subnet 2 | `floodguard-public-1b` — `10.0.2.0/24` — `us-east-1b` |
| Internet Gateway | `floodguard-igw` |
| Route Table | `floodguard-public-rt` — `0.0.0.0/0 → IGW` |
| CloudFront (API) | `d2962fm2ka76im.cloudfront.net` |
| CloudFront (Frontend) | `d28cob3p1pxddd.cloudfront.net` |
| Backend EB | `floodguard-backend.eba-p2pusqhe.us-east-1.elasticbeanstalk.com` |
| S3 Bucket | `floodguard-uploads` |

## Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| Resident | `user@gmail.com` | `12345678` |
| Admin | `admin@floodguard.np` | `12345678` |
| Volunteer | `volunteer1@gmail.com` | `12345678` |

# Member 2 — Individual Demo Script (5 min)
### Samir | Code + AWS Console

---

## INTRO ⏱ 0:00 – 0:15

`[SHOW]` VS Code open

> "I'm Samir, Member 2. I built the resident reporting and SOS system. I'll show the code, then my AWS setup — VPC and CloudFront."

---

## CODE ⏱ 0:15 – 2:30

`[SHOW]` `backend/src/` file tree — point to 3 folders: `reports/`, `uploads/`, `flood-requests/`

> "Three modules. Reports, uploads, flood-requests."

---

`[OPEN]` `backend/src/reports/reports.controller.ts`

> "`@UseGuards(JwtAuthGuard)` — must be logged in. `@Body()` with a DTO auto-validates the input using `class-validator`. User ID comes from the JWT token — residents can't fake their identity."

---

`[OPEN]` `backend/src/uploads/uploads.service.ts` — highlight imports

```ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
```

> "These two AWS SDK packages handle photo uploads. Backend generates a presigned PUT URL — the browser uploads directly to S3. No image bytes go through our server. URL expires in 5 minutes. DB stores only the S3 key, never a full URL."

---

`[OPEN]` `backend/src/flood-requests/flood-requests.service.ts` — scroll to `claimRequest`

```ts
await this.prisma.floodRequest.updateMany({
  where: { id, status: 'pending' },
  data: { status: 'assigned', assignedTo: volunteerId },
});
if (result.count === 0) throw new ConflictException('Already claimed');
```

> "`updateMany` with `status: pending` in the WHERE is atomic. If two volunteers claim simultaneously, only one wins. Count of zero means someone else got it first — we throw a 409. No race condition."

---

## AWS — VPC ⏱ 2:30 – 3:30

`[OPEN]` AWS Console → VPC → `floodguard-vpc`

> "CIDR `10.0.0.0/16` — private network for the whole app."

`[CLICK]` Subnets → show `floodguard-public-1a` (us-east-1a) and `floodguard-public-1b` (us-east-1b)

> "Two subnets, two AZs — required by AWS for RDS. If one zone fails, we're covered."

`[CLICK]` Route Tables → `floodguard-public-rt` → Routes tab → show `0.0.0.0/0 → IGW`

> "This route is what makes them public — all outbound traffic goes through the Internet Gateway."

---

## AWS — CloudFront ⏱ 3:30 – 5:00

`[OPEN]` CloudFront → Distributions → show both

> "Two distributions — backend API and frontend. EB only speaks HTTP. CloudFront sits in front and handles HTTPS for the browser."

`[CLICK]` Backend dist `d2962fm2ka76im` → Origins → show EB URL, HTTP only

`[CLICK]` Behaviors → show: all methods allowed, Cache: Disabled

> "All methods enabled — POST, PATCH, DELETE — otherwise the API breaks. Cache disabled — never serve one user's response to another."

`[CLICK]` Frontend dist `d28cob3p1pxddd` → same settings

> "Same for the frontend. Key lesson: `NEXT_PUBLIC_API_URL` is baked in at build time. It must point to this CloudFront URL — not the raw EB URL — or browsers block every API call as mixed content. That was our biggest deployment issue."

> "That's it — reports, SOS, S3 uploads, VPC, CloudFront. Done.
>
> 
>
> 
>
> 
>
> 
>
> 
>
> 
>
> 
>
> 
>
> 
>
> 
>
> 
>
> 
>
> "

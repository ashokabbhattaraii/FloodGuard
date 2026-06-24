# FloodGuard — Project Context

## What This Is
A cloud-based flood monitoring and early warning system for the DDAC (CT071-3-3) group project at APU. Solves Problem #4: Flood Early Warning & Community Alert System.

## Architecture
- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + GSAP — runs at root `/`
- **Backend:** NestJS 11 + TypeScript — in `/backend` directory (separate git repo)
- **Cloud:** AWS (EC2/ECS, RDS PostgreSQL, S3, SNS, SES, CloudWatch, Lambda, Cognito)
- **Package Managers:** bun (frontend), pnpm (backend)

## Design System
Uses "Torivo Dark Indigo" theme (see `design.md`):
- Background: `#08081e`, Text: `#f6f6f6`, Accent: `#7c7cff`
- Fonts: Geist (body) + Instrument Serif (accent italic)
- Pill radius: 100px, Card radius: 14px

## Key Files
- `system.md` — Full system documentation (problem, features, architecture, DB schema, APIs)
- `design.md` — Design tokens, typography, colors, components
- `docs/ui-plan.md` — Page-by-page UI wireframes and component plan
- `app/` — Next.js frontend pages and components
- `backend/` — NestJS backend (separate package.json, pnpm)

## User Roles
1. **Public/Resident** — View alerts, submit reports, see flood maps
2. **Admin/Local Authority** — Manage alerts, review reports, monitor dashboards
3. **Super Admin** — User management, system config, cloud monitoring

## Commands
```bash
# Frontend
bun dev          # Start Next.js dev server
bun run build    # Build for production
bun run lint     # ESLint

# Backend
cd backend
pnpm start:dev   # NestJS dev server (watch mode)
pnpm build       # Build
pnpm test        # Run tests
pnpm lint        # Lint
```

## Conventions
- Use App Router patterns (server components by default, `'use client'` only when needed)
- Components in `app/_components/` organized by page/feature
- Follow existing Tailwind utility class patterns — no separate CSS modules
- Backend follows NestJS module structure: `src/{module}/{module}.controller.ts`, `.service.ts`, `.module.ts`
- TypeScript strict mode in both frontend and backend
- Check `AGENTS.md` — Next.js version may have breaking changes vs training data. Read `node_modules/next/dist/docs/` before writing Next.js code.

## Assessment Requirements
- **Task 1 (30 marks):** Frontend + Backend + AWS Compute + Database
- **Task 2 (20 marks):** Additional cloud services (S3, SNS/SES, Lambda, CloudWatch monitoring)
- Each team member must own 2+ distinct, non-overlapping features

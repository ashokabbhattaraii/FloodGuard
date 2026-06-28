# Project Structure - FloodGuard Monorepo

## Directory Tree

```
problem-4/                              # Root monorepo directory
│
├── 📁 frontend/                        # Next.js Frontend Application
│   ├── app/                            # Next.js App Router
│   │   ├── page.tsx                    # Landing page
│   │   ├── layout.tsx                  # Root layout
│   │   ├── globals.css                 # Global styles
│   │   ├── dashboard/                  # Dashboard pages
│   │   ├── alerts/                     # Alert pages
│   │   ├── map/                        # Flood map pages
│   │   └── _components/                # Shared components
│   ├── public/                         # Static assets
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   ├── utils/                          # Utility functions
│   ├── .env.local                      # Frontend environment variables
│   ├── .env.example                    # Frontend env template
│   ├── package.json                    # Frontend dependencies (bun)
│   ├── bun.lock                        # Bun lock file
│   ├── next.config.ts                  # Next.js configuration
│   ├── tsconfig.json                   # TypeScript config
│   ├── postcss.config.mjs              # PostCSS config
│   ├── eslint.config.mjs               # ESLint config
│   ├── .ebextensions/                  # AWS EB extensions
│   ├── .elasticbeanstalk/              # AWS EB config
│   └── Procfile                        # EB process config
│
├── 📁 backend/                         # NestJS Backend Application
│   ├── src/                            # Backend source code
│   │   ├── main.ts                     # Application entry point
│   │   ├── app.module.ts               # Root module
│   │   ├── auth/                       # Authentication module
│   │   ├── users/                      # Users module
│   │   ├── alerts/                     # Alerts module
│   │   ├── reports/                    # Reports module
│   │   ├── regions/                    # Regions module
│   │   ├── forecast/                   # Forecast module
│   │   └── common/                     # Shared utilities
│   ├── prisma/                         # Database ORM
│   │   ├── schema.prisma               # Database schema
│   │   ├── migrations/                 # Migration files
│   │   └── seed.ts                     # Seed data
│   ├── test/                           # Test files
│   ├── .env                            # Backend environment variables
│   ├── package.json                    # Backend dependencies (pnpm)
│   ├── pnpm-lock.yaml                  # pnpm lock file
│   ├── tsconfig.json                   # TypeScript config
│   ├── nest-cli.json                   # NestJS CLI config
│   ├── .ebextensions/                  # AWS EB extensions
│   ├── .elasticbeanstalk/              # AWS EB config
│   └── Procfile                        # EB process config
│
├── 📁 docs/                            # Project Documentation
│   ├── ui-plan.md                      # UI wireframes & component plan
│   ├── api-spec.md                     # API specifications
│   └── deployment.md                   # Deployment guides
│
├── 📁 .git/                            # Git repository (monorepo)
├── 📁 .claude/                         # Claude Code configuration
├── 📁 .agents/                         # Agent skills
│
├── 📄 .gitignore                       # Git ignore rules
│
├── 📄 README.md                        # Main documentation
├── 📄 CLAUDE.md                        # AI assistant context
├── 📄 system.md                        # System architecture
├── 📄 design.md                        # Design system
├── 📄 STRUCTURE.md                     # This file
│
└── 📄 Other docs/                      # Additional documentation
    ├── CREDENTIALS.md
    ├── SETUP-COMPLETE.md
    ├── SYSTEM-STATUS.md
    ├── PROJECT-SUMMARY.md
    ├── PHASE-1-IMPLEMENTATION.md
    ├── DEPLOYMENT_FIX.md
    ├── MIGRATION-COMMANDS.md
    ├── REGION-SYSTEM-README.md
    └── TODO.md
```

## Key Characteristics

### ✅ Monorepo Benefits
1. **Single Repository** - Both frontend and backend in one repo
2. **Unified Git History** - Track changes across both projects together
3. **Easier Coordination** - API changes and frontend updates in one commit
4. **Shared Documentation** - Common docs at root level
5. **Simple CI/CD** - Deploy both from one pipeline

### 📦 Package Management
- **Frontend:** bun (fast, modern package manager)
- **Backend:** pnpm (efficient, strict dependencies)
- **No root dependencies** - frontend and backend run completely independently

### 🚀 Running the System

Open **two separate terminal windows**:

```bash
# Terminal 1 - Frontend
cd frontend
bun dev
# Frontend runs at http://localhost:3000

# Terminal 2 - Backend
cd backend
pnpm start:dev
# Backend runs at http://localhost:3001
```

### 🔧 Common Tasks

#### Install Dependencies
```bash
# Frontend
cd frontend
bun install

# Backend
cd backend
pnpm install
```

#### Build for Production
```bash
# Frontend
cd frontend
bun run build

# Backend
cd backend
pnpm build
```

#### Run Linting
```bash
# Frontend
cd frontend
bun run lint

# Backend
cd backend
pnpm lint
```

### 📝 Git Workflow

Since this is a monorepo, you commit both frontend and backend changes together:

```bash
# Make changes in frontend/
# Make changes in backend/

# Stage all changes
git add .

# Commit together
git commit -m "feat: add flood alert notification system"

# Push to remote
git push origin main
```

### 🌳 Branch Strategy

```bash
main                    # Production-ready code
├── develop             # Integration branch
├── feature/alerts      # Feature branches
├── feature/map         # Each feature isolated
└── hotfix/critical     # Critical fixes
```

### 📂 File Organization

#### Frontend Structure
```
frontend/app/
├── (public)/          # Public routes (no auth)
│   ├── page.tsx       # Landing page
│   └── alerts/        # Public alerts
├── (protected)/       # Protected routes (auth required)
│   ├── dashboard/     # User dashboard
│   └── admin/         # Admin panel
└── _components/       # Shared components
    ├── ui/            # UI primitives
    ├── layout/        # Layout components
    └── features/      # Feature-specific components
```

#### Backend Structure
```
backend/src/
├── main.ts            # Entry point
├── app.module.ts      # Root module
├── auth/              # Auth module
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   └── guards/
├── alerts/            # Alerts module
│   ├── alerts.controller.ts
│   ├── alerts.service.ts
│   └── alerts.module.ts
└── common/            # Shared code
    ├── filters/
    ├── interceptors/
    └── pipes/
```

### 🔐 Environment Variables

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx
NEXT_PUBLIC_AWS_REGION=ap-southeast-1
```

#### Backend (.env)
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/floodguard"
JWT_SECRET=your-secret-key
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=ap-southeast-1
```

### 🎯 Development Workflow

1. **Clone Repository**
   ```bash
   git clone <repo-url>
   cd problem-4
   ```

2. **Install Dependencies**
   ```bash
   # Frontend
   cd frontend
   bun install
   
   # Backend (in another terminal or after)
   cd backend
   pnpm install
   ```

3. **Setup Environment**
   ```bash
   cp frontend/.env.example frontend/.env.local
   cp backend/.env.example backend/.env
   # Edit the .env files with your values
   ```

4. **Run Database Migrations**
   ```bash
   cd backend
   pnpm prisma migrate dev
   pnpm prisma db seed
   ```

5. **Start Development Servers** (in two terminals)
   ```bash
   # Terminal 1
   cd frontend
   bun dev
   
   # Terminal 2
   cd backend
   pnpm start:dev
   ```

6. **Make Changes & Commit**
   ```bash
   git checkout -b feature/your-feature
   # Make changes...
   git add .
   git commit -m "feat: your feature"
   git push origin feature/your-feature
   ```

### 🚢 Deployment

#### Frontend (AWS Elastic Beanstalk)
```bash
cd frontend
eb deploy
```

#### Backend (AWS Elastic Beanstalk)
```bash
cd backend
eb deploy
```

See `SETUP-COMPLETE.md` for full AWS deployment setup.

---

**Last Updated:** June 28, 2026  
**Structure Version:** 2.0 (Monorepo)

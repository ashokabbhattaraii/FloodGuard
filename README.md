# FloodGuard - Flood Early Warning & Community Alert System

> APU DDAC (CT071-3-3) Group Project - Problem #4

A cloud-based flood monitoring and early warning system that provides real-time alerts, community reporting, and predictive flood forecasting.

## 🏗️ Project Structure

```
problem-4/                    # Root monorepo
├── frontend/                 # Next.js 16 + React 19 + Tailwind CSS 4
│   ├── app/                  # Next.js App Router pages
│   ├── public/               # Static assets
│   ├── utils/                # Shared utilities
│   ├── package.json          # Frontend dependencies (bun)
│   └── ...
├── backend/                  # NestJS 11 + TypeScript
│   ├── src/                  # Backend source code
│   ├── prisma/               # Database schema & migrations
│   ├── package.json          # Backend dependencies (pnpm)
│   └── ...
├── docs/                     # Project documentation
├── package.json              # Root package.json for monorepo scripts
├── CLAUDE.md                 # Project context for AI assistants
├── system.md                 # System architecture & requirements
└── design.md                 # Design system & UI specifications
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** >= 20.0.0
- **Bun** (for frontend) - `curl -fsSL https://bun.sh/install | bash`
- **pnpm** (for backend) - `npm install -g pnpm`
- **PostgreSQL** (local or AWS RDS)

### Installation

```bash
# Install frontend dependencies
cd frontend
bun install

# Install backend dependencies (in another terminal or after)
cd backend
pnpm install
```

### Environment Setup

#### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
```

#### Backend (`backend/.env`)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/floodguard"
JWT_SECRET=your_jwt_secret
AWS_REGION=ap-southeast-1
# Add other AWS credentials as needed
```

### Running the Application

Run frontend and backend in **separate terminal windows**:

#### Terminal 1 - Frontend
```bash
cd frontend
bun dev
```
Frontend runs at: http://localhost:3000

#### Terminal 2 - Backend
```bash
cd backend
pnpm start:dev
```
Backend runs at: http://localhost:3001

### Building for Production

```bash
# Build frontend
cd frontend
bun run build

# Build backend
cd backend
pnpm build
```

### Running Production Build

```bash
# Start frontend (in one terminal)
cd frontend
bun start

# Start backend (in another terminal)
cd backend
pnpm start:prod
```

## 📦 Available Commands

### Frontend Commands
```bash
cd frontend
bun dev          # Start dev server
bun run build    # Build for production
bun start        # Start production server
bun run lint     # Run ESLint
```

### Backend Commands
```bash
cd backend
pnpm start:dev   # Start dev server (watch mode)
pnpm build       # Build for production
pnpm start:prod  # Start production server
pnpm test        # Run tests
pnpm lint        # Run ESLint
```

## 🏛️ Architecture

### Frontend Stack
- **Framework:** Next.js 16 (App Router)
- **UI Library:** React 19
- **Styling:** Tailwind CSS 4
- **Animations:** GSAP
- **Package Manager:** Bun
- **Font:** Geist (body), Instrument Serif (accent italic)

### Backend Stack
- **Framework:** NestJS 11
- **Language:** TypeScript
- **Database:** PostgreSQL (Prisma ORM)
- **Package Manager:** pnpm

### Cloud Infrastructure (AWS)
- **Compute:** EC2/ECS
- **Database:** RDS PostgreSQL
- **Storage:** S3
- **Notifications:** SNS, SES
- **Monitoring:** CloudWatch
- **Serverless:** Lambda
- **Auth:** Cognito

## 👥 User Roles

1. **Public/Resident** - View alerts, submit reports, see flood maps
2. **Admin/Local Authority** - Manage alerts, review reports, monitor dashboards
3. **Super Admin** - User management, system config, cloud monitoring

## 🎨 Design System

**Theme:** Torivo Dark Indigo
- Background: `#08081e`
- Text: `#f6f6f6`
- Accent: `#7c7cff`
- Pill radius: 100px
- Card radius: 14px

See `design.md` for complete design tokens and component specifications.

## 📚 Documentation

- `CLAUDE.md` - Project context & conventions
- `system.md` - System architecture, features, DB schema, APIs
- `design.md` - Design tokens, typography, colors, components
- `docs/ui-plan.md` - Page-by-page UI wireframes
- `SETUP-COMPLETE.md` - AWS setup documentation
- `SYSTEM-STATUS.md` - Current implementation status

## 🔐 AWS Credentials

See `CREDENTIALS.md` for AWS access keys and configuration.

## 🧪 Testing

```bash
# Backend tests
cd backend
pnpm test        # Run tests
pnpm test:watch  # Watch mode
pnpm test:cov    # Coverage report
```

## 📋 Assessment Requirements

- **Task 1 (30 marks):** Frontend + Backend + AWS Compute + Database
- **Task 2 (20 marks):** Additional AWS services (S3, SNS/SES, Lambda, CloudWatch)
- Each team member must own 2+ distinct, non-overlapping features

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes in `frontend/` or `backend/` directories
3. Commit: `git commit -m "feat: your feature description"`
4. Push: `git push origin feature/your-feature`
5. Create a Pull Request

## 📝 Git Workflow

This is a **monorepo** - both frontend and backend are committed to the same repository:

```bash
# Stage changes from both frontend and backend
git add .

# Commit everything together
git commit -m "feat: implement flood alert system"

# Push to remote
git push origin main
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001 (backend)
lsof -ti:3001 | xargs kill -9
```

### Database Connection Issues
```bash
# Check PostgreSQL is running
psql -U postgres -l

# Run migrations
cd backend && pnpm prisma migrate dev
```

### Module Not Found
```bash
# Clean and reinstall
npm run clean
npm run install:all
```

## 📞 Support

For issues or questions, contact the development team or create an issue in the repository.

---

**Team:** APU DDAC CT071-3-3  
**Course:** Cloud Computing  
**Problem:** #4 - Flood Early Warning & Community Alert System

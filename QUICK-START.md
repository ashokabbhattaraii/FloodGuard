# Quick Start Guide - FloodGuard Monorepo

## ✅ Restructured Successfully!

Your project is now organized as a monorepo with frontend and backend as separate directories.

## 📁 New Structure

```
problem-4/           # Root (git repository)
├── frontend/        # Next.js app (bun)
├── backend/         # NestJS app (pnpm)
├── docs/            # Documentation
└── *.md files       # Project documentation
```

## 🚀 Getting Started

### 1. Install Dependencies

**Frontend:**
```bash
cd frontend
bun install
```

**Backend:**
```bash
cd backend
pnpm install
```

### 2. Setup Environment Variables

**Frontend** (`frontend/.env.local`):
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your values
```

**Backend** (`backend/.env`):
```bash
cd backend
cp .env.example .env
# Edit .env with your database and AWS credentials
```

### 3. Run Database Migrations (Backend)

```bash
cd backend
pnpm prisma migrate dev
pnpm prisma db seed  # Optional: seed data
```

### 4. Start Development Servers

Open **TWO terminal windows**:

**Terminal 1 - Frontend:**
```bash
cd frontend
bun dev
```
✅ Frontend: http://localhost:3000

**Terminal 2 - Backend:**
```bash
cd backend
pnpm start:dev
```
✅ Backend: http://localhost:3001

## 📝 Git Workflow

This is a **monorepo** - commit both frontend and backend changes together:

```bash
# Make changes in frontend/ and/or backend/
git add .
git commit -m "feat: your feature description"
git push origin main
```

## 🛠️ Common Commands

### Frontend
```bash
cd frontend
bun dev           # Dev server
bun run build     # Production build
bun start         # Start production
bun run lint      # Lint code
```

### Backend
```bash
cd backend
pnpm start:dev    # Dev server (watch mode)
pnpm build        # Production build
pnpm start:prod   # Start production
pnpm test         # Run tests
pnpm lint         # Lint code
```

## 📚 Documentation

- `README.md` - Complete project documentation
- `CLAUDE.md` - AI assistant context & conventions
- `STRUCTURE.md` - Detailed directory structure
- `system.md` - System architecture & requirements
- `design.md` - Design system & UI specs
- `docs/` - Additional documentation

## 🎯 Next Steps

1. ✅ Dependencies installed
2. ✅ Environment configured
3. ✅ Database migrated
4. ✅ Servers running
5. 🚀 Start building features!

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill frontend process (port 3000)
lsof -ti:3000 | xargs kill -9

# Kill backend process (port 3001)
lsof -ti:3001 | xargs kill -9
```

### Database connection error
```bash
# Check PostgreSQL is running
psql -U postgres -l

# Re-run migrations
cd backend
pnpm prisma migrate reset
```

### Module not found
```bash
# Clean and reinstall
cd frontend
rm -rf node_modules .next
bun install

cd ../backend
rm -rf node_modules dist
pnpm install
```

## 📞 Need Help?

Check these files:
- `README.md` - Full documentation
- `SETUP-COMPLETE.md` - AWS setup guide
- `SYSTEM-STATUS.md` - Implementation status
- `CREDENTIALS.md` - AWS credentials

---

**Project:** FloodGuard - Flood Early Warning System  
**Course:** APU DDAC (CT071-3-3)  
**Problem:** #4

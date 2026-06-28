# FloodGuard - Login Credentials

## Default User Accounts (Development)

All default accounts use password: **`12345678`**

### Admin Account
- **Email:** `admin@gmail.com`
- **Password:** `12345678`
- **Role:** Admin
- **Name:** Admin User

### Resident Account
- **Email:** `user@gmail.com`
- **Password:** `12345678`
- **Role:** Resident
- **Name:** Ahmad Resident

### Volunteer Accounts
1. **Email:** `volunteer1@gmail.com`
   - **Password:** `12345678`
   - **Role:** Volunteer
   - **Name:** Siti Volunteer

2. **Email:** `volunteer2@gmail.com`
   - **Password:** `12345678`
   - **Role:** Volunteer
   - **Name:** Kumar Volunteer

## Database Info
- **Database Name:** `floodguard`
- **PostgreSQL Connection:** `postgresql://postgres@localhost:5432/floodguard`

## Re-seeding the Database

If you need to re-seed the database:

```bash
cd backend
# Option 1: Run seed file directly
cd prisma && npx tsx seed-realistic.ts

# Option 2: Reset database and run migrations
pnpm prisma migrate reset
```

## Important Notes
- These are **development credentials only**
- Never commit real passwords to version control
- Change all credentials before deploying to production
- The seed file is at: `backend/prisma/seed-realistic.ts`

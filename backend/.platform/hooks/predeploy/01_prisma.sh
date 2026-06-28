#!/bin/bash
cd /var/app/staging

# Generate Prisma client
npx prisma generate

# Try migrate deploy, if it fails (e.g. P3005 - non-empty database), use db push
if npx prisma migrate deploy 2>&1 | tee /tmp/prisma-migrate.log; then
  echo "Prisma migrate deploy succeeded"
else
  EXIT_CODE=$?
  echo "Prisma migrate deploy failed with exit code $EXIT_CODE"

  # Check if failure is due to P3005 (non-empty database)
  if grep -q "P3005" /tmp/prisma-migrate.log || grep -q "database schema is not empty" /tmp/prisma-migrate.log; then
    echo "Database schema exists, running db push instead..."
    npx prisma db push --accept-data-loss --skip-generate
  else
    echo "Migration failed for unknown reason, exiting..."
    exit $EXIT_CODE
  fi
fi

#!/bin/bash
cd /var/app/staging
npx prisma generate
npx prisma migrate deploy

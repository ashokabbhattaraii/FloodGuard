#!/bin/bash
set -e

# Install pnpm
npm install -g pnpm

# Install all dependencies (need devDeps for build + prisma CLI)
pnpm install --frozen-lockfile

# Generate Prisma client
npx prisma generate

# Build the NestJS application
npx nest build

# Remove devDependencies
pnpm prune --prod

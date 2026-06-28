#!/bin/bash
# Build Next.js application
set -e

echo "Building Next.js application..."
cd /var/app/staging
npm run build

echo "Build completed successfully!"
ls -la .next/

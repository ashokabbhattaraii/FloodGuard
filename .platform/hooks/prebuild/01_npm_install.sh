#!/bin/bash
# Install dependencies before build
set -e

echo "Installing Node.js dependencies..."
cd /var/app/staging
npm ci --production=false

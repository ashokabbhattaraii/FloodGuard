#!/bin/bash
# Install production dependencies only
set -e

echo "Installing production dependencies..."
cd /var/app/current
npm ci --production --omit=dev

echo "Dependencies installed successfully!"

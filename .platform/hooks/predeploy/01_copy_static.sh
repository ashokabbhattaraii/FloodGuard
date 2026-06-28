#!/bin/bash
# Copy public and static files to standalone folder for Next.js

set -e

echo "Copying static files to standalone folder..."

# Copy public folder
if [ -d "/var/app/staging/public" ]; then
    echo "Copying public folder..."
    cp -r /var/app/staging/public /var/app/staging/.next/standalone/
fi

# Copy .next/static folder
if [ -d "/var/app/staging/.next/static" ]; then
    echo "Copying .next/static folder..."
    cp -r /var/app/staging/.next/static /var/app/staging/.next/standalone/.next/
fi

echo "Static files copied successfully!"

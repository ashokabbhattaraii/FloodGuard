#!/bin/bash
set -e

echo "🔨 Building Next.js application..."
bun run build

echo "📦 Copying static assets..."
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/

echo "📋 Creating deployment package..."
cd .next/standalone

# Create a proper zip with dereferenced symlinks
echo "🗜️  Zipping with dereferenced symlinks..."
zip -r ../../frontend-deploy.zip . -x "*.DS_Store"

cd ../..

echo "☁️  Deploying to Elastic Beanstalk..."
eb deploy --label "deploy-$(date +%Y%m%d-%H%M%S)" --source frontend-deploy.zip

echo "✅ Frontend deployment complete!"

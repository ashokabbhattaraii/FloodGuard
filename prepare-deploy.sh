#!/bin/bash
set -e

echo "🔨 Building Next.js application..."
bun run build

echo "📦 Copying static assets to standalone..."
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
cp -r public .next/standalone/ 2>/dev/null || true

echo "🔄 Converting symlinked node_modules to real files..."
cd .next/standalone/node_modules

# Remove pnpm symlinks and reinstall with npm for proper packaging
echo "  - Removing symlinked modules..."
rm -rf .pnpm 2>/dev/null || true

# Fix symlinks by copying actual files
for link in $(find . -maxdepth 1 -type l); do
    target=$(readlink "$link")
    if [ -e "$target" ]; then
        echo "  - Dereferencing: $link"
        rm "$link"
        cp -r "$target" "$link"
    fi
done

cd ../../..

echo "✅ Deployment package prepared!"
echo "Run: eb deploy --label \"deploy-$(date +%Y%m%d-%H%M%S)\""

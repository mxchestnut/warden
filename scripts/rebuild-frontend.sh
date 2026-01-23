#!/bin/bash

# Manual frontend rebuild and deployment

cd ~/warden-backend/frontend-src

echo "🔍 Current git status..."
git status

echo ""
echo "📦 Installing dependencies..."
npm ci

echo ""
echo "🔨 Building frontend..."
npm run build

echo ""
echo "📁 Deploying to nginx..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/. /var/www/html/
sudo chown -R www-data:www-data /var/www/html

echo ""
echo "✅ Frontend rebuilt and deployed!"
echo ""
echo "Testing for localhost:3000..."
grep -r "localhost:3000" dist/ | wc -l
echo "^ Should be 0"

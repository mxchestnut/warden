#!/bin/bash

# Quick script to fix nginx MIME type configuration on production server
# This rebuilds frontend and updates nginx config with MIME type support

set -e

echo "🔨 Rebuilding frontend..."
cd ~/warden-backend/frontend-src
npm ci
npm run build

echo "📁 Deploying frontend files..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/. /var/www/html/
sudo chown -R www-data:www-data /var/www/html

echo "⚙️  Updating nginx configuration with MIME type support..."
sudo cp nginx-site.conf /etc/nginx/sites-available/default

echo "🔍 Verifying MIME types file exists..."
if [ ! -f /etc/nginx/mime.types ]; then
    echo "❌ ERROR: /etc/nginx/mime.types not found!"
    echo "This file should be installed with nginx by default."
    exit 1
fi

echo "🔍 Testing nginx configuration..."
sudo nginx -t

echo "🔄 Reloading nginx..."
sudo systemctl reload nginx

echo "✅ Done! CSS files should now be served with correct MIME types"
echo ""
echo "🧪 Test the fix:"
echo "  curl -I https://warden.my/assets/CharacterEdit-BrPP7WSI.css"
echo "  (Should show Content-Type: text/css)"
echo ""
echo "🔍 If issues persist, check nginx error log:"
echo "  sudo tail -f /var/log/nginx/error.log"

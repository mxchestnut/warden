#!/bin/bash

# Script to diagnose and fix the nginx reverse proxy issue
# The frontend static files need to be served by nginx, not proxied to backend

echo "🔍 Diagnosing nginx configuration..."
echo ""

echo "📋 Current nginx configuration:"
echo "--------------------------------"
sudo cat /etc/nginx/sites-available/default
echo ""
echo "================================"
echo ""

echo "📁 Checking /var/www/html contents:"
echo "--------------------------------"
ls -lah /var/www/html/
echo ""

echo "🔍 Checking if /var/www/html/assets exists:"
if [ -d "/var/www/html/assets" ]; then
    echo "✅ /assets directory exists"
    echo "Sample files:"
    ls /var/www/html/assets/ | head -10
else
    echo "❌ /assets directory NOT FOUND!"
    echo "This means the frontend build wasn't deployed to /var/www/html"
fi
echo ""

echo "🔍 Testing asset serving directly:"
echo "Local nginx test (should be text/css):"
curl -I http://localhost/assets/CharacterEdit-BrPP7WSI.css 2>&1 | grep -i "content-type" || echo "File not found"
echo ""

echo "🔍 Testing backend direct (port 3000):"
echo "Backend test (this is what we're getting now):"
curl -I http://localhost:3000/assets/CharacterEdit-BrPP7WSI.css 2>&1 | grep -i "content-type" || echo "File not found"
echo ""

echo "💡 The issue is that nginx is forwarding /assets requests to the backend"
echo "   instead of serving them directly from /var/www/html/"

#!/bin/bash

# Emergency fix script to manually update nginx on production server
# Run this directly on the server via SSH

set -e

echo "🚨 EMERGENCY NGINX FIX"
echo "====================="
echo ""

echo "📋 Step 1: Checking current nginx configuration..."
echo ""
echo "Current /etc/nginx/sites-available/default:"
echo "-------------------------------------------"
sudo cat /etc/nginx/sites-available/default
echo ""
echo "-------------------------------------------"
echo ""

read -p "📝 Does this config have 'location /api/' block? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "❌ The nginx config doesn't have the reverse proxy setup!"
    echo "   The deployment script may have failed to update it."
    echo ""
    echo "🔧 Manual fix required. Here's what to do:"
    echo ""
    echo "1. Edit the nginx config:"
    echo "   sudo nano /etc/nginx/sites-available/default"
    echo ""
    echo "2. Find the main 'server {' block (NOT the one for SSL redirect)"
    echo ""
    echo "3. Add this BEFORE any 'location /' block:"
    echo ""
    cat << 'EOF'
    # API requests go to backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }

    # Explicitly handle /assets directory - SERVE FROM DISK
    location /assets/ {
        root /var/www/html;
        expires 7d;
        add_header Cache-Control "public, must-revalidate";
        try_files $uri =404;
    }

    # Static assets - SERVE FROM DISK
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/html;
        expires 7d;
        add_header Cache-Control "public, must-revalidate";
        try_files $uri =404;
    }
EOF
    echo ""
    echo "4. Make sure the server block has these directives at the top:"
    echo "   include /etc/nginx/mime.types;"
    echo "   default_type application/octet-stream;"
    echo ""
    echo "5. Test and reload:"
    echo "   sudo nginx -t"
    echo "   sudo systemctl reload nginx"
    echo ""
    exit 1
fi

echo ""
echo "✅ Config appears to have reverse proxy setup"
echo ""

echo "📋 Step 2: Checking if static files exist..."
if [ ! -d "/var/www/html/assets" ]; then
    echo "❌ /var/www/html/assets directory doesn't exist!"
    echo "   Rebuilding frontend..."
    cd ~/warden-backend/frontend-src
    npm run build
    sudo rm -rf /var/www/html/*
    sudo cp -r dist/. /var/www/html/
    sudo chown -R www-data:www-data /var/www/html
else
    echo "✅ /var/www/html/assets exists"
fi
echo ""

echo "📋 Step 3: Testing static file serving..."
echo "Test 1: Direct nginx (port 80)..."
curl -I http://localhost/assets/CharacterEdit-BrPP7WSI.css 2>&1 | grep "Content-Type" || echo "File not found"

echo ""
echo "Test 2: Backend (port 3000) - should NOT serve this..."
curl -I http://localhost:3000/assets/CharacterEdit-BrPP7WSI.css 2>&1 | grep "Content-Type" || echo "File not found"

echo ""
echo "📋 Step 4: If the issue persists, check which nginx config is being used..."
sudo nginx -T | grep -A 50 "server {" | grep -B 5 -A 20 "location.*assets"

echo ""
echo "💡 If you see SSL configs above, the issue might be in the SSL server block"
echo "   Certbot creates a separate server block for SSL (port 443)"
echo ""

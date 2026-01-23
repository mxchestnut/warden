#!/bin/bash

# Direct fix - point nginx at the warden.my certificate that should exist now

set -e

echo "🔍 Checking for warden.my certificate..."

if [ -f "/etc/letsencrypt/live/warden.my/fullchain.pem" ]; then
    echo "✅ Found warden.my certificate!"
    
    # Find nginx config
    if [ -f "/etc/nginx/conf.d/default.conf" ]; then
        NGINX_CONF="/etc/nginx/conf.d/default.conf"
    else
        NGINX_CONF="/etc/nginx/sites-available/default"
    fi
    
    echo "Updating $NGINX_CONF to use warden.my certificate..."
    
    # Update SSL certificate paths in nginx config
    sudo sed -i 's|ssl_certificate /etc/letsencrypt/live/api.warden.my/fullchain.pem|ssl_certificate /etc/letsencrypt/live/warden.my/fullchain.pem|g' "$NGINX_CONF"
    sudo sed -i 's|ssl_certificate_key /etc/letsencrypt/live/api.warden.my/privkey.pem|ssl_certificate_key /etc/letsencrypt/live/warden.my/privkey.pem|g' "$NGINX_CONF"
    
    # Also update server_name if needed
    sudo sed -i 's/server_name api.warden.my/server_name warden.my www.warden.my/g' "$NGINX_CONF"
    
    echo ""
    echo "Testing nginx configuration..."
    sudo nginx -t
    
    echo ""
    echo "Reloading nginx..."
    sudo systemctl reload nginx
    
    echo ""
    echo "✅ Certificate updated! Checking..."
    sleep 2
    curl -I https://localhost 2>&1 | head -5
    
elif [ -f "/etc/letsencrypt/live/api.warden.my/fullchain.pem" ]; then
    echo "⚠️  Only api.warden.my certificate exists"
    echo "Getting warden.my certificate..."
    
    sudo systemctl stop nginx
    sudo certbot certonly --standalone --non-interactive --agree-tos \
      --email admin@warden.my \
      -d warden.my -d www.warden.my
    sudo systemctl start nginx
    
    # Run this script again
    $0
else
    echo "❌ No certificates found!"
    exit 1
fi

#!/bin/bash

# Get SSL certificate for warden.my using certbot nginx mode
# This doesn't require stopping nginx

set -e

echo "🔐 Getting SSL Certificate for warden.my"
echo "========================================"
echo ""

# First, make sure nginx is configured to respond to warden.my
NGINX_CONF="/etc/nginx/conf.d/default.conf"
if [ ! -f "$NGINX_CONF" ]; then
    NGINX_CONF="/etc/nginx/sites-available/default"
fi

echo "Updating nginx to accept warden.my requests..."
sudo sed -i 's/server_name api.warden.my/server_name warden.my www.warden.my api.warden.my/g' "$NGINX_CONF"
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "Running certbot to get warden.my certificate..."
echo ""

# Use certbot nginx mode - it handles everything automatically
sudo certbot --nginx --non-interactive --agree-tos \
  --email admin@warden.my \
  -d warden.my -d www.warden.my \
  --redirect

echo ""
echo "✅ Certificate obtained and nginx configured!"
echo ""

# Verify
echo "Checking certificate..."
sudo certbot certificates | grep -A 5 "warden.my"

echo ""
echo "Testing HTTPS..."
sleep 2
curl -I https://localhost 2>&1 | head -5

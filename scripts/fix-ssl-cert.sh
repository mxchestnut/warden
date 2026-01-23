#!/bin/bash

# Fix SSL certificate mismatch by using correct certificate
# The issue: certificate is for api.warden.my but we need warden.my

set -e

echo "🚨 FIXING SSL CERTIFICATE CONFIGURATION"
echo "========================================"
echo ""

# Find nginx config
if [ -f "/etc/nginx/conf.d/default.conf" ]; then
    NGINX_CONF="/etc/nginx/conf.d/default.conf"
elif [ -f "/etc/nginx/sites-available/default" ]; then
    NGINX_CONF="/etc/nginx/sites-available/default"
else
    NGINX_CONF=$(sudo find /etc/nginx/conf.d -name "*.conf" 2>/dev/null | head -1)
fi

echo "Nginx config: $NGINX_CONF"
echo ""

# Check what certificates exist
echo "🔍 Checking available Let's Encrypt certificates..."
if [ -d "/etc/letsencrypt/live" ]; then
    echo "Available certificates:"
    sudo ls -la /etc/letsencrypt/live/
    echo ""
    
    # Look for warden.my certificate
    if [ -d "/etc/letsencrypt/live/warden.my" ]; then
        echo "✅ Found warden.my certificate"
        CERT_DIR="warden.my"
    elif [ -d "/etc/letsencrypt/live/api.warden.my" ]; then
        echo "⚠️  Only found api.warden.my certificate"
        echo "We need to get a certificate for warden.my"
        CERT_DIR="api.warden.my"
        NEEDS_NEW_CERT=true
    else
        CERT_DIR=$(sudo ls -t /etc/letsencrypt/live/ | grep -v README | head -1)
        echo "Using: $CERT_DIR"
    fi
else
    echo "❌ No Let's Encrypt certificates found!"
    exit 1
fi

SSL_CERT="/etc/letsencrypt/live/$CERT_DIR/fullchain.pem"
SSL_KEY="/etc/letsencrypt/live/$CERT_DIR/privkey.pem"

echo ""
echo "Using certificate: $SSL_CERT"
echo ""

# Check what domains are in the certificate
echo "🔍 Checking certificate domains..."
CERT_DOMAINS=$(sudo openssl x509 -in "$SSL_CERT" -noout -text | grep -A1 "Subject Alternative Name" | tail -1 || sudo openssl x509 -in "$SSL_CERT" -noout -subject | sed 's/.*CN = //')
echo "Certificate covers: $CERT_DOMAINS"
echo ""

# Backup current config
sudo cp "$NGINX_CONF" "${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"

# Create nginx config that matches the certificate
echo "📝 Creating nginx configuration..."

if echo "$CERT_DOMAINS" | grep -q "warden.my"; then
    # Certificate covers warden.my - use it
    SERVER_NAMES="warden.my www.warden.my"
elif echo "$CERT_DOMAINS" | grep -q "api.warden.my"; then
    # Only have api.warden.my - need to get new cert or use this one
    if [ "$NEEDS_NEW_CERT" = true ]; then
        echo "⚠️  WARNING: Certificate only covers api.warden.my"
        echo "We'll configure nginx for warden.my but you'll need to run certbot:"
        echo "  sudo certbot --nginx -d warden.my -d www.warden.my"
        SERVER_NAMES="warden.my www.warden.my"
    else
        SERVER_NAMES="api.warden.my"
    fi
else
    # Fallback
    SERVER_NAMES="warden.my www.warden.my api.warden.my"
fi

echo "Server names: $SERVER_NAMES"
echo ""

sudo tee "$NGINX_CONF" > /dev/null << EOF
# HTTP - redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_NAMES;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS - main application
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $SERVER_NAMES;
    
    root /var/www/html;
    index index.html;
    
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # SSL Configuration
    ssl_certificate $SSL_CERT;
    ssl_certificate_key $SSL_KEY;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # API proxying
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static assets from disk
    location /assets/ {
        expires 7d;
        add_header Cache-Control "public, must-revalidate";
        try_files \$uri =404;
    }
    
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        expires 7d;
        add_header Cache-Control "public, must-revalidate";
        try_files \$uri =404;
    }
    
    location = /staff {
        try_files /staff.html =404;
    }
    
    # SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
}
EOF

echo "✅ Configuration created"
echo ""

echo "🧪 Testing nginx configuration..."
if ! sudo nginx -t; then
    echo "❌ Configuration invalid!"
    sudo cp "${NGINX_CONF}.backup."* "$NGINX_CONF"
    exit 1
fi

echo "✅ Configuration valid"
echo ""

echo "🔄 Reloading nginx..."
sudo systemctl reload nginx || sudo service nginx reload

echo ""
echo "✅ NGINX CONFIGURED"
echo ""

if [ "$NEEDS_NEW_CERT" = true ]; then
    echo "⚠️  IMPORTANT: You need to get an SSL certificate for warden.my"
    echo ""
    echo "Run this command on the server:"
    echo "  sudo certbot --nginx -d warden.my -d www.warden.my"
    echo ""
    echo "This will automatically:"
    echo "  1. Get a new certificate from Let's Encrypt"
    echo "  2. Update nginx configuration"
    echo "  3. Fix the SSL error"
else
    echo "✅ SSL should be working now!"
fi

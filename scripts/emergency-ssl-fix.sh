#!/bin/bash

# Emergency SSL fix - restore proper SSL configuration

set -e

echo "🚨 EMERGENCY SSL FIX"
echo "==================="
echo ""

# Find nginx config
if [ -f "/etc/nginx/conf.d/default.conf" ]; then
    NGINX_CONF="/etc/nginx/conf.d/default.conf"
elif [ -f "/etc/nginx/sites-available/default" ]; then
    NGINX_CONF="/etc/nginx/sites-available/default"
else
    NGINX_CONF=$(sudo find /etc/nginx/conf.d -name "*.conf" 2>/dev/null | head -1)
fi

echo "Config file: $NGINX_CONF"
echo ""

# Extract SSL certificate info
SSL_CERT=$(sudo grep -r "ssl_certificate " /etc/nginx/ 2>/dev/null | grep -v "ssl_certificate_key" | head -1 | awk '{print $2}' | tr -d ';')
SSL_KEY=$(sudo grep -r "ssl_certificate_key" /etc/nginx/ 2>/dev/null | head -1 | awk '{print $2}' | tr -d ';')

if [ -z "$SSL_CERT" ]; then
    echo "❌ Cannot find SSL certificate configuration!"
    echo "Checking Certbot certificates..."
    if [ -d "/etc/letsencrypt/live" ]; then
        CERT_DIR=$(sudo ls -t /etc/letsencrypt/live/ | head -1)
        SSL_CERT="/etc/letsencrypt/live/$CERT_DIR/fullchain.pem"
        SSL_KEY="/etc/letsencrypt/live/$CERT_DIR/privkey.pem"
        echo "Found: $CERT_DIR"
    else
        echo "❌ No SSL certificates found!"
        exit 1
    fi
fi

echo "SSL Certificate: $SSL_CERT"
echo "SSL Key: $SSL_KEY"
echo ""

# Get domain from certificate
CERT_DOMAIN=$(sudo openssl x509 -in "$SSL_CERT" -noout -subject 2>/dev/null | sed 's/.*CN = //' || echo "warden.my")
echo "Certificate domain: $CERT_DOMAIN"
echo ""

# Backup current config
sudo cp "$NGINX_CONF" "${NGINX_CONF}.broken.$(date +%Y%m%d_%H%M%S)"

# Create fixed configuration
echo "📝 Creating fixed SSL configuration..."

sudo tee "$NGINX_CONF" > /dev/null << EOF
# HTTP - redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $CERT_DOMAIN www.$CERT_DOMAIN;
    
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
    server_name $CERT_DOMAIN www.$CERT_DOMAIN;
    
    root /var/www/html;
    index index.html;
    
    # MIME types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # SSL Configuration
    ssl_certificate $SSL_CERT;
    ssl_certificate_key $SSL_KEY;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Include Certbot SSL options if available
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # API proxying to backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Static assets - served from nginx
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
    
    # Staff page
    location = /staff {
        try_files /staff.html =404;
    }
    
    # SPA routing fallback
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
}
EOF

echo "✅ Configuration created"
echo ""

echo "🧪 Testing configuration..."
if ! sudo nginx -t; then
    echo "❌ Configuration test failed!"
    echo "Restoring backup..."
    sudo cp "${NGINX_CONF}.broken."* "$NGINX_CONF"
    exit 1
fi

echo "✅ Configuration valid"
echo ""

echo "🔄 Reloading nginx..."
sudo systemctl reload nginx || sudo service nginx reload

echo ""
echo "✅ SSL FIXED!"
echo ""
echo "🧪 Test: https://$CERT_DOMAIN"

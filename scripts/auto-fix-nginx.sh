#!/bin/bash

# Find and fix nginx configuration wherever it is

set -e

echo "🔍 FINDING NGINX CONFIGURATION"
echo "=============================="
echo ""

# Find the main nginx config
NGINX_CONF=""

if [ -f "/etc/nginx/sites-available/default" ]; then
    NGINX_CONF="/etc/nginx/sites-available/default"
    echo "✅ Found: /etc/nginx/sites-available/default"
elif [ -f "/etc/nginx/conf.d/default.conf" ]; then
    NGINX_CONF="/etc/nginx/conf.d/default.conf"
    echo "✅ Found: /etc/nginx/conf.d/default.conf"
elif [ -f "/etc/nginx/nginx.conf" ]; then
    echo "⚠️  Only found /etc/nginx/nginx.conf (main config)"
    echo "Looking for server blocks in conf.d..."
    NGINX_CONF=$(sudo find /etc/nginx/conf.d -name "*.conf" 2>/dev/null | head -1)
    if [ -n "$NGINX_CONF" ]; then
        echo "✅ Found: $NGINX_CONF"
    else
        echo "❌ No server configuration found!"
        echo "Creating new config in /etc/nginx/conf.d/warden.conf"
        NGINX_CONF="/etc/nginx/conf.d/warden.conf"
    fi
else
    echo "❌ Cannot find nginx configuration!"
    exit 1
fi

echo "Using config: $NGINX_CONF"
echo ""

# Backup if exists
if [ -f "$NGINX_CONF" ]; then
    echo "📦 Backing up current config..."
    sudo cp "$NGINX_CONF" "${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Check for SSL
HAS_SSL=false
if [ -f "$NGINX_CONF" ] && sudo grep -q "listen 443 ssl" "$NGINX_CONF"; then
    echo "✅ SSL is configured"
    HAS_SSL=true
    
    # Extract SSL paths
    SSL_CERT=$(sudo grep -m 1 "ssl_certificate " "$NGINX_CONF" | grep -v "ssl_certificate_key" | awk '{print $2}' | tr -d ';')
    SSL_KEY=$(sudo grep -m 1 "ssl_certificate_key" "$NGINX_CONF" | awk '{print $2}' | tr -d ';')
    
    # Get domain from certificate for proper server_name
    CERT_DOMAIN=$(sudo openssl x509 -in "$SSL_CERT" -noout -subject 2>/dev/null | sed 's/.*CN = //' || echo "warden.my")
    
    echo "SSL Cert: $SSL_CERT"
    echo "SSL Key: $SSL_KEY"
    echo "Certificate Domain: $CERT_DOMAIN"
else
    echo "ℹ️  No SSL configuration"
fi

echo ""
echo "📝 Creating new nginx configuration..."

if [ "$HAS_SSL" = true ]; then
    # SSL configuration
    sudo tee "$NGINX_CONF" > /dev/null << EOF
# HTTP - redirect to HTTPS
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $CERT_DOMAIN www.$CERT_DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS - main server
server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name $CERT_DOMAIN www.$CERT_DOMAIN;
    
    root /var/www/html;
    index index.html;
    
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    ssl_certificate $SSL_CERT;
    ssl_certificate_key $SSL_KEY;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # API to backend
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
        try_files \$uri =404;
    }
    
    # SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

else
    # HTTP only
    sudo tee "$NGINX_CONF" > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    root /var/www/html;
    index index.html;
    
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /assets/ {
        expires 7d;
        try_files $uri =404;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 7d;
        try_files $uri =404;
    }
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

fi

echo "✅ Configuration created"
echo ""

echo "🧪 Testing configuration..."
if sudo nginx -t; then
    echo "✅ Configuration valid"
else
    echo "❌ Configuration invalid!"
    if [ -f "${NGINX_CONF}.backup.$(date +%Y%m%d)_"* ]; then
        echo "Restoring backup..."
        sudo cp "${NGINX_CONF}.backup."* "$NGINX_CONF"
    fi
    exit 1
fi

echo ""
echo "🔄 Reloading nginx..."
sudo systemctl reload nginx || sudo service nginx reload

echo ""
echo "✅ NGINX FIXED!"
echo ""
echo "🧪 Testing..."
sleep 2
curl -I http://localhost/assets/CharacterEdit-BrPP7WSI.css 2>&1 | grep "Content-Type" || echo "CSS file not found locally"

echo ""
echo "Configuration saved to: $NGINX_CONF"

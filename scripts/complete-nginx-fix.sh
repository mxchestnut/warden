#!/bin/bash

# Complete nginx fix script for production
# This handles both HTTP and HTTPS (SSL) configurations

set -e

echo "🔧 COMPLETE NGINX FIX FOR WARDEN.MY"
echo "==================================="
echo ""

# Backup current config
echo "📦 Backing up current nginx config..."
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

# Get the current config to check for SSL
echo "🔍 Checking for SSL configuration..."
if sudo grep -q "listen 443 ssl" /etc/nginx/sites-available/default; then
    echo "✅ SSL is configured (Certbot)"
    HAS_SSL=true
else
    echo "ℹ️  No SSL configuration found"
    HAS_SSL=false
fi

# Create the complete nginx configuration
echo "📝 Creating new nginx configuration..."

if [ "$HAS_SSL" = true ]; then
    # SSL is configured - we need to update the HTTPS server block
    echo "Updating SSL-enabled configuration..."
    
    # Extract SSL certificate paths
    SSL_CERT=$(sudo grep -m 1 "ssl_certificate " /etc/nginx/sites-available/default | grep -v "ssl_certificate_key" | awk '{print $2}' | tr -d ';')
    SSL_KEY=$(sudo grep -m 1 "ssl_certificate_key" /etc/nginx/sites-available/default | awk '{print $2}' | tr -d ';')
    
    sudo tee /etc/nginx/sites-available/default > /dev/null << EOF
# HTTP - redirect to HTTPS
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name warden.my www.warden.my;
    
    # Allow Certbot challenges
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other HTTP to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS - main server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name warden.my www.warden.my;
    
    root /var/www/html;
    index index.html;
    
    # Include MIME types - CRITICAL
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # SSL Configuration
    ssl_certificate $SSL_CERT;
    ssl_certificate_key $SSL_KEY;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;
    
    # API requests go to backend
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
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static assets - MUST come before location /
    location /assets/ {
        expires 7d;
        add_header Cache-Control "public, must-revalidate";
        try_files \$uri =404;
    }
    
    # All static files by extension
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 7d;
        add_header Cache-Control "public, must-revalidate";
        try_files \$uri =404;
    }
    
    # Staff dashboard
    location = /staff {
        try_files /staff.html =404;
    }
    
    # SPA routing - catch-all (MUST be last)
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
}
EOF

else
    # No SSL - use simple HTTP config
    echo "Creating HTTP-only configuration..."
    
    sudo tee /etc/nginx/sites-available/default > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root /var/www/html;
    index index.html;

    # Include MIME types - CRITICAL
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # API requests go to backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets
    location /assets/ {
        expires 7d;
        add_header Cache-Control "public, must-revalidate";
        try_files $uri =404;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 7d;
        add_header Cache-Control "public, must-revalidate";
        try_files $uri =404;
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

fi

echo ""
echo "✅ New configuration created"
echo ""

# Test configuration
echo "🧪 Testing nginx configuration..."
if sudo nginx -t; then
    echo "✅ Configuration test passed"
else
    echo "❌ Configuration test failed!"
    echo "Restoring backup..."
    sudo cp /etc/nginx/sites-available/default.backup.$(date +%Y%m%d)_* /etc/nginx/sites-available/default
    exit 1
fi

# Reload nginx
echo ""
echo "🔄 Reloading nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Nginx reloaded successfully!"
echo ""

# Test the fix
echo "🧪 Testing CSS file serving..."
echo ""
sleep 2

echo "Test 1: HTTP/HTTPS response"
if [ "$HAS_SSL" = true ]; then
    curl -I https://localhost/assets/CharacterEdit-BrPP7WSI.css 2>&1 | grep "Content-Type" || echo "⚠️  CSS file not found"
else
    curl -I http://localhost/assets/CharacterEdit-BrPP7WSI.css 2>&1 | grep "Content-Type" || echo "⚠️  CSS file not found"
fi

echo ""
echo "✅ COMPLETE! CSS files should now be served with correct MIME type"
echo ""
echo "🧪 Test from your browser:"
echo "   https://warden.my/assets/CharacterEdit-BrPP7WSI.css"
echo "   Should show Content-Type: text/css"
echo ""

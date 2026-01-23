#!/bin/bash

# Script to verify nginx configuration has all required elements
# Run this before deployment to catch configuration issues

set -e

CONFIG_FILE="frontend-src/nginx-site.conf"
DOCKER_CONFIG="frontend-src/nginx.conf"

echo "🔍 Verifying nginx configurations..."
echo ""

check_config() {
    local file=$1
    local errors=0
    
    echo "Checking $file..."
    
    # Check for MIME types include
    if ! grep -q "include.*mime\.types" "$file"; then
        echo "  ❌ Missing 'include /etc/nginx/mime.types;'"
        errors=$((errors + 1))
    else
        echo "  ✅ MIME types included"
    fi
    
    # Check for default_type
    if ! grep -q "default_type" "$file"; then
        echo "  ⚠️  Missing 'default_type' directive"
        errors=$((errors + 1))
    else
        echo "  ✅ default_type set"
    fi
    
    # Check for /assets/ location
    if ! grep -q "location /assets/" "$file"; then
        echo "  ⚠️  Missing explicit /assets/ location block"
        errors=$((errors + 1))
    else
        echo "  ✅ /assets/ location block present"
    fi
    
    # Check for SPA catch-all
    if ! grep -q "try_files.*index\.html" "$file"; then
        echo "  ❌ Missing SPA catch-all with index.html"
        errors=$((errors + 1))
    else
        echo "  ✅ SPA routing configured"
    fi
    
    echo ""
    return $errors
}

total_errors=0

check_config "$CONFIG_FILE" || total_errors=$((total_errors + $?))
check_config "$DOCKER_CONFIG" || total_errors=$((total_errors + $?))

if [ $total_errors -eq 0 ]; then
    echo "✅ All nginx configurations are valid!"
    exit 0
else
    echo "❌ Found $total_errors configuration issue(s)"
    echo ""
    echo "These issues can cause MIME type errors in production."
    echo "Please fix before deploying."
    exit 1
fi

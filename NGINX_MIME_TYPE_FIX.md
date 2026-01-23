# Nginx MIME Type Configuration Fix

## Problem

CSS and JS files were being served with incorrect MIME type `text/html` instead of `text/css` and `application/javascript`, causing browser errors:

```
Refused to apply style from 'https://warden.my/assets/CharacterEdit-BrPP7WSI.css' 
because its MIME type ('text/html') is not a supported stylesheet MIME type
```

## Root Cause

The nginx configuration was **missing the critical `include /etc/nginx/mime.types;` directive**, which tells nginx what Content-Type header to use for different file extensions.

Without this directive:
- `.css` files → served as `application/octet-stream` or fallback to `text/html`
- `.js` files → served incorrectly
- Browsers reject files with wrong MIME types for security reasons

## The Permanent Fix

### 1. Added MIME Type Configuration

Both `nginx-site.conf` and `nginx.conf` now include:

```nginx
server {
    listen 80;
    server_name _;
    root /var/www/html;
    index index.html;

    # Include MIME types - CRITICAL for proper Content-Type headers
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # ... rest of configuration
}
```

### 2. Explicit /assets/ Handling

Prevent SPA routing from serving `index.html` for missing assets:

```nginx
# Explicitly handle /assets directory to prevent fallback to index.html
location /assets/ {
    expires 7d;
    add_header Cache-Control "public, must-revalidate";
    try_files $uri =404;
}
```

### 3. CI/CD Verification

Added automated check in deployment pipeline that verifies:
- ✅ MIME types are included
- ✅ default_type is set
- ✅ /assets/ location block exists
- ✅ SPA routing is configured

Run locally: `./scripts/verify-nginx-config.sh`

## How MIME Types Work

The `/etc/nginx/mime.types` file contains mappings like:

```nginx
types {
    text/html                             html htm shtml;
    text/css                              css;
    text/xml                              xml;
    application/javascript                js;
    application/json                      json;
    # ... hundreds more
}
```

When nginx serves a `.css` file:
1. Checks the file extension (`.css`)
2. Looks up the MIME type in `mime.types` → finds `text/css`
3. Sets `Content-Type: text/css` header
4. Browser accepts and applies the stylesheet

**Without `include mime.types;`**, nginx doesn't know what Content-Type to use.

## Deployment

### Automatic (Recommended)

```bash
git add .
git commit -m "fix: Add MIME type configuration to nginx to prevent CSS/JS loading errors"
git push origin main
```

GitHub Actions will:
1. ✅ Verify nginx configuration
2. ✅ Build frontend with all assets
3. ✅ Deploy with correct nginx config
4. ✅ Reload nginx

### Manual (Emergency Fix)

SSH into server and run:

```bash
cd ~/warden-backend
git pull origin main
./scripts/fix-nginx-prod.sh
```

## Verification

After deployment, verify the fix:

```bash
# Should show Content-Type: text/css
curl -I https://warden.my/assets/CharacterEdit-BrPP7WSI.css

# Should show Content-Type: application/javascript
curl -I https://warden.my/assets/index-abc123.js
```

## Why This Won't Happen Again

1. **Automated verification** - CI/CD pipeline checks nginx config before every deployment
2. **Documentation** - This file explains the issue and solution
3. **Proper defaults** - MIME types are now configured at the server level
4. **Verification script** - Run `./scripts/verify-nginx-config.sh` anytime

## Related Files

- [`frontend-src/nginx-site.conf`](../frontend-src/nginx-site.conf) - Production nginx config
- [`frontend-src/nginx.conf`](../frontend-src/nginx.conf) - Docker nginx config
- [`scripts/verify-nginx-config.sh`](../scripts/verify-nginx-config.sh) - Configuration validator
- [`scripts/fix-nginx-prod.sh`](../scripts/fix-nginx-prod.sh) - Emergency fix script
- [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) - CI/CD pipeline

## Common Nginx MIME Type Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| CSS not loading | Missing `include mime.types;` | Add to server block |
| JS not executing | Wrong Content-Type | Verify mime.types included |
| Fonts not loading | Missing font MIME types | Check mime.types has woff/woff2 |
| Assets return 404 but exist | SPA routing catches /assets/ | Add explicit location block |

## Testing Locally

```bash
# Start local nginx with config
nginx -c $(pwd)/frontend-src/nginx-site.conf -t

# Or use docker
docker run -v $(pwd)/frontend-src/dist:/usr/share/nginx/html \
           -v $(pwd)/frontend-src/nginx.conf:/etc/nginx/conf.d/default.conf \
           -p 8080:80 nginx:alpine
```

## References

- [Nginx MIME Types Documentation](http://nginx.org/en/docs/http/ngx_http_core_module.html#types)
- [MDN: MIME Types](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types)
- [Nginx Location Block Priority](http://nginx.org/en/docs/http/ngx_http_core_module.html#location)

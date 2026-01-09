import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to restrict access to Tailscale network only
 * Tailscale IPs are in the 100.x.x.x range (CGNAT space)
 *
 * This protects sensitive admin routes from public internet access
 */
export function requireTailscale(req: Request, res: Response, next: NextFunction) {
  const clientIP = req.ip || req.socket.remoteAddress || '';

  // Allow localhost (for development)
  if (clientIP === '127.0.0.1' || clientIP === '::1' || clientIP === '::ffff:127.0.0.1') {
    return next();
  }

  // Check if IP is in Tailscale range (100.64.0.0/10)
  const isTailscale = clientIP.startsWith('100.') ||
                      clientIP.includes('::ffff:100.'); // IPv6-mapped IPv4

  if (!isTailscale) {
    console.warn(`[SECURITY] Admin access attempt from non-Tailscale IP: ${clientIP}`);
    return res.status(403).json({
      error: 'Access denied. Admin panel requires Tailscale connection.'
    });
  }

  next();
}

/**
 * Alternative: Use nginx to restrict admin routes at the web server level
 * This is more secure as it blocks requests before they reach the app
 *
 * Add to nginx config:
 *
 * location /api/admin {
 *   # Only allow Tailscale IPs (100.64.0.0/10)
 *   allow 100.64.0.0/10;
 *   deny all;
 *
 *   proxy_pass http://localhost:3000;
 *   # ... other proxy settings
 * }
 */

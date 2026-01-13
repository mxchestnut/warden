import { Request, Response, NextFunction } from 'express';

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // DEVELOPMENT ONLY: Bypass auth and mock a user
  if (process.env.NODE_ENV !== 'production' && process.env.DISABLE_AUTH === 'true') {
    // Mock user for development
    (req as any).user = { 
      id: 1, 
      username: 'dev-user',
      email: 'dev@warden.local',
      isAdmin: true 
    };
    return next();
  }

  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
}

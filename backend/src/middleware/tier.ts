import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check authentication (tier restrictions removed)
 * All features are now available to all authenticated users
 */
export function requireRpTier(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // All authenticated users have access to all features
  return next();
}

/**
 * Helper function to check if a user has access to features
 * Always returns true for authenticated users (no tier restrictions)
 */
export function hasRpTier(user: { subscriptionTier?: string; isAdmin?: boolean }): boolean {
  return true; // All users have access
}

/**
 * Get user access level from Discord user ID
 * Returns 'full' for all authenticated users
 */
export async function getUserTierFromDiscord(db: any, discordUserId: string): Promise<string | null> {
  const { users } = await import('../db/schema.js');
  const { eq } = await import('drizzle-orm');

  const result = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.discordUserId, discordUserId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return 'full'; // All users have full access
}

/**
 * Check if a Discord guild has access to features
 * Returns true for all guilds (no premium restrictions)
 */
export async function checkGuildPremiumAccess(db: any, guild: any): Promise<{ hasAccess: boolean; reason?: string }> {
  return { hasAccess: true }; // All guilds have access
}

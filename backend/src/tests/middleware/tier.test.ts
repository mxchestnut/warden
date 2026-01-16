import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireRpTier, hasRpTier, getUserTierFromDiscord, checkGuildPremiumAccess } from '../../middleware/tier';

// Mock database
vi.mock('../../db/schema.js', () => ({
  users: {
    id: 'id',
    isAdmin: 'isAdmin',
    discordUserId: 'discordUserId'
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value }))
}));

describe('Tier Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: undefined
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    mockNext = vi.fn();
  });

  describe('requireRpTier', () => {
    it('should return 401 if user is not authenticated', () => {
      requireRpTier(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() for authenticated users', () => {
      (mockReq as any).user = { id: 1, username: 'testuser' };

      requireRpTier(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow access regardless of subscription tier', () => {
      (mockReq as any).user = { 
        id: 1, 
        username: 'testuser',
        subscriptionTier: 'free'
      };

      requireRpTier(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('hasRpTier', () => {
    it('should return true for any user', () => {
      const user = { subscriptionTier: 'free' };
      expect(hasRpTier(user)).toBe(true);
    });

    it('should return true for admin users', () => {
      const user = { subscriptionTier: 'free', isAdmin: true };
      expect(hasRpTier(user)).toBe(true);
    });

    it('should return true for users without subscription tier', () => {
      const user = {};
      expect(hasRpTier(user)).toBe(true);
    });

    it('should return true regardless of tier level', () => {
      expect(hasRpTier({ subscriptionTier: 'free' })).toBe(true);
      expect(hasRpTier({ subscriptionTier: 'pro' })).toBe(true);
      expect(hasRpTier({ subscriptionTier: 'master' })).toBe(true);
    });
  });

  describe('getUserTierFromDiscord', () => {
    it('should return "full" for users found in database', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ isAdmin: false }])
      };

      const result = await getUserTierFromDiscord(mockDb, 'discord123');
      
      expect(result).toBe('full');
    });

    it('should return "full" for admin users', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ isAdmin: true }])
      };

      const result = await getUserTierFromDiscord(mockDb, 'discord123');
      
      expect(result).toBe('full');
    });

    it('should return null for users not found', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([])
      };

      const result = await getUserTierFromDiscord(mockDb, 'unknown');
      
      expect(result).toBeNull();
    });
  });

  describe('checkGuildPremiumAccess', () => {
    it('should return hasAccess true for any guild', async () => {
      const result = await checkGuildPremiumAccess({}, { id: 'guild123' });
      
      expect(result).toEqual({ hasAccess: true });
    });

    it('should not include a reason when access is granted', async () => {
      const result = await checkGuildPremiumAccess({}, {});
      
      expect(result.reason).toBeUndefined();
    });
  });
});

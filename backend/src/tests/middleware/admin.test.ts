import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { isAdmin } from '../../middleware/admin';

describe('Admin Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      isAuthenticated: vi.fn() as any,
      user: undefined
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    mockNext = vi.fn();
  });

  describe('isAdmin', () => {
    it('should return 401 if user is not authenticated', () => {
      (mockReq.isAuthenticated as any) = vi.fn().mockReturnValue(false);

      isAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 if user is authenticated but not admin', () => {
      (mockReq.isAuthenticated as any) = vi.fn().mockReturnValue(true);
      mockReq.user = { id: 1, username: 'user', isAdmin: false };

      isAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Forbidden - Admin access required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() if user is admin', () => {
      (mockReq.isAuthenticated as any) = vi.fn().mockReturnValue(true);
      mockReq.user = { id: 1, username: 'admin', isAdmin: true };

      isAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should handle user object without isAdmin property', () => {
      (mockReq.isAuthenticated as any) = vi.fn().mockReturnValue(true);
      mockReq.user = { id: 1, username: 'user' };

      isAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

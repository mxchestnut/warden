import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { isAuthenticated } from '../../middleware/auth';

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    mockReq = {
      isAuthenticated: vi.fn() as any
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    mockNext = vi.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isAuthenticated', () => {
    it('should call next() when user is authenticated', () => {
      (mockReq.isAuthenticated as any).mockReturnValue(true);

      isAuthenticated(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
      (mockReq.isAuthenticated as any).mockReturnValue(false);

      isAuthenticated(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should bypass auth in development with DISABLE_AUTH=true', () => {
      process.env.NODE_ENV = 'development';
      process.env.DISABLE_AUTH = 'true';

      isAuthenticated(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as any).user).toBeDefined();
      expect((mockReq as any).user.username).toBe('dev-user');
    });

    it('should not bypass auth in production even with DISABLE_AUTH=true', () => {
      process.env.NODE_ENV = 'production';
      process.env.DISABLE_AUTH = 'true';
      (mockReq.isAuthenticated as any).mockReturnValue(false);

      isAuthenticated(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should mock admin user in development mode', () => {
      process.env.NODE_ENV = 'development';
      process.env.DISABLE_AUTH = 'true';

      isAuthenticated(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as any).user.isAdmin).toBe(true);
    });
  });
});

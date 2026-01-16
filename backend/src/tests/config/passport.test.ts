import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('passport', () => ({
  default: {
    use: vi.fn(),
    serializeUser: vi.fn(),
    deserializeUser: vi.fn()
  }
}));

vi.mock('passport-local', () => ({
  Strategy: vi.fn()
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn()
  }
}));

vi.mock('../../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn()
  }
}));

vi.mock('../../db/schema', () => ({
  users: {
    id: 'id',
    username: 'username',
    password: 'password'
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value }))
}));

describe('Passport Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export setupPassport function', async () => {
    const passportModule = await import('../../config/passport');
    expect(passportModule.setupPassport).toBeDefined();
    expect(typeof passportModule.setupPassport).toBe('function');
  });

  it('should configure passport with LocalStrategy', async () => {
    const passport = await import('passport');
    const { setupPassport } = await import('../../config/passport');

    setupPassport();

    expect(passport.default.use).toHaveBeenCalled();
    expect(passport.default.serializeUser).toHaveBeenCalled();
    expect(passport.default.deserializeUser).toHaveBeenCalled();
  });

  it('should setup user serialization', async () => {
    const passport = await import('passport');
    const { setupPassport } = await import('../../config/passport');

    setupPassport();

    const serializeCall = (passport.default.serializeUser as any).mock.calls[0][0];
    const done = vi.fn();
    
    serializeCall({ id: 123, username: 'test' }, done);
    
    expect(done).toHaveBeenCalledWith(null, 123);
  });

  it('should setup user deserialization', async () => {
    const passport = await import('passport');
    const { db } = await import('../../db');
    const { setupPassport } = await import('../../config/passport');

    // Mock database response
    // @ts-expect-error - Mocking internal Drizzle query builder
    (db.where as any).mockResolvedValue([{
      id: 1,
      username: 'testuser',
      accountCode: 'ABC123',
      isAdmin: false
    }]);

    setupPassport();

    const deserializeCall = (passport.default.deserializeUser as any).mock.calls[0][0];
    const done = vi.fn();
    
    await deserializeCall(1, done);
    
    expect(done).toHaveBeenCalledWith(null, expect.objectContaining({
      id: 1,
      username: 'testuser'
    }));
  });

  it('should handle user not found during deserialization', async () => {
    const passport = await import('passport');
    const { db } = await import('../../db');
    const { setupPassport } = await import('../../config/passport');

    // Mock database to return empty array
    // @ts-expect-error - Mocking internal Drizzle query builder
    (db.where as any).mockResolvedValue([]);

    setupPassport();

    const deserializeCall = (passport.default.deserializeUser as any).mock.calls[0][0];
    const done = vi.fn();
    
    await deserializeCall(999, done);
    
    expect(done).toHaveBeenCalledWith(null, false);
  });

  it('should handle errors during deserialization', async () => {
    const passport = await import('passport');
    const { db } = await import('../../db');
    const { setupPassport } = await import('../../config/passport');

    // Mock database to throw error
    const dbError = new Error('Database error');
    // @ts-expect-error - Mocking internal Drizzle query builder
    (db.where as any).mockRejectedValue(dbError);

    setupPassport();

    const deserializeCall = (passport.default.deserializeUser as any).mock.calls[0][0];
    const done = vi.fn();
    
    await deserializeCall(1, done);
    
    expect(done).toHaveBeenCalledWith(dbError);
  });
});

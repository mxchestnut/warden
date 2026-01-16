// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock dependencies before importing routes
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn()
  }
}));

vi.mock('../../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis()
  }
}));

vi.mock('../../db/schema', () => ({
  users: {
    id: 'id',
    username: 'username',
    password: 'password',
    discordUserId: 'discordUserId'
  },
  characterSheets: {
    id: 'id',
    userId: 'userId',
    name: 'name'
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value }))
}));

describe('Discord Routes', () => {
  let app: express.Application;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    const discordRoutes = (await import('../../routes/discord.js')).default;
    
    app = express();
    app.use(express.json());
    app.use('/api/discord', discordRoutes);
  });

  describe('POST /api/discord/login', () => {
    it('should require username and password', async () => {
      const response = await request(app)
        .post('/api/discord/login')
        .send({ discordUserId: '123456789' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('username and password');
    });

    it('should require discordUserId', async () => {
      const response = await request(app)
        .post('/api/discord/login')
        .send({ username: 'testuser', password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Discord user ID');
    });

    it('should return 401 for invalid credentials', async () => {
      const { db } = await import('../../db');
      (db.select as any).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([])
      });

      const response = await request(app)
        .post('/api/discord/login')
        .send({
          username: 'nonexistent',
          password: 'wrongpass',
          discordUserId: '123456789'
        });

      expect(response.status).toBe(401);
    });

    it('should authenticate valid user and link Discord account', async () => {
      const bcrypt = await import('bcryptjs');
      const { db } = await import('../../db');

      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpass',
        discordUserId: null
      };

      // Mock user lookup
      (db.select as any).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockUser])
      });

      // Mock password verification
      (bcrypt.default.compare as any).mockResolvedValue(true);

      // Mock Discord ID check (no existing link)
      (db.select as any).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([])
      });

      // Mock update
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([])
      });

      // Mock character lookup
      (db.select as any).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([])
      });

      const response = await request(app)
        .post('/api/discord/login')
        .send({
          username: 'testuser',
          password: 'password123',
          discordUserId: '987654321'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
    });
  });

  describe('GET /api/discord/user/:discordUserId', () => {
    it('should return 404 for unlinked Discord account', async () => {
      const { db } = await import('../../db');
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([])
      });

      const response = await request(app)
        .get('/api/discord/user/123456789');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not linked');
    });

    it('should return user data for linked Discord account', async () => {
      const { db } = await import('../../db');

      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        discordUserId: '123456789'
      };

      // Mock user lookup
      (db.select as any).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockUser])
      });

      // Mock character lookup
      (db.select as any).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([])
      });

      const response = await request(app)
        .get('/api/discord/user/123456789');

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
    });

    it('should handle database errors', async () => {
      const { db } = await import('../../db');
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockRejectedValue(new Error('Database error'))
      });

      const response = await request(app)
        .get('/api/discord/user/123456789');

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to fetch');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors in login', async () => {
      const { db } = await import('../../db');
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockRejectedValue(new Error('Database connection failed'))
      });

      const response = await request(app)
        .post('/api/discord/login')
        .send({
          username: 'testuser',
          password: 'password123',
          discordUserId: '123456789'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Authentication failed');
    });

    it('should prevent linking Discord ID to multiple accounts', async () => {
      const bcrypt = await import('bcryptjs');
      const { db } = await import('../../db');

      const mockUser = {
        id: 1,
        username: 'testuser',
        password: 'hashedpass',
        discordUserId: null
      };

      const existingDiscordLink = {
        id: 2,
        username: 'otheruser',
        discordUserId: '987654321'
      };

      // Mock user lookup
      (db.select as any).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockUser])
      });

      // Mock password verification
      (bcrypt.default.compare as any).mockResolvedValue(true);

      // Mock Discord ID check - already linked to another account
      (db.select as any).mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([existingDiscordLink])
      });

      const response = await request(app)
        .post('/api/discord/login')
        .send({
          username: 'testuser',
          password: 'password123',
          discordUserId: '987654321'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already linked');
    });
  });
});

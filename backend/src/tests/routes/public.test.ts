// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request, { Response } from 'supertest';

// Mock database before importing routes
vi.mock('../../db', () => ({
  db: {
    query: {
      characterSheets: {
        findFirst: vi.fn()
      }
    },
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('../../db/schema', () => ({
  characterSheets: {
    id: 'id',
    publicSlug: 'publicSlug',
    isPublic: 'isPublic',
    publicViews: 'publicViews'
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value })),
  and: vi.fn((...args) => ({ and: args }))
}));

describe('Public Routes', () => {
  let app: express.Application;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import the actual route module
    const publicRoutes = (await import('../../routes/public.js')).default;
    
    app = express();
    app.use(express.json());
    app.use('/api/public', publicRoutes);
  });

  describe('GET /api/public/characters/:slug', () => {
    it('should return 404 for non-existent character', async () => {
      const { db } = await import('../../db');
      (db.query.characterSheets.findFirst as any).mockResolvedValue(null);

      const response = await request(app).get('/api/public/characters/non-existent') as any as Response;

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Character not found or not public');
    });

    it('should return public character data', async () => {
      const { db } = await import('../../db');
      const mockCharacter = {
        id: 1,
        name: 'Aragorn',
        fullName: 'Aragorn son of Arathorn',
        species: 'Human',
        publicSlug: 'aragorn-ranger',
        isPublic: true,
        publicViews: 10,
        level: 20,
        characterClass: 'Ranger',
        race: 'Human',
        alignment: 'Lawful Good'
      };

      (db.query.characterSheets.findFirst as any).mockResolvedValue(mockCharacter);

      const response = await request(app).get('/api/public/characters/aragorn-ranger') as any as Response;

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Aragorn');
      expect(response.body.fullName).toBe('Aragorn son of Arathorn');
    });

    it('should not expose sensitive data', async () => {
      const { db } = await import('../../db');
      const mockCharacter = {
        id: 1,
        userId: 123,
        privateNotes: 'Secret notes',
        name: 'Test Character',
        publicSlug: 'test-char',
        isPublic: true,
        publicViews: 5
      };

      (db.query.characterSheets.findFirst as any).mockResolvedValue(mockCharacter);

      const response = await request(app).get('/api/public/characters/test-char') as any as Response;

      expect(response.status).toBe(200);
      expect(response.body).not.toHaveProperty('userId');
      expect(response.body).not.toHaveProperty('privateNotes');
    });

    it('should handle database errors', async () => {
      const { db } = await import('../../db');
      (db.query.characterSheets.findFirst as any).mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/public/characters/error-test') as any as Response;

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch character');
    });
  });

  describe('GET /api/public/characters', () => {
    it('should return list of public characters', async () => {
      const { db } = await import('../../db');
      (db.query.characterSheets.findMany as any) = vi.fn().mockResolvedValue([
        {
          name: 'Character 1',
          publicSlug: 'char-1',
          publicViews: 100
        },
        {
          name: 'Character 2',
          publicSlug: 'char-2',
          publicViews: 50
        }
      ]);

      const response = await request(app).get('/api/public/characters') as any as Response;

      expect(response.status).toBe(200);
      expect(response.body.characters).toBeInstanceOf(Array);
    });

    it('should handle errors when fetching character list', async () => {
      const { db } = await import('../../db');
      (db.query.characterSheets.findMany as any) = vi.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/public/characters') as any as Response;

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch characters');
    });
  });
});

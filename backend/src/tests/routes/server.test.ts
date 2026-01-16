import { describe, it, expect, beforeEach, vi } from 'vitest';
import request, { Response } from 'supertest';
import express, { Express } from 'express';

describe('Server Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    
    // Mock CSRF token generation
    app.get('/api/csrf-token', (req, res) => {
      res.json({ csrfToken: 'mock-csrf-token' });
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  });

  describe('GET /api/csrf-token', () => {
    it('should return CSRF token', async () => {
      const response = await request(app).get('/api/csrf-token') as any as Response;
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('csrfToken');
      expect(response.body.csrfToken).toBe('mock-csrf-token');
    });

    it('should return JSON content type', async () => {
      const response = await request(app).get('/api/csrf-token') as any as Response;
      
      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('GET /health', () => {
    it('should return 200 status', async () => {
      const response = await request(app).get('/health') as any as Response;
      
      expect(response.status).toBe(200);
    });

    it('should return ok status', async () => {
      const response = await request(app).get('/health') as any as Response;
      
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });

    it('should include timestamp', async () => {
      const response = await request(app).get('/health') as any as Response;
      
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.timestamp).toBe('string');
    });

    it('should return JSON content type', async () => {
      const response = await request(app).get('/health') as any as Response;
      
      expect(response.headers['content-type']).toMatch(/json/);
    });
  });
});

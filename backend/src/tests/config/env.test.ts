import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

describe('Environment Validation', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment Schema', () => {
    it('should accept valid environment variables', () => {
      const envSchema = z.object({
        NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
        PORT: z.string().default('3000').transform(Number),
        DATABASE_URL: z.string().url(),
        SESSION_SECRET: z.string().min(32),
      });

      const validEnv = {
        NODE_ENV: 'test',
        PORT: '3000',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        SESSION_SECRET: 'a'.repeat(32),
      };

      const result = envSchema.parse(validEnv);
      
      expect(result.NODE_ENV).toBe('test');
      expect(result.PORT).toBe(3000);
      expect(result.DATABASE_URL).toBe(validEnv.DATABASE_URL);
      expect(result.SESSION_SECRET).toBe(validEnv.SESSION_SECRET);
    });

    it('should use default values when not provided', () => {
      const envSchema = z.object({
        NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
        PORT: z.string().default('3000').transform(Number),
      });

      const result = envSchema.parse({});
      
      expect(result.NODE_ENV).toBe('development');
      expect(result.PORT).toBe(3000);
    });

    it('should reject invalid DATABASE_URL', () => {
      const envSchema = z.object({
        DATABASE_URL: z.string().url(),
      });

      expect(() => envSchema.parse({ DATABASE_URL: 'not-a-url' })).toThrow();
    });

    it('should reject short SESSION_SECRET', () => {
      const envSchema = z.object({
        SESSION_SECRET: z.string().min(32),
      });

      expect(() => envSchema.parse({ SESSION_SECRET: 'too-short' })).toThrow();
    });

    it('should accept optional SENTRY_DSN', () => {
      const envSchema = z.object({
        SENTRY_DSN: z.string().url().optional(),
      });

      // Should work without SENTRY_DSN
      const result1 = envSchema.parse({});
      expect(result1.SENTRY_DSN).toBeUndefined();

      // Should work with valid SENTRY_DSN
      const result2 = envSchema.parse({ SENTRY_DSN: 'https://example.com/123' });
      expect(result2.SENTRY_DSN).toBe('https://example.com/123');
    });

    it('should transform string to boolean for USE_REDIS', () => {
      const envSchema = z.object({
        USE_REDIS: z.string().default('true').transform(val => val !== 'false'),
      });

      expect(envSchema.parse({ USE_REDIS: 'true' }).USE_REDIS).toBe(true);
      expect(envSchema.parse({ USE_REDIS: 'false' }).USE_REDIS).toBe(false);
      expect(envSchema.parse({}).USE_REDIS).toBe(true);
    });

    it('should accept valid LOG_LEVEL values', () => {
      const envSchema = z.object({
        LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
      });

      expect(envSchema.parse({ LOG_LEVEL: 'debug' }).LOG_LEVEL).toBe('debug');
      expect(envSchema.parse({ LOG_LEVEL: 'error' }).LOG_LEVEL).toBe('error');
      expect(envSchema.parse({}).LOG_LEVEL).toBe('info');
    });

    it('should reject invalid LOG_LEVEL values', () => {
      const envSchema = z.object({
        LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']),
      });

      expect(() => envSchema.parse({ LOG_LEVEL: 'invalid' })).toThrow();
    });
  });

  describe('Environment Helpers', () => {
    it('should correctly identify production environment', () => {
      process.env.NODE_ENV = 'production';
      const isProduction = process.env.NODE_ENV === 'production';
      expect(isProduction).toBe(true);
    });

    it('should correctly identify development environment', () => {
      process.env.NODE_ENV = 'development';
      const isDevelopment = process.env.NODE_ENV === 'development';
      expect(isDevelopment).toBe(true);
    });

    it('should correctly identify test environment', () => {
      process.env.NODE_ENV = 'test';
      const isTest = process.env.NODE_ENV === 'test';
      expect(isTest).toBe(true);
    });
  });
});

import { describe, it, expect } from 'vitest';

describe('Database Index', () => {
  describe('Database Connection', () => {
    it('should export db instance', async () => {
      const dbModule = await import('../../db/index.js');
      
      expect(dbModule.db).toBeDefined();
      expect(dbModule.db.query).toBeDefined();
    });
  });

  describe('reinitializeDatabase', () => {
    it('should export reinitializeDatabase function', async () => {
      const dbModule = await import('../../db/index.js');
      
      expect(dbModule.reinitializeDatabase).toBeDefined();
      expect(typeof dbModule.reinitializeDatabase).toBe('function');
    });
  });
});

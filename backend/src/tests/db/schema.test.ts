import { describe, it, expect } from 'vitest';

describe('Database Schema', () => {
  it('should export users table', async () => {
    const schema = await import('../../db/schema');
    expect(schema.users).toBeDefined();
  });

  it('should export characterSheets table', async () => {
    const schema = await import('../../db/schema');
    expect(schema.characterSheets).toBeDefined();
  });

  it('should export documents table', async () => {
    const schema = await import('../../db/schema');
    expect(schema.documents).toBeDefined();
  });

  it('should export botSettings table', async () => {
    const schema = await import('../../db/schema');
    expect(schema.botSettings).toBeDefined();
  });

  it('should export prompts table', async () => {
    const schema = await import('../../db/schema');
    expect(schema.prompts).toBeDefined();
  });

  it('should export characterStats table', async () => {
    const schema = await import('../../db/schema');
    expect(schema.characterStats).toBeDefined();
  });

  it('should export activityFeed table', async () => {
    const schema = await import('../../db/schema');
    expect(schema.activityFeed).toBeDefined();
  });

  it('should export loreEntries table', async () => {
    const schema = await import('../../db/schema');
    expect(schema.loreEntries).toBeDefined();
  });

  it('should export channelCharacterMappings table', async () => {
    const schema = await import('../../db/schema');
    expect(schema.channelCharacterMappings).toBeDefined();
  });

  it('should export knowledgeBase table', async () => {
    const schema = await import('../../db/schema');
    expect(schema.knowledgeBase).toBeDefined();
  });

  it('should export files table', async () => {
    const schema = await import('../../db/schema');
    expect(schema.files).toBeDefined();
  });

  it('should export systemSettings table', async () => {
    const schema = await import('../../db/schema');
    expect(schema.systemSettings).toBeDefined();
  });

  it('should export all core tables', async () => {
    const schema = await import('../../db/schema');
    
    const coreTables = [
      'users',
      'characterSheets',
      'documents',
      'botSettings',
      'prompts',
      'characterStats',
      'activityFeed',
      'loreEntries',
      'knowledgeBase',
      'files',
      'systemSettings'
    ];

    coreTables.forEach(table => {
      expect((schema as any)[table]).toBeDefined();
    });
  });
});

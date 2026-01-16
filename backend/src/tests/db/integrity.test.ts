import { describe, it, expect, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '../../db';
import * as schema from '../../db/schema';

// Helper function to generate unique account codes for tests
let accountCodeCounter = 0;
function generateTestAccountCode(): string {
  return `TST${String(accountCodeCounter++).padStart(3, '0')}`;
}

describe('Database Integrity Tests', () => {
  // Clean up test data after each test
  afterEach(async () => {
    // Clean in reverse order of dependencies
    await db.execute(sql`DELETE FROM shared_documents WHERE user_id IN (SELECT id FROM users WHERE account_code LIKE 'TST%')`);
    await db.execute(sql`DELETE FROM documents WHERE user_id IN (SELECT id FROM users WHERE account_code LIKE 'TST%')`);
    await db.execute(sql`DELETE FROM character_sheets WHERE user_id IN (SELECT id FROM users WHERE account_code LIKE 'TST%')`);
    await db.execute(sql`DELETE FROM users WHERE account_code LIKE 'TST%'`);
  });

  describe('Schema Structure', () => {
    it('should have all required tables', async () => {
      const tables = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      
      const tableNames = tables.rows.map((row: any) => row.table_name);
      
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('character_sheets');
      expect(tableNames).toContain('documents');
      expect(tableNames).toContain('shared_documents');
    });

    it('should have required columns in users table', async () => {
      const columns = await db.execute(sql`
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);
      
      const columnNames = columns.rows.map((row: any) => row.column_name);
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('username');
      expect(columnNames).toContain('password');
      expect(columnNames).toContain('account_code');
      expect(columnNames).toContain('email');
      expect(columnNames).toContain('created_at');
    });
  });

  describe('Primary Key Constraints', () => {
    it('should have primary key on users.id', async () => {
      const result = await db.execute(sql`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'users' AND constraint_type = 'PRIMARY KEY'
      `);
      
      expect(result.rows.length).toBe(1);
    });

    it('should auto-increment user IDs', async () => {
      const [user1] = await db.insert(schema.users).values({
        username: 'test_user_1',
        password: 'password1',
        accountCode: generateTestAccountCode()
      }).returning();

      const [user2] = await db.insert(schema.users).values({
        username: 'test_user_2',
        password: 'password2',
        accountCode: generateTestAccountCode()
      }).returning();

      expect(user2.id).toBeGreaterThan(user1.id);
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should prevent creating character with non-existent user', async () => {
      await expect(async () => {
        await db.insert(schema.characterSheets).values({
          userId: 999999, // Non-existent user ID
          name: 'Test Character'
        });
      }).rejects.toThrow();
    });

    it('should allow creating character with valid user', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'test_user_fk',
        password: 'password',
        accountCode: generateTestAccountCode()
      }).returning();

      const [character] = await db.insert(schema.characterSheets).values({
        userId: user.id,
        name: 'Valid Character'
      }).returning();

      expect(character).toBeDefined();
      expect(character.userId).toBe(user.id);
    });
  });

  describe('Unique Constraints', () => {
    it('should enforce unique username constraint', async () => {
      const accountCode = generateTestAccountCode();
      
      await db.insert(schema.users).values({
        username: 'test_unique_user',
        password: 'password1',
        accountCode: accountCode
      });

      await expect(async () => {
        await db.insert(schema.users).values({
          username: 'test_unique_user', // Duplicate username
          password: 'password2',
          accountCode: generateTestAccountCode() // Different account code
        });
      }).rejects.toThrow();
    });

    it('should enforce unique account_code constraint', async () => {
      const accountCode = generateTestAccountCode();
      
      await db.insert(schema.users).values({
        username: 'user_account_1',
        password: 'password1',
        accountCode: accountCode
      });

      await expect(async () => {
        await db.insert(schema.users).values({
          username: 'user_account_2', // Different username
          password: 'password2',
          accountCode: accountCode // Duplicate account code
        });
      }).rejects.toThrow();
    });
  });

  describe('Not-Null Constraints', () => {
    it('should require username', async () => {
      await expect(async () => {
        await db.insert(schema.users).values({
          username: null as any,
          password: 'password',
          accountCode: generateTestAccountCode()
        });
      }).rejects.toThrow();
    });

    it('should require password', async () => {
      await expect(async () => {
        await db.insert(schema.users).values({
          username: 'test_user',
          password: null as any,
          accountCode: generateTestAccountCode()
        });
      }).rejects.toThrow();
    });

    it('should require account_code', async () => {
      await expect(async () => {
        await db.insert(schema.users).values({
          username: 'test_user',
          password: 'password',
          accountCode: null as any
        });
      }).rejects.toThrow();
    });

    it('should require name in character_sheets', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'test_user_char',
        password: 'password',
        accountCode: generateTestAccountCode()
      }).returning();

      await expect(async () => {
        await db.insert(schema.characterSheets).values({
          userId: user.id,
          name: null as any
        });
      }).rejects.toThrow();
    });
  });

  describe('Default Values', () => {
    it('should set default created_at timestamp', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'test_timestamp',
        password: 'password',
        accountCode: generateTestAccountCode()
      }).returning();

      expect(user.createdAt).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should set default ability scores to 10', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'test_stats',
        password: 'password',
        accountCode: generateTestAccountCode()
      }).returning();

      const [character] = await db.insert(schema.characterSheets).values({
        userId: user.id,
        name: 'Default Stats Character'
      }).returning();

      expect(character.strength).toBe(10);
      expect(character.dexterity).toBe(10);
      expect(character.constitution).toBe(10);
      expect(character.intelligence).toBe(10);
      expect(character.wisdom).toBe(10);
      expect(character.charisma).toBe(10);
    });

    it('should set default level to 1', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'test_level',
        password: 'password',
        accountCode: generateTestAccountCode()
      }).returning();

      const [character] = await db.insert(schema.characterSheets).values({
        userId: user.id,
        name: 'Level 1 Character'
      }).returning();

      expect(character.level).toBe(1);
    });

    it('should set default is_admin to false', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'test_admin_default',
        password: 'password',
        accountCode: generateTestAccountCode()
      }).returning();

      expect(user.isAdmin).toBe(false);
    });

    it('should set default storage quota', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'test_storage',
        password: 'password',
        accountCode: generateTestAccountCode()
      }).returning();

      expect(user.storageQuotaBytes).toBe(1073741824); // 1GB
      expect(user.storageUsedBytes).toBe(0);
    });
  });

  describe('Data Type Validation', () => {
    it('should store integers correctly in ability scores', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'test_int',
        password: 'password',
        accountCode: generateTestAccountCode()
      }).returning();

      const [character] = await db.insert(schema.characterSheets).values({
        userId: user.id,
        name: 'Stats Character',
        strength: 18,
        dexterity: 14,
        constitution: 16,
        intelligence: 12,
        wisdom: 10,
        charisma: 8
      }).returning();

      expect(character.strength).toBe(18);
      expect(character.dexterity).toBe(14);
      expect(character.constitution).toBe(16);
    });

    it('should store text fields correctly', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'test_text',
        password: 'hashed_password_string',
        email: 'test@example.com',
        accountCode: generateTestAccountCode()
      }).returning();

      expect(user.username).toBe('test_text');
      expect(user.password).toBe('hashed_password_string');
      expect(user.email).toBe('test@example.com');
    });

    it('should store boolean fields correctly', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'test_bool',
        password: 'password',
        accountCode: generateTestAccountCode()
      }).returning();

      const [character] = await db.insert(schema.characterSheets).values({
        userId: user.id,
        name: 'PC Character',
        isPathCompanion: true
      }).returning();

      expect(character.isPathCompanion).toBe(true);
    });
  });

  describe('Referential Integrity', () => {
    it('should prevent deleting user with associated characters', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'test_delete',
        password: 'password',
        accountCode: generateTestAccountCode()
      }).returning();

      await db.insert(schema.characterSheets).values({
        userId: user.id,
        name: 'Protected Character'
      });

      // Attempt to delete user should fail due to foreign key constraint
      await expect(async () => {
        await db.delete(schema.users).where(sql`id = ${user.id}`);
      }).rejects.toThrow();
    });

    it('should maintain referential integrity for documents', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'test_doc_integrity',
        password: 'password',
        accountCode: generateTestAccountCode()
      }).returning();

      const [document] = await db.insert(schema.documents).values({
        userId: user.id,
        name: 'Test Document'
      }).returning();

      expect(document.userId).toBe(user.id);
    });
  });

  describe('Complex Relationships', () => {
    it('should allow one user to have multiple characters', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'test_multi_char',
        password: 'password',
        accountCode: generateTestAccountCode()
      }).returning();

      const [char1] = await db.insert(schema.characterSheets).values({
        userId: user.id,
        name: 'Character 1'
      }).returning();

      const [char2] = await db.insert(schema.characterSheets).values({
        userId: user.id,
        name: 'Character 2'
      }).returning();

      expect(char1.userId).toBe(user.id);
      expect(char2.userId).toBe(user.id);
      expect(char1.id).not.toBe(char2.id);
    });

    it('should support document sharing between users', async () => {
      const [owner] = await db.insert(schema.users).values({
        username: 'test_doc_owner',
        password: 'password',
        accountCode: generateTestAccountCode()
      }).returning();

      const [sharedUser] = await db.insert(schema.users).values({
        username: 'test_shared_user',
        password: 'password',
        accountCode: generateTestAccountCode()
      }).returning();

      const [document] = await db.insert(schema.documents).values({
        userId: owner.id,
        name: 'Shared Document'
      }).returning();

      const [share] = await db.insert(schema.sharedDocuments).values({
        documentId: document.id,
        userId: sharedUser.id,
        canEdit: true
      }).returning();

      expect(share.documentId).toBe(document.id);
      expect(share.userId).toBe(sharedUser.id);
      expect(share.canEdit).toBe(true);
    });

    it('should support hierarchical documents', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'test_hierarchy',
        password: 'password',
        accountCode: generateTestAccountCode()
      }).returning();

      const [folder] = await db.insert(schema.documents).values({
        userId: user.id,
        name: 'My Folder',
        isFolder: true
      }).returning();

      const [childDoc] = await db.insert(schema.documents).values({
        userId: user.id,
        name: 'Document in Folder',
        parentId: folder.id,
        isFolder: false
      }).returning();

      expect(childDoc.parentId).toBe(folder.id);
      expect(folder.isFolder).toBe(true);
      expect(childDoc.isFolder).toBe(false);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistent timestamps', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'test_time',
        password: 'password',
        accountCode: generateTestAccountCode()
      }).returning();

      const [character] = await db.insert(schema.characterSheets).values({
        userId: user.id,
        name: 'Time Test Character'
      }).returning();

      expect(character.createdAt).toBeInstanceOf(Date);
      expect(character.updatedAt).toBeInstanceOf(Date);
      
      // created_at and updated_at should be close in time
      const timeDiff = Math.abs(character.updatedAt.getTime() - character.createdAt.getTime());
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });

    it('should allow null values for optional fields', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'test_optional',
        password: 'password',
        accountCode: generateTestAccountCode(),
        email: null
      }).returning();

      expect(user.email).toBeNull();
    });

    it('should store large text content', async () => {
      const [user] = await db.insert(schema.users).values({
        username: 'test_large',
        password: 'password',
        accountCode: generateTestAccountCode()
      }).returning();

      const largeContent = 'A'.repeat(10000); // 10KB

      const [document] = await db.insert(schema.documents).values({
        userId: user.id,
        name: 'Large Document',
        content: largeContent
      }).returning();

      expect(document.content).toBe(largeContent);
      expect(document.content?.length).toBe(10000);
    });
  });
});

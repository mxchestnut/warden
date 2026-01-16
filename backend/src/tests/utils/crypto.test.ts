import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

describe('Password Hashing', () => {
  const testPassword = 'MySecurePassword123!';
  
  describe('bcrypt hashing', () => {
    it('should hash a password', async () => {
      const hash = await bcrypt.hash(testPassword, 10);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(testPassword);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should verify correct password', async () => {
      const hash = await bcrypt.hash(testPassword, 10);
      const isValid = await bcrypt.compare(testPassword, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await bcrypt.hash(testPassword, 10);
      const isValid = await bcrypt.compare('WrongPassword', hash);
      
      expect(isValid).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const hash1 = await bcrypt.hash(testPassword, 10);
      const hash2 = await bcrypt.hash(testPassword, 10);
      
      expect(hash1).not.toBe(hash2);
      
      // But both should verify
      expect(await bcrypt.compare(testPassword, hash1)).toBe(true);
      expect(await bcrypt.compare(testPassword, hash2)).toBe(true);
    });

    it('should handle empty password', async () => {
      const hash = await bcrypt.hash('', 10);
      const isValid = await bcrypt.compare('', hash);
      
      expect(isValid).toBe(true);
    });

    it('should handle special characters in password', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`';
      const hash = await bcrypt.hash(specialPassword, 10);
      const isValid = await bcrypt.compare(specialPassword, hash);
      
      expect(isValid).toBe(true);
    });

    it('should handle unicode characters', async () => {
      const unicodePassword = '🔐パスワード密码🛡️';
      const hash = await bcrypt.hash(unicodePassword, 10);
      const isValid = await bcrypt.compare(unicodePassword, hash);
      
      expect(isValid).toBe(true);
    });
  });

  describe('Password comparison edge cases', () => {
    let hash: string;

    beforeEach(async () => {
      hash = await bcrypt.hash(testPassword, 10);
    });

    it('should be case sensitive', async () => {
      const isValid = await bcrypt.compare('mysecurepassword123!', hash);
      expect(isValid).toBe(false);
    });

    it('should detect extra characters', async () => {
      const isValid = await bcrypt.compare(testPassword + 'extra', hash);
      expect(isValid).toBe(false);
    });

    it('should detect missing characters', async () => {
      const isValid = await bcrypt.compare(testPassword.slice(0, -1), hash);
      expect(isValid).toBe(false);
    });
  });
});

describe('Token Generation', () => {
  const crypto = require('crypto');

  it('should generate random hex tokens', () => {
    const token1 = crypto.randomBytes(32).toString('hex');
    const token2 = crypto.randomBytes(32).toString('hex');

    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
  });

  it('should generate UUIDs', () => {
    const uuid1 = crypto.randomUUID();
    const uuid2 = crypto.randomUUID();

    expect(uuid1).toBeDefined();
    expect(uuid2).toBeDefined();
    expect(uuid1).not.toBe(uuid2);
    expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('should generate base64 tokens', () => {
    const token = crypto.randomBytes(32).toString('base64');

    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThan(0);
  });
});

describe('Encryption/Decryption', () => {
  const crypto = require('crypto');
  const algorithm = 'aes-256-cbc';
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);

  const encrypt = (text: string): string => {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  };

  const decrypt = (encryptedData: string): string => {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  };

  it('should encrypt and decrypt text', () => {
    const original = 'Secret message!';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);

    expect(encrypted).not.toBe(original);
    expect(decrypted).toBe(original);
  });

  it('should handle special characters', () => {
    const original = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(original);
  });

  it('should handle unicode', () => {
    const original = '🔐パスワード密码🛡️';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(original);
  });

  it('should produce different ciphertext for same plaintext', () => {
    const text = 'Same text';
    const iv1 = crypto.randomBytes(16);
    const iv2 = crypto.randomBytes(16);
    
    const cipher1 = crypto.createCipheriv(algorithm, key, iv1);
    const encrypted1 = cipher1.update(text, 'utf8', 'hex') + cipher1.final('hex');
    
    const cipher2 = crypto.createCipheriv(algorithm, key, iv2);
    const encrypted2 = cipher2.update(text, 'utf8', 'hex') + cipher2.final('hex');

    expect(encrypted1).not.toBe(encrypted2);
  });
});

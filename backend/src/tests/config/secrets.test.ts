import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AWS SDK before importing secrets
const mockSend = vi.fn();

vi.mock('@aws-sdk/client-secrets-manager', () => {
  return {
    SecretsManagerClient: class {
      send = mockSend;
    },
    GetSecretValueCommand: class {
      constructor(public params: any) {}
    }
  };
});

describe('Secrets Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.NODE_ENV;
  });

  describe('getSecretsWithFallback', () => {
    it('should use environment variables in development mode', async () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://dev-db';
      process.env.SESSION_SECRET = 'dev-secret';
      process.env.WARDEN_BOT_TOKEN = 'dev-token';
      process.env.GEMINI_API_KEY = 'dev-key';

      const { getSecretsWithFallback } = await import('../../config/secrets');
      const secrets = await getSecretsWithFallback();

      expect(secrets.DATABASE_URL).toBe('postgresql://dev-db');
      expect(secrets.SESSION_SECRET).toBe('dev-secret');
      expect(secrets.WARDEN_BOT_TOKEN).toBe('dev-token');
      expect(secrets.GEMINI_API_KEY).toBe('dev-key');
    });

    it('should return empty strings for missing env vars in development', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.DATABASE_URL;
      delete process.env.SESSION_SECRET;

      const { getSecretsWithFallback } = await import('../../config/secrets');
      const secrets = await getSecretsWithFallback();

      expect(secrets.DATABASE_URL).toBe('');
      expect(secrets.SESSION_SECRET).toBe('');
    });

    it('should fallback to env vars if AWS Secrets Manager fails', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://fallback-db';
      process.env.SESSION_SECRET = 'fallback-secret';
      process.env.WARDEN_BOT_TOKEN = 'fallback-token';
      process.env.GEMINI_API_KEY = 'fallback-key';

      // Mock AWS SDK to fail
      mockSend.mockRejectedValue(new Error('AWS error'));

      const { getSecretsWithFallback } = await import('../../config/secrets');
      const secrets = await getSecretsWithFallback();

      expect(secrets.DATABASE_URL).toBe('postgresql://fallback-db');
      expect(secrets.SESSION_SECRET).toBe('fallback-secret');
    });
  });

  describe('loadSecrets', () => {
    it('should load secrets from AWS Secrets Manager', async () => {
      mockSend
        .mockResolvedValueOnce({ SecretString: 'postgresql://aws-db' })
        .mockResolvedValueOnce({ SecretString: 'aws-session-secret' })
        .mockResolvedValueOnce({ SecretString: 'aws-bot-token' })
        .mockResolvedValueOnce({ SecretString: 'aws-gemini-key' });

      const { loadSecrets } = await import('../../config/secrets');
      const secrets = await loadSecrets();

      expect(secrets.DATABASE_URL).toBe('postgresql://aws-db');
      expect(secrets.SESSION_SECRET).toBe('aws-session-secret');
      expect(secrets.WARDEN_BOT_TOKEN).toBe('aws-bot-token');
      expect(secrets.GEMINI_API_KEY).toBe('aws-gemini-key');
    });

    it('should cache secrets after first load', async () => {
      mockSend
        .mockResolvedValueOnce({ SecretString: 'cached-db' })
        .mockResolvedValueOnce({ SecretString: 'cached-session' })
        .mockResolvedValueOnce({ SecretString: 'cached-token' })
        .mockResolvedValueOnce({ SecretString: 'cached-key' });

      const { loadSecrets } = await import('../../config/secrets');
      
      // First call
      const secrets1 = await loadSecrets();
      expect(mockSend).toHaveBeenCalledTimes(4);
      
      // Second call - should use cache
      const secrets2 = await loadSecrets();
      expect(mockSend).toHaveBeenCalledTimes(4); // Still 4, not 8
      
      expect(secrets1).toEqual(secrets2);
    });

    it('should throw error if secret is not found', async () => {
      mockSend.mockRejectedValue(new Error('Secret not found'));

      const { loadSecrets } = await import('../../config/secrets');
      
      await expect(loadSecrets()).rejects.toThrow('Secret not found');
    });
  });
});

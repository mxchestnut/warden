import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

interface Secrets {
  DATABASE_URL: string;
  SESSION_SECRET: string;
  WARDEN_BOT_TOKEN: string;
  GEMINI_API_KEY: string;
}

let cachedSecrets: Secrets | null = null;

async function getSecret(secretName: string): Promise<string> {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);

    if (response.SecretString) {
      return response.SecretString;
    }

    throw new Error(`Secret ${secretName} not found or is binary`);
  } catch (error) {
    console.error(`Error fetching secret ${secretName}:`, error);
    throw error;
  }
}

export async function loadSecrets(): Promise<Secrets> {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  console.log('Loading secrets from AWS Secrets Manager...');

  // Load required secrets
  const [databaseUrl, sessionSecret, wardenBotToken, geminiApiKey] = await Promise.all([
    getSecret('warden/database-url'),
    getSecret('warden/session-secret'),
    getSecret('warden/bot-token'),
    getSecret('warden/gemini-api-key')
  ]);

  console.log('✓ Warden bot token loaded');

  cachedSecrets = {
    DATABASE_URL: databaseUrl,
    SESSION_SECRET: sessionSecret,
    WARDEN_BOT_TOKEN: wardenBotToken,
    GEMINI_API_KEY: geminiApiKey
  };

  console.log('✓ Secrets loaded successfully');
  return cachedSecrets;
}

// For local development, fall back to .env
export async function getSecretsWithFallback(): Promise<Secrets> {
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode - using .env file');
    return {
      DATABASE_URL: process.env.DATABASE_URL || '',
      SESSION_SECRET: process.env.SESSION_SECRET || '',
      WARDEN_BOT_TOKEN: process.env.WARDEN_BOT_TOKEN || '',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || ''
    };
  }

  // In production, try AWS Secrets Manager first, fall back to .env
  try {
    return await loadSecrets();
  } catch (error) {
    console.warn('Failed to load from AWS Secrets Manager, falling back to .env:', error);
    return {
      DATABASE_URL: process.env.DATABASE_URL || '',
      SESSION_SECRET: process.env.SESSION_SECRET || '',
      WARDEN_BOT_TOKEN: process.env.WARDEN_BOT_TOKEN || '',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || ''
    };
  }
}

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Environment Variable Validation with Zod
 * 
 * Validates all required environment variables on startup.
 * Provides clear error messages if any are missing or invalid.
 */

// Load .env file first
dotenv.config({ path: path.join(process.cwd(), '../.env') });

// Define the schema for environment variables
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Server Configuration
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3000'),
  
  // Database
  DATABASE_URL: z.string().url().describe('PostgreSQL connection string (e.g., postgresql://user:pass@host:5432/db)'),
  
  // Session & Security
  SESSION_SECRET: z.string().min(32).describe('Session secret for cookie signing (min 32 characters)'),
  
  // Discord Bot
  WARDEN_BOT_TOKEN: z.string().min(50).describe('Discord bot token from Discord Developer Portal'),
  
  // AI Services
  GEMINI_API_KEY: z.string().min(20).describe('Google Gemini API key'),
  
  // AWS Services
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  
  // PathCompanion Integration
  PLAYFAB_TITLE_ID: z.string().optional(),
  PLAYFAB_SECRET_KEY: z.string().optional(),
  PATHCOMPANION_ENCRYPTION_KEY: z.string().optional(),
  
  // Stripe Payment Processing
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_PRO: z.string().optional(),
  STRIPE_PRICE_ID_MASTER: z.string().optional(),
  
  // Optional Configuration
  USE_REDIS: z.string().transform(val => val !== 'false').default('true'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  
  // Sentry Error Tracking
  SENTRY_DSN: z.string().url().optional(),
});

// Export the type for TypeScript
export type Env = z.infer<typeof envSchema>;

// Validate and parse environment variables
let env: Env;

try {
  env = envSchema.parse(process.env);
  console.log('✓ Environment variables validated successfully');
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:');
    console.error('');
    
    error.errors.forEach((err) => {
      const path = err.path.join('.');
      console.error(`  • ${path}: ${err.message}`);
      
      // Show description if available
      const field = envSchema.shape[err.path[0] as keyof typeof envSchema.shape];
      if (field && field.description) {
        console.error(`    → ${field.description}`);
      }
    });
    
    console.error('');
    console.error('Please check your .env file and ensure all required variables are set.');
    console.error('');
    process.exit(1);
  }
  
  throw error;
}

// Export validated environment
export default env;

// Helper to check if in production
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

// Helper to get required env var with clear error
export function requireEnv(key: keyof Env): string {
  const value = env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return String(value);
}

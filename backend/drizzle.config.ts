import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../.env') });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!
  }
});

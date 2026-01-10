import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';
import path from 'path';

// Load .env before creating the pool
dotenv.config({ path: path.join(process.cwd(), '../.env') });

// For development, initialize immediately from .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') || process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // Allow Neon/AWS certificates
  } : undefined
});

export const db = drizzle(pool, { schema });

// For production, reinitialize with secrets from AWS
export async function reinitializeDatabase(databaseUrl: string) {
  const newPool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false, // Allow AWS RDS self-signed certificates
      // Note: For maximum security, download RDS CA bundle and set ca: fs.readFileSync('rds-ca-bundle.pem')
    }
  });

  const newDb = drizzle(newPool, { schema });

  // Replace the pool and db (close old connection)
  await pool.end();
  Object.assign(pool, newPool);
  Object.assign(db, newDb);

  console.log('✓ Database connection reinitialized with AWS secrets');

  return db;
}

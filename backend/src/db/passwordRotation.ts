import { db } from './index';
import { sql } from 'drizzle-orm';

export interface PasswordRotationStatus {
  lastRotated: Date | null;
  daysUntilRotation: number;
  needsRotation: boolean;
  overdue: boolean;
}

// Configuration
const ROTATION_INTERVAL_DAYS = 90;
const WARNING_THRESHOLD_DAYS = 7; // Warn 7 days before rotation needed

/**
 * Get the current password rotation status
 */
export async function getPasswordRotationStatus(): Promise<PasswordRotationStatus> {
  try {
    // Check if settings table exists and has rotation date
    const result = await db.execute(sql`
      SELECT value
      FROM system_settings
      WHERE key = 'db_password_last_rotated'
      LIMIT 1
    `);

    const lastRotatedStr = result.rows[0]?.value as string | undefined;
    const lastRotated = lastRotatedStr ? new Date(lastRotatedStr) : null;

    if (!lastRotated) {
      // Never rotated - set to installation date or assume it needs rotation
      return {
        lastRotated: null,
        daysUntilRotation: 0,
        needsRotation: true,
        overdue: true
      };
    }

    const now = new Date();
    const daysSinceRotation = Math.floor((now.getTime() - lastRotated.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilRotation = ROTATION_INTERVAL_DAYS - daysSinceRotation;
    const needsRotation = daysUntilRotation <= WARNING_THRESHOLD_DAYS;
    const overdue = daysUntilRotation <= 0;

    return {
      lastRotated,
      daysUntilRotation: Math.max(0, daysUntilRotation),
      needsRotation,
      overdue
    };
  } catch (error) {
    // If table doesn't exist or any error, assume needs rotation
    console.error('Error checking password rotation status:', error);
    return {
      lastRotated: null,
      daysUntilRotation: 0,
      needsRotation: true,
      overdue: false // Don't mark as overdue if we can't check
    };
  }
}

/**
 * Record that the password was rotated
 */
export async function recordPasswordRotation(): Promise<void> {
  try {
    const now = new Date().toISOString();

    // Upsert the rotation date
    await db.execute(sql`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('db_password_last_rotated', ${now}, ${now})
      ON CONFLICT (key)
      DO UPDATE SET value = ${now}, updated_at = ${now}
    `);

    console.log('✓ Password rotation date recorded');
  } catch (error) {
    console.error('Error recording password rotation:', error);
    throw error;
  }
}

/**
 * Initialize the system_settings table if it doesn't exist
 */
export async function initializePasswordRotationTracking(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Set initial rotation date to now if not set
    const status = await getPasswordRotationStatus();
    if (!status.lastRotated) {
      await recordPasswordRotation();
      console.log('✓ Initialized password rotation tracking');
    }
  } catch (error) {
    console.error('Error initializing password rotation tracking:', error);
  }
}

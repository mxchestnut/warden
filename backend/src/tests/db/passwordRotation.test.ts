import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as passwordRotation from '../../db/passwordRotation';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

// Mock db
vi.mock('../../db', () => ({
  db: {
    execute: vi.fn()
  }
}));

describe('Password Rotation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPasswordRotationStatus', () => {
    it('should return needsRotation when never rotated', async () => {
      // Mock empty result (no rotation record)
      vi.mocked(db.execute).mockResolvedValueOnce({ rows: [] } as any);

      const status = await passwordRotation.getPasswordRotationStatus();

      expect(status.lastRotated).toBeNull();
      expect(status.needsRotation).toBe(true);
      expect(status.overdue).toBe(true);
      expect(status.daysUntilRotation).toBe(0);
    });

    it('should calculate days until rotation correctly', async () => {
      // 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      vi.mocked(db.execute).mockResolvedValueOnce({
        rows: [{ value: thirtyDaysAgo.toISOString() }]
      } as any);

      const status = await passwordRotation.getPasswordRotationStatus();

      expect(status.lastRotated).toBeInstanceOf(Date);
      expect(status.daysUntilRotation).toBe(60); // 90 - 30 = 60 days
      expect(status.needsRotation).toBe(false);
      expect(status.overdue).toBe(false);
    });

    it('should detect when rotation is needed (within 7 days)', async () => {
      // 85 days ago (5 days until rotation)
      const eightyFiveDaysAgo = new Date();
      eightyFiveDaysAgo.setDate(eightyFiveDaysAgo.getDate() - 85);

      vi.mocked(db.execute).mockResolvedValueOnce({
        rows: [{ value: eightyFiveDaysAgo.toISOString() }]
      } as any);

      const status = await passwordRotation.getPasswordRotationStatus();

      expect(status.lastRotated).toBeInstanceOf(Date);
      expect(status.daysUntilRotation).toBe(5);
      expect(status.needsRotation).toBe(true);
      expect(status.overdue).toBe(false);
    });

    it('should detect when rotation is overdue', async () => {
      // 100 days ago
      const hundredDaysAgo = new Date();
      hundredDaysAgo.setDate(hundredDaysAgo.getDate() - 100);

      vi.mocked(db.execute).mockResolvedValueOnce({
        rows: [{ value: hundredDaysAgo.toISOString() }]
      } as any);

      const status = await passwordRotation.getPasswordRotationStatus();

      expect(status.lastRotated).toBeInstanceOf(Date);
      expect(status.daysUntilRotation).toBe(0);
      expect(status.needsRotation).toBe(true);
      expect(status.overdue).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(db.execute).mockRejectedValueOnce(new Error('DB connection failed'));

      const status = await passwordRotation.getPasswordRotationStatus();

      expect(status.lastRotated).toBeNull();
      expect(status.needsRotation).toBe(true);
      expect(status.overdue).toBe(false); // Not marked as overdue on error
    });
  });

  describe('recordPasswordRotation', () => {
    it('should insert rotation date into database', async () => {
      vi.mocked(db.execute).mockResolvedValueOnce({} as any);

      await passwordRotation.recordPasswordRotation();

      expect(db.execute).toHaveBeenCalledTimes(1);
      const call = vi.mocked(db.execute).mock.calls[0][0];
      expect(call).toBeDefined();
    });

    it('should throw on database error', async () => {
      vi.mocked(db.execute).mockRejectedValueOnce(new Error('DB write failed'));

      await expect(passwordRotation.recordPasswordRotation()).rejects.toThrow('DB write failed');
    });
  });

  describe('initializePasswordRotationTracking', () => {
    it('should create table and set initial date if not exists', async () => {
      // Mock table creation
      vi.mocked(db.execute).mockResolvedValueOnce({} as any);
      // Mock status check (no record)
      vi.mocked(db.execute).mockResolvedValueOnce({ rows: [] } as any);
      // Mock recording rotation
      vi.mocked(db.execute).mockResolvedValueOnce({} as any);

      await passwordRotation.initializePasswordRotationTracking();

      expect(db.execute).toHaveBeenCalledTimes(3);
    });

    it('should not set date if already initialized', async () => {
      const now = new Date().toISOString();
      
      // Mock table creation
      vi.mocked(db.execute).mockResolvedValueOnce({} as any);
      // Mock status check (record exists)
      vi.mocked(db.execute).mockResolvedValueOnce({
        rows: [{ value: now }]
      } as any);

      await passwordRotation.initializePasswordRotationTracking();

      expect(db.execute).toHaveBeenCalledTimes(2); // Only table creation and status check
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(db.execute).mockRejectedValueOnce(new Error('Table creation failed'));

      // Should not throw
      await expect(passwordRotation.initializePasswordRotationTracking()).resolves.toBeUndefined();
    });
  });

  it('should export getPasswordRotationStatus function', () => {
    expect(passwordRotation.getPasswordRotationStatus).toBeDefined();
    expect(typeof passwordRotation.getPasswordRotationStatus).toBe('function');
  });

  it('should export recordPasswordRotation function', () => {
    expect(passwordRotation.recordPasswordRotation).toBeDefined();
    expect(typeof passwordRotation.recordPasswordRotation).toBe('function');
  });

  it('should export initializePasswordRotationTracking function', () => {
    expect(passwordRotation.initializePasswordRotationTracking).toBeDefined();
    expect(typeof passwordRotation.initializePasswordRotationTracking).toBe('function');
  });
});

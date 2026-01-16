import { describe, it, expect, vi } from 'vitest';

// Mock AWS SDK before importing s3.ts
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn()
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn()
}));

describe('S3 Configuration', () => {
  it('should export s3Client', async () => {
    const s3Config = await import('../../config/s3');
    expect(s3Config.s3Client).toBeDefined();
  });

  it('should export BUCKET_NAME', async () => {
    const s3Config = await import('../../config/s3');
    expect(s3Config.BUCKET_NAME).toBeDefined();
    expect(typeof s3Config.BUCKET_NAME).toBe('string');
  });

  it('should use default bucket name when env var not set', async () => {
    const originalS3Bucket = process.env.S3_BUCKET;
    const originalAwsS3Bucket = process.env.AWS_S3_BUCKET;
    
    delete process.env.S3_BUCKET;
    delete process.env.AWS_S3_BUCKET;

    // Re-import to get default
    vi.resetModules();
    const s3Config = await import('../../config/s3');
    
    expect(s3Config.BUCKET_NAME).toBe('my1eparty-documents');

    // Restore
    if (originalS3Bucket) process.env.S3_BUCKET = originalS3Bucket;
    if (originalAwsS3Bucket) process.env.AWS_S3_BUCKET = originalAwsS3Bucket;
  });

  it('should export uploadToS3 function', async () => {
    const s3Config = await import('../../config/s3');
    expect(s3Config.uploadToS3).toBeDefined();
    expect(typeof s3Config.uploadToS3).toBe('function');
  });

  it('should export deleteFromS3 function', async () => {
    const s3Config = await import('../../config/s3');
    expect(s3Config.deleteFromS3).toBeDefined();
    expect(typeof s3Config.deleteFromS3).toBe('function');
  });

  it('should export getSignedUrl function', async () => {
    const s3Config = await import('../../config/s3');
    expect(s3Config.getSignedUrl).toBeDefined();
    expect(typeof s3Config.getSignedUrl).toBe('function');
  });

  describe('uploadToS3', () => {
    it('should call S3Client with correct parameters', async () => {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const s3Config = await import('../../config/s3');
      
      const mockSend = vi.fn().mockResolvedValue({});
      (S3Client as any).prototype.send = mockSend;

      const buffer = Buffer.from('test');
      await s3Config.uploadToS3(buffer, 'test.pdf', 'application/pdf');

      expect(PutObjectCommand).toHaveBeenCalled();
    });

    it('should return success result', async () => {
      const s3Config = await import('../../config/s3');
      const { S3Client } = await import('@aws-sdk/client-s3');
      
      const mockSend = vi.fn().mockResolvedValue({});
      (S3Client as any).prototype.send = mockSend;

      const result = await s3Config.uploadToS3(Buffer.from('test'), 'test.pdf', 'application/pdf');
      
      expect(result).toEqual({ success: true, key: 'test.pdf' });
    });
  });

  describe('deleteFromS3', () => {
    it('should call DeleteObjectCommand with correct key', async () => {
      const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const s3Config = await import('../../config/s3');
      
      const mockSend = vi.fn().mockResolvedValue({});
      (S3Client as any).prototype.send = mockSend;

      await s3Config.deleteFromS3('test.pdf');

      expect(DeleteObjectCommand).toHaveBeenCalled();
    });

    it('should return success result', async () => {
      const s3Config = await import('../../config/s3');
      const { S3Client } = await import('@aws-sdk/client-s3');
      
      const mockSend = vi.fn().mockResolvedValue({});
      (S3Client as any).prototype.send = mockSend;

      const result = await s3Config.deleteFromS3('test.pdf');
      
      expect(result).toEqual({ success: true });
    });
  });

  describe('getSignedUrl', () => {
    it('should generate signed URL', async () => {
      const s3Config = await import('../../config/s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      
      (getSignedUrl as any).mockResolvedValue('https://signed-url.com');

      const url = await s3Config.getSignedUrl('test.pdf');
      
      expect(url).toBe('https://signed-url.com');
    });

    it('should use custom expiration time', async () => {
      const s3Config = await import('../../config/s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      
      (getSignedUrl as any).mockResolvedValue('https://signed-url.com');

      await s3Config.getSignedUrl('test.pdf', 7200);
      
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 7200 }
      );
    });
  });
});

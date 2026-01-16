import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock sharp before importing imageOptimization
vi.mock('sharp', () => {
  const mockMetadata = vi.fn(() => Promise.resolve({ width: 1920, height: 1080, format: 'jpeg' }));
  const mockToBuffer = vi.fn(() => Promise.resolve(Buffer.from('optimized-image-data')));
  
  const mockSharp = vi.fn(() => ({
    metadata: mockMetadata,
    resize: vi.fn(function(this: any) { return this; }),
    jpeg: vi.fn(function(this: any) { return this; }),
    png: vi.fn(function(this: any) { return this; }),
    webp: vi.fn(function(this: any) { return this; }),
    composite: vi.fn(function(this: any) { return this; }),
    toBuffer: mockToBuffer
  }));

  return { default: mockSharp };
});

describe('Image Optimization Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isImageMimeType', () => {
    it('should return true for image MIME types', async () => {
      const { isImageMimeType } = await import('../../utils/imageOptimization');
      
      expect(isImageMimeType('image/jpeg')).toBe(true);
      expect(isImageMimeType('image/png')).toBe(true);
      expect(isImageMimeType('image/webp')).toBe(true);
      expect(isImageMimeType('image/gif')).toBe(true);
      expect(isImageMimeType('image/svg+xml')).toBe(true);
    });

    it('should return false for non-image MIME types', async () => {
      const { isImageMimeType } = await import('../../utils/imageOptimization');
      
      expect(isImageMimeType('application/pdf')).toBe(false);
      expect(isImageMimeType('text/plain')).toBe(false);
      expect(isImageMimeType('video/mp4')).toBe(false);
      expect(isImageMimeType('audio/mpeg')).toBe(false);
    });
  });

  describe('getAllowedMimeTypes', () => {
    it('should return avatar MIME types', async () => {
      const { getAllowedMimeTypes } = await import('../../utils/imageOptimization');
      
      const types = getAllowedMimeTypes('avatar');
      expect(types).toContain('image/jpeg');
      expect(types).toContain('image/png');
      expect(types).toContain('image/webp');
      expect(types).toContain('image/gif');
      expect(types).not.toContain('image/svg+xml');
    });

    it('should return image MIME types including SVG', async () => {
      const { getAllowedMimeTypes } = await import('../../utils/imageOptimization');
      
      const types = getAllowedMimeTypes('image');
      expect(types).toContain('image/jpeg');
      expect(types).toContain('image/svg+xml');
    });

    it('should return document MIME types', async () => {
      const { getAllowedMimeTypes } = await import('../../utils/imageOptimization');
      
      const types = getAllowedMimeTypes('document');
      expect(types).toContain('application/pdf');
      expect(types).toContain('text/plain');
      expect(types).toContain('text/markdown');
    });

    it('should return wildcard for unknown categories', async () => {
      const { getAllowedMimeTypes } = await import('../../utils/imageOptimization');
      
      const types = getAllowedMimeTypes('unknown');
      expect(types).toEqual(['*/*']);
    });

    it('should return wildcard for "other" category', async () => {
      const { getAllowedMimeTypes } = await import('../../utils/imageOptimization');
      
      const types = getAllowedMimeTypes('other');
      expect(types).toEqual(['*/*']);
    });
  });

  describe('validateMimeTypeForCategory', () => {
    it('should validate avatar MIME types correctly', async () => {
      const { validateMimeTypeForCategory } = await import('../../utils/imageOptimization');
      
      expect(validateMimeTypeForCategory('image/jpeg', 'avatar')).toBe(true);
      expect(validateMimeTypeForCategory('image/png', 'avatar')).toBe(true);
      expect(validateMimeTypeForCategory('application/pdf', 'avatar')).toBe(false);
    });

    it('should validate image MIME types correctly', async () => {
      const { validateMimeTypeForCategory } = await import('../../utils/imageOptimization');
      
      expect(validateMimeTypeForCategory('image/svg+xml', 'image')).toBe(true);
      expect(validateMimeTypeForCategory('image/jpeg', 'image')).toBe(true);
      expect(validateMimeTypeForCategory('video/mp4', 'image')).toBe(false);
    });

    it('should validate document MIME types correctly', async () => {
      const { validateMimeTypeForCategory } = await import('../../utils/imageOptimization');
      
      expect(validateMimeTypeForCategory('application/pdf', 'document')).toBe(true);
      expect(validateMimeTypeForCategory('text/plain', 'document')).toBe(true);
      expect(validateMimeTypeForCategory('image/jpeg', 'document')).toBe(false);
    });

    it('should allow all types for "other" category', async () => {
      const { validateMimeTypeForCategory } = await import('../../utils/imageOptimization');
      
      expect(validateMimeTypeForCategory('anything', 'other')).toBe(true);
      expect(validateMimeTypeForCategory('video/mp4', 'other')).toBe(true);
      expect(validateMimeTypeForCategory('application/octet-stream', 'other')).toBe(true);
    });

    it('should allow all types for unknown categories', async () => {
      const { validateMimeTypeForCategory } = await import('../../utils/imageOptimization');
      
      expect(validateMimeTypeForCategory('anything', 'unknown')).toBe(true);
    });
  });

  describe('optimizeImage', () => {
    it('should export optimizeImage function', async () => {
      const { optimizeImage } = await import('../../utils/imageOptimization');
      expect(optimizeImage).toBeDefined();
      expect(typeof optimizeImage).toBe('function');
    });

    it('should process image buffer and return optimized result', async () => {
      const { optimizeImage } = await import('../../utils/imageOptimization');
      
      const inputBuffer = Buffer.from('test-image');
      const result = await optimizeImage(inputBuffer, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 85,
        format: 'webp'
      });

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.format).toBe('webp');
      expect(result.size).toBeGreaterThan(0);
    });
  });

  describe('createThumbnail', () => {
    it('should export createThumbnail function', async () => {
      const { createThumbnail } = await import('../../utils/imageOptimization');
      expect(createThumbnail).toBeDefined();
      expect(typeof createThumbnail).toBe('function');
    });

    it('should create thumbnail with default size', async () => {
      const { createThumbnail } = await import('../../utils/imageOptimization');
      
      const inputBuffer = Buffer.from('test-image');
      const result = await createThumbnail(inputBuffer);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.format).toBe('webp');
    });

    it('should create thumbnail with custom size', async () => {
      const { createThumbnail } = await import('../../utils/imageOptimization');
      
      const inputBuffer = Buffer.from('test-image');
      const result = await createThumbnail(inputBuffer, 150);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('createAvatar', () => {
    it('should export createAvatar function', async () => {
      const { createAvatar } = await import('../../utils/imageOptimization');
      expect(createAvatar).toBeDefined();
      expect(typeof createAvatar).toBe('function');
    });

    it('should create circular avatar with default size', async () => {
      const { createAvatar } = await import('../../utils/imageOptimization');
      
      const inputBuffer = Buffer.from('test-image');
      const result = await createAvatar(inputBuffer);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.format).toBe('webp');
    });

    it('should create circular avatar with custom size', async () => {
      const { createAvatar } = await import('../../utils/imageOptimization');
      
      const inputBuffer = Buffer.from('test-image');
      const result = await createAvatar(inputBuffer, 128);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
    });
  });
});

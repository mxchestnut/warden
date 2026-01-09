import sharp from 'sharp';
import path from 'path';
import crypto from 'crypto';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface OptimizedImage {
  buffer: Buffer;
  format: string;
  size: number;
  width: number;
  height: number;
}

/**
 * Optimize an image for web use
 */
export async function optimizeImage(
  inputBuffer: Buffer,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 85,
    format = 'webp'
  } = options;

  const image = sharp(inputBuffer);
  const metadata = await image.metadata();

  // Resize if needed
  let resized = image;
  if (metadata.width && metadata.height) {
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      resized = image.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
  }

  // Convert to specified format with quality
  let converted: sharp.Sharp;
  switch (format) {
    case 'jpeg':
      converted = resized.jpeg({ quality, progressive: true });
      break;
    case 'png':
      converted = resized.png({ quality, progressive: true });
      break;
    case 'webp':
    default:
      converted = resized.webp({ quality });
      break;
  }

  const buffer = await converted.toBuffer();
  const finalMetadata = await sharp(buffer).metadata();

  return {
    buffer,
    format,
    size: buffer.length,
    width: finalMetadata.width || 0,
    height: finalMetadata.height || 0
  };
}

/**
 * Create a thumbnail from an image
 */
export async function createThumbnail(
  inputBuffer: Buffer,
  size: number = 300
): Promise<OptimizedImage> {
  const image = sharp(inputBuffer);

  const buffer = await image
    .resize(size, size, {
      fit: 'cover',
      position: 'center'
    })
    .webp({ quality: 80 })
    .toBuffer();

  const metadata = await sharp(buffer).metadata();

  return {
    buffer,
    format: 'webp',
    size: buffer.length,
    width: metadata.width || 0,
    height: metadata.height || 0
  };
}

/**
 * Create avatar with circular crop
 */
export async function createAvatar(
  inputBuffer: Buffer,
  size: number = 256
): Promise<OptimizedImage> {
  // Create a circular mask
  const roundedCorners = Buffer.from(
    `<svg><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`
  );

  const buffer = await sharp(inputBuffer)
    .resize(size, size, {
      fit: 'cover',
      position: 'center'
    })
    .composite([{
      input: roundedCorners,
      blend: 'dest-in'
    }])
    .webp({ quality: 90 })
    .toBuffer();

  const metadata = await sharp(buffer).metadata();

  return {
    buffer,
    format: 'webp',
    size: buffer.length,
    width: metadata.width || 0,
    height: metadata.height || 0
  };
}

/**
 * Check if a file is an image based on MIME type
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Get allowed MIME types by category
 */
export function getAllowedMimeTypes(category: string): string[] {
  const mimeTypes: Record<string, string[]> = {
    avatar: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    other: ['*/*'] // Allow all
  };

  return mimeTypes[category] || mimeTypes.other;
}

/**
 * Validate MIME type for category
 */
export function validateMimeTypeForCategory(mimeType: string, category: string): boolean {
  const allowed = getAllowedMimeTypes(category);

  if (allowed.includes('*/*')) {
    return true;
  }

  return allowed.includes(mimeType);
}

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { isAuthenticated } from '../middleware/auth';
import { db } from '../db';
import { files, users } from '../db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { uploadToS3, deleteFromS3, getSignedUrl } from '../config/s3';
import {
  optimizeImage,
  createThumbnail,
  createAvatar,
  isImageMimeType,
  validateMimeTypeForCategory
} from '../utils/imageOptimization';

const router = Router();

// Storage quota - same for all users now (10GB)
const STORAGE_QUOTA = 10737418240; // 10GB

function getStorageQuota(): number {
  return STORAGE_QUOTA;
}

// Configure multer for temporary file storage
const upload = multer({
  dest: '/tmp/uploads/', // Temporary storage before S3
  limits: {
    fileSize: 1024 * 1024 * 1024 * 2, // 2GB max (for large PDFs)
  }
});

// Scan file with ClamAV
async function scanFileForVirus(filePath: string): Promise<{ isInfected: boolean; details: string }> {
  try {
    const NodeClam = require('clamscan');

    const clamscan = await new NodeClam().init({
      removeInfected: false,
      quarantineInfected: false,
      scanLog: null,
      debugMode: false,
      clamdscan: {
        socket: '/var/run/clamd.scan/clamd.sock', // Amazon Linux ClamAV socket
        timeout: 300000, // 5 minutes for large files
        multiscan: true,
        reloadDb: false,
      },
      preference: 'clamdscan'
    });

    const { isInfected, viruses } = await clamscan.isInfected(filePath);

    return {
      isInfected,
      details: isInfected ? JSON.stringify({ viruses }) : 'File is clean'
    };
  } catch (error: any) {
    console.error('ClamAV scan error:', error);
    // If ClamAV fails, we'll allow upload but mark as error
    return {
      isInfected: false,
      details: `Scan error: ${error.message}. File uploaded without scan.`
    };
  }
}

// Upload file with categories and optimization
router.post('/upload', isAuthenticated, upload.single('file'), async (req, res) => {
  try {
    const user = req.user as any;
    const uploadedFile = req.file;
    const category = req.body.category || 'document'; // avatar, image, document, other

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File upload started:', {
      originalName: uploadedFile.originalname,
      size: uploadedFile.size,
      mimeType: uploadedFile.mimetype,
      category
    });

    // Validate MIME type for category
    if (!validateMimeTypeForCategory(uploadedFile.mimetype, category)) {
      fs.unlinkSync(uploadedFile.path);
      return res.status(400).json({
        error: `File type ${uploadedFile.mimetype} is not allowed for category '${category}'`
      });
    }

    // Check user storage quota
    const [userData] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));

    const quotaBytes = getStorageQuota();
    const usedBytes = userData.storageUsedBytes || 0;

    if (usedBytes + uploadedFile.size > quotaBytes) {
      fs.unlinkSync(uploadedFile.path);
      const usedMB = (usedBytes / (1024 * 1024)).toFixed(2);
      const quotaMB = (quotaBytes / (1024 * 1024)).toFixed(2);
      return res.status(400).json({
        error: 'Storage quota exceeded',
        details: `You have used ${usedMB}MB of your ${quotaMB}MB quota`,
        used: usedBytes,
        quota: quotaBytes
      });
    }

    // Scan for viruses
    console.log('Scanning file for viruses...');
    const scanResult = await scanFileForVirus(uploadedFile.path);

    if (scanResult.isInfected) {
      fs.unlinkSync(uploadedFile.path);
      return res.status(400).json({
        error: 'File contains malware and has been rejected',
        details: scanResult.details
      });
    }

    // Read file buffer
    let fileBuffer = fs.readFileSync(uploadedFile.path);
    let finalMimeType = uploadedFile.mimetype;
    let finalSize = uploadedFile.size;
    let isOptimized = false;
    let thumbnailS3Key: string | null = null;

    // Optimize images
    if (isImageMimeType(uploadedFile.mimetype)) {
      console.log('Optimizing image...');

      if (category === 'avatar') {
        // Create optimized avatar
        const optimized = await createAvatar(fileBuffer, 512);
        fileBuffer = Buffer.from(optimized.buffer);
        finalMimeType = `image/${optimized.format}`;
        finalSize = optimized.size;
        isOptimized = true;
      } else if (category === 'image') {
        // Optimize image and create thumbnail
        const optimized = await optimizeImage(fileBuffer, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 85,
          format: 'webp'
        });
        fileBuffer = Buffer.from(optimized.buffer);
        finalMimeType = `image/${optimized.format}`;
        finalSize = optimized.size;
        isOptimized = true;

        // Create thumbnail
        const thumb = await createThumbnail(fileBuffer, 300);
        const thumbFileName = `thumb-${crypto.randomBytes(8).toString('hex')}.webp`;
        const thumbS3Key = `thumbnails/${user.id}/${Date.now()}-${thumbFileName}`;

        await uploadToS3(thumb.buffer, thumbS3Key, 'image/webp');
        thumbnailS3Key = thumbS3Key;
      }
    }

    // Generate safe filename
    const fileExt = path.extname(uploadedFile.originalname);
    const safeFileName = crypto.randomBytes(16).toString('hex') + (isOptimized ? '.webp' : fileExt);
    const s3Key = `uploads/${user.id}/${Date.now()}-${safeFileName}`;

    // Upload to S3
    console.log('Uploading to S3...');
    await uploadToS3(fileBuffer, s3Key, finalMimeType);

    // Save file metadata to database
    const [fileRecord] = await db.insert(files).values({
      userId: user.id,
      fileName: safeFileName,
      originalFileName: uploadedFile.originalname,
      mimeType: finalMimeType,
      fileSize: finalSize,
      s3Key: s3Key,
      s3Bucket: process.env.S3_BUCKET || '',
      virusScanStatus: scanResult.isInfected ? 'infected' : 'clean',
      virusScanDetails: scanResult.details,
      category,
      isOptimized,
      thumbnailS3Key
    }).returning();

    // Update user storage usage
    await db
      .update(users)
      .set({
        storageUsedBytes: usedBytes + finalSize
      })
      .where(eq(users.id, user.id));

    // Delete temporary file
    fs.unlinkSync(uploadedFile.path);

    console.log('File uploaded successfully:', fileRecord.id);

    res.json({
      message: 'File uploaded successfully',
      file: {
        id: fileRecord.id,
        fileName: fileRecord.fileName,
        originalFileName: fileRecord.originalFileName,
        fileSize: fileRecord.fileSize,
        mimeType: fileRecord.mimeType,
        uploadedAt: fileRecord.uploadedAt,
        virusScanStatus: fileRecord.virusScanStatus,
        category: fileRecord.category,
        isOptimized: fileRecord.isOptimized,
        hasThumbnail: !!fileRecord.thumbnailS3Key
      }
    });
  } catch (error: any) {
    console.error('File upload error:', error);

    // Clean up temp file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ error: 'Failed to upload file', details: error.message });
  }
});

// List user's files with optional category filter
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const category = req.query.category as string | undefined;

    let query = db
      .select()
      .from(files)
      .where(and(
        eq(files.userId, user.id),
        isNull(files.deletedAt)
      ));

    // Add category filter if provided
    let userFiles;
    if (category) {
      userFiles = await db.select().from(files)
        .where(and(
          eq(files.userId, user.id),
          eq(files.category, category),
          isNull(files.deletedAt)
        ))
        .orderBy(sql`${files.uploadedAt} DESC`);
    } else {
      userFiles = await query.orderBy(sql`${files.uploadedAt} DESC`);
    }

    // Get storage quota info
    const [userData] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));

    const quotaBytes = getStorageQuota();

    res.json({
      files: userFiles,
      quota: {
        used: userData.storageUsedBytes || 0,
        total: quotaBytes,
        usedMB: ((userData.storageUsedBytes || 0) / (1024 * 1024)).toFixed(2),
        totalMB: (quotaBytes / (1024 * 1024)).toFixed(2),
        percentUsed: Math.round(((userData.storageUsedBytes || 0) / quotaBytes) * 100)
      }
    });
  } catch (error: any) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Get file download URL
router.get('/:id/download', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const fileId = parseInt(req.params.id as string);
    if (isNaN(fileId) || fileId < 1) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }
    const thumbnail = req.query.thumbnail === 'true';

    const [fileRecord] = await db
      .select()
      .from(files)
      .where(and(
        eq(files.id, fileId),
        eq(files.userId, user.id),
        isNull(files.deletedAt)
      ));

    if (!fileRecord) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get thumbnail or full file
    const s3Key = (thumbnail && fileRecord.thumbnailS3Key)
      ? fileRecord.thumbnailS3Key
      : fileRecord.s3Key;

    // Generate pre-signed URL (valid for 1 hour)
    const downloadUrl = await getSignedUrl(s3Key, 3600);

    res.json({
      downloadUrl,
      fileName: fileRecord.originalFileName,
      expiresIn: 3600
    });
  } catch (error: any) {
    console.error('Error generating download URL:', error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

// Delete file
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const fileId = parseInt(req.params.id as string);
    if (isNaN(fileId) || fileId < 1) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    const [fileRecord] = await db
      .select()
      .from(files)
      .where(and(
        eq(files.id, fileId),
        eq(files.userId, user.id),
        isNull(files.deletedAt)
      ));

    if (!fileRecord) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete from S3
    await deleteFromS3(fileRecord.s3Key);

    // Delete thumbnail if exists
    if (fileRecord.thumbnailS3Key) {
      await deleteFromS3(fileRecord.thumbnailS3Key);
    }

    // Soft delete in database
    await db
      .update(files)
      .set({ deletedAt: new Date() })
      .where(eq(files.id, fileId));

    // Update user storage usage
    const [userData] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));

    const newUsedBytes = Math.max(0, (userData.storageUsedBytes || 0) - fileRecord.fileSize);

    await db
      .update(users)
      .set({ storageUsedBytes: newUsedBytes })
      .where(eq(users.id, user.id));

    res.json({ message: 'File deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;

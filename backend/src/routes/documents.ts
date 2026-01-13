import { Router } from 'express';
import multer from 'multer';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '../db';
import { documents } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth';
import { s3Client, BUCKET_NAME } from '../config/s3';
import { randomBytes } from 'crypto';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(isAuthenticated);

// Get user's documents and folders
router.get('/', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const parentId = req.query.parentId ? parseInt(req.query.parentId as string) : null;

    const userDocs = await db.select().from(documents).where(
      and(
        eq(documents.userId, userId),
        parentId ? eq(documents.parentId, parentId) : isNull(documents.parentId)
      )
    );

    res.json(userDocs);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Create folder
router.post('/folder', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { name, parentId } = req.body;

    const [newFolder] = await db.insert(documents).values({
      name,
      userId,
      parentId: parentId || null,
      isFolder: true
    }).returning();

    res.json(newFolder);
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Create/update document
router.post('/document', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { id, name, content, parentId } = req.body;

    if (id) {
      // Update existing document
      const [updated] = await db.update(documents)
        .set({ name, content, updatedAt: new Date() })
        .where(and(eq(documents.id, id), eq(documents.userId, userId)))
        .returning();

      res.json(updated);
    } else {
      // Create new document
      const [newDoc] = await db.insert(documents).values({
        name,
        content,
        userId,
        parentId: parentId || null,
        isFolder: false
      }).returning();

      res.json(newDoc);
    }
  } catch (error) {
    console.error('Error saving document:', error);
    res.status(500).json({ error: 'Failed to save document' });
  }
});

// Upload file to S3
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = (req.user as any).id;
    const { parentId } = req.body;
    const file = req.file;

    // Generate unique key for S3
    const key = `${userId}/${randomBytes(16).toString('hex')}-${file.originalname}`;

    // Upload to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    }));

    // Save metadata to database
    const [newDoc] = await db.insert(documents).values({
      name: file.originalname,
      userId,
      parentId: parentId || null,
      isFolder: false,
      s3Key: key,
      mimeType: file.mimetype,
      size: file.size
    }).returning();

    res.json(newDoc);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get download URL for file
router.get('/download/:id', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const docId = parseInt(req.params.id);

    const [doc] = await db.select().from(documents).where(
      and(eq(documents.id, docId), eq(documents.userId, userId))
    );

    if (!doc || !doc.s3Key) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Generate presigned URL (valid for 1 hour)
    const url = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: doc.s3Key
      }),
      { expiresIn: 3600 }
    );

    res.json({ url });
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

// Delete document/folder
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const docId = parseInt(req.params.id);

    await db.delete(documents).where(
      and(eq(documents.id, docId), eq(documents.userId, userId))
    );

    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;

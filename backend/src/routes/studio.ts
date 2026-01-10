import { Router } from 'express';
import { db } from '../db';
import { documents } from '../db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(isAuthenticated);

// Get user's studio documents and folders
router.get('/', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const parentId = req.query.parentId ? parseInt(req.query.parentId as string) : null;

    // Get all studio documents (documents without s3Key are text documents)
    const studioDocs = await db.select().from(documents).where(
      and(
        eq(documents.userId, userId),
        parentId ? eq(documents.parentId, parentId) : isNull(documents.parentId)
      )
    ).orderBy(desc(documents.isFolder), desc(documents.updatedAt));

    res.json(studioDocs);
  } catch (error) {
    console.error('Error fetching studio documents:', error);
    res.status(500).json({ error: 'Failed to fetch studio documents' });
  }
});

// Create new studio folder
router.post('/folder', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { name, parentId } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const [newFolder] = await db.insert(documents).values({
      name: name.trim(),
      userId,
      parentId: parentId || null,
      isFolder: true,
      updatedAt: new Date()
    }).returning();

    res.json(newFolder);
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Create new studio document
router.post('/document', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { name, content, parentId } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Document name is required' });
    }

    const [newDoc] = await db.insert(documents).values({
      name: name.trim(),
      content: content || '',
      userId,
      parentId: parentId || null,
      isFolder: false,
      mimeType: 'text/html', // TipTap content
      size: content ? Buffer.byteLength(content, 'utf8') : 0,
      updatedAt: new Date()
    }).returning();

    res.json(newDoc);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Update studio document content
router.put('/document/:id', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const docId = parseInt(req.params.id);
    const { name, content } = req.body;

    // Verify ownership
    const [doc] = await db.select().from(documents).where(
      and(
        eq(documents.id, docId),
        eq(documents.userId, userId)
      )
    );

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (doc.isFolder) {
      return res.status(400).json({ error: 'Cannot update folder content' });
    }

    const updates: any = {
      updatedAt: new Date()
    };

    if (name !== undefined) {
      updates.name = name.trim();
    }

    if (content !== undefined) {
      updates.content = content;
      updates.size = Buffer.byteLength(content, 'utf8');
    }

    const [updated] = await db.update(documents)
      .set(updates)
      .where(eq(documents.id, docId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Get single document
router.get('/document/:id', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const docId = parseInt(req.params.id);

    const [doc] = await db.select().from(documents).where(
      and(
        eq(documents.id, docId),
        eq(documents.userId, userId)
      )
    );

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(doc);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Delete document or folder
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const docId = parseInt(req.params.id);

    // Verify ownership
    const [doc] = await db.select().from(documents).where(
      and(
        eq(documents.id, docId),
        eq(documents.userId, userId)
      )
    );

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // If it's a folder, delete all children recursively
    if (doc.isFolder) {
      await deleteChildrenRecursively(docId, userId);
    }

    await db.delete(documents).where(eq(documents.id, docId));

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Rename document or folder
router.patch('/:id/rename', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const docId = parseInt(req.params.id);
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Verify ownership
    const [doc] = await db.select().from(documents).where(
      and(
        eq(documents.id, docId),
        eq(documents.userId, userId)
      )
    );

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const [updated] = await db.update(documents)
      .set({
        name: name.trim(),
        updatedAt: new Date()
      })
      .where(eq(documents.id, docId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Error renaming document:', error);
    res.status(500).json({ error: 'Failed to rename document' });
  }
});

// Move document to different folder
router.patch('/:id/move', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const docId = parseInt(req.params.id);
    const { parentId } = req.body;

    // Verify ownership of document
    const [doc] = await db.select().from(documents).where(
      and(
        eq(documents.id, docId),
        eq(documents.userId, userId)
      )
    );

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Verify ownership of target folder if specified
    if (parentId !== null) {
      const [targetFolder] = await db.select().from(documents).where(
        and(
          eq(documents.id, parentId),
          eq(documents.userId, userId),
          eq(documents.isFolder, true)
        )
      );

      if (!targetFolder) {
        return res.status(404).json({ error: 'Target folder not found' });
      }

      // Prevent moving folder into itself or its children
      if (doc.isFolder) {
        const isDescendant = await checkIfDescendant(docId, parentId);
        if (isDescendant || docId === parentId) {
          return res.status(400).json({ error: 'Cannot move folder into itself or its children' });
        }
      }
    }

    const [updated] = await db.update(documents)
      .set({
        parentId: parentId || null,
        updatedAt: new Date()
      })
      .where(eq(documents.id, docId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Error moving document:', error);
    res.status(500).json({ error: 'Failed to move document' });
  }
});

// Helper function to recursively delete children
async function deleteChildrenRecursively(parentId: number, userId: number) {
  const children = await db.select().from(documents).where(
    and(
      eq(documents.parentId, parentId),
      eq(documents.userId, userId)
    )
  );

  for (const child of children) {
    if (child.isFolder) {
      await deleteChildrenRecursively(child.id, userId);
    }
    await db.delete(documents).where(eq(documents.id, child.id));
  }
}

// Helper function to check if targetId is a descendant of folderId
async function checkIfDescendant(folderId: number, targetId: number): Promise<boolean> {
  const [target] = await db.select().from(documents).where(eq(documents.id, targetId));
  if (!target || !target.parentId) return false;
  if (target.parentId === folderId) return true;
  return checkIfDescendant(folderId, target.parentId);
}

export default router;

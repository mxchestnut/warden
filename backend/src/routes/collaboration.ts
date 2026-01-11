import express from 'express';
import { db } from '../db';
import { documentCollaborators, documents, documentVersions, users } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// Get collaborators for a document
router.get('/document/:documentId', isAuthenticated, async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const userId = (req.user as any).id;

    // Check if user has access to the document
    const [document] = await db.select().from(documents).where(eq(documents.id, documentId));
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.userId !== userId) {
      // Check if user is a collaborator
      const [collaboration] = await db
        .select()
        .from(documentCollaborators)
        .where(and(eq(documentCollaborators.documentId, documentId), eq(documentCollaborators.userId, userId)));
      
      if (!collaboration) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const collaborators = await db
      .select({
        id: documentCollaborators.id,
        userId: documentCollaborators.userId,
        role: documentCollaborators.role,
        canEdit: documentCollaborators.canEdit,
        canComment: documentCollaborators.canComment,
        invitedAt: documentCollaborators.invitedAt
      })
      .from(documentCollaborators)
      .where(eq(documentCollaborators.documentId, documentId));

    res.json(collaborators);
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    res.status(500).json({ error: 'Failed to fetch collaborators' });
  }
});

// Add a collaborator to a document
router.post('/document/:documentId/collaborators', isAuthenticated, async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const inviterId = (req.user as any).id;
    const { userId, role, canEdit, canComment } = req.body;

    // Check if user owns the document
    const [document] = await db.select().from(documents).where(eq(documents.id, documentId));
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.userId !== inviterId) {
      return res.status(403).json({ error: 'Only the document owner can add collaborators' });
    }

    // Check if user exists
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already a collaborator
    const [existing] = await db
      .select()
      .from(documentCollaborators)
      .where(and(eq(documentCollaborators.documentId, documentId), eq(documentCollaborators.userId, userId)));

    if (existing) {
      return res.status(400).json({ error: 'User is already a collaborator' });
    }

    const [newCollaborator] = await db.insert(documentCollaborators).values({
      documentId,
      userId,
      role: role || 'viewer',
      canEdit: canEdit ?? false,
      canComment: canComment ?? true,
      invitedBy: inviterId
    }).returning();

    res.status(201).json(newCollaborator);
  } catch (error) {
    console.error('Error adding collaborator:', error);
    res.status(500).json({ error: 'Failed to add collaborator' });
  }
});

// Update collaborator permissions
router.patch('/document/:documentId/collaborators/:collaboratorId', isAuthenticated, async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const collaboratorId = parseInt(req.params.collaboratorId);
    const userId = (req.user as any).id;
    const { role, canEdit, canComment } = req.body;

    // Check if user owns the document
    const [document] = await db.select().from(documents).where(eq(documents.id, documentId));
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.userId !== userId) {
      return res.status(403).json({ error: 'Only the document owner can update collaborator permissions' });
    }

    const updates: any = {};
    if (role !== undefined) updates.role = role;
    if (canEdit !== undefined) updates.canEdit = canEdit;
    if (canComment !== undefined) updates.canComment = canComment;

    const [updatedCollaborator] = await db
      .update(documentCollaborators)
      .set(updates)
      .where(eq(documentCollaborators.id, collaboratorId))
      .returning();

    res.json(updatedCollaborator);
  } catch (error) {
    console.error('Error updating collaborator:', error);
    res.status(500).json({ error: 'Failed to update collaborator' });
  }
});

// Remove a collaborator
router.delete('/document/:documentId/collaborators/:collaboratorId', isAuthenticated, async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const collaboratorId = parseInt(req.params.collaboratorId);
    const userId = (req.user as any).id;

    // Check if user owns the document
    const [document] = await db.select().from(documents).where(eq(documents.id, documentId));
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.userId !== userId) {
      return res.status(403).json({ error: 'Only the document owner can remove collaborators' });
    }

    await db.delete(documentCollaborators).where(eq(documentCollaborators.id, collaboratorId));

    res.json({ message: 'Collaborator removed successfully' });
  } catch (error) {
    console.error('Error removing collaborator:', error);
    res.status(500).json({ error: 'Failed to remove collaborator' });
  }
});

// Get document versions
router.get('/document/:documentId/versions', isAuthenticated, async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const userId = (req.user as any).id;

    // Check if user has access to the document
    const [document] = await db.select().from(documents).where(eq(documents.id, documentId));
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.userId !== userId) {
      // Check if user is a collaborator
      const [collaboration] = await db
        .select()
        .from(documentCollaborators)
        .where(and(eq(documentCollaborators.documentId, documentId), eq(documentCollaborators.userId, userId)));
      
      if (!collaboration) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const versions = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.version));

    res.json(versions);
  } catch (error) {
    console.error('Error fetching versions:', error);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

// Create a new document version
router.post('/document/:documentId/versions', isAuthenticated, async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const userId = (req.user as any).id;
    const { content, contentHtml, title, changeSummary } = req.body;

    // Check if user has edit access
    const [document] = await db.select().from(documents).where(eq(documents.id, documentId));
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    let canEdit = document.userId === userId;

    if (!canEdit) {
      const [collaboration] = await db
        .select()
        .from(documentCollaborators)
        .where(and(eq(documentCollaborators.documentId, documentId), eq(documentCollaborators.userId, userId)));
      
      canEdit = collaboration?.canEdit ?? false;
    }

    if (!canEdit) {
      return res.status(403).json({ error: 'You do not have edit access to this document' });
    }

    // Get current version number
    const [latestVersion] = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.version))
      .limit(1);

    const newVersionNumber = (latestVersion?.version ?? 0) + 1;

    const [newVersion] = await db.insert(documentVersions).values({
      documentId,
      version: newVersionNumber,
      content,
      contentHtml,
      title,
      changeSummary,
      createdBy: userId
    }).returning();

    res.status(201).json(newVersion);
  } catch (error) {
    console.error('Error creating version:', error);
    res.status(500).json({ error: 'Failed to create version' });
  }
});

export default router;

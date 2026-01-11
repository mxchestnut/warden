import express from 'express';
import { db } from '../db';
import { comments, commentReactions, documents } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// Get comments for a document
router.get('/document/:documentId', async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);

    const allComments = await db
      .select()
      .from(comments)
      .where(eq(comments.documentId, documentId))
      .orderBy(comments.createdAt);

    res.json(allComments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Create a comment
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { documentId, content, contentHtml, parentId, anchor } = req.body;

    if (!documentId || !content) {
      return res.status(400).json({ error: 'Document ID and content are required' });
    }

    // Check if document exists and user has access
    const [document] = await db.select().from(documents).where(eq(documents.id, documentId));
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const result: any = await db.insert(comments).values({
      documentId,
      userId,
      content,
      contentHtml,
      parentId: parentId || null,
      anchor: anchor ? JSON.stringify(anchor) : null
    }).returning();
    
    const newComment = result[0];

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Update a comment
router.patch('/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const commentId = parseInt(req.params.id);
    const { content, contentHtml } = req.body;

    // Check if user owns the comment
    const [comment] = await db.select().from(comments).where(eq(comments.id, commentId));
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ error: 'You can only edit your own comments' });
    }

    const [updatedComment] = await db.update(comments).set({
      content,
      contentHtml,
      isEdited: true,
      updatedAt: new Date()
    }).where(eq(comments.id, commentId)).returning();

    res.json(updatedComment);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete a comment
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const commentId = parseInt(req.params.id);

    // Check if user owns the comment
    const [comment] = await db.select().from(comments).where(eq(comments.id, commentId));
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId !== userId && !(req.user as any).isAdmin) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    await db.delete(comments).where(eq(comments.id, commentId));

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Resolve/unresolve a comment
router.patch('/:id/resolve', isAuthenticated, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const { isResolved } = req.body;

    const [updatedComment] = await db.update(comments).set({
      isResolved: isResolved ?? true
    }).where(eq(comments.id, commentId)).returning();

    res.json(updatedComment);
  } catch (error) {
    console.error('Error resolving comment:', error);
    res.status(500).json({ error: 'Failed to resolve comment' });
  }
});

// Add reaction to comment
router.post('/:id/react', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const commentId = parseInt(req.params.id);
    const { reactionType } = req.body;

    if (!reactionType) {
      return res.status(400).json({ error: 'Reaction type is required' });
    }

    // Check if reaction already exists
    const [existing] = await db
      .select()
      .from(commentReactions)
      .where(and(
        eq(commentReactions.commentId, commentId),
        eq(commentReactions.userId, userId),
        eq(commentReactions.reactionType, reactionType)
      ));

    if (existing) {
      // Remove reaction if it already exists
      await db.delete(commentReactions).where(eq(commentReactions.id, existing.id));
      return res.json({ message: 'Reaction removed' });
    }

    // Add new reaction
    const [newReaction] = await db.insert(commentReactions).values({
      commentId,
      userId,
      reactionType
    }).returning();

    res.status(201).json(newReaction);
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// Get reactions for a comment
router.get('/:id/reactions', async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);

    const reactions = await db
      .select()
      .from(commentReactions)
      .where(eq(commentReactions.commentId, commentId));

    res.json(reactions);
  } catch (error) {
    console.error('Error fetching reactions:', error);
    res.status(500).json({ error: 'Failed to fetch reactions' });
  }
});

export default router;

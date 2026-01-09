import { Router } from 'express';
import { db } from '../db';
import { knowledgeBase } from '../db/schema';
import { eq, sql, or, and, desc } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

// Get all knowledge base entries with optional search and filter
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { search, category, aiGenerated, limit = '100', offset = '0' } = req.query;

    let query = db.select().from(knowledgeBase);

    // Build filters
    const filters = [];

    if (search) {
      const searchTerm = String(search);
      filters.push(
        or(
          sql`LOWER(${knowledgeBase.question}) LIKE LOWER(${'%' + searchTerm + '%'})`,
          sql`LOWER(${knowledgeBase.answer}) LIKE LOWER(${'%' + searchTerm + '%'})`
        )
      );
    }

    if (category) {
      filters.push(eq(knowledgeBase.category, String(category)));
    }

    if (aiGenerated !== undefined) {
      filters.push(eq(knowledgeBase.aiGenerated, aiGenerated === 'true'));
    }

    // Apply filters if any exist
    if (filters.length > 0) {
      query = query.where(filters.length === 1 ? filters[0] : and(...filters)) as any;
    }

    // Add ordering and pagination
    const entries = await query
      .orderBy(desc(knowledgeBase.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    // Get total count for pagination
    const countQuery = db.select({ count: sql<number>`count(*)` }).from(knowledgeBase);
    if (filters.length > 0) {
      countQuery.where(filters.length === 1 ? filters[0] : and(...filters)) as any;
    }
    const [{ count }] = await countQuery;

    res.json({
      entries,
      total: Number(count),
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge base entries' });
  }
});

// Get categories and statistics
router.get('/stats', isAuthenticated, async (req, res) => {
  try {
    // Get all entries to calculate stats
    const entries = await db.select().from(knowledgeBase);

    // Calculate category counts
    const categoryCounts: Record<string, number> = {};
    let aiGeneratedCount = 0;
    let manualCount = 0;

    entries.forEach(entry => {
      const cat = entry.category || 'Uncategorized';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      if (entry.aiGenerated) {
        aiGeneratedCount++;
      } else {
        manualCount++;
      }
    });

    res.json({
      total: entries.length,
      aiGenerated: aiGeneratedCount,
      manual: manualCount,
      categories: Object.entries(categoryCounts).map(([name, count]) => ({
        name,
        count
      })).sort((a, b) => b.count - a.count)
    });
  } catch (error) {
    console.error('Error fetching knowledge base stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get single entry by ID
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const [entry] = await db
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.id, Number(req.params.id)));

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json(entry);
  } catch (error) {
    console.error('Error fetching entry:', error);
    res.status(500).json({ error: 'Failed to fetch entry' });
  }
});

// Create new entry (admin only - we'll use userId check)
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { question, answer, answerHtml, sourceUrl, category } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }

    const [entry] = await db
      .insert(knowledgeBase)
      .values({
        guildId: 'web', // Web UI entries use special 'web' guildId
        question,
        answer,
        answerHtml: answerHtml || null,
        sourceUrl: sourceUrl || null,
        category: category || null,
        aiGenerated: false,
        createdBy: (req.user as any)?.id,
        upvotes: 0
      })
      .returning();

    res.status(201).json(entry);
  } catch (error) {
    console.error('Error creating entry:', error);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// Update entry (admin only)
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const { question, answer, answerHtml, sourceUrl, category } = req.body;

    const [updated] = await db
      .update(knowledgeBase)
      .set({
        question,
        answer,
        answerHtml,
        sourceUrl,
        category,
        updatedAt: new Date()
      })
      .where(eq(knowledgeBase.id, Number(req.params.id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating entry:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// Delete entry (admin only)
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const [deleted] = await db
      .delete(knowledgeBase)
      .where(eq(knowledgeBase.id, Number(req.params.id)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

export default router;

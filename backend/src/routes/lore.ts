import { Router } from 'express';
import { db } from '../db/index.js';
import { loreEntries, channelLoreTags } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth.js';

const router = Router();

// Get all lore entries for a guild, optionally filtered by tag
router.get('/guild/:guildId', isAuthenticated, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { tag } = req.query;

    let query = db.select()
      .from(loreEntries)
      .where(eq(loreEntries.guildId, guildId))
      .orderBy(desc(loreEntries.createdAt));

    if (tag) {
      query = db.select()
        .from(loreEntries)
        .where(and(
          eq(loreEntries.guildId, guildId),
          eq(loreEntries.tag, tag as string)
        ))
        .orderBy(desc(loreEntries.createdAt));
    }

    const entries = await query;
    res.json(entries);
  } catch (error) {
    console.error('Error fetching lore entries:', error);
    res.status(500).json({ error: 'Failed to fetch lore entries' });
  }
});

// Get channel's lore tag
router.get('/channel/:guildId/:channelId/tag', async (req, res) => {
  try {
    const { guildId, channelId } = req.params;

    const [channelTag] = await db.select()
      .from(channelLoreTags)
      .where(and(
        eq(channelLoreTags.guildId, guildId),
        eq(channelLoreTags.channelId, channelId)
      ));

    res.json(channelTag || null);
  } catch (error) {
    console.error('Error fetching channel lore tag:', error);
    res.status(500).json({ error: 'Failed to fetch channel lore tag' });
  }
});

// Create a new lore entry
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { guildId, userId, tag, content } = req.body;

    if (!guildId || !userId || !tag || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [entry] = await db.insert(loreEntries).values({
      guildId,
      userId,
      tag,
      content
    }).returning();

    res.json(entry);
  } catch (error) {
    console.error('Error creating lore entry:', error);
    res.status(500).json({ error: 'Failed to create lore entry' });
  }
});

// Set channel lore tag
router.post('/channel/tag', isAuthenticated, async (req, res) => {
  try {
    const { guildId, channelId, tag } = req.body;

    if (!guildId || !channelId || !tag) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Delete existing tag for this channel if any
    await db.delete(channelLoreTags)
      .where(and(
        eq(channelLoreTags.guildId, guildId),
        eq(channelLoreTags.channelId, channelId)
      ));

    // Insert new tag
    const [channelTag] = await db.insert(channelLoreTags).values({
      guildId,
      channelId,
      tag
    }).returning();

    res.json(channelTag);
  } catch (error) {
    console.error('Error setting channel lore tag:', error);
    res.status(500).json({ error: 'Failed to set channel lore tag' });
  }
});

// Delete a lore entry
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    await db.delete(loreEntries)
      .where(eq(loreEntries.id, parseInt(id)));

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting lore entry:', error);
    res.status(500).json({ error: 'Failed to delete lore entry' });
  }
});

export default router;

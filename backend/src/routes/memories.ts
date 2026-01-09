import express from 'express';
import { db } from '../db';
import { characterMemories, characterSheets } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// Get all memories for a character
router.get('/:characterId/memories', isAuthenticated, async (req, res) => {
  try {
    const { characterId } = req.params;

    const memories = await db.select({
      id: characterMemories.id,
      memory: characterMemories.memory,
      addedBy: characterMemories.addedBy,
      createdAt: characterMemories.createdAt
    })
      .from(characterMemories)
      .where(eq(characterMemories.characterId, parseInt(characterId)))
      .orderBy(desc(characterMemories.createdAt));

    res.json(memories);
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

// Add a memory
router.post('/:characterId/memories', isAuthenticated, async (req, res) => {
  try {
    const { characterId } = req.params;
    const { memory, guildId } = req.body;

    if (!memory) {
      return res.status(400).json({ error: 'Memory text is required' });
    }

    const [newMemory] = await db.insert(characterMemories).values({
      characterId: parseInt(characterId),
      guildId: guildId || '',
      memory,
      addedBy: 'portal' // Indicate it was added via portal
    }).returning();

    res.json(newMemory);
  } catch (error) {
    console.error('Error adding memory:', error);
    res.status(500).json({ error: 'Failed to add memory' });
  }
});

// Delete a memory
router.delete('/memories/:memoryId', isAuthenticated, async (req, res) => {
  try {
    const { memoryId } = req.params;

    await db.delete(characterMemories)
      .where(eq(characterMemories.id, parseInt(memoryId)));

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting memory:', error);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

// Update a memory
router.put('/memories/:memoryId', isAuthenticated, async (req, res) => {
  try {
    const { memoryId } = req.params;
    const { memory } = req.body;

    if (!memory) {
      return res.status(400).json({ error: 'Memory text is required' });
    }

    const [updated] = await db.update(characterMemories)
      .set({ memory })
      .where(eq(characterMemories.id, parseInt(memoryId)))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Error updating memory:', error);
    res.status(500).json({ error: 'Failed to update memory' });
  }
});

export default router;

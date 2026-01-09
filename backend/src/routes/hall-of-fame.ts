import express from 'express';
import { db } from '../db';
import { hallOfFame } from '../db/schema';
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// Get Hall of Fame messages with filters (root endpoint)
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const {
      character,
      minStars,
      startDate,
      endDate,
      limit = '50',
      offset = '0'
    } = req.query;

    let query = db.select().from(hallOfFame);
    const conditions = [];

    // Character filter
    if (character && typeof character === 'string') {
      conditions.push(eq(hallOfFame.characterName, character));
    }

    // Star count filter
    if (minStars && typeof minStars === 'string') {
      const minStarsNum = parseInt(minStars);
      if (!isNaN(minStarsNum)) {
        conditions.push(gte(hallOfFame.starCount, minStarsNum));
      }
    }

    // Date range filter
    if (startDate && typeof startDate === 'string') {
      conditions.push(gte(hallOfFame.addedToHallAt, new Date(startDate)));
    }
    if (endDate && typeof endDate === 'string') {
      conditions.push(lte(hallOfFame.addedToHallAt, new Date(endDate)));
    }

    // Apply filters
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Apply ordering and pagination
    const limitNum = parseInt(limit as string) || 50;
    const offsetNum = parseInt(offset as string) || 0;

    const messages = await query
      .orderBy(desc(hallOfFame.addedToHallAt))
      .limit(limitNum)
      .offset(offsetNum);

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(hallOfFame)
      .where(conditions.length > 0 ? and(...conditions) : sql`true`);

    res.json({
      messages,
      pagination: {
        total: count,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + messages.length < count
      }
    });
  } catch (error) {
    console.error('Error fetching Hall of Fame messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Legacy endpoint for backward compatibility
router.get('/list', isAuthenticated, async (req, res) => {
  try {
    const {
      character,
      minStars,
      startDate,
      endDate,
      limit = '50',
      offset = '0'
    } = req.query;

    let query = db.select().from(hallOfFame);
    const conditions = [];

    // Character filter
    if (character && typeof character === 'string') {
      conditions.push(eq(hallOfFame.characterName, character));
    }

    // Star count filter
    if (minStars && typeof minStars === 'string') {
      const minStarsNum = parseInt(minStars);
      if (!isNaN(minStarsNum)) {
        conditions.push(gte(hallOfFame.starCount, minStarsNum));
      }
    }

    // Date range filter
    if (startDate && typeof startDate === 'string') {
      conditions.push(gte(hallOfFame.addedToHallAt, new Date(startDate)));
    }
    if (endDate && typeof endDate === 'string') {
      conditions.push(lte(hallOfFame.addedToHallAt, new Date(endDate)));
    }

    // Apply filters
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Apply ordering and pagination
    const messages = await query
      .orderBy(desc(hallOfFame.addedToHallAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Get total count for pagination
    const countQuery = conditions.length > 0
      ? db.select({ count: sql<number>`count(*)` }).from(hallOfFame).where(and(...conditions))
      : db.select({ count: sql<number>`count(*)` }).from(hallOfFame);

    const [{ count }] = await countQuery as any;

    res.json({
      messages: messages.map(msg => ({
        ...msg,
        contextMessages: msg.contextMessages ? JSON.parse(msg.contextMessages) : []
      })),
      total: Number(count),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Error fetching Hall of Fame:', error);
    res.status(500).json({ error: 'Failed to fetch Hall of Fame messages' });
  }
});

// Get random Hall of Fame message ("gem from the vault")
router.get('/random', isAuthenticated, async (req, res) => {
  try {
    const { minStars } = req.query;

    let query = db.select().from(hallOfFame);

    if (minStars && typeof minStars === 'string') {
      const minStarsNum = parseInt(minStars);
      if (!isNaN(minStarsNum)) {
        query = query.where(gte(hallOfFame.starCount, minStarsNum)) as any;
      }
    }

    const messages = await query;

    if (messages.length === 0) {
      return res.json({ message: null });
    }

    // Get random message
    const randomIndex = Math.floor(Math.random() * messages.length);
    const randomMessage = messages[randomIndex];

    res.json({
      message: {
        ...randomMessage,
        contextMessages: randomMessage.contextMessages ? JSON.parse(randomMessage.contextMessages) : []
      }
    });
  } catch (error) {
    console.error('Error fetching random Hall of Fame:', error);
    res.status(500).json({ error: 'Failed to fetch random message' });
  }
});

// Get Hall of Fame statistics
router.get('/stats', isAuthenticated, async (req, res) => {
  try {
    // Total messages in Hall of Fame
    const [{ count: totalMessages }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(hallOfFame) as any;

    // Total stars
    const [{ totalStars }] = await db
      .select({ totalStars: sql<number>`sum(${hallOfFame.starCount})` })
      .from(hallOfFame) as any;

    // Top starred message
    const [topMessage] = await db
      .select()
      .from(hallOfFame)
      .orderBy(desc(hallOfFame.starCount))
      .limit(1);

    // Most active character
    const characterStats = await db
      .select({
        characterName: hallOfFame.characterName,
        count: sql<number>`count(*)`,
        totalStars: sql<number>`sum(${hallOfFame.starCount})`
      })
      .from(hallOfFame)
      .where(sql`${hallOfFame.characterName} IS NOT NULL`)
      .groupBy(hallOfFame.characterName)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    // Recent additions
    const recentAdditions = await db
      .select()
      .from(hallOfFame)
      .orderBy(desc(hallOfFame.addedToHallAt))
      .limit(5);

    res.json({
      totalMessages: Number(totalMessages),
      totalStars: Number(totalStars) || 0,
      topMessage: topMessage ? {
        ...topMessage,
        contextMessages: topMessage.contextMessages ? JSON.parse(topMessage.contextMessages) : []
      } : null,
      characterStats: characterStats.map(stat => ({
        characterName: stat.characterName,
        count: Number(stat.count),
        totalStars: Number(stat.totalStars) || 0
      })),
      recentAdditions: recentAdditions.map(msg => ({
        ...msg,
        contextMessages: msg.contextMessages ? JSON.parse(msg.contextMessages) : []
      }))
    });
  } catch (error) {
    console.error('Error fetching Hall of Fame stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get unique characters with Hall of Fame messages
router.get('/characters', isAuthenticated, async (req, res) => {
  try {
    const characters = await db
      .selectDistinct({ characterName: hallOfFame.characterName })
      .from(hallOfFame)
      .where(sql`${hallOfFame.characterName} IS NOT NULL`)
      .orderBy(hallOfFame.characterName);

    res.json({
      characters: characters.map(c => c.characterName).filter(Boolean)
    });
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

export default router;

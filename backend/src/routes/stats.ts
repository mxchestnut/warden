import { Router } from 'express';
import { db } from '../db/index.js';
import { characterSheets, characterStats, activityFeed } from '../db/schema.js';
import { isAuthenticated } from '../middleware/auth.js';
import { desc, sql, eq, and, gte } from 'drizzle-orm';

const router = Router();

// Get overall statistics
router.get('/overview', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;

    // Total characters
    const totalCharacters = await db
      .select({ count: sql<number>`count(*)` })
      .from(characterSheets)
      .where(eq(characterSheets.userId, userId));

    // Total messages across all characters
    const totalStats = await db
      .select({
        totalMessages: sql<number>`COALESCE(SUM(${characterStats.totalMessages}), 0)`,
        totalRolls: sql<number>`COALESCE(SUM(${characterStats.totalDiceRolls}), 0)`,
        totalNat20s: sql<number>`COALESCE(SUM(${characterStats.nat20Count}), 0)`,
        totalNat1s: sql<number>`COALESCE(SUM(${characterStats.nat1Count}), 0)`,
        totalDamage: sql<number>`COALESCE(SUM(${characterStats.totalDamageDealt}), 0)`
      })
      .from(characterStats)
      .innerJoin(characterSheets, eq(characterStats.characterId, characterSheets.id))
      .where(eq(characterSheets.userId, userId));

    res.json({
      characterCount: Number(totalCharacters[0]?.count || 0),
      totalMessages: Number(totalStats[0]?.totalMessages || 0),
      totalDiceRolls: Number(totalStats[0]?.totalRolls || 0),
      nat20Count: Number(totalStats[0]?.totalNat20s || 0),
      nat1Count: Number(totalStats[0]?.totalNat1s || 0),
      totalDamageDealt: Number(totalStats[0]?.totalDamage || 0)
    });
  } catch (error) {
    console.error('Error fetching overview stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get leaderboard (top characters by various metrics)
router.get('/leaderboard', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const { metric = 'messages', timeframe = 'all' } = req.query;

    // Calculate date threshold based on timeframe
    let dateThreshold: Date | null = null;
    if (timeframe === 'daily') {
      dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - 1);
    } else if (timeframe === 'weekly') {
      dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - 7);
    }

    // Build query based on metric
    let orderByColumn;
    switch (metric) {
      case 'messages':
        orderByColumn = characterStats.totalMessages;
        break;
      case 'rolls':
        orderByColumn = characterStats.totalDiceRolls;
        break;
      case 'nat20s':
        orderByColumn = characterStats.nat20Count;
        break;
      case 'damage':
        orderByColumn = characterStats.totalDamageDealt;
        break;
      default:
        orderByColumn = characterStats.totalMessages;
    }

    const whereConditions = [eq(characterSheets.userId, userId)];
    if (dateThreshold) {
      whereConditions.push(gte(characterStats.lastActive, dateThreshold));
    }

    const leaderboard = await db
      .select({
        characterId: characterSheets.id,
        characterName: characterSheets.name,
        avatarUrl: characterSheets.avatarUrl,
        totalMessages: characterStats.totalMessages,
        totalRolls: characterStats.totalDiceRolls,
        nat20Count: characterStats.nat20Count,
        nat1Count: characterStats.nat1Count,
        totalDamage: characterStats.totalDamageDealt,
        lastActive: characterStats.lastActive
      })
      .from(characterStats)
      .innerJoin(characterSheets, eq(characterStats.characterId, characterSheets.id))
      .where(and(...whereConditions))
      .orderBy(desc(orderByColumn))
      .limit(10);

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get activity timeline
router.get('/activity', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const { characterId, limit = 50 } = req.query;

    const whereConditions = characterId
      ? and(
          eq(characterSheets.userId, userId),
          eq(activityFeed.characterId, Number(characterId))
        )
      : eq(characterSheets.userId, userId);

    const activities = await db
      .select({
        id: activityFeed.id,
        characterId: activityFeed.characterId,
        characterName: characterSheets.name,
        activityType: activityFeed.activityType,
        description: activityFeed.description,
        metadata: activityFeed.metadata,
        timestamp: activityFeed.timestamp
      })
      .from(activityFeed)
      .innerJoin(characterSheets, eq(activityFeed.characterId, characterSheets.id))
      .where(whereConditions)
      .orderBy(desc(activityFeed.timestamp))
      .limit(Number(limit));

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Get character comparison data
router.get('/compare', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;

    const characters = await db
      .select({
        id: characterSheets.id,
        name: characterSheets.name,
        level: characterSheets.level,
        characterClass: characterSheets.characterClass,
        totalMessages: characterStats.totalMessages,
        totalRolls: characterStats.totalDiceRolls,
        nat20Count: characterStats.nat20Count,
        nat1Count: characterStats.nat1Count,
        totalDamage: characterStats.totalDamageDealt,
        // Calculate crit rate
        critRate: sql<number>`CASE
          WHEN ${characterStats.totalDiceRolls} > 0
          THEN ROUND((${characterStats.nat20Count}::numeric / ${characterStats.totalDiceRolls}) * 100, 2)
          ELSE 0
        END`,
        failRate: sql<number>`CASE
          WHEN ${characterStats.totalDiceRolls} > 0
          THEN ROUND((${characterStats.nat1Count}::numeric / ${characterStats.totalDiceRolls}) * 100, 2)
          ELSE 0
        END`
      })
      .from(characterSheets)
      .leftJoin(characterStats, eq(characterSheets.id, characterStats.characterId))
      .where(eq(characterSheets.userId, userId))
      .orderBy(desc(characterStats.totalMessages));

    res.json(characters);
  } catch (error) {
    console.error('Error fetching comparison data:', error);
    res.status(500).json({ error: 'Failed to fetch comparison data' });
  }
});

// Get damage distribution for charts
router.get('/damage-distribution', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const { characterId } = req.query;

    // This would ideally come from individual roll records
    // For now, return aggregate data
    const characters = await db
      .select({
        characterId: characterSheets.id,
        characterName: characterSheets.name,
        totalDamage: characterStats.totalDamageDealt,
        avgDamagePerRoll: sql<number>`CASE
          WHEN ${characterStats.totalDiceRolls} > 0
          THEN ROUND(${characterStats.totalDamageDealt}::numeric / ${characterStats.totalDiceRolls}, 2)
          ELSE 0
        END`
      })
      .from(characterSheets)
      .leftJoin(characterStats, eq(characterSheets.id, characterStats.characterId))
      .where(
        characterId
          ? and(
              eq(characterSheets.userId, userId),
              eq(characterSheets.id, Number(characterId))
            )
          : eq(characterSheets.userId, userId)
      );

    res.json(characters);
  } catch (error) {
    console.error('Error fetching damage distribution:', error);
    res.status(500).json({ error: 'Failed to fetch damage distribution' });
  }
});

export default router;

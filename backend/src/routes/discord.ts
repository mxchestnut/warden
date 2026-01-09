import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { users, characterSheets } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Discord bot authentication - validates Murder credentials and returns user data
router.post('/login', async (req, res) => {
  try {
    const { username, password, discordUserId } = req.body;

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Valid username and password required' });
    }

    if (!discordUserId || typeof discordUserId !== 'string') {
      return res.status(400).json({ error: 'Valid Discord user ID required' });
    }

    // Find user by username
    const [user] = await db.select().from(users).where(eq(users.username, username));

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Link Discord account if not already linked
    if (user.discordUserId !== discordUserId) {
      // Check if this Discord ID is already linked to another account
      const [existingLink] = await db.select()
        .from(users)
        .where(eq(users.discordUserId, discordUserId));

      if (existingLink && existingLink.id !== user.id) {
        return res.status(400).json({
          error: `This Discord account is already linked to another My1e Party account (${existingLink.username})`
        });
      }

      // Link this Discord user to the Murder account
      await db.update(users)
        .set({ discordUserId })
        .where(eq(users.id, user.id));
    }

    // Get user's characters
    const characters = await db.select().from(characterSheets).where(eq(characterSheets.userId, user.id));

    // Return user data (without password)
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        discordUserId: user.discordUserId || discordUserId,
        pathCompanionConnected: !!(user.pathCompanionUsername && user.pathCompanionPassword)
      },
      characters: characters.map(char => ({
        id: char.id,
        name: char.name,
        characterClass: char.characterClass,
        level: char.level,
        race: char.race,
        avatarUrl: char.avatarUrl,
        isPathCompanion: char.isPathCompanion
      }))
    });

  } catch (error) {
    console.error('Discord auth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    res.status(500).json({ error: `Authentication failed: ${errorMessage}` });
  }
});

// Get user by Discord ID (for subsequent requests)
router.get('/user/:discordUserId', async (req, res) => {
  try {
    const { discordUserId } = req.params;

    const [user] = await db.select()
      .from(users)
      .where(eq(users.discordUserId, discordUserId));

    if (!user) {
      return res.status(404).json({ error: 'Discord account not linked to My1e Party' });
    }

    // Get user's characters
    const characters = await db.select().from(characterSheets).where(eq(characterSheets.userId, user.id));

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        pathCompanionConnected: !!(user.pathCompanionUsername && user.pathCompanionPassword)
      },
      characters: characters.map(char => ({
        id: char.id,
        name: char.name,
        characterClass: char.characterClass,
        level: char.level,
        race: char.race,
        avatarUrl: char.avatarUrl,
        isPathCompanion: char.isPathCompanion,
        strength: char.strength,
        dexterity: char.dexterity,
        constitution: char.constitution,
        intelligence: char.intelligence,
        wisdom: char.wisdom,
        charisma: char.charisma,
        currentHp: char.currentHp,
        maxHp: char.maxHp,
        armorClass: char.armorClass,
        fortitudeSave: char.fortitudeSave,
        reflexSave: char.reflexSave,
        willSave: char.willSave,
        skills: char.skills ? JSON.parse(char.skills) : {},
        weapons: char.weapons ? JSON.parse(char.weapons) : [],
        feats: char.feats ? JSON.parse(char.feats) : [],
        spells: char.spells ? JSON.parse(char.spells) : {}
      }))
    });

  } catch (error) {
    console.error('Get Discord user error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

export default router;

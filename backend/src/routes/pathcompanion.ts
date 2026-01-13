import { Router } from 'express';
import { db } from '../db';
import { characterSheets, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth';
import * as PlayFabService from '../services/playfab';
import crypto from 'crypto';

const router = Router();

// Encryption utilities for PathCompanion password (same as in auth.ts)
const ENCRYPTION_KEY = process.env.PATHCOMPANION_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

function decryptPassword(encryptedPassword: string): string {
  const parts = encryptedPassword.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Helper function to refresh PathCompanion session if needed
async function refreshSessionIfNeeded(userId: number): Promise<string> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.pathCompanionUsername || !user.pathCompanionPassword) {
    throw new Error('No PathCompanion account connected. Please connect your PathCompanion account in Settings first.');
  }

  // Try to use existing session ticket first
  if (user.pathCompanionSessionTicket) {
    try {
      // Test if session is still valid
      await PlayFabService.getUserData(user.pathCompanionSessionTicket);
      return user.pathCompanionSessionTicket;
    } catch (error) {
      // Session expired, continue to refresh
    }
  }

  // Session expired or doesn't exist, refresh it
  try {
    const decryptedPassword = decryptPassword(user.pathCompanionPassword);
    const auth = await PlayFabService.loginToPlayFab(user.pathCompanionUsername, decryptedPassword);

    // Update session ticket in database
    await db.update(users)
      .set({ pathCompanionSessionTicket: auth.sessionTicket })
      .where(eq(users.id, userId));

    return auth.sessionTicket;
  } catch (error) {
    console.error(`Failed to refresh session for user ${userId}:`, error);

    // Check if it's a decryption error (encryption key changed)
    if (error instanceof Error && error.message.includes('bad decrypt')) {
      throw new Error('PathCompanion credentials need to be re-entered. Please go to Settings and reconnect your PathCompanion account.');
    }

    throw new Error(`Failed to refresh PathCompanion session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Login endpoint doesn't require Warden auth
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const auth = await PlayFabService.loginToPlayFab(username, password);

    res.json({
      playfabId: auth.playfabId,
      sessionTicket: auth.sessionTicket,
      message: 'Successfully connected to PathCompanion'
    });
  } catch (error) {
    console.error('PathCompanion login error:', error);
    res.status(500).json({
      error: 'Failed to connect to PathCompanion',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get list of characters from connected PathCompanion account
 * GET /api/pathcompanion/characters
 */
router.get('/characters', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;

    // Automatically refresh session if needed
    const sessionTicket = await refreshSessionIfNeeded(user.id);

    // Get user data from PathCompanion
    const userData = await PlayFabService.getUserData(sessionTicket);

    // Filter to character entries (character1-99, gm1-99, shared1-99, portraits, etc.)
    const characterKeys = Object.keys(userData)
      .filter(key =>
        /^character\d+$/.test(key) ||  // character1, character2, etc.
        /^gm\d+$/.test(key) ||          // gm1, gm2, etc.
        /^shared\d+$/.test(key)         // shared1, shared2, etc.
      )
      .slice(0, 50); // Limit to 50 characters to avoid performance issues

    const allItems = await Promise.all(
      characterKeys.map(async (key) => {
        try {
          const char = await PlayFabService.getCharacter(sessionTicket, key);

          // GM characters and shared characters are campaigns
          // character1, character2, etc. are player characters
          const isCampaign = /^(gm|shared)\d+$/i.test(key);

          return {
            id: key,
            name: char?.characterName || key,
            lastModified: userData[key].LastUpdated || null,
            isCampaign
          };
        } catch (err) {
          console.error(`Failed to get name for ${key}:`, err);
          return null;
        }
      })
    );

    // Separate characters and campaigns
    const characterList = allItems.filter(item => item && !item.isCampaign).map(item => ({
      id: item!.id,
      name: item!.name,
      lastModified: item!.lastModified
    }));

    const campaignList = allItems.filter(item => item && item.isCampaign).map(item => ({
      id: item!.id,
      name: item!.name,
      lastModified: item!.lastModified
    }));

    res.json({
      characters: characterList,
      campaigns: campaignList
    });
  } catch (error) {
    console.error('Failed to fetch PathCompanion characters:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: errorMessage.includes('PathCompanion account') ? errorMessage : 'Failed to fetch characters',
      details: errorMessage
    });
  }
});

/**
 * Import a character from a share key
 * POST /api/pathcompanion/character/share
 * Body: { shareKey }
 */
router.post('/character/share', async (req, res) => {
  try {
    const { shareKey } = req.body;

    if (!shareKey) {
      return res.status(400).json({ error: 'Share key required' });
    }

    const character = await PlayFabService.getCharacterFromShareKey(shareKey);
    res.json({ character });
  } catch (error) {
    console.error('Failed to get shared character:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get character' });
  }
});

/**
 * Import a PathCompanion character
 * POST /api/pathcompanion/import
 * Body: { characterId, mergeWithId? } - uses stored PathCompanion session
 * Requires Warden authentication AND PathCompanion account connection
 */
router.post('/import', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user.id;
    const { characterId, mergeWithId } = req.body;

    if (!characterId) {
      return res.status(400).json({ error: 'Character ID is required' });
    }

    // Automatically refresh session if needed
    const sessionTicket = await refreshSessionIfNeeded(user.id);

    // Fetch the character from PathCompanion using session ticket
    const character = await PlayFabService.getCharacter(sessionTicket, characterId);

    if (!character) {
      return res.status(404).json({ error: 'Character not found in PathCompanion' });
    }

    // Extract ability scores
    const abilities = PlayFabService.extractAbilityScores(character.data);
    const level = PlayFabService.extractCharacterLevel(character.data);
    const combatStats = PlayFabService.extractCombatStats(character.data);
    const saves = PlayFabService.extractSavingThrows(character.data);
    const basicInfo = PlayFabService.extractBasicInfo(character.data);
    const skills = PlayFabService.extractSkills(character.data);
    const feats = PlayFabService.extractFeats(character.data);
    const specialAbilities = PlayFabService.extractSpecialAbilities(character.data);
    const weapons = PlayFabService.extractWeapons(character.data);
    const armor = PlayFabService.extractArmor(character.data);
    const spells = PlayFabService.extractSpells(character.data);

    console.log(`Importing character ${character.characterName}:`, {
      level,
      characterClass: basicInfo.characterClass,
      hp: `${combatStats.currentHp}/${combatStats.maxHp}`,
      ac: combatStats.armorClass,
      bab: combatStats.baseAttackBonus
    });

    // Check if this character is already imported by PathCompanion ID
    const existingByPcId = await db.select().from(characterSheets).where(
      eq(characterSheets.pathCompanionId, characterId)
    );

    // Check for duplicate names (case-insensitive)
    const { and, sql } = await import('drizzle-orm');
    const existingByName = await db.select().from(characterSheets).where(
      and(
        eq(characterSheets.userId, userId),
        sql`LOWER(${characterSheets.name}) = LOWER(${character.characterName})`
      )
    );

    console.log(`Import check for "${character.characterName}":`, {
      existingByPcId: existingByPcId.length,
      existingByName: existingByName.length,
      mergeWithId,
      willConflict: existingByPcId.length === 0 && existingByName.length > 0 && !mergeWithId
    });

    // If there's a name conflict and no merge decision, ask the user
    if (existingByPcId.length === 0 && existingByName.length > 0 && !mergeWithId) {
      console.log('Returning 409 conflict for duplicate name');
      return res.status(409).json({
        conflict: true,
        message: `A character named "${character.characterName}" already exists. Would you like to merge the PathCompanion data into it?`,
        existingCharacter: {
          id: existingByName[0].id,
          name: existingByName[0].name,
          level: existingByName[0].level,
          characterClass: existingByName[0].characterClass,
          isPathCompanion: existingByName[0].isPathCompanion
        }
      });
    }

    let targetId = existingByPcId.length > 0 ? existingByPcId[0].id : mergeWithId;

    let sheet;

    if (targetId) {
      // Update existing character (either by PathCompanion ID or merge target)
      [sheet] = await db.update(characterSheets)
        .set({
          name: character.characterName,
          strength: abilities.strength,
          dexterity: abilities.dexterity,
          constitution: abilities.constitution,
          intelligence: abilities.intelligence,
          wisdom: abilities.wisdom,
          charisma: abilities.charisma,
          characterClass: basicInfo.characterClass,
          level: level,
          race: basicInfo.race,
          alignment: basicInfo.alignment,
          deity: basicInfo.deity,
          size: basicInfo.size,
          avatarUrl: basicInfo.avatarUrl,
          currentHp: combatStats.currentHp,
          maxHp: combatStats.maxHp,
          tempHp: combatStats.tempHp,
          armorClass: combatStats.armorClass,
          touchAc: combatStats.touchAc,
          flatFootedAc: combatStats.flatFootedAc,
          initiative: combatStats.initiative,
          speed: combatStats.speed,
          baseAttackBonus: combatStats.baseAttackBonus,
          cmb: combatStats.cmb,
          cmd: combatStats.cmd,
          fortitudeSave: saves.fortitudeSave,
          reflexSave: saves.reflexSave,
          willSave: saves.willSave,
          skills: JSON.stringify(skills),
          feats: JSON.stringify(feats),
          specialAbilities: JSON.stringify(specialAbilities),
          weapons: JSON.stringify(weapons),
          armor: JSON.stringify(armor),
          spells: JSON.stringify(spells),
          isPathCompanion: true,
          pathCompanionId: characterId,
          pathCompanionData: JSON.stringify(character.data),
          pathCompanionSession: user.pathCompanionSessionTicket,
          lastSynced: new Date(),
          updatedAt: new Date()
        })
        .where(eq(characterSheets.id, targetId))
        .returning();
    } else {
      // Create new character
      [sheet] = await db.insert(characterSheets).values({
        userId,
        name: character.characterName,
        strength: abilities.strength,
        dexterity: abilities.dexterity,
        constitution: abilities.constitution,
        intelligence: abilities.intelligence,
        wisdom: abilities.wisdom,
        charisma: abilities.charisma,
        characterClass: basicInfo.characterClass,
        level: level,
        race: basicInfo.race,
        alignment: basicInfo.alignment,
        deity: basicInfo.deity,
        size: basicInfo.size,
        currentHp: combatStats.currentHp,
        maxHp: combatStats.maxHp,
        tempHp: combatStats.tempHp,
        armorClass: combatStats.armorClass,
        touchAc: combatStats.touchAc,
        flatFootedAc: combatStats.flatFootedAc,
        initiative: combatStats.initiative,
        speed: combatStats.speed,
        baseAttackBonus: combatStats.baseAttackBonus,
        cmb: combatStats.cmb,
        cmd: combatStats.cmd,
        fortitudeSave: saves.fortitudeSave,
        reflexSave: saves.reflexSave,
        willSave: saves.willSave,
        skills: JSON.stringify(skills),
        feats: JSON.stringify(feats),
        specialAbilities: JSON.stringify(specialAbilities),
        weapons: JSON.stringify(weapons),
        armor: JSON.stringify(armor),
        spells: JSON.stringify(spells),
        isPathCompanion: true,
        pathCompanionId: characterId,
        pathCompanionData: JSON.stringify(character.data),
        pathCompanionSession: user.pathCompanionSessionTicket,
        lastSynced: new Date()
      }).returning();
    }

    // Add computed modifiers and parse JSON fields
    const sheetWithModifiers = {
      ...sheet,
      skills: sheet.skills ? JSON.parse(sheet.skills) : {},
      weapons: sheet.weapons ? JSON.parse(sheet.weapons) : [],
      armor: sheet.armor ? JSON.parse(sheet.armor) : {},
      feats: sheet.feats ? JSON.parse(sheet.feats) : [],
      specialAbilities: sheet.specialAbilities ? JSON.parse(sheet.specialAbilities) : [],
      spells: sheet.spells ? JSON.parse(sheet.spells) : {},
      modifiers: {
        strength: PlayFabService.calculateModifier(sheet.strength),
        dexterity: PlayFabService.calculateModifier(sheet.dexterity),
        constitution: PlayFabService.calculateModifier(sheet.constitution),
        intelligence: PlayFabService.calculateModifier(sheet.intelligence),
        wisdom: PlayFabService.calculateModifier(sheet.wisdom),
        charisma: PlayFabService.calculateModifier(sheet.charisma)
      },
      isPathCompanion: true
    };

    const wasMerge = mergeWithId && existingByPcId.length === 0;
    const wasUpdate = existingByPcId.length > 0;

    res.status(wasMerge || wasUpdate ? 200 : 201).json({
      ...sheetWithModifiers,
      _meta: {
        action: wasMerge ? 'merged' : (wasUpdate ? 'updated' : 'created'),
        message: wasMerge
          ? `PathCompanion data merged into existing character`
          : (wasUpdate ? `Character synced from PathCompanion` : `New character imported from PathCompanion`)
      }
    });
  } catch (error) {
    console.error('Failed to import PathCompanion character:', error);
    res.status(500).json({
      error: 'Failed to import character',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Import all PathCompanion characters
 * POST /api/pathcompanion/import-all
 * Requires Warden authentication AND PathCompanion account connection
 */
router.post('/import-all', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user.id;

    // Automatically refresh session if needed
    const sessionTicket = await refreshSessionIfNeeded(user.id);

    // Get user data from PathCompanion
    const userData = await PlayFabService.getUserData(sessionTicket);

    // Filter to character entries (character1-99, not gm/shared)
    const characterKeys = Object.keys(userData)
      .filter(key => /^character\d+$/.test(key))
      .slice(0, 50);

    if (characterKeys.length === 0) {
      return res.status(404).json({ error: 'No characters found in PathCompanion' });
    }

    const results = [];
    const errors = [];

    for (const characterId of characterKeys) {
      try {
        const character = await PlayFabService.getCharacter(sessionTicket, characterId);

        if (!character) {
          errors.push({ characterId, error: 'Character not found' });
          continue;
        }

        // Extract ability scores
        const abilities = PlayFabService.extractAbilityScores(character.data);
        const level = PlayFabService.extractCharacterLevel(character.data);
        const combatStats = PlayFabService.extractCombatStats(character.data);
        const saves = PlayFabService.extractSavingThrows(character.data);
        const basicInfo = PlayFabService.extractBasicInfo(character.data);
        const skills = PlayFabService.extractSkills(character.data);
        const feats = PlayFabService.extractFeats(character.data);
        const specialAbilities = PlayFabService.extractSpecialAbilities(character.data);
        const weapons = PlayFabService.extractWeapons(character.data);
        const armor = PlayFabService.extractArmor(character.data);
        const spells = PlayFabService.extractSpells(character.data);

        // Check if this character is already imported
        const existing = await db.select().from(characterSheets).where(
          eq(characterSheets.pathCompanionId, characterId)
        );

        if (existing.length > 0) {
          // Update existing character
          await db.update(characterSheets)
            .set({
              name: character.characterName,
              strength: abilities.strength,
              dexterity: abilities.dexterity,
              constitution: abilities.constitution,
              intelligence: abilities.intelligence,
              wisdom: abilities.wisdom,
              charisma: abilities.charisma,
              characterClass: character.data.class || character.data.className,
              level: level,
              race: basicInfo.race,
              alignment: basicInfo.alignment,
              deity: basicInfo.deity,
              size: basicInfo.size,
              avatarUrl: basicInfo.avatarUrl,
              currentHp: combatStats.currentHp,
              maxHp: combatStats.maxHp,
              tempHp: combatStats.tempHp,
              armorClass: combatStats.armorClass,
              touchAc: combatStats.touchAc,
              flatFootedAc: combatStats.flatFootedAc,
              initiative: combatStats.initiative,
              speed: combatStats.speed,
              baseAttackBonus: combatStats.baseAttackBonus,
              cmb: combatStats.cmb,
              cmd: combatStats.cmd,
              fortitudeSave: saves.fortitudeSave,
              reflexSave: saves.reflexSave,
              willSave: saves.willSave,
              skills: JSON.stringify(skills),
              feats: JSON.stringify(feats),
              specialAbilities: JSON.stringify(specialAbilities),
              weapons: JSON.stringify(weapons),
              armor: JSON.stringify(armor),
              spells: JSON.stringify(spells),
              pathCompanionData: JSON.stringify(character.data),
              pathCompanionSession: user.pathCompanionSessionTicket,
              lastSynced: new Date(),
              updatedAt: new Date()
            })
            .where(eq(characterSheets.id, existing[0].id));

          results.push({ characterId, name: character.characterName, action: 'updated' });
        } else {
          // Create new character
          await db.insert(characterSheets).values({
            userId,
            name: character.characterName,
            strength: abilities.strength,
            dexterity: abilities.dexterity,
            constitution: abilities.constitution,
            intelligence: abilities.intelligence,
            wisdom: abilities.wisdom,
            charisma: abilities.charisma,
            characterClass: character.data.class || character.data.className,
            level: level,
            race: basicInfo.race,
            alignment: basicInfo.alignment,
            deity: basicInfo.deity,
            size: basicInfo.size,
            currentHp: combatStats.currentHp,
            maxHp: combatStats.maxHp,
            tempHp: combatStats.tempHp,
            armorClass: combatStats.armorClass,
            touchAc: combatStats.touchAc,
            flatFootedAc: combatStats.flatFootedAc,
            initiative: combatStats.initiative,
            speed: combatStats.speed,
            baseAttackBonus: combatStats.baseAttackBonus,
            cmb: combatStats.cmb,
            cmd: combatStats.cmd,
            fortitudeSave: saves.fortitudeSave,
            reflexSave: saves.reflexSave,
            willSave: saves.willSave,
            skills: JSON.stringify(skills),
            feats: JSON.stringify(feats),
            specialAbilities: JSON.stringify(specialAbilities),
            weapons: JSON.stringify(weapons),
            armor: JSON.stringify(armor),
            spells: JSON.stringify(spells),
            isPathCompanion: true,
            pathCompanionId: characterId,
            pathCompanionData: JSON.stringify(character.data),
            pathCompanionSession: user.pathCompanionSessionTicket,
            lastSynced: new Date()
          });

          results.push({ characterId, name: character.characterName, action: 'created' });
        }
      } catch (error) {
        console.error(`Failed to import character ${characterId}:`, error);
        errors.push({
          characterId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.status(200).json({
      message: `Imported ${results.length} characters`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Failed to import all PathCompanion characters:', error);
    res.status(500).json({
      error: 'Failed to import characters',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Sync a PathCompanion character (refresh data from PlayFab)
 * POST /api/pathcompanion/sync/:id
 */
router.post('/sync/:id', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user.id;
    const sheetId = parseInt(req.params.id as string);

    // Get the character sheet
    const [sheet] = await db.select().from(characterSheets).where(
      eq(characterSheets.id, sheetId)
    );

    if (!sheet) {
      return res.status(404).json({ error: 'Character sheet not found' });
    }

    if (sheet.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!sheet.isPathCompanion || !sheet.pathCompanionId) {
      return res.status(400).json({ error: 'Not a PathCompanion character' });
    }

    // Automatically refresh session if needed
    const sessionTicket = await refreshSessionIfNeeded(user.id);

    // Fetch fresh data from PathCompanion
    const character = await PlayFabService.getCharacter(
      sessionTicket,
      sheet.pathCompanionId
    );

    if (!character) {
      return res.status(404).json({ error: 'Character not found in PathCompanion' });
    }

    // Extract updated ability scores
    const abilities = PlayFabService.extractAbilityScores(character.data);
    const level = PlayFabService.extractCharacterLevel(character.data);
    const combatStats = PlayFabService.extractCombatStats(character.data);
    const saves = PlayFabService.extractSavingThrows(character.data);
    const basicInfo = PlayFabService.extractBasicInfo(character.data);
    const skills = PlayFabService.extractSkills(character.data);
    const feats = PlayFabService.extractFeats(character.data);
    const specialAbilities = PlayFabService.extractSpecialAbilities(character.data);
    const weapons = PlayFabService.extractWeapons(character.data);
    const armor = PlayFabService.extractArmor(character.data);
    const spells = PlayFabService.extractSpells(character.data);

    // Update the character sheet - ONLY update combat stats, preserve bio/personality
    const [updated] = await db.update(characterSheets)
      .set({
        // Update combat stats and mechanics from PathCompanion
        name: character.characterName,
        strength: abilities.strength,
        dexterity: abilities.dexterity,
        constitution: abilities.constitution,
        intelligence: abilities.intelligence,
        wisdom: abilities.wisdom,
        charisma: abilities.charisma,
        characterClass: character.data.class || character.data.className,
        level: level,
        race: basicInfo.race,
        alignment: basicInfo.alignment,
        deity: basicInfo.deity,
        size: basicInfo.size,
        // Only update avatar if Warden doesn't have a custom one
        ...(sheet.avatarUrl ? {} : { avatarUrl: basicInfo.avatarUrl }),
        currentHp: combatStats.currentHp,
        maxHp: combatStats.maxHp,
        tempHp: combatStats.tempHp,
        armorClass: combatStats.armorClass,
        touchAc: combatStats.touchAc,
        flatFootedAc: combatStats.flatFootedAc,
        initiative: combatStats.initiative,
        speed: combatStats.speed,
        baseAttackBonus: combatStats.baseAttackBonus,
        cmb: combatStats.cmb,
        cmd: combatStats.cmd,
        fortitudeSave: saves.fortitudeSave,
        reflexSave: saves.reflexSave,
        willSave: saves.willSave,
        skills: JSON.stringify(skills),
        feats: JSON.stringify(feats),
        specialAbilities: JSON.stringify(specialAbilities),
        weapons: JSON.stringify(weapons),
        armor: JSON.stringify(armor),
        spells: JSON.stringify(spells),
        pathCompanionData: JSON.stringify(character.data),
        lastSynced: new Date(),
        updatedAt: new Date()
        // NOTE: bio, personality, backstory, appearance, etc. are NOT updated
        // This preserves Warden-specific character development
      })
      .where(eq(characterSheets.id, sheetId))
      .returning();

    const updatedWithModifiers = {
      ...updated,
      skills: updated.skills ? JSON.parse(updated.skills) : {},
      weapons: updated.weapons ? JSON.parse(updated.weapons) : [],
      armor: updated.armor ? JSON.parse(updated.armor) : {},
      feats: updated.feats ? JSON.parse(updated.feats) : [],
      specialAbilities: updated.specialAbilities ? JSON.parse(updated.specialAbilities) : [],
      spells: updated.spells ? JSON.parse(updated.spells) : {},
      modifiers: {
        strength: PlayFabService.calculateModifier(updated.strength),
        dexterity: PlayFabService.calculateModifier(updated.dexterity),
        constitution: PlayFabService.calculateModifier(updated.constitution),
        intelligence: PlayFabService.calculateModifier(updated.intelligence),
        wisdom: PlayFabService.calculateModifier(updated.wisdom),
        charisma: PlayFabService.calculateModifier(updated.charisma)
      }
    };

    res.json(updatedWithModifiers);
  } catch (error) {
    console.error('Failed to sync PathCompanion character:', error);
    res.status(500).json({
      error: 'Failed to sync character',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Import all characters from PathCompanion account
 * POST /api/pathcompanion/import-all
 * Requires Warden authentication AND PathCompanion account connection
 */
router.post('/import-all', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user.id;

    // Check if user has connected PathCompanion account
    if (!user.pathCompanionSessionTicket) {
      return res.status(400).json({
        error: 'No PathCompanion account connected. Please connect your PathCompanion account in Settings first.'
      });
    }

    // Get user data from PathCompanion
    const userData = await PlayFabService.getUserData(user.pathCompanionSessionTicket);

    // Filter to character entries only (exclude campaigns)
    const characterKeys = Object.keys(userData)
      .filter(key => /^character\d+$/.test(key))  // Only character1, character2, etc.
      .slice(0, 50); // Limit to 50 characters

    const results: {
      success: Array<{ id: string; name: string; action: string }>;
      failed: Array<{ id: string; reason: string }>;
    } = {
      success: [],
      failed: []
    };

    // Import each character sequentially to avoid overwhelming the DB
    for (const characterId of characterKeys) {
      try {
        const character = await PlayFabService.getCharacter(user.pathCompanionSessionTicket, characterId);

        if (!character) {
          results.failed.push({ id: characterId, reason: 'Character not found' });
          continue;
        }

        // Extract all data
        const abilities = PlayFabService.extractAbilityScores(character.data);
        const level = PlayFabService.extractCharacterLevel(character.data);
        const combatStats = PlayFabService.extractCombatStats(character.data);
        const saves = PlayFabService.extractSavingThrows(character.data);
        const basicInfo = PlayFabService.extractBasicInfo(character.data);
        const skills = PlayFabService.extractSkills(character.data);
        const feats = PlayFabService.extractFeats(character.data);
        const specialAbilities = PlayFabService.extractSpecialAbilities(character.data);
        const weapons = PlayFabService.extractWeapons(character.data);
        const armor = PlayFabService.extractArmor(character.data);
        const spells = PlayFabService.extractSpells(character.data);

        // Check if character already exists
        const existing = await db.select().from(characterSheets).where(
          eq(characterSheets.pathCompanionId, characterId)
        );

        if (existing.length > 0) {
          // Update existing character
          await db.update(characterSheets)
            .set({
              name: character.characterName,
              strength: abilities.strength,
              dexterity: abilities.dexterity,
              constitution: abilities.constitution,
              intelligence: abilities.intelligence,
              wisdom: abilities.wisdom,
              charisma: abilities.charisma,
              characterClass: character.data.class || character.data.className,
              level: level,
              race: basicInfo.race,
              alignment: basicInfo.alignment,
              deity: basicInfo.deity,
              size: basicInfo.size,
              avatarUrl: basicInfo.avatarUrl,
              currentHp: combatStats.currentHp,
              maxHp: combatStats.maxHp,
              tempHp: combatStats.tempHp,
              armorClass: combatStats.armorClass,
              touchAc: combatStats.touchAc,
              flatFootedAc: combatStats.flatFootedAc,
              initiative: combatStats.initiative,
              speed: combatStats.speed,
              baseAttackBonus: combatStats.baseAttackBonus,
              cmb: combatStats.cmb,
              cmd: combatStats.cmd,
              fortitudeSave: saves.fortitudeSave,
              reflexSave: saves.reflexSave,
              willSave: saves.willSave,
              skills: JSON.stringify(skills),
              feats: JSON.stringify(feats),
              specialAbilities: JSON.stringify(specialAbilities),
              weapons: JSON.stringify(weapons),
              armor: JSON.stringify(armor),
              spells: JSON.stringify(spells),
              pathCompanionData: JSON.stringify(character.data),
              pathCompanionSession: user.pathCompanionSessionTicket,
              lastSynced: new Date(),
              updatedAt: new Date()
            })
            .where(eq(characterSheets.id, existing[0].id));

          results.success.push({ id: characterId, name: character.characterName, action: 'updated' });
        } else {
          // Create new character
          await db.insert(characterSheets).values({
            userId,
            name: character.characterName,
            strength: abilities.strength,
            dexterity: abilities.dexterity,
            constitution: abilities.constitution,
            intelligence: abilities.intelligence,
            wisdom: abilities.wisdom,
            charisma: abilities.charisma,
            characterClass: character.data.class || character.data.className,
            level: level,
            race: basicInfo.race,
            alignment: basicInfo.alignment,
            deity: basicInfo.deity,
            size: basicInfo.size,
            avatarUrl: basicInfo.avatarUrl,
            currentHp: combatStats.currentHp,
            maxHp: combatStats.maxHp,
            tempHp: combatStats.tempHp,
            armorClass: combatStats.armorClass,
            touchAc: combatStats.touchAc,
            flatFootedAc: combatStats.flatFootedAc,
            initiative: combatStats.initiative,
            speed: combatStats.speed,
            baseAttackBonus: combatStats.baseAttackBonus,
            cmb: combatStats.cmb,
            cmd: combatStats.cmd,
            fortitudeSave: saves.fortitudeSave,
            reflexSave: saves.reflexSave,
            willSave: saves.willSave,
            skills: JSON.stringify(skills),
            feats: JSON.stringify(feats),
            specialAbilities: JSON.stringify(specialAbilities),
            weapons: JSON.stringify(weapons),
            armor: JSON.stringify(armor),
            spells: JSON.stringify(spells),
            pathCompanionData: JSON.stringify(character.data),
            pathCompanionSession: user.pathCompanionSessionTicket,
            pathCompanionId: characterId,
            isPathCompanion: true,
            lastSynced: new Date()
          });

          results.success.push({ id: characterId, name: character.characterName, action: 'created' });
        }
      } catch (error) {
        console.error(`Failed to import character ${characterId}:`, error);
        results.failed.push({
          id: characterId,
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json({
      message: `Imported ${results.success.length} characters`,
      success: results.success,
      failed: results.failed
    });
  } catch (error) {
    console.error('Failed to import all characters:', error);
    res.status(500).json({
      error: 'Failed to import characters',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Link an existing Warden character to PathCompanion using a character key
 * POST /api/pathcompanion/link/:id
 * Body: { characterKey }
 */
router.post('/link/:id', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user.id;
    const sheetId = parseInt(req.params.id as string);
    const { characterKey } = req.body;

    if (!characterKey) {
      return res.status(400).json({ error: 'Character key is required' });
    }

    // Get the character sheet
    const [sheet] = await db.select().from(characterSheets).where(
      eq(characterSheets.id, sheetId)
    );

    if (!sheet) {
      return res.status(404).json({ error: 'Character sheet not found' });
    }

    if (sheet.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Decode the character key (it's base64 encoded JSON)
    let keyData;
    try {
      const decoded = Buffer.from(characterKey, 'base64').toString('utf-8');
      keyData = JSON.parse(decoded);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid character key format' });
    }

    if (!keyData.character) {
      return res.status(400).json({ error: 'Invalid character key - missing character ID' });
    }

    // Automatically refresh session if needed
    const sessionTicket = await refreshSessionIfNeeded(user.id);

    // Fetch the character from PathCompanion to verify it exists
    const character = await PlayFabService.getCharacter(sessionTicket, keyData.character);

    if (!character) {
      return res.status(404).json({ error: 'Character not found in PathCompanion' });
    }

    // Link the character but don't overwrite bio/personality fields
    const [updated] = await db.update(characterSheets)
      .set({
        isPathCompanion: true,
        pathCompanionId: keyData.character,
        pathCompanionSession: user.pathCompanionSessionTicket,
        lastSynced: new Date(),
        updatedAt: new Date()
      })
      .where(eq(characterSheets.id, sheetId))
      .returning();

    res.json({
      message: `Successfully linked to PathCompanion character: ${character.characterName}`,
      character: updated,
      pathCompanionName: character.characterName
    });
  } catch (error) {
    console.error('Failed to link PathCompanion character:', error);
    res.status(500).json({
      error: 'Failed to link character',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Export character TO PathCompanion
 * POST /api/pathcompanion/export/:id
 */
router.post('/export/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const sheetId = parseInt(req.params.id as string);
    const user = req.user as any;

    if (!user.pathCompanionSessionTicket) {
      return res.status(400).json({
        error: 'No PathCompanion account connected. Please connect your PathCompanion account in Settings first.'
      });
    }

    // Get the character sheet
    const [sheet] = await db.select().from(characterSheets).where(
      eq(characterSheets.id, sheetId)
    );

    if (!sheet) {
      return res.status(404).json({ error: 'Character sheet not found' });
    }

    if (sheet.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Export character to PathCompanion
    const result = await PlayFabService.exportCharacterToPathCompanion(
      user.pathCompanionSessionTicket,
      sheet.name,
      {
        name: sheet.name,
        race: sheet.race,
        characterClass: sheet.characterClass,
        level: sheet.level,
        alignment: sheet.alignment,
        deity: sheet.deity,
        size: sheet.size,
        avatarUrl: sheet.avatarUrl,
        strength: sheet.strength,
        dexterity: sheet.dexterity,
        constitution: sheet.constitution,
        intelligence: sheet.intelligence,
        wisdom: sheet.wisdom,
        charisma: sheet.charisma,
        currentHp: sheet.currentHp,
        maxHp: sheet.maxHp,
        tempHp: sheet.tempHp,
        armorClass: sheet.armorClass,
        touchAc: sheet.touchAc,
        flatFootedAc: sheet.flatFootedAc,
        initiative: sheet.initiative,
        speed: sheet.speed,
        baseAttackBonus: sheet.baseAttackBonus,
        cmb: sheet.cmb,
        cmd: sheet.cmd,
        fortitudeSave: sheet.fortitudeSave,
        reflexSave: sheet.reflexSave,
        willSave: sheet.willSave,
        skills: sheet.skills,
        feats: sheet.feats,
        specialAbilities: sheet.specialAbilities,
        weapons: sheet.weapons,
        armor: sheet.armor,
        spells: sheet.spells,
      }
    );

    // Update the character sheet to mark it as linked to PathCompanion
    await db.update(characterSheets)
      .set({
        isPathCompanion: true,
        pathCompanionId: result.characterId,
        pathCompanionSession: user.pathCompanionSessionTicket,
        lastSynced: new Date(),
      })
      .where(eq(characterSheets.id, sheetId));

    res.json({
      message: result.message,
      characterId: result.characterId,
    });
  } catch (error) {
    console.error('Failed to export character to PathCompanion:', error);
    res.status(500).json({
      error: 'Failed to export character to PathCompanion',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

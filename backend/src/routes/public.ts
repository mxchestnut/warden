import { Router } from 'express';
import { db } from '../db';
import { characterSheets } from '../db/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Get public character by slug (no auth required)
router.get('/characters/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const character = await db.query.characterSheets.findFirst({
      where: and(
        eq(characterSheets.publicSlug, slug),
        eq(characterSheets.isPublic, true)
      )
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found or not public' });
    }

    // Increment view counter
    await db.update(characterSheets)
      .set({ publicViews: (character.publicViews || 0) + 1 })
      .where(eq(characterSheets.id, character.id));

    // Return character data (excluding sensitive info)
    const publicCharacter = {
      name: character.name,
      fullName: character.fullName,
      species: character.species,
      avatarUrl: character.avatarUrl,
      // Basic identity
      titles: character.titles,
      ageDescription: character.ageDescription,
      culturalBackground: character.culturalBackground,
      pronouns: character.pronouns,
      genderIdentity: character.genderIdentity,
      sexuality: character.sexuality,
      occupation: character.occupation,
      currentLocation: character.currentLocation,
      // Personality
      personalityOneSentence: character.personalityOneSentence,
      keyVirtues: character.keyVirtues,
      keyFlaws: character.keyFlaws,
      // Goals & motivations
      currentGoal: character.currentGoal,
      longTermDesire: character.longTermDesire,
      coreMotivation: character.coreMotivation,
      // Appearance
      physicalPresence: character.physicalPresence,
      identifyingTraits: character.identifyingTraits,
      clothingAesthetic: character.clothingAesthetic,
      // Pathfinder stats (if linked)
      level: character.level,
      characterClass: character.characterClass,
      race: character.race,
      alignment: character.alignment,
      // Public metadata
      publicViews: (character.publicViews || 0) + 1,
      createdAt: character.createdAt
    };

    res.json(publicCharacter);
  } catch (error) {
    console.error('Error fetching public character:', error);
    res.status(500).json({ error: 'Failed to fetch character' });
  }
});

// Get list of all public characters (for discovery)
router.get('/characters', async (req, res) => {
  try {
    const publicCharacters = await db.query.characterSheets.findMany({
      where: eq(characterSheets.isPublic, true),
      columns: {
        name: true,
        fullName: true,
        species: true,
        avatarUrl: true,
        personalityOneSentence: true,
        publicSlug: true,
        publicViews: true,
        createdAt: true
      },
      orderBy: (characterSheets, { desc }) => [desc(characterSheets.publicViews)]
    });

    res.json({ characters: publicCharacters });
  } catch (error) {
    console.error('Error fetching public characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

export default router;

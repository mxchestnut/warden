import PlayFab from 'playfab-sdk/Scripts/PlayFab/PlayFab';
import PlayFabClient from 'playfab-sdk/Scripts/PlayFab/PlayFabClient';
import * as zlib from 'zlib';
import axios from 'axios';
import type {
  PlayFabResult,
  PlayFabError,
  PlayFabCharacterData,
  PlayFabUserDataResult
} from '../types/playfab';

// PathCompanion Title ID (publicly visible)
const TITLE_ID = 'BCA4C';

// Initialize PlayFab
PlayFab.settings.titleId = TITLE_ID;

export interface PathCompanionAuth {
  playfabId: string;
  sessionTicket: string;
  entityToken: string;
}

export interface PathCompanionCharacter {
  characterId: string;
  characterName: string;
  data: PlayFabCharacterData; // The character sheet data from PlayFab
  lastModified: Date;
}

/**
 * Login to PlayFab using username/email and password
 * This gets a session ticket that can be used for subsequent requests
 * Tries username first, then email if username fails
 */
export async function loginToPlayFab(username: string, password: string): Promise<PathCompanionAuth> {
  return new Promise((resolve, reject) => {
    // First try login with username
    const usernameRequest = {
      TitleId: TITLE_ID,
      Username: username,
      Password: password,
      InfoRequestParameters: {
        GetUserAccountInfo: true,
      }
    };

    PlayFabClient.LoginWithPlayFab(usernameRequest, (error: PlayFabError | null, result: PlayFabResult | undefined) => {
      if (error) {
        // If username login fails with "User not found", try email login
        if ((error as any).error === 'AccountNotFound' || (error as any).errorCode === 1001) {
          console.log('Username login failed, trying email login...');

          const emailRequest = {
            TitleId: TITLE_ID,
            Email: username, // Try using the input as email
            Password: password,
            InfoRequestParameters: {
              GetUserAccountInfo: true,
            }
          };

          PlayFabClient.LoginWithEmailAddress(emailRequest, (emailError: PlayFabError | null, emailResult: PlayFabResult | undefined) => {
            if (emailError) {
              console.error('PlayFab email login error:', JSON.stringify(emailError, null, 2));
              const errorMsg = emailError.errorMessage || emailError.error || 'PlayFab login failed';
              reject(new Error(errorMsg));
              return;
            }

            if (!emailResult || !emailResult.data) {
              console.error('PlayFab email login - no result data. Result:', emailResult);
              reject(new Error('No data returned from PlayFab'));
              return;
            }

            console.log('PlayFab email login successful for:', username);
            resolve({
              playfabId: emailResult.data.PlayFabId,
              sessionTicket: emailResult.data.SessionTicket,
              entityToken: emailResult.data.EntityToken?.EntityToken || '',
            });
          });
        } else {
          console.error('PlayFab login error details:', JSON.stringify(error, null, 2));
          const errorMsg = error.errorMessage || error.error || 'PlayFab login failed';
          reject(new Error(errorMsg));
        }
        return;
      }

      if (!result || !result.data) {
        console.error('PlayFab login - no result data. Result:', result);
        reject(new Error('No data returned from PlayFab'));
        return;
      }

      console.log('PlayFab login successful for:', username);
      resolve({
        playfabId: result.data.PlayFabId,
        sessionTicket: result.data.SessionTicket,
        entityToken: result.data.EntityToken?.EntityToken || '',
      });
    });
  });
}

/**
 * Get user data from PlayFab
 * This typically includes character references
 */
export async function getUserData(sessionTicket: string): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    PlayFab.settings.sessionTicket = sessionTicket;

    const request = {
      SessionTicket: sessionTicket,
    };

    PlayFabClient.GetUserData(request, (error: PlayFabError | null, result: PlayFabResult<PlayFabUserDataResult> | undefined) => {
      if (error) {
        console.error('GetUserData error:', JSON.stringify(error, null, 2));
        reject(new Error(error.errorMessage || 'Failed to get user data'));
        return;
      }

      console.log('GetUserData success, data keys:', Object.keys(result?.data?.Data || {}));
      resolve(result?.data?.Data || {});
    });
  });
}

/**
 * Get all characters for a user
 * PathCompanion stores character data in PlayFab's title data or user data
 */
export async function getCharacterFromShareKey(shareKey: string): Promise<PathCompanionCharacter> {
  try {
    // Decode the share key
    const decoded = JSON.parse(Buffer.from(shareKey, 'base64').toString('utf-8'));
    const { account, character } = decoded;

    console.log('Fetching shared character:', { account, character });

    // Use PlayFab Client API with anonymous login to access public data
    // This requires the character to be publicly shared
    return new Promise((resolve, reject) => {
      // First, login anonymously
      PlayFabClient.LoginWithCustomID({
        CustomId: `my1eparty_import_${Date.now()}`,
        CreateAccount: true,
        TitleId: TITLE_ID
      }, (error: any, _result: any) => {
        if (error) {
          console.error('PlayFab anonymous login error:', error);
          return reject(new Error('Failed to authenticate with PathCompanion'));
        }

        // Now try to get the user's public data
        PlayFabClient.GetUserData({
          PlayFabId: account,
          Keys: [character]
        }, (error2: any, result2: any) => {
          if (error2) {
            console.error('PlayFab GetUserData error:', error2);
            return reject(new Error('Character not found or not publicly shared'));
          }

          if (!result2?.data?.Data?.[character]) {
            return reject(new Error('Character not found'));
          }

          try {
            const charValue = result2.data.Data[character];
            const rawValue = charValue.Value;

            // Decompress the character data
            const compressed = Buffer.from(rawValue, 'base64');
            const decompressed = zlib.inflateSync(compressed);
            const charData = JSON.parse(decompressed.toString('utf-8'));

            console.log('Successfully decompressed character:', charData.name || 'Unknown');

            resolve({
              characterId: character,
              characterName: charData.name || charData.characterName || charData.Name || 'Unnamed Character',
              data: charData,
              lastModified: new Date(charValue.LastUpdated || Date.now()),
            });
          } catch (_e) {
            console.error('Failed to decompress character data:', _e);
            reject(new Error('Failed to parse character data'));
          }
        });
      });
    });
  } catch (error) {
    throw new Error(`Invalid share key: ${error}`);
  }
}

/**
 * Get a specific character's data for a given session ticket.
 */
export async function getCharacter(sessionTicket: string, characterId: string): Promise<PathCompanionCharacter | null> {
  try {
    const userData = await getUserData(sessionTicket);

    if (!userData[characterId]) {
      return null;
    }

    // PathCompanion stores character data as base64-encoded gzipped JSON
    const charValue = userData[characterId];
    const compressedData = typeof charValue.Value === 'string'
      ? charValue.Value
      : JSON.stringify(charValue.Value);

    // PathCompanion stores character data as base64-encoded compressed JSON
    const buffer = Buffer.from(compressedData, 'base64');

    return new Promise((resolve, reject) => {
      // Try inflate (deflate compression) instead of gunzip
      zlib.inflate(buffer, (err, decompressed) => {
        let charData;

        if (err) {
          // Try inflateRaw if inflate fails
          zlib.inflateRaw(buffer, (err2, decompressed2) => {
            if (err2) {
              // Try plain JSON as last resort
              try {
                const plainText = buffer.toString('utf8');
                charData = JSON.parse(plainText);
                console.log(`Character ${characterId} parsed as plain JSON (not compressed)`);
                resolve({
                  characterId,
                  characterName: charData.name || charData.characterName || charData.Name || 'Unnamed Character',
                  data: charData,
                  lastModified: new Date(charValue.LastUpdated || Date.now()),
                });
              } catch (parseErr) {
                console.error(`Failed to parse character ${characterId} data:`, {
                  inflateError: err.message,
                  inflateRawError: err2.message,
                  parseError: parseErr,
                  bufferHex: buffer.toString('hex').substring(0, 100)
                });
                reject(new Error('Failed to decompress/parse character data'));
              }
              return;
            }

            // inflateRaw succeeded
            try {
              const decompressedStr = decompressed2.toString('utf8');
              console.log(`Decompressed ${characterId} with inflateRaw:`, decompressedStr.substring(0, 200));
              charData = JSON.parse(decompressedStr);
              resolve({
                characterId,
                characterName: charData.name || charData.characterName || charData.Name || 'Unnamed Character',
                data: charData,
                lastModified: new Date(charValue.LastUpdated || Date.now()),
              });
            } catch (parseErr) {
              console.error(`Failed to parse inflateRaw decompressed ${characterId}:`, parseErr);
              reject(new Error('Failed to parse character data'));
            }
          });
          return;
        }

        // inflate succeeded
        try {
          const decompressedStr = decompressed.toString('utf8');
          console.log(`Decompressed ${characterId} with inflate:`, decompressedStr.substring(0, 200));
          charData = JSON.parse(decompressedStr);

          // Log the full structure to find the name
          console.log(`Full character structure keys for ${characterId}:`, Object.keys(charData));
          if (charData.characterInfo) {
            console.log(`characterInfo keys:`, Object.keys(charData.characterInfo));
            console.log(`characterInfo first 500 chars:`, JSON.stringify(charData.characterInfo).substring(0, 500));
          }

          // Extract character name from PathCompanion structure
          const characterName = charData.characterInfo?.characterName ||
                                charData.campaignName ||  // For GM characters
                                charData.name ||
                                charData.characterName ||
                                charData.Name ||
                                charData.characterInfo?.name ||
                                charData.basicInfo?.name ||
                                characterId;  // Fallback to ID instead of "Unnamed Character"

          console.log(`Extracted character name for ${characterId}: ${characterName}`);

          resolve({
            characterId,
            characterName,
            data: charData,
            lastModified: new Date(charValue.LastUpdated || Date.now()),
          });
        } catch (parseErr) {
          console.error(`Failed to parse inflate decompressed ${characterId}:`, parseErr);
          reject(new Error('Failed to parse character data'));
        }
      });
    });
  } catch (error) {
    throw new Error(`Failed to get character: ${error}`);
  }
}

/**
 * Helper to extract character level from PathCompanion character data
 */
export function extractCharacterLevel(characterData: PlayFabCharacterData): number {
  // Try different possible locations for level data
  if (characterData.characterInfo?.levelInfo) {
    // levelInfo is an object with keys like "1", "2", etc. for each level
    const levels = Object.keys(characterData.characterInfo.levelInfo);
    const numericLevels = levels.map(l => parseInt(l)).filter(l => !isNaN(l));
    if (numericLevels.length > 0) {
      const level = Math.max(...numericLevels);
      console.log(`✓ Extracted character level: ${level} from levelInfo with ${numericLevels.length} levels`);
      return level;
    }
  }

  // Fallback checks
  if (characterData.level !== undefined) {
    console.log(`✓ Extracted character level: ${characterData.level} from characterData.level`);
    return characterData.level;
  }
  if (characterData.characterInfo?.level !== undefined) {
    console.log(`✓ Extracted character level: ${characterData.characterInfo.level} from characterInfo.level`);
    return characterData.characterInfo.level;
  }
  if (characterData.characterLevel !== undefined) {
    console.log(`✓ Extracted character level: ${characterData.characterLevel} from characterLevel`);
    return characterData.characterLevel;
  }

  console.log(`⚠️ Character level not found, defaulting to 1`);
  return 1; // Default to level 1
}

/**
 * Helper to extract ability scores from PathCompanion character data
 * PathCompanion uses Pathfinder 2e, which has the same core abilities as D&D
 */
export function extractAbilityScores(characterData: PlayFabCharacterData) {
  // PathCompanion stores abilities at the root level
  const abilities = characterData.abilities ||
                    characterData.characterInfo?.stats ||
                    characterData.stats ||
                    characterData.abilityScores ||
                    {};

  // Helper to extract score from PathCompanion's complex structure
  const extractScore = (stat: Record<string, any>): number => {
    if (typeof stat === 'number') return stat;
    if (stat?.total !== undefined) return stat.total;
    if (stat?.permanentTotal !== undefined) return stat.permanentTotal;
    if (stat?.value !== undefined) return stat.value;
    return 10; // Default
  };

  return {
    strength: extractScore(abilities.strength || abilities.str),
    dexterity: extractScore(abilities.dexterity || abilities.dex),
    constitution: extractScore(abilities.constitution || abilities.con),
    intelligence: extractScore(abilities.intelligence || abilities.int),
    wisdom: extractScore(abilities.wisdom || abilities.wis),
    charisma: extractScore(abilities.charisma || abilities.cha),
  };
}

/**
 * Calculate ability modifier (same for both D&D and Pathfinder)
 */
export function calculateModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Extract combat stats from PathCompanion character data
 */
export function extractCombatStats(characterData: PlayFabCharacterData) {
  // PathCompanion stores combat data at root level in combat/defense/offense objects
  const combat = characterData.combat || {};
  const defense = characterData.defense || {};
  const offense = characterData.offense || {};

  console.log('=== Extracting Combat Stats ===');
  console.log('Defense HP:', JSON.stringify(defense.hp));
  console.log('Defense AC:', JSON.stringify(defense.ac));
  console.log('Offense BAB:', JSON.stringify(offense.bab));
  console.log('Offense CMB:', JSON.stringify(offense.cmb));
  console.log('Defense CMD:', JSON.stringify(defense.cmd));

  // BAB can be a number or an object with total
  const bab = typeof offense.bab === 'number' ? offense.bab : (offense.bab?.total || 0);

  // HP is in defense.hp
  const currentHp = defense.hp?.current || 0;
  const maxHp = defense.hp?.total || 0;
  const tempHp = defense.hp?.temp || 0;

  // CMB and CMD can be numbers or objects with total property
  let cmb = 0;
  if (typeof offense.cmb === 'number') {
    cmb = offense.cmb;
  } else if (offense.cmb && typeof offense.cmb === 'object') {
    cmb = offense.cmb.total || 0;
  }

  let cmd = 10;
  if (typeof defense.cmd === 'number') {
    cmd = defense.cmd;
  } else if (defense.cmd && typeof defense.cmd === 'object') {
    cmd = defense.cmd.total || 10;
  }

  const stats = {
    currentHp,
    maxHp,
    tempHp,
    armorClass: defense.ac?.total || defense.armorClass || 10,
    touchAc: defense.ac?.touch || defense.touchAc || 10,
    flatFootedAc: defense.ac?.flatFooted || defense.flatFootedAc || 10,
    initiative: offense.initiative?.total || offense.initiative || 0,
    speed: combat.speed?.total || combat.baseSpeed || 30,
    baseAttackBonus: bab,
    cmb,
    cmd,
  };

  console.log('✓ Extracted combat stats:', JSON.stringify(stats));
  return stats;
}

/**
 * Extract saving throws from PathCompanion character data
 */
export function extractSavingThrows(characterData: PlayFabCharacterData) {
  // PathCompanion stores saves in the defense object
  const defense = characterData.defense || {};
  const saves = defense.saves || defense.savingThrows || {};

  return {
    fortitudeSave: saves.fortitude?.total || saves.fort?.total || saves.fortitude || 0,
    reflexSave: saves.reflex?.total || saves.ref?.total || saves.reflex || 0,
    willSave: saves.will?.total || saves.will || 0,
  };
}

/**
 * Extract skills from PathCompanion character data
 */
export function extractSkills(characterData: PlayFabCharacterData) {
  // PathCompanion stores skills at root level
  const skillsData = characterData.skills || {};
  const skills: Record<string, any> = {};

  // PathCompanion stores skills as objects with ranks, modifiers, etc.
  for (const [skillName, skillValue] of Object.entries(skillsData)) {
    if (typeof skillValue === 'object' && skillValue !== null) {
      const skill = skillValue as Record<string, any>;
      skills[skillName] = {
        ranks: skill.ranks || 0,
        total: skill.total || skill.value || 0,
        misc: skill.misc || skill.modifier || 0,
        classSkill: skill.classSkill || false
      };
    }
  }

  console.log(`Extracted ${Object.keys(skills).length} skills`);

  return skills;
}

/**
 * Extract feats from PathCompanion character data
 */
export function extractFeats(characterData: PlayFabCharacterData) {
  const charInfo = characterData.characterInfo || {};
  const feats: string[] = [];

  // PathCompanion stores feats in levelInfo[level].Feats
  if (charInfo.levelInfo) {
    for (const level of Object.keys(charInfo.levelInfo)) {
      const levelData = (charInfo.levelInfo as Record<string, any>)[level];
      if (levelData.Feats && Array.isArray(levelData.Feats)) {
        feats.push(...levelData.Feats.map((feat: Record<string, any> | string) => {
          if (typeof feat === 'string') return feat;
          return feat.name || feat.featName || 'Unknown Feat';
        }));
      }
    }
  }

  return [...new Set(feats)]; // Remove duplicates
}

/**
 * Extract special abilities from PathCompanion character data
 */
export function extractSpecialAbilities(characterData: PlayFabCharacterData) {
  const charInfo = characterData.characterInfo || {};
  const abilities: string[] = [];

  // Check various possible locations for special abilities
  if (charInfo.specialAbilities && Array.isArray(charInfo.specialAbilities)) {
    abilities.push(...charInfo.specialAbilities.map((a: Record<string, any> | string) =>
      typeof a === 'string' ? a : a.name || a.description || 'Unknown Ability'
    ));
  }

  if (charInfo.classAbilities && Array.isArray(charInfo.classAbilities)) {
    abilities.push(...charInfo.classAbilities.map((a: Record<string, any> | string) =>
      typeof a === 'string' ? a : a.name || a.description || 'Unknown Ability'
    ));
  }

  if (charInfo.traits && Array.isArray(charInfo.traits)) {
    abilities.push(...charInfo.traits.map((t: Record<string, any> | string) =>
      typeof t === 'string' ? t : t.name || t.description || 'Unknown Trait'
    ));
  }

  return abilities;
}

/**
 * Extract weapons from PathCompanion character data
 */
export function extractWeapons(characterData: PlayFabCharacterData) {
  const equipment = characterData.equipment || {};
  const offense = characterData.offense || {};
  const weaponsData = equipment.weapons || offense.weapons || [];

  if (!Array.isArray(weaponsData)) return [];

  return weaponsData.map((weapon: Record<string, any>) => ({
    name: weapon.name || weapon.weaponName || weapon.Name || 'Unknown Weapon',
    attackBonus: weapon.attackBonus || weapon.attack || weapon.AttackBonus || 0,
    damage: weapon.damage || weapon.damageRoll || weapon.Damage || '1d6',
    critical: weapon.critical || weapon.crit || weapon.Critical || '×2',
    range: weapon.range || weapon.rangeIncrement || weapon.Range || 0,
    type: weapon.type || weapon.damageType || weapon.Type || 'S',
    notes: weapon.notes || weapon.description || weapon.Notes || ''
  }));
}

/**
 * Extract armor from PathCompanion character data
 */
export function extractArmor(characterData: PlayFabCharacterData) {
  const equipment = characterData.equipment || {};
  const defense = characterData.defense || {};
  const armorData = equipment.armor || defense.armor || {};

  if (typeof armorData !== 'object' || armorData === null) return {};

  return {
    name: armorData.name || armorData.armorName || armorData.Name || 'No Armor',
    acBonus: armorData.acBonus || armorData.bonus || armorData.ACBonus || 0,
    maxDex: armorData.maxDex || armorData.maxDexBonus || armorData.MaxDex || 99,
    checkPenalty: armorData.checkPenalty || armorData.armorCheckPenalty || armorData.CheckPenalty || 0,
    spellFailure: armorData.spellFailure || armorData.arcaneSpellFailure || armorData.SpellFailure || 0,
    type: armorData.type || armorData.Type || 'light'
  };
}

/**
 * Extract spells from PathCompanion character data
 */
export function extractSpells(characterData: PlayFabCharacterData) {
  const spellsData = characterData.spells || {};
  const spells: Record<string, any> = {};

  // PathCompanion might organize spells by level
  for (let level = 0; level <= 9; level++) {
    const levelKey = `level${level}`;
    const levelSpells = spellsData[levelKey] || spellsData[level.toString()] || spellsData[level];
    if (levelSpells && Array.isArray(levelSpells)) {
      spells[level] = levelSpells.map((spell: Record<string, any> | string) =>
        typeof spell === 'string' ? spell : spell.name || spell.spellName || spell.Name || 'Unknown Spell'
      );
    }
  }

  return spells;
}

/**
 * Extract basic character info (race, alignment, deity, size)
 */
export function extractBasicInfo(characterData: PlayFabCharacterData) {
  const charInfo = characterData.characterInfo || {};

  // Extract character classes from levelInfo
  let characterClass = '';
  if (charInfo.levelInfo) {
    const classes: string[] = [];
    for (const level of Object.keys(charInfo.levelInfo)) {
      const levelData = charInfo.levelInfo[level];
      if (levelData.Class && !classes.includes(levelData.Class)) {
        classes.push(levelData.Class);
      }
    }
    characterClass = classes.join(' / ');
  }

  // Fallback to direct class field
  if (!characterClass) {
    characterClass = characterData.class || characterData.className || charInfo.class || charInfo.className || '';
  }

  console.log('=== Extracting Basic Info ===');
  console.log('Character class:', characterClass);
  console.log('Race:', charInfo.race);
  console.log('Alignment:', charInfo.alignment);

  return {
    race: charInfo.race || charInfo.raceName || '',
    alignment: charInfo.alignment || '',
    deity: charInfo.deity || charInfo.god || '',
    size: charInfo.size || 'Medium',
    avatarUrl: charInfo.portrait || charInfo.portraitUrl || charInfo.image || charInfo.avatar || null,
    characterClass
  };
}

/**
 * Extract defensive abilities (DR, SR, resistances, immunities)
 */
export function extractDefensiveAbilities(characterData: PlayFabCharacterData) {
  const defense = characterData.defense || {};

  return {
    damageReduction: defense.dr || [],
    spellResistance: defense.sr?.total || defense.sr || 0,
    resistances: defense.resistances || {},
    immunities: defense.immunities || []
  };
}

/**
 * Extract caster information (caster level, spell DC, concentration)
 */
export function extractCasterInfo(characterData: PlayFabCharacterData) {
  const spells = characterData.spells || {};

  // Caster level is often stored per class
  const casterLevel = spells.casterLevel || spells.CL || 0;

  // Spell DC base (10 + spell level + stat mod) - we'll need to calc stat mod on frontend
  const spellDCBase = spells.dcBase || 10;

  // Concentration bonus
  const concentration = spells.concentration?.total || spells.concentration || 0;

  return {
    casterLevel,
    spellDCBase,
    concentration
  };
}

/**
 * Export character data TO PathCompanion
 */
export async function exportCharacterToPathCompanion(
  sessionTicket: string,
  characterName: string,
  characterData: any
): Promise<{ characterId: string; message: string }> {
  try {
    // Get existing user data to find next available slot
    const userData = await getUserData(sessionTicket);

    // Find next available character slot (character1, character2, etc.)
    let slotNumber = 1;
    while (userData[`character${slotNumber}`] && slotNumber < 100) {
      slotNumber++;
    }

    const characterId = `character${slotNumber}`;

    // Format character data for PathCompanion
    const pathCompanionData = {
      name: characterData.name,
      characterInfo: {
        name: characterData.name,
        race: characterData.race || '',
        characterClass: characterData.characterClass || '',
        level: characterData.level || 1,
        alignment: characterData.alignment || '',
        deity: characterData.deity || '',
        size: characterData.size || 'Medium',
        portrait: characterData.avatarUrl || '',
      },
      abilityScores: {
        Strength: characterData.strength || 10,
        Dexterity: characterData.dexterity || 10,
        Constitution: characterData.constitution || 10,
        Intelligence: characterData.intelligence || 10,
        Wisdom: characterData.wisdom || 10,
        Charisma: characterData.charisma || 10,
      },
      combat: {
        currentHp: characterData.currentHp || characterData.maxHp || 10,
        maxHp: characterData.maxHp || 10,
        tempHp: characterData.tempHp || 0,
        armorClass: characterData.armorClass || 10,
        touchAc: characterData.touchAc || 10,
        flatFootedAc: characterData.flatFootedAc || 10,
        initiative: characterData.initiative || 0,
        speed: characterData.speed || 30,
        baseAttackBonus: characterData.baseAttackBonus || 0,
        cmb: characterData.cmb || 0,
        cmd: characterData.cmd || 10,
      },
      saves: {
        fortitude: characterData.fortitudeSave || 0,
        reflex: characterData.reflexSave || 0,
        will: characterData.willSave || 0,
      },
      skills: characterData.skills || {},
      feats: characterData.feats || [],
      specialAbilities: characterData.specialAbilities || [],
      weapons: characterData.weapons || [],
      armor: characterData.armor || {},
      spells: characterData.spells || {},
    };

    // Update user data in PlayFab
    const response = await axios.post(
      'https://pathcompanion.com/Server/UpdateUserData',
      {
        SessionTicket: sessionTicket,
        Data: {
          [characterId]: JSON.stringify(pathCompanionData),
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.code !== 200) {
      throw new Error(response.data.errorMessage || 'Failed to export character');
    }

    return {
      characterId,
      message: `Character exported successfully to PathCompanion as ${characterId}`,
    };
  } catch (error) {
    console.error('Error exporting character to PathCompanion:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as any;
      if (axiosError.response) {
        throw new Error(axiosError.response.data.errorMessage || 'Failed to export character to PathCompanion');
      }
    }
    throw new Error('Failed to export character to PathCompanion');
  }
}

export default {
  loginToPlayFab,
  getUserData,
  getCharacterFromShareKey,
  getCharacter,
  exportCharacterToPathCompanion,
  extractAbilityScores,
  extractCharacterLevel,
  calculateModifier,
  extractCombatStats,
  extractSavingThrows,
  extractSkills,
  extractFeats,
  extractSpecialAbilities,
  extractWeapons,
  extractArmor,
  extractSpells,
  extractBasicInfo,
  extractDefensiveAbilities,
  extractCasterInfo,
};

import { Client, GatewayIntentBits, Message, EmbedBuilder, Webhook, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Partials } from 'discord.js';
import { db } from '../db';
import { channelCharacterMappings, characterSheets, users, knowledgeBase, characterStats, activityFeed, hallOfFame, gmNotes, gameTime, botSettings, hcList, characterMemories, prompts, tropes, loreEntries, channelLoreTags, characterRelationships } from '../db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import * as PlayFabService from './playfab';
import * as GeminiService from './gemini';
import { learnFromUrl } from './gemini';
import node_crypto from 'node:crypto';
import axios from 'axios';
import { getUserTierFromDiscord } from '../middleware/tier.js';

// Warden - Discord bot for Pathfinder 1E campaigns

// Global guards to persist across module reloads
declare global {
  // Bot client
  var __WARDEN_CLIENT__: Client | null | undefined;
  // Init flag
  var __WARDEN_INIT__: boolean | undefined;
  // Message dedupe set
  var __PROCESSED_MESSAGE_IDS__: Set<string> | undefined;
}

let botClient: Client | null = global.__WARDEN_CLIENT__ ?? null;
const webhookCache = new Map<string, Webhook>(); // channelId -> webhook

// Track initialization to prevent duplicates (persisted globally)
let botInitialized = global.__WARDEN_INIT__ ?? false;

// Normalize string by removing accents and converting to lowercase
function normalizeString(str: string): string {
  return str
    .normalize('NFD') // Decompose combined characters
    .replaceAll(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .toLowerCase()
    .trim();
}

// Check if user has admin permissions
function isAdmin(message: Message): boolean {
  if (!message.member) return false;
  return message.member.permissions.has('Administrator');
}

export function initializeDiscordBot(token: string) {
  // Prevent duplicate initialization with a strong guard
  if (global.__WARDEN_INIT__) {
    return global.__WARDEN_CLIENT__ ?? botClient;
  }

  botInitialized = true;
  global.__WARDEN_INIT__ = true;

  if (!token) {
    console.log(`No Discord bot token provided, skipping bot initialization`);
    return;
  }

  // Prevent re-initialization - destroy old client if exists
  if (botClient) {
    botClient.destroy();
    botClient = null;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Reaction, Partials.Channel],
  });

  // Store the client globally
  botClient = client;
  global.__WARDEN_CLIENT__ = client;

  client.on('ready', () => {
    console.log(`Warden bot logged in as ${client?.user?.tag}`);

    // Start prompt scheduler for RP tier feature
    import('./promptScheduler.js').then(({ startPromptScheduler }) => {
      startPromptScheduler(client as Client);
    }).catch(error => {
      console.error('Failed to start prompt scheduler:', error);
    });
  });

  client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;

    // Per-message dedupe guard to avoid double handling
    if (!global.__PROCESSED_MESSAGE_IDS__) {
      global.__PROCESSED_MESSAGE_IDS__ = new Set<string>();
    }
    const processed = global.__PROCESSED_MESSAGE_IDS__;
    if (processed!.has(message.id)) {
      return;
    }
    processed!.add(message.id);
    // Auto-clean after 10 minutes to avoid unbounded growth
    setTimeout(() => processed!.delete(message.id), 10 * 60 * 1000);

    const content = message.content.trim();
    const isCommand = content.startsWith('!');

    // Cross-restart idempotency: if bot already reacted ✅ to this command message, skip
    if (isCommand) {
      try {
        await message.fetch();
        const alreadyProcessed = message.reactions.cache.some(r => r.emoji.name === '✅' && r.me);
        if (alreadyProcessed) {
          return;
        }
      } catch {}
    }

    // Handle all commands in one unified handler
    await handleCommands(message, content, client);

    // Mark command message as processed to avoid duplicate handling across restarts
    if (isCommand) {
      try { await message.react('✅'); } catch {}
    }
  });

  // Hall of Fame - Star Reaction Handler
  client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;

    // Fetch partial reactions
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Error fetching reaction:', error);
        return;
      }
    }

    // Check if it's a star reaction
    if (reaction.emoji.name === '⭐') {
      await handleStarReaction(reaction);
    }
  });

  botClient.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Error fetching reaction:', error);
        return;
      }
    }

    if (reaction.emoji.name === '⭐') {
      await handleStarReaction(reaction);
    }
  });

  botClient.login(token).catch(error => {
    console.error('Failed to login Warden Discord bot:', error);
  });
}

// ============ UNIFIED COMMAND HANDLER ============
// All commands in one bot with tier-based access control

async function handleCommands(message: Message, content: string, client: Client) {
  // Check for character proxying patterns: "CharName: message" or "!CharName: message"
  const proxyRegex = /^!?([\p{L}\p{N}\s]+):\s*(.+)$/u;
  const proxyMatch = proxyRegex.exec(content);
  if (proxyMatch) {
    const characterName = proxyMatch[1].trim();
    const messageContent = proxyMatch[2];
    await handleProxy(message, characterName, messageContent, client);
    return;
  }

  // Check for name-based rolling: "!CharName stat"
  const nameRollRegex = /^!([\p{L}\p{N}\s]+)\s+(.+)$/u;
  const nameRollMatch = nameRollRegex.exec(content);
  if (nameRollMatch) {
    const potentialName = nameRollMatch[1].trim();
    const potentialStat = nameRollMatch[2].trim();

    // Check if this is a known command first
    const knownCommands = ['setchar', 'char', 'roll', 'help', 'profile', 'connect', 'syncall', 'stats',
      'leaderboard', 'time', 'note', 'npc', 'music', 'hall', 'botset', 'hc', 'weeklyreport',
      'monthlyreport', 'postleaderboard', 'prompt', 'trope', 'promptsettings',
      'ask', 'learn', 'learnurl', 'feat', 'spell', 'memory', 'lore', 'set'];
    const isKnownCommand = knownCommands.includes(potentialName.toLowerCase());

    if (!isKnownCommand) {
      // Check special patterns
      if (potentialStat.toLowerCase() === 'update') {
        await handleCharacterUpdate(message, potentialName);
        return;
      }
      if (potentialStat.toLowerCase() === 'memories') {
        await handleCharacterMemoriesView(message, potentialName);
        return;
      }
      // Check for relationship pattern: !CharName is OtherName's relationship. | Description
      if (potentialStat.toLowerCase().includes(' is ')) {
        const tier = await getUserTierFromDiscord(db, message.author.id);
        if (tier === 'rp') {
          await handleRelationship(message, potentialName, potentialStat);
          return;
        }
      }
      // Try to handle as name-based roll
      const handled = await handleNameRoll(message, potentialName, potentialStat);
      if (handled) return;
    }
  }

  // Standard command handling
  if (!content.startsWith('!')) return;

  const args = content.slice(1).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  try {
    switch (command) {
      // === FREE TIER COMMANDS (Available to everyone) ===

      // Character management
      case 'setchar':
        await handleSetChar(message, args);
        break;
      case 'char':
        await handleShowChar(message);
        break;
      case 'profile':
        await handleProfile(message, args);
        break;
      case 'roll':
        await handleRoll(message, args);
        break;
      case 'connect':
        await handleConnect(message, args);
        break;
      case 'syncall':
        await handleSyncAll(message);
        break;

      // Stats and leaderboards
      case 'stats':
        await handleStats(message, args);
        break;
      case 'leaderboard':
        await handleLeaderboard(message, args);
        break;

      // GM tools
      case 'time':
        await handleTime(message, args);
        break;
      case 'note':
        await handleNote(message, args);
        break;
      case 'npc':
        await handleNPC(message, args);
        break;
      case 'music':
        await handleMusic(message);
        break;
      case 'hall':
        await handleHall(message, args);
        break;
      case 'botset':
        await handleBotSet(message, args);
        break;
      case 'hc':
        await handleHC(message, args);
        break;
      case 'weeklyreport':
        await handleWeeklyReport(message);
        break;
      case 'monthlyreport':
        await handleMonthlyReport(message);
        break;
      case 'postleaderboard':
        await handlePostLeaderboard(message, args);
        break;
      case 'help':
        await handleHelp(message, 'unified');
        break;

      // === RP TIER COMMANDS (Requires Stripe subscription) ===

      // RP Prompts & Tropes
      case 'prompt':
        if (!await checkRpTier(message)) return;
        await handlePrompt(message, args);
        break;
      case 'trope':
        if (!await checkRpTier(message)) return;
        await handleTrope(message, args);
        break;
      case 'promptsettings':
        if (!await checkRpTier(message)) return;
        await handlePromptSettings(message, args);
        break;

      // AI & Knowledge Base
      case 'ask':
        if (!await checkRpTier(message)) return;
        await handleAsk(message, args);
        break;
      case 'learn':
        if (!await checkRpTier(message)) return;
        await handleLearn(message, args);
        break;
      case 'learnurl':
        if (!await checkRpTier(message)) return;
        await handleLearnUrl(message, args);
        break;

      // D&D AI Generation
      case 'feat':
        if (!await checkRpTier(message)) return;
        await handleFeat(message, args);
        break;
      case 'spell':
        if (!await checkRpTier(message)) return;
        await handleSpell(message, args);
        break;

      // Character Memories (AI-enhanced)
      case 'memory':
        if (!await checkRpTier(message)) return;
        await handleMemory(message, args);
        break;

      // World Building Lore (RP tier)
      case 'lore':
        if (!await checkRpTier(message)) return;
        await handleLore(message, args);
        break;
      case 'set':
        if (!await checkRpTier(message)) return;
        await handleSet(message, args);
        break;

      default:
        // Unknown command, no response
        break;
    }
  } catch (error) {
    console.error('Error handling command:', error);
    // Try to reply with error, but catch if message was deleted (e.g., for security in !connect)
    try {
      await message.reply('❌ An error occurred processing your command.');
    } catch (replyError) {
      // Message was deleted or reply failed, silently ignore
      console.log('Could not reply with error message (message may have been deleted)');
    }
  }
}

// Helper function to check RP tier access
async function checkRpTier(message: Message): Promise<boolean> {
  const tier = await getUserTierFromDiscord(db, message.author.id);

  if (tier !== 'rp') {
    await message.reply(
      `⭐ **RP Tier Required**\n\n` +
      `This command requires an RP tier subscription.\n\n` +
      `**Premium Features Include:**\n` +
      `• AI knowledge base (!ask, !learn, !learnurl)\n` +
      `• D&D generation (!feat, !spell)\n` +
      `• RP prompts & tropes\n` +
      `• Character memories\n` +
      `• World building lore (!lore, !set)\n` +
      `• Daily prompt scheduling\n\n` +
      `Upgrade at https://warden.my/settings`
    );
    return false;
  }

  return true;
}



async function handleSetChar(message: Message, args: string[]) {
  if (args.length === 0) {
    await message.reply('Usage: `!setchar <character_name>`\nExample: `!setchar Ogun`');
    return;
  }

  const characterName = args.join(' ');
  const channelId = message.channel.id;
  const guildId = message.guild?.id || '';

  // Find character by name (case-insensitive)
  const { sql } = await import('drizzle-orm');
  const characters = await db
    .select()
    .from(characterSheets)
    .where(sql`LOWER(${characterSheets.name}) = LOWER(${characterName})`);

  if (characters.length === 0) {
    await message.reply(`❌ Character "${characterName}" not found. Check spelling and try again.`);
    return;
  }

  const character = characters[0];

  // Get user info to store mapping
  const userRecords = await db.select().from(users).limit(1);
  if (userRecords.length === 0) {
    await message.reply('❌ No users found in database.');
    return;
  }
  const userId = userRecords[0].id;

  // Check if mapping exists
  const existing = await db
    .select()
    .from(channelCharacterMappings)
    .where(
      and(
        eq(channelCharacterMappings.channelId, channelId),
        eq(channelCharacterMappings.guildId, guildId)
      )
    );

  if (existing.length > 0) {
    // Update existing mapping
    await db
      .update(channelCharacterMappings)
      .set({ characterId: character.id })
      .where(
        and(
          eq(channelCharacterMappings.channelId, channelId),
          eq(channelCharacterMappings.guildId, guildId)
        )
      );
  } else {
    // Create new mapping
    await db.insert(channelCharacterMappings).values({
      channelId,
      guildId,
      characterId: character.id,
      userId,
    });
  }

  await message.reply(`✅ This channel is now linked to **${character.name}**! Rolls from the portal will appear here.`);
}

async function handleShowChar(message: Message) {
  const channelId = message.channel.id;
  const guildId = message.guild?.id || '';

  const mapping = await db
    .select()
    .from(channelCharacterMappings)
    .innerJoin(characterSheets, eq(channelCharacterMappings.characterId, characterSheets.id))
    .where(
      and(
        eq(channelCharacterMappings.channelId, channelId),
        eq(channelCharacterMappings.guildId, guildId)
      )
    );

  if (mapping.length === 0) {
    await message.reply('❌ No character is linked to this channel. Use `!setchar <name>` to link one.');
    return;
  }

  const character = mapping[0].character_sheets;
  await message.reply(`📋 This channel is linked to **${character.name}** (Level ${character.level} ${character.characterClass || 'Character'})`);
}

async function handleProfile(message: Message, args: string[]) {
  let character: any;

  // Get user by Discord ID first
  const [user] = await db.select()
    .from(users)
    .where(eq(users.discordUserId, message.author.id));

  if (!user) {
    await message.reply('❌ **Discord account not linked to My1e Party.**\n\n' +
      '**To link your account:**\n' +
      '1. Use `!connect <username> <password>` in Discord, OR\n' +
      '2. Visit warden.my to create/manage your account');
    return;
  }

  if (args.length > 0) {
    // Profile for a specific character by name (search server's characters)
    const characterName = args.join(' ');
    const normalizedInput = normalizeString(characterName);
    const guildId = message.guild?.id || '';

    // Get all characters that are mapped to this server
    const serverCharacters = await db
      .select({
        character: characterSheets
      })
      .from(channelCharacterMappings)
      .innerJoin(characterSheets, eq(channelCharacterMappings.characterId, characterSheets.id))
      .where(eq(channelCharacterMappings.guildId, guildId));

    // Also include the requesting user's unmapped characters
    const userCharacters = await db
      .select()
      .from(characterSheets)
      .where(eq(characterSheets.userId, user.id));

    // Combine and deduplicate
    const allAvailableCharacters = [
      ...serverCharacters.map(sc => sc.character),
      ...userCharacters
    ].filter((char, index, self) =>
      index === self.findIndex(c => c.id === char.id)
    );

    const matchedCharacters = allAvailableCharacters.filter(char =>
      normalizeString(char.name) === normalizedInput
    );

    if (matchedCharacters.length === 0) {
      await message.reply(`❌ Character "${characterName}" not found in this server or your account.`);
      return;
    }

    character = matchedCharacters[0];
  } else {
    // Profile for channel-linked character
    const channelId = message.channel.id;
    const guildId = message.guild?.id || '';

    const mapping = await db
      .select()
      .from(channelCharacterMappings)
      .innerJoin(characterSheets, eq(channelCharacterMappings.characterId, characterSheets.id))
      .where(
        and(
          eq(channelCharacterMappings.channelId, channelId),
          eq(channelCharacterMappings.guildId, guildId)
        )
      );

    if (mapping.length === 0) {
      await message.reply('❌ No character linked to this channel. Use `!profile <character_name>` or `!setchar <name>` first.');
      return;
    }

    character = mapping[0].character_sheets;
  }

  // Helper to truncate text
  const truncate = (text: string, maxLength: number = 1024): string => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  // Helper to strip HTML tags
  const stripHtml = (text: string): string => {
    if (!text) return text;
    return text.replaceAll(/<[^>]*>/g, '').trim();
  };

  // Helper to parse race field
  const getRaceName = (race: any): string => {
    if (!race) return '';
    if (typeof race === 'string') {
      try {
        const parsed = JSON.parse(race);
        return parsed.name || parsed.race || race;
      } catch {
        return race;
      }
    }
    return race.name || race.race || '';
  };

  // Helper functions to build tab content
  const buildIdentityTab = (embed: EmbedBuilder) => {
    const identityInfo = [];
    if (character.fullName && character.fullName !== character.name) identityInfo.push(`**Full Name:** ${stripHtml(character.fullName)}`);
    if (character.titles) identityInfo.push(`**Titles:** ${stripHtml(character.titles)}`);
    if (character.species) identityInfo.push(`**Species:** ${stripHtml(character.species)}`);
    if (character.race) {
      const raceName = getRaceName(character.race);
      if (raceName) identityInfo.push(`**Race:** ${raceName}`);
    }
    if (character.ageDescription) identityInfo.push(`**Age:** ${stripHtml(character.ageDescription)}`);
    if (character.culturalBackground) identityInfo.push(`**Culture:** ${stripHtml(character.culturalBackground)}`);
    if (character.pronouns) identityInfo.push(`**Pronouns:** ${stripHtml(character.pronouns)}`);
    if (character.genderIdentity) identityInfo.push(`**Gender:** ${stripHtml(character.genderIdentity)}`);
    if (character.sexuality) identityInfo.push(`**Sexuality:** ${stripHtml(character.sexuality)}`);
    if (character.occupation) identityInfo.push(`**Occupation:** ${stripHtml(character.occupation)}`);
    if (character.currentLocation) identityInfo.push(`**Location:** ${stripHtml(character.currentLocation)}`);
    if (character.characterClass) identityInfo.push(`**Class:** ${character.characterClass}`);
    if (character.level) identityInfo.push(`**Level:** ${character.level}`);
    if (identityInfo.length > 0) {
      embed.addFields({ name: '👤 Basic Identity', value: truncate(identityInfo.join('\n')), inline: false });
    }
  };

  const buildCombatTab = (embed: EmbedBuilder) => {
    const statModifier = (stat: number) => {
      const mod = Math.floor((stat - 10) / 2);
      return mod >= 0 ? `+${mod}` : `${mod}`;
    };
    const statsInfo = [
      `**STR:** ${character.strength} (${statModifier(character.strength)})`,
      `**DEX:** ${character.dexterity} (${statModifier(character.dexterity)})`,
      `**CON:** ${character.constitution} (${statModifier(character.constitution)})`,
      `**INT:** ${character.intelligence} (${statModifier(character.intelligence)})`,
      `**WIS:** ${character.wisdom} (${statModifier(character.wisdom)})`,
      `**CHA:** ${character.charisma} (${statModifier(character.charisma)})`
    ];
    embed.addFields({ name: '📊 Ability Scores', value: statsInfo.join(' • '), inline: false });

    const combatInfo = [
      `**HP:** ${character.currentHp || 0}/${character.maxHp || 0}`,
      `**AC:** ${character.armorClass || 10}`,
      `**Initiative:** ${(character.initiative || 0) >= 0 ? '+' : ''}${character.initiative || 0}`,
      `**Speed:** ${character.speed || 30}ft`
    ];
    embed.addFields({ name: '⚔️ Combat Stats', value: combatInfo.join(' • '), inline: false });

    const savesInfo = [
      `**Fortitude:** ${(character.fortitudeSave || 0) >= 0 ? '+' : ''}${character.fortitudeSave || 0}`,
      `**Reflex:** ${(character.reflexSave || 0) >= 0 ? '+' : ''}${character.reflexSave || 0}`,
      `**Will:** ${(character.willSave || 0) >= 0 ? '+' : ''}${character.willSave || 0}`
    ];
    embed.addFields({ name: '🛡️ Saving Throws', value: savesInfo.join(' • '), inline: false });
  };

  const buildGoalsTab = (embed: EmbedBuilder) => {
    const goalsInfo = [];
    if (character.currentGoal) goalsInfo.push(`**Current Goal:** ${stripHtml(character.currentGoal)}`);
    if (character.longTermDesire) goalsInfo.push(`**Long-term Desire:** ${stripHtml(character.longTermDesire)}`);
    if (character.coreMotivation) goalsInfo.push(`**Core Motivation:** ${stripHtml(character.coreMotivation)}`);
    if (character.deepestFear) goalsInfo.push(`**Deepest Fear:** ${stripHtml(character.deepestFear)}`);
    if (character.alignmentTendency) goalsInfo.push(`**Alignment:** ${stripHtml(character.alignmentTendency)}`);
    if (goalsInfo.length > 0) {
      embed.addFields({ name: '🎯 Goals & Motivations', value: truncate(goalsInfo.join('\n')), inline: false });
    }
  };

  const buildPersonalityTab = (embed: EmbedBuilder) => {
    if (character.personalityOneSentence) {
      embed.addFields({ name: '💬 In a Nutshell', value: `*"${stripHtml(character.personalityOneSentence)}"*`, inline: false });
    }

    const personalityInfo = [];
    if (character.keyVirtues) personalityInfo.push(`**Virtues:** ${stripHtml(character.keyVirtues)}`);
    if (character.keyFlaws) personalityInfo.push(`**Flaws:** ${stripHtml(character.keyFlaws)}`);
    if (character.stressBehavior) personalityInfo.push(`**Under Stress:** ${stripHtml(character.stressBehavior)}`);
    if (character.habitsOrTells) personalityInfo.push(`**Habits:** ${stripHtml(character.habitsOrTells)}`);
    if (character.speechStyle) personalityInfo.push(`**Speech:** ${stripHtml(character.speechStyle)}`);
    if (personalityInfo.length > 0) {
      embed.addFields({ name: '😊 Personality Traits', value: truncate(personalityInfo.join('\n')), inline: false });
    }
  };

  const buildAppearanceTab = (embed: EmbedBuilder) => {
    const appearanceInfo = [];
    if (character.physicalPresence) appearanceInfo.push(`**Presence:** ${stripHtml(character.physicalPresence)}`);
    if (character.identifyingTraits) appearanceInfo.push(`**Identifying Traits:** ${stripHtml(character.identifyingTraits)}`);
    if (character.clothingAesthetic) appearanceInfo.push(`**Clothing Style:** ${stripHtml(character.clothingAesthetic)}`);
    if (appearanceInfo.length > 0) {
      embed.addFields({ name: '🎨 Appearance', value: truncate(appearanceInfo.join('\n')), inline: false });
    }
  };

  const buildSkillsTab = (embed: EmbedBuilder) => {
    let skills: any = character.skills;
    if (typeof skills === 'string') {
      try {
        skills = JSON.parse(skills);
      } catch (e) {
        // Silent fail - will show "no data" message
      }
    }
    if (skills && typeof skills === 'object') {
      const trainedSkills = Object.entries(skills)
        .filter(([_, data]: any) => data.ranks > 0 || data.total >= 5)
        .map(([name, data]: any) => `**${name}:** +${data.total}`)
        .join('\n');
      if (trainedSkills) {
        embed.addFields({ name: '📚 Pathfinder Skills', value: truncate(trainedSkills, 1024), inline: false });
      } else {
        embed.addFields({ name: '📚 Pathfinder Skills', value: 'No trained skills recorded', inline: false });
      }
    } else {
      embed.addFields({ name: '📚 Pathfinder Skills', value: 'No skill data available', inline: false });
    }
  };

  const buildAbilitiesTab = (embed: EmbedBuilder) => {
    const abilitiesInfo = [];
    if (character.notableEquipment) abilitiesInfo.push(`**Equipment:** ${stripHtml(character.notableEquipment)}`);
    if (character.skillsReliedOn) abilitiesInfo.push(`**Strengths:** ${stripHtml(character.skillsReliedOn)}`);
    if (character.skillsAvoided) abilitiesInfo.push(`**Weaknesses:** ${stripHtml(character.skillsAvoided)}`);
    if (abilitiesInfo.length > 0) {
      embed.addFields({ name: '⚔️ Abilities & Equipment', value: truncate(abilitiesInfo.join('\n')), inline: false });
    } else {
      embed.addFields({ name: '⚔️ Abilities & Equipment', value: 'No abilities recorded', inline: false });
    }
  };

  const buildBackstoryTab = (embed: EmbedBuilder) => {
    if (character.origin) {
      embed.addFields({ name: '📖 Origin', value: truncate(stripHtml(character.origin), 1024), inline: false });
    }

    const backstoryNotes = [];
    if (character.greatestSuccess) backstoryNotes.push(`**Greatest Success:** ${stripHtml(character.greatestSuccess)}`);
    if (character.greatestFailure) backstoryNotes.push(`**Greatest Failure:** ${stripHtml(character.greatestFailure)}`);
    if (character.regret) backstoryNotes.push(`**Regret:** ${stripHtml(character.regret)}`);
    if (backstoryNotes.length > 0) {
      embed.addFields({ name: '🏆 Defining Moments', value: truncate(backstoryNotes.join('\n\n')), inline: false });
    }
  };

  const buildRelationshipsTab = async (embed: EmbedBuilder) => {
    // Fetch relationships from database
    const relationships = await db.select()
      .from(characterRelationships)
      .where(eq(characterRelationships.characterId, character.id))
      .orderBy(characterRelationships.createdAt);

    if (relationships.length > 0) {
      const relationshipList = relationships.map(rel => {
        let text = `• **${character.name}** is **${rel.relatedCharacterName}'s ${rel.relationshipType}**`;
        if (rel.description) {
          text += `\n  *${rel.description}*`;
        }
        return text;
      }).join('\n\n');

      embed.addFields({ name: '👥 Relationships', value: truncate(relationshipList, 1024), inline: false });
    }

    // Also show character sheet relationships if they exist
    const sheetRelationships = [];
    if (character.importantRelationships) {
      sheetRelationships.push(`**Important:** ${stripHtml(character.importantRelationships)}`);
    }
    if (character.protectedRelationship) {
      sheetRelationships.push(`**Protected:** ${stripHtml(character.protectedRelationship)}`);
    }
    if (character.avoidedRelationship) {
      sheetRelationships.push(`**Avoided:** ${stripHtml(character.avoidedRelationship)}`);
    }

    if (sheetRelationships.length > 0) {
      embed.addFields({ name: '📝 Character Sheet Notes', value: truncate(sheetRelationships.join('\n\n'), 1024), inline: false });
    }

    if (relationships.length === 0 && sheetRelationships.length === 0) {
      embed.addFields({
        name: '👥 Relationships',
        value: `No relationships recorded yet.\n\nAdd one with: \`!${character.name} is <name>'s <relationship>. | <description>\``,
        inline: false
      });
    }
  };

  const buildBeliefsTab = (embed: EmbedBuilder) => {
    if (character.beliefsPhilosophy) {
      embed.addFields({ name: '🧠 Beliefs & Philosophy', value: truncate(stripHtml(character.beliefsPhilosophy), 1024), inline: false });
    }
    if (character.coreBelief) {
      embed.addFields({ name: '💭 Core Belief', value: truncate(stripHtml(character.coreBelief), 1024), inline: false });
    }
  };

  const buildPublicPrivateTab = (embed: EmbedBuilder) => {
    const secretsInfo = [];
    if (character.publicFacade) secretsInfo.push(`**Public Face:** ${stripHtml(character.publicFacade)}`);
    if (character.hiddenAspect) secretsInfo.push(`**Hidden Aspect:** ${stripHtml(character.hiddenAspect)}`);
    if (character.secret) secretsInfo.push(`**Secret:** ${stripHtml(character.secret)}`);
    if (secretsInfo.length > 0) {
      embed.addFields({ name: '👁️ Public vs Private Self', value: truncate(secretsInfo.join('\n\n')), inline: false });
    }
  };

  const buildGrowthTab = (embed: EmbedBuilder) => {
    const arcInfo = [];
    if (character.recentChange) arcInfo.push(`**Recent Change:** ${stripHtml(character.recentChange)}`);
    if (character.potentialChange) arcInfo.push(`**Potential Growth:** ${stripHtml(character.potentialChange)}`);
    if (arcInfo.length > 0) {
      embed.addFields({ name: '📈 Growth & Change', value: truncate(arcInfo.join('\n\n')), inline: false });
    }
  };

  const buildLegacyTab = (embed: EmbedBuilder) => {
    const legacyInfo = [];
    if (character.symbolOrMotif) legacyInfo.push(`**Symbol:** ${stripHtml(character.symbolOrMotif)}`);
    if (character.legacy) legacyInfo.push(`**Legacy:** ${stripHtml(character.legacy)}`);
    if (character.rememberedAs) legacyInfo.push(`**Remembered As:** ${stripHtml(character.rememberedAs)}`);
    if (legacyInfo.length > 0) {
      embed.addFields({ name: '🌟 Legacy & Symbol', value: truncate(legacyInfo.join('\n\n')), inline: false });
    }
  };

  // Function to build embed for each tab
  const buildEmbed = async (tab: string): Promise<EmbedBuilder> => {
    const embed = new EmbedBuilder()
      .setTitle(`${character.name}`)
      .setColor('#6366f1');

    if (character.avatarUrl) {
      const avatarUrl = character.avatarUrl.startsWith('http')
        ? character.avatarUrl
        : `https://warden.my${character.avatarUrl}`;
      embed.setThumbnail(avatarUrl);
    }

    switch (tab) {
      case 'identity': {
        buildIdentityTab(embed);
        break;
      }
      case 'combat': {
        buildCombatTab(embed);
        break;
      }
      case 'goals': {
        buildGoalsTab(embed);
        break;
      }
      case 'personality': {
        buildPersonalityTab(embed);
        break;
      }
      case 'appearance': {
        buildAppearanceTab(embed);
        break;
      }
      case 'skills': {
        buildSkillsTab(embed);
        break;
      }
      case 'abilities': {
        buildAbilitiesTab(embed);
        break;
      }
      case 'backstory': {
        buildBackstoryTab(embed);
        break;
      }
      case 'relationships': {
        await buildRelationshipsTab(embed);
        break;
      }
      case 'beliefs': {
        buildBeliefsTab(embed);
        break;
      }
      case 'public_private': {
        buildPublicPrivateTab(embed);
        break;
      }
      case 'growth': {
        buildGrowthTab(embed);
        break;
      }
      case 'legacy': {
        buildLegacyTab(embed);
        break;
      }
    }

    embed.setFooter({ text: `Use !roll <stat> to roll for ${character.name}` });
    return embed;
  };

  // Create button rows for tabs (Discord allows 5 buttons per row)
  const createButtons1 = (currentTab: string) => {
    return new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('tab_identity')
          .setLabel('Identity')
          .setStyle(currentTab === 'identity' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setEmoji('👤'),
        new ButtonBuilder()
          .setCustomId('tab_combat')
          .setLabel('Combat')
          .setStyle(currentTab === 'combat' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setEmoji('⚔️'),
        new ButtonBuilder()
          .setCustomId('tab_goals')
          .setLabel('Goals')
          .setStyle(currentTab === 'goals' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setEmoji('🎯'),
        new ButtonBuilder()
          .setCustomId('tab_personality')
          .setLabel('Personality')
          .setStyle(currentTab === 'personality' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setEmoji('😊'),
        new ButtonBuilder()
          .setCustomId('tab_appearance')
          .setLabel('Appearance')
          .setStyle(currentTab === 'appearance' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setEmoji('🎨')
      );
  };

  const createButtons2 = (currentTab: string) => {
    return new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('tab_skills')
          .setLabel('Skills')
          .setStyle(currentTab === 'skills' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setEmoji('📚'),
        new ButtonBuilder()
          .setCustomId('tab_abilities')
          .setLabel('Abilities')
          .setStyle(currentTab === 'abilities' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setEmoji('⚔️'),
        new ButtonBuilder()
          .setCustomId('tab_backstory')
          .setLabel('Backstory')
          .setStyle(currentTab === 'backstory' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setEmoji('📖'),
        new ButtonBuilder()
          .setCustomId('tab_relationships')
          .setLabel('Relationships')
          .setStyle(currentTab === 'relationships' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setEmoji('👥'),
        new ButtonBuilder()
          .setCustomId('tab_beliefs')
          .setLabel('Beliefs')
          .setStyle(currentTab === 'beliefs' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setEmoji('🧠')
      );
  };

  const createButtons3 = (currentTab: string) => {
    return new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('tab_public_private')
          .setLabel('Public/Private')
          .setStyle(currentTab === 'public_private' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setEmoji('👁️'),
        new ButtonBuilder()
          .setCustomId('tab_growth')
          .setLabel('Growth')
          .setStyle(currentTab === 'growth' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setEmoji('📈'),
        new ButtonBuilder()
          .setCustomId('tab_legacy')
          .setLabel('Legacy')
          .setStyle(currentTab === 'legacy' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setEmoji('🌟'),
        new ButtonBuilder()
          .setCustomId('refresh_profile')
          .setLabel('Refresh')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🔄')
      );
  };

  // Send initial message
  let currentTab = 'identity';
  const reply = await message.reply({
    embeds: [await buildEmbed(currentTab)],
    components: [createButtons1(currentTab), createButtons2(currentTab), createButtons3(currentTab)]
  });

  // Try to pin the message (requires permissions)
  try {
    await reply.pin();
  } catch (error) {
    // Silently fail if bot doesn't have pin permissions
    console.log('Could not pin profile message - missing permissions');
  }

  // Create collector for button interactions with longer timeout
  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 1800000 // 30 minutes
  });

  collector.on('collect', async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      await interaction.reply({ content: '❌ Only the person who ran !profile can navigate tabs.', ephemeral: true });
      return;
    }

    // Handle refresh button
    if (interaction.customId === 'refresh_profile') {
      await interaction.update({
        embeds: [await buildEmbed(currentTab)],
        components: [createButtons1(currentTab), createButtons2(currentTab), createButtons3(currentTab)]
      });
      return;
    }

    const tabRegex = /^tab_(.+)$/;
    const tabMatch = tabRegex.exec(interaction.customId);
    if (tabMatch) {
      currentTab = tabMatch[1];
      await interaction.update({
        embeds: [await buildEmbed(currentTab)],
        components: [createButtons1(currentTab), createButtons2(currentTab), createButtons3(currentTab)]
      });
    }
  });

  collector.on('end', () => {
    // Disable buttons after timeout
    reply.edit({ components: [] }).catch(() => {});
  });
}

async function handleRoll(message: Message, args: string[]) {
  if (args.length === 0) {
    await message.reply('Usage: `!roll <dice or stat>`\nExamples: `!roll d20`, `!roll 2d6+3`, `!roll strength`, `!roll perception`');
    return;
  }

  const rollParam = args.join(' ').toLowerCase();

  // Check if this is dice notation (e.g., d20, 1d20, 2d6+3, d20+5)
  const dicePattern = /^(\d+)?d(\d+)([+-]\d+)?$/i;
  const diceMatch = rollParam.match(dicePattern);

  if (diceMatch) {
    // Parse dice notation
    const numDice = parseInt(diceMatch[1] || '1'); // Default to 1 if not specified
    const dieSize = parseInt(diceMatch[2]);
    const modifier = diceMatch[3] ? parseInt(diceMatch[3]) : 0;

    if (numDice < 1 || numDice > 100) {
      await message.reply('❌ Number of dice must be between 1 and 100');
      return;
    }

    if (dieSize < 2 || dieSize > 1000) {
      await message.reply('❌ Die size must be between 2 and 1000');
      return;
    }

    // Roll the dice
    const rolls: number[] = [];
    for (let i = 0; i < numDice; i++) {
      rolls.push(Math.floor(Math.random() * dieSize) + 1);
    }

    const rollSum = rolls.reduce((sum, roll) => sum + roll, 0);
    const total = rollSum + modifier;

    // Determine color based on results
    let embedColor = 0x0099ff; // Default blue
    if (numDice === 1) {
      if (rolls[0] === dieSize) embedColor = 0x00ff00; // Max roll
      else if (rolls[0] === 1) embedColor = 0xff0000; // Min roll
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`🎲 Dice Roll`)
      .setDescription(
        `**${numDice}d${dieSize}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''}**\n` +
        `Rolls: [${rolls.join(', ')}]${rolls.length > 1 ? ` = ${rollSum}` : ''}\n` +
        `${modifier !== 0 ? `Modifier: ${modifier > 0 ? '+' : ''}${modifier}\n` : ''}` +
        `**Total: ${total}**`
      )
      .setFooter({ text: `Rolled by ${message.author.username}` })
      .setTimestamp();

    if (numDice === 1) {
      if (rolls[0] === dieSize) {
        embed.addFields({ name: '🎉', value: `Natural ${dieSize}!`, inline: true });
      } else if (rolls[0] === 1) {
        embed.addFields({ name: '💀', value: 'Natural 1!', inline: true });
      }
    }

    await message.reply({ embeds: [embed] });

    return;
  }

  // Otherwise, treat as stat/save/skill roll for linked character
  const channelId = message.channel.id;
  const guildId = message.guild?.id || '';

  // Get linked character
  const mapping = await db
    .select()
    .from(channelCharacterMappings)
    .innerJoin(characterSheets, eq(channelCharacterMappings.characterId, characterSheets.id))
    .where(
      and(
        eq(channelCharacterMappings.channelId, channelId),
        eq(channelCharacterMappings.guildId, guildId)
      )
    );

  if (mapping.length === 0) {
    await message.reply('❌ No character linked to this channel. Use `!setchar <name>` first.');
    return;
  }

  const character = mapping[0].character_sheets;

  // Determine roll type and calculate
  let rollType: string;
  let modifier = 0;
  let rollDescription = '';
  let statName: string;

  // Check if it's an ability score
  const abilityScores = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  if (abilityScores.some(stat => rollParam.includes(stat))) {
    rollType = 'ability';
    const stat = abilityScores.find(s => rollParam.includes(s))!;
    modifier = Math.floor(((character as any)[stat] - 10) / 2);
    rollDescription = `${stat.charAt(0).toUpperCase() + stat.slice(1)} Check`;
    statName = stat;
  }
  // Check if it's a save
  else if (rollParam.includes('fortitude') || rollParam === 'fort') {
    rollType = 'save';
    modifier = character.fortitudeSave || 0;
    rollDescription = 'Fortitude Save';
    statName = 'fortitude';
  } else if (rollParam.includes('reflex') || rollParam === 'ref') {
    rollType = 'save';
    modifier = character.reflexSave || 0;
    rollDescription = 'Reflex Save';
    statName = 'reflex';
  } else if (rollParam.includes('will')) {
    rollType = 'save';
    modifier = character.willSave || 0;
    rollDescription = 'Will Save';
    statName = 'will';
  }
  // Check if it's a skill
  else {
    rollType = 'skill';
    let skills: any = character.skills;

    // Parse skills if they're stored as a JSON string
    if (typeof skills === 'string') {
      try {
        skills = JSON.parse(skills);
      } catch (e) {
        console.error(`[handleRoll] Failed to parse skills for ${character.name}:`, e);
        await message.reply(`❌ ${character.name} has malformed skills data. Please re-sync from PathCompanion.`);
        return;
      }
    }

    if (skills && typeof skills === 'object') {
      const skillKey = Object.keys(skills).find(k => k.toLowerCase().includes(rollParam));
      if (skillKey && skills[skillKey]) {
        modifier = skills[skillKey].total || 0;
        rollDescription = `${skillKey} Check`;
        statName = skillKey;
      } else {
        await message.reply(`❌ Skill "${rollParam}" not found on ${character.name}.`);
        return;
      }
    } else {
      await message.reply(`❌ "${rollParam}" not recognized. Try an ability, save, or skill name.`);
      return;
    }
  }

  // Roll the dice
  const diceRoll = Math.floor(Math.random() * 20) + 1;
  const total = diceRoll + modifier;

  // Determine embed color based on roll
  let embedColor = 0x0099ff; // Default blue
  if (diceRoll === 20) embedColor = 0x00ff00; // Green for nat 20
  else if (diceRoll === 1) embedColor = 0xff0000; // Red for nat 1

  // Create embed
  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(`🎲 ${character.name} - ${rollDescription}`)
    .setDescription(`**${diceRoll}** ${modifier >= 0 ? '+' : ''}${modifier} = **${total}**`)
    .setFooter({ text: `Rolled by ${message.author.username}` })
    .setTimestamp();

  if (diceRoll === 20) {
    embed.addFields({ name: '🎉', value: 'Natural 20!', inline: true });
  } else if (diceRoll === 1) {
    embed.addFields({ name: '💀', value: 'Natural 1!', inline: true });
  }

  await message.reply({ embeds: [embed] });

  // Track stats
  await trackCharacterActivity(
    character.id,
    message.guild?.id || '',
    'roll',
    `Rolled ${rollDescription}: ${total}`,
    {
      diceRoll,
      modifier,
      total,
      stat: statName,
      nat20: diceRoll === 20,
      nat1: diceRoll === 1
    }
  );
}

// Encryption utilities for PathCompanion password
const ENCRYPTION_KEY = process.env.PATHCOMPANION_ENCRYPTION_KEY || node_crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

function encryptPassword(password: string): string {
  const iv = node_crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const cipher = node_crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decryptPassword(encryptedPassword: string): string {
  const parts = encryptedPassword.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted password format');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const decipher = node_crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Automatically refresh PathCompanion session if expired
async function refreshPathCompanionSession(user: any): Promise<string> {
  if (!user.pathCompanionUsername || !user.pathCompanionPassword) {
    throw new Error('No PathCompanion credentials stored. Please use !connect first.');
  }

  console.log(`Auto-refreshing PathCompanion session for user ${user.pathCompanionUsername}`);

  // Decrypt stored password
  const password = decryptPassword(user.pathCompanionPassword);

  // Re-authenticate with PathCompanion
  const auth = await PlayFabService.loginToPlayFab(user.pathCompanionUsername, password);

  // Update session ticket in database
  await db.update(users)
    .set({
      pathCompanionSessionTicket: auth.sessionTicket,
      pathCompanionConnectedAt: new Date()
    })
    .where(eq(users.id, user.id));

  console.log(`Successfully refreshed session for ${user.pathCompanionUsername}`);
  return auth.sessionTicket;
}

async function handleConnect(message: Message, args: string[]) {
  // Delete the message immediately to protect credentials
  await message.delete().catch(() => {});

  if (args.length < 2) {
    await message.author.send('❌ **Usage:** `!connect <username> <password>`\n\n' +
      '⚠️ **Security Note:** This command has been deleted from the channel. Your credentials are only used for authentication.\n\n' +
      '**Example:** `!connect myusername mypassword`\n\n' +
      '🔗 **Linking your Discord account** will allow you to:\n' +
      '• Use all your characters in Discord\n' +
      '• Roll dice with your character stats\n' +
      '• Proxy messages as your characters\n\n' +
      '💡 Don\'t have an account? Create one at https://warden.my');
    return;
  }

  const username = args[0];
  const password = args.slice(1).join(' '); // Allow passwords with spaces

  try {
    // Send a DM to the user for privacy
    await message.author.send('🔐 Connecting to warden.my...');

    // Authenticate with backend
    const API_URL = process.env.API_URL || 'http://localhost:3000';

    const response = await axios.post(`${API_URL}/api/discord/login`, {
      username,
      password,
      discordUserId: message.author.id
    });
    const { user, characters } = response.data;

    await message.author.send('✅ **Successfully connected!**\n\n' +
      `🎭 Account: **${user.username}**\n` +
      `🎲 Characters: **${characters.length}**\n` +
      (user.pathCompanionConnected ? '🔗 PathCompanion: **Connected**\n' : '') +
      '\n**Your available characters:**\n' +
      characters.map((c: any) => `• ${c.name}${c.isPathCompanion ? ' (PathCompanion)' : ''}`).join('\n') +
      '\n\n**Next steps:**\n' +
      '• Use `!setchar <name>` in a channel to link it to a character\n' +
      '• Use `!roll <stat>` to roll dice\n' +
      '• Type `CharName: message` to proxy as that character\n' +
      '• Use `!help` for more commands');

    console.log(`Discord account ${message.author.tag} (${message.author.id}) linked to Warden user: ${username}`);

  } catch (error: any) {
    console.error('Discord connect error:', error);

    let errorMsg = 'Unknown error occurred';
    if (error.response?.data?.error) {
      errorMsg = error.response.data.error;
    } else if (error.message) {
      errorMsg = error.message;
    }

    await message.author.send('❌ **Failed to connect.**\n\n' +
      `Error: ${errorMsg}\n\n` +
      'Please check your username and password and try again.\n\n' +
      '💡 Need help? Visit https://warden.my to manage your account.');
  }
}

async function handleSyncAll(message: Message) {
  await message.reply('🔄 Refreshing your character list...');

  try {
    // Get user by Discord ID
    const [user] = await db.select()
      .from(users)
      .where(eq(users.discordUserId, message.author.id));

    if (!user) {
      await message.reply('❌ **Discord account not linked.**\n\n' +
        '**To link your account:**\n' +
        '1. Use `!connect <username> <password>` in Discord, OR\n' +
        '2. Visit warden.my to create/manage your account\n\n' +
        '💡 Once linked, all your characters will be available!');
      return;
    }

    // Get all characters for this user
    const characters = await db.select()
      .from(characterSheets)
      .where(eq(characterSheets.userId, user.id));

    if (characters.length === 0) {
      await message.reply('ℹ️ **No characters found in your account.**\n\n' +
        '**Create characters:**\n' +
        '• Visit https://warden.my and create a character manually\n' +
        (user.pathCompanionUsername ? '• Or import from PathCompanion in the web portal\n' : '') +
        '\n💡 Characters you create will automatically be available in Discord!');
      return;
    }

    // Build response with character list (limit to avoid Discord's 2000 char limit)
    const MAX_CHARS_TO_SHOW = 25;
    const charsToShow = characters.slice(0, MAX_CHARS_TO_SHOW);
    const charList = charsToShow.map(c =>
      `• **${c.name}** - Level ${c.level} ${c.characterClass || 'Character'}${c.isPathCompanion ? ' (PathCompanion)' : ''}`
    ).join('\n');

    const moreText = characters.length > MAX_CHARS_TO_SHOW
      ? `\n\n...and ${characters.length - MAX_CHARS_TO_SHOW} more! View all at https://warden.my`
      : '';

    await message.reply(`✅ **Synced ${characters.length} character${characters.length !== 1 ? 's' : ''}!**\n\n` +
      charList +
      moreText +
      '\n\n**Usage:**\n' +
      '• `!setchar <name>` - Link a channel to a character\n' +
      '• `!roll <stat>` - Roll dice for your character\n' +
      '• `CharName: message` - Proxy as a character');

  } catch (error) {
    console.error('Discord syncall error:', error);
    await message.reply('❌ Failed to sync characters. Please try again later.');
  }
}

async function handleCharacterUpdate(message: Message, characterName: string) {
  try {
    // Get user by Discord ID
    const [user] = await db.select()
      .from(users)
      .where(eq(users.discordUserId, message.author.id));

    if (!user) {
      await message.reply('❌ **Discord account not linked.**\n\n' +
        'Use `!connect <username> <password>` to link your account first.');
      return;
    }

    // Find the character
    const normalizeString = (str: string) => str.toLowerCase().trim();
    const normalizedInput = normalizeString(characterName);

    const characters = await db.select()
      .from(characterSheets)
      .where(eq(characterSheets.userId, user.id));

    const character = characters.find(c => normalizeString(c.name) === normalizedInput);

    if (!character) {
      await message.reply(`❌ **Character "${characterName}" not found in your account.**\n\n` +
        'Use `!syncall` to see your character list.');
      return;
    }

    // Check if character is linked to PathCompanion
    if (!character.isPathCompanion || !character.pathCompanionId) {
      await message.reply(`❌ **${character.name} is not linked to PathCompanion.**\n\n` +
        'To link this character:\n' +
        '1. Visit https://warden.my\n' +
        '2. Open the character sheet\n' +
        '3. Click the Link icon to connect to PathCompanion');
      return;
    }

    await message.reply(`🔄 **Updating ${character.name} from PathCompanion...**`);

    // Call the sync API
    const axios = require('axios');
    const API_URL = process.env.API_URL || 'http://localhost:3000';

    try {
      const response = await axios.post(
        `${API_URL}/api/characters/${character.id}/sync-pathcompanion`,
        {},
        {
          headers: {
            Cookie: `connect.sid=${character.pathCompanionSession}` // Use stored session
          }
        }
      );

      const updated = response.data;

      await message.reply(`✅ **${updated.name} successfully updated!**\n\n` +
        `**Stats:** Level ${updated.level} ${updated.characterClass || 'Character'}\n` +
        `**HP:** ${updated.currentHp}/${updated.maxHp} • **AC:** ${updated.armorClass}\n` +
        `**Saves:** Fort +${updated.fortitudeSave}, Ref +${updated.reflexSave}, Will +${updated.willSave}\n\n` +
        `*Last synced: ${new Date().toLocaleString()}*`);

    } catch (apiError: any) {
      console.error('Failed to sync PathCompanion character:', apiError);
      const errorMsg = apiError.response?.data?.error || 'Failed to sync character data.';
      await message.reply(`❌ **Update failed:** ${errorMsg}\n\n` +
        'Try reconnecting to PathCompanion at https://warden.my');
    }

  } catch (error) {
    console.error('Discord character update error:', error);
    await message.reply('❌ Failed to update character. Please try again later.');
  }
}

async function handleHelp(message: Message, botType: 'free' | 'premium' | 'unified' = 'unified') {
  if (botType === 'unified') {
    // Write Pretend (unified bot) help
    const embed = new EmbedBuilder()
      .setColor(0xff6b6b)
      .setTitle('✨ Write Pretend Bot Commands')
      .setDescription('Your AI-powered roleplay companion!')
      .addFields(
        { name: '🔗 Account Setup', value: '`!connect <username> <password>` - Link Discord account\n`!syncall` - Refresh character list', inline: false },
        { name: '🎭 Characters', value: '`!CharName <stat>` - Roll for any character\n`CharName: message` - Speak as character\n`!setchar <name>` - Link character to channel\n`!profile [name]` - View character profile', inline: false },
        { name: '🎲 Dice & Stats', value: '`!roll <dice>` - Roll dice (e.g., !roll 1d20+5)\n`!stats [character]` - View character stats\n`!leaderboard <type>` - View leaderboards', inline: false },
        { name: '⭐ Hall of Fame', value: 'React with ⭐ to messages (10+ stars → Hall of Fame!)\n`!hall` - Recent Hall of Fame\n`!hall top` - Top 20 starred messages', inline: false },
        { name: '🛠️ GM Tools', value: '`!time [set <date>]` - Game time tracking\n`!note <add|list>` - GM notes\n`!hc <text|list|edit|delete>` - HC list\n`!npc <name>` - Generate quick NPC\n`!music` - Mood music suggestion', inline: false },
        { name: '⭐ RP Tier Features', value: '`!prompt` - Get RP prompts\n`!trope` - Get story tropes\n`!ask <question>` - AI knowledge base\n`!learn <info>` - Teach the AI\n`!learnurl <url>` - Learn from webpages\n`!feat/!spell <name>` - D&D lookups\n`!memory` - Character memories\n`!lore <note> <tag>` - World building notes\n`!set <tag>` - Link channel to lore tag\n*Requires RP tier subscription at warden.my*', inline: false },
        { name: '⚙️ Admin', value: '`!botset` - Set bot announcement channel', inline: false }
      )
      .setFooter({ text: 'Visit warden.my to manage characters and upgrade to RP tier!' });

    await message.reply({ embeds: [embed] });
  }
}

async function handleProxy(message: Message, characterName: string, messageText: string, botClient: Client) {
  try {
    // Find character by name (fuzzy matching - normalize accents)
    const normalizedInput = normalizeString(characterName);

    // Get all characters and filter in JavaScript for fuzzy matching
    const allCharacters = await db
      .select()
      .from(characterSheets);

    const matchedCharacters = allCharacters.filter(char =>
      normalizeString(char.name) === normalizedInput
    );

    if (matchedCharacters.length === 0) {
      // Silently ignore if character not found (might just be regular text)
      return;
    }

    const character = matchedCharacters[0];
    const channel = message.channel;

    // Work in text channels, news channels, and threads (including forum posts)
    if (!('send' in channel)) {
      return;
    }

    // For threads, get the parent channel for webhooks
    const webhookChannel = channel.isThread() ? channel.parent : channel;

    if (!webhookChannel || !('fetchWebhooks' in webhookChannel)) {
      console.error('Channel does not support webhooks');
      return;
    }

    // Determine webhook name based on bot
    const webhookName = 'Write Pretend Proxy';

    // Get or create webhook for this channel
    let webhook: Webhook | undefined;

    // Check if a webhook already exists
    const webhooks = await webhookChannel.fetchWebhooks();

    // Clean up any Write Pretend Proxy webhooks (no longer used)
    const writePretendWebhooks = webhooks.filter(wh => wh.name === 'Write Pretend Proxy');
    for (const oldWebhook of writePretendWebhooks.values()) {
      await oldWebhook.delete('Write Pretend no longer handles proxying').catch(() => {});
    }

    // Find existing webhook for this bot
    webhook = webhooks.find((wh: Webhook) => wh.owner?.id === botClient.user?.id && wh.name === webhookName);

    if (!webhook) {
      // Create new webhook
      webhook = await webhookChannel.createWebhook({
        name: webhookName,
        reason: `Character proxying for ${webhookName.replace(' Proxy', '')}`
      });
    }

    // Delete the original message
    await message.delete().catch(() => {});

    // Convert relative avatar URL to absolute URL
    let avatarUrl = character.avatarUrl;

    if (avatarUrl && avatarUrl.startsWith('/')) {
      // Relative URL, make it absolute
      const baseUrl = process.env.FRONTEND_URL || 'http://54.242.214.56';
      avatarUrl = baseUrl + avatarUrl;
    } else if (!avatarUrl) {
      // No avatar, use default
      avatarUrl = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(character.name) + '&size=256&background=random';
    }

    try {
      const webhookOptions: any = {
        content: messageText,
        username: character.name,
        avatarURL: avatarUrl
      };

      // If we're in a thread, specify the thread ID
      if (channel.isThread()) {
        webhookOptions.threadId = channel.id;
      }

      await webhook.send(webhookOptions);

      // Track stats
      await trackCharacterActivity(
        character.id,
        message.guild?.id || '',
        'message',
        `Sent message in ${(channel as any).name || 'thread'}`,
        {
          messageLength: messageText.length,
          channelId: channel.id
        }
      );

    } catch (webhookError: any) {
      // If webhook fails (e.g., Unknown Webhook error), fetch fresh webhook and retry once
      if (webhookError.code === 10015) {

        if (!('fetchWebhooks' in webhookChannel)) {
          throw new Error('Channel does not support webhooks');
        }

        // Fetch fresh webhook
        const webhooks = await webhookChannel.fetchWebhooks();
        webhook = webhooks.find((wh: Webhook) => wh.owner?.id === botClient.user?.id && wh.name === webhookName);

        if (!webhook) {
          webhook = await webhookChannel.createWebhook({
            name: webhookName,
            reason: `Character proxying for ${webhookName.replace(' Proxy', '')}`
          });
        }

        // Retry send
        const retryOptions: any = {
          content: messageText,
          username: character.name,
          avatarURL: avatarUrl
        };

        if (channel.isThread()) {
          retryOptions.threadId = channel.id;
        }

        await webhook.send(retryOptions);
      } else {
        throw webhookError;
      }
    }

  } catch (error) {
    console.error('Error in handleProxy:', error);
  }
}

async function handleNameRoll(message: Message, characterName: string, rollParam: string): Promise<boolean> {
  try {
    // Find character by name (fuzzy matching - normalize accents)
    const normalizedInput = normalizeString(characterName);

    // Get all characters and filter in JavaScript for fuzzy matching
    const allCharacters = await db
      .select()
      .from(characterSheets);

    const matchedCharacters = allCharacters.filter(char =>
      normalizeString(char.name) === normalizedInput
    );

    if (matchedCharacters.length === 0) {
      return false; // Not a character name
    }

    const character = matchedCharacters[0];

    // Determine roll type and calculate
    let rollType = 'ability';
    let modifier = 0;
    let rollDescription = '';
    let statName = rollParam.toLowerCase();

    // Check if it's an ability score
    const abilityScores = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    const matchedAbility = abilityScores.find(stat => statName.includes(stat));

    if (matchedAbility) {
      modifier = Math.floor(((character as any)[matchedAbility] - 10) / 2);
      rollDescription = `${matchedAbility.charAt(0).toUpperCase() + matchedAbility.slice(1)} Check`;
    }
    // Check if it's a save
    else if (statName.includes('fortitude') || statName === 'fort') {
      rollType = 'save';
      modifier = character.fortitudeSave || 0;
      rollDescription = 'Fortitude Save';
    } else if (statName.includes('reflex') || statName === 'ref') {
      rollType = 'save';
      modifier = character.reflexSave || 0;
      rollDescription = 'Reflex Save';
    } else if (statName.includes('will')) {
      rollType = 'save';
      modifier = character.willSave || 0;
      rollDescription = 'Will Save';
    }
    // Check if it's a skill
    else {
      rollType = 'skill';
      let skills = character.skills as any;

      // Parse skills if they're stored as a JSON string
      if (typeof skills === 'string') {
        try {
          skills = JSON.parse(skills);
        } catch (e) {
          console.error(`[handleNameRoll] Failed to parse skills for ${character.name}:`, e);
          await message.reply(`❌ ${character.name} has malformed skills data. Please re-sync from PathCompanion.`);
          return true;
        }
      }

      console.log(`[handleNameRoll] Character: ${character.name}, Skills type: ${typeof skills}, Skills:`, skills);

      if (skills && typeof skills === 'object' && Object.keys(skills).length > 0) {
        // Try exact match first, then partial match
        let skillKey = Object.keys(skills).find(k => k.toLowerCase() === statName);
        if (!skillKey) {
          // Try partial match - check if the search term is in the skill name
          skillKey = Object.keys(skills).find(k => k.toLowerCase().includes(statName));
        }
        if (!skillKey) {
          // Try reverse - check if skill name starts with search term
          skillKey = Object.keys(skills).find(k => statName.includes(k.toLowerCase()));
        }

        console.log(`[handleNameRoll] Skill search for "${statName}", found: ${skillKey}`);

        if (skillKey && skills[skillKey]) {
          modifier = skills[skillKey].total || 0;
          rollDescription = `${skillKey} Check`;
        } else {
          await message.reply(`❌ Skill "${rollParam}" not found on ${character.name}. Available skills: ${Object.keys(skills).join(', ')}`);
          return true;
        }
      } else {
        await message.reply(`❌ ${character.name} has no skills configured. Please import from PathCompanion or manually add skills.`);
        return true;
      }
    }

    // Roll the dice
    const diceRoll = Math.floor(Math.random() * 20) + 1;
    const total = diceRoll + modifier;

    // Determine embed color
    let embedColor = 0x0099ff;
    if (diceRoll === 20) embedColor = 0x00ff00;
    else if (diceRoll === 1) embedColor = 0xff0000;

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`🎲 ${character.name} - ${rollDescription}`)
      .setDescription(`**${diceRoll}** ${modifier >= 0 ? '+' : ''}${modifier} = **${total}**`)
      .setFooter({ text: `Rolled by ${message.author.username}` })
      .setTimestamp();

    if (diceRoll === 20) {
      embed.addFields({ name: '🎉', value: 'Natural 20!', inline: true });
    } else if (diceRoll === 1) {
      embed.addFields({ name: '💀', value: 'Natural 1!', inline: true });
    }

    await message.reply({ embeds: [embed] });

    // Track the roll in character stats
    await trackCharacterActivity(
      character.id,
      message.guild?.id || '',
      'roll',
      `Rolled ${rollDescription} in #${message.channel && 'name' in message.channel ? message.channel.name : 'unknown'}`,
      {
        type: rollType,
        stat: rollDescription,
        roll: diceRoll,
        modifier: modifier,
        total: total,
        nat20: diceRoll === 20,
        nat1: diceRoll === 1,
        channelId: message.channelId
      }
    );

    return true;

  } catch (error) {
    console.error('Error in handleNameRoll:', error);
    return false;
  }
}


export async function sendRollToDiscord(characterId: number, rollData: any) {
  console.log(`[sendRollToDiscord] Called for character ${characterId}`, rollData);

  if (!botClient) {
    console.log('[sendRollToDiscord] Discord bot not initialized');
    return false;
  }

  // Find all channels linked to this character
  const mappings = await db
    .select()
    .from(channelCharacterMappings)
    .innerJoin(characterSheets, eq(channelCharacterMappings.characterId, characterSheets.id))
    .where(eq(channelCharacterMappings.characterId, characterId));

  console.log(`[sendRollToDiscord] Found ${mappings.length} channel mappings for character ${characterId}`);

  if (mappings.length === 0) {
    console.log(`[sendRollToDiscord] No channels linked to character ${characterId}`);
    return false;
  }

  const character = mappings[0].character_sheets;
  let sentCount = 0;

  for (const mapping of mappings) {
    console.log(`[sendRollToDiscord] Attempting to send to channel ${mapping.channel_character_mappings.channelId}`);
    try {
      const channel = await botClient.channels.fetch(mapping.channel_character_mappings.channelId);
      if (channel && channel.isTextBased() && 'send' in channel) {
        // Determine embed color
        let embedColor = 0x0099ff;
        if (rollData.diceRoll === 20) embedColor = 0x00ff00;
        else if (rollData.diceRoll === 1) embedColor = 0xff0000;

        const embed = new EmbedBuilder()
          .setColor(embedColor)
          .setTitle(`🎲 ${character.name} - ${rollData.rollDescription}`)
          .setDescription(`**${rollData.diceRoll}** ${rollData.modifier >= 0 ? '+' : ''}${rollData.modifier} = **${rollData.total}**`)
          .setFooter({ text: 'Rolled from warden.my' })
          .setTimestamp();

        if (rollData.diceRoll === 20) {
          embed.addFields({ name: '🎉', value: 'Natural 20!', inline: true });
        } else if (rollData.diceRoll === 1) {
          embed.addFields({ name: '💀', value: 'Natural 1!', inline: true });
        }

        console.log(`[sendRollToDiscord] Sending embed to channel ${mapping.channel_character_mappings.channelId}`);
        await channel.send({ embeds: [embed] });
        console.log(`[sendRollToDiscord] Successfully sent to channel`);
        sentCount++;
      } else {
        console.log(`[sendRollToDiscord] Channel not text-based or cannot send messages`);
      }
    } catch (error) {
      console.error(`[sendRollToDiscord] Failed to send roll to channel ${mapping.channel_character_mappings.channelId}:`, error);
    }
  }

  console.log(`[sendRollToDiscord] Sent to ${sentCount} channels`);
  return sentCount > 0;
}

// AI FAQ System

async function handleAsk(message: Message, args: string[]) {
  if (args.length === 0) {
    await message.reply('Usage: `!ask <question>`\nExample: `!ask How does sneak attack work?`');
    return;
  }

  const question = args.join(' ');
  const guildId = message.guild?.id;

  if (!guildId) {
    await message.reply('❌ This command can only be used in a server, not in DMs.');
    return;
  }

  try {
    // First, search THIS server's knowledge base
    const searchResults = await db.select()
      .from(knowledgeBase)
      .where(and(
        eq(knowledgeBase.guildId, guildId),
        sql`LOWER(${knowledgeBase.question}) LIKE LOWER(${'%' + question + '%'})`
      ))
      .limit(1);

    if (searchResults.length > 0) {
      const kb = searchResults[0];

      // Truncate if too long for Discord embed
      const truncatedAnswer = kb.answer.length > 4000
        ? kb.answer.substring(0, 3997) + '...'
        : kb.answer;

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('📚 Knowledge Base')
        .setDescription(truncatedAnswer)
        .addFields(
          { name: 'Question', value: kb.question, inline: false },
          { name: 'Source', value: kb.aiGenerated ? '🤖 AI Generated' : (kb.sourceUrl || 'Manual Entry'), inline: true }
        )
        .setFooter({ text: `👍 ${kb.upvotes || 0} upvotes • React ⭐ to save AI answers` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      return;
    }

    // If not in KB, ask AI
    if ('sendTyping' in message.channel) {
      await message.channel.sendTyping();
    }
    const answer = await GeminiService.askGemini(question);

    // Truncate if too long for Discord embed (max 4096 chars)
    const truncatedAnswer = answer.length > 4000
      ? answer.substring(0, 3997) + '...'
      : answer;

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('🤖 AI Answer')
      .setDescription(truncatedAnswer)
      .addFields({ name: 'Question', value: question, inline: false })
      .setFooter({ text: 'React ⭐ to save this to knowledge base' })
      .setTimestamp();

    const reply = await message.reply({ embeds: [embed] });

    // Add star reaction for saving
    await reply.react('⭐');

    // Listen for star reaction to save to KB
    const filter = (reaction: any, user: any) => {
      return reaction.emoji.name === '⭐' && !user.bot;
    };

    const collector = reply.createReactionCollector({ filter, time: 60000, max: 1 });

    collector.on('collect', async () => {
      try {
        await db.insert(knowledgeBase).values({
          guildId,
          question,
          answer,
          aiGenerated: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        await message.reply('✅ Saved to this server\'s knowledge base!');
      } catch (error) {
        console.error('Error saving to knowledge base:', error);
      }
    });

  } catch (error) {
    console.error('Error in !ask command:', error);
    await message.reply('❌ Sorry, I encountered an error answering that question.');
  }
}

async function handleLearn(message: Message, args: string[]) {
  // Check if user has admin permissions
  if (!message.member?.permissions.has('Administrator')) {
    await message.reply('❌ Only administrators can add knowledge base entries.');
    return;
  }

  const guildId = message.guild?.id;
  if (!guildId) {
    await message.reply('❌ This command can only be used in a server, not in DMs.');
    return;
  }

  const fullText = args.join(' ');
  const parts = fullText.split('|').map(p => p.trim());

  if (parts.length < 2 || parts.length > 3) {
    await message.reply(
      'Usage: `!learn <question> | <answer> [| <category>]`\n' +
      'Example: `!learn What is AC? | Armor Class is your defense rating`\n' +
      'With category: `!learn Fireball | 3rd-level evocation spell... | spell`\n' +
      'Categories: `kink`, `feat`, `spell`, or leave blank for general'
    );
    return;
  }

  const [question, answer, category] = parts;

  try {
    await db.insert(knowledgeBase).values({
      guildId,
      question,
      answer,
      category: category || null,
      aiGenerated: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const categoryTag = category ? ` [${category.toUpperCase()}]` : '';
    await message.reply(`✅ Added to this server's knowledge base!${categoryTag}\n**Q:** ${question}\n**A:** ${answer.substring(0, 200)}${answer.length > 200 ? '...' : ''}`);
  } catch (error) {
    console.error('Error in !learn command:', error);
    await message.reply('❌ Failed to add to knowledge base.');
  }
}

async function handleLearnUrl(message: Message, args: string[]) {
  // Check if user has admin permissions
  if (!message.member?.permissions.has('Administrator')) {
    await message.reply('❌ Only administrators can use this command.');
    return;
  }

  const guildId = message.guild?.id;
  if (!guildId) {
    await message.reply('❌ This command can only be used in a server, not in DMs.');
    return;
  }

  if (args.length === 0) {
    await message.reply(
      'Usage: `!learnurl <url> [category]`\n' +
      'Example: `!learnurl <https://www.d20pfsrd.com/feats/combat-feats/power-attack-combat/> feat`\n' +
      'Supported sites: d20pfsrd.com and most standard web pages\n' +
      'Categories: `kink`, `feat`, `spell`, or leave blank for general'
    );
    return;
  }

  // Discord suppresses auto-linking with <URL>, so strip the angle brackets
  let url = args[0];
  if (url && url.startsWith('<') && url.endsWith('>')) {
    url = url.slice(1, -1);
  }

  const category = args[1] || null;

  // Validate URL
  try {
    new URL(url);
  } catch {
    await message.reply('❌ Invalid URL. Please provide a valid URL.');
    return;
  }

  await message.reply(`⏳ Learning from ${url}... This may take a few moments.`);

  try {
    const entries = await learnFromUrl(url);

    if (entries.length === 0) {
      await message.reply('❌ Could not extract any information from that URL. The site may be blocking scraping, the page structure is not supported, or there was a connection error. Check the server logs for details.');
      return;
    }

    // Insert all entries into knowledge base
    let successCount = 0;
    for (const entry of entries) {
      try {
        await db.insert(knowledgeBase).values({
          guildId,
          question: entry.question,
          answer: entry.answer,
          category: category,
          aiGenerated: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        successCount++;
      } catch (error) {
        console.error('Error inserting entry:', error);
      }
    }

    const categoryTag = category ? ` to category [${category.toUpperCase()}]` : '';
    await message.reply(`✅ Added **${successCount}** entries${categoryTag} to this server's knowledge base from ${url}!\nTry asking me about it with \`!ask\``);
  } catch (error) {
    console.error('Error in !learnurl command:', error);
    await message.reply('❌ Failed to learn from that URL. The site may be blocking scraping or the page structure is not supported.');
  }
}

// Generic knowledge lookup function with AI fallback
async function handleKnowledgeLookup(message: Message, args: string[], category: string, emoji: string, categoryName: string, gameSystem?: string) {
  if (args.length === 0) {
    // Provide category-specific examples
    let exampleTerm = 'Fireball'; // Default for spell
    if (category === 'kink') {
      exampleTerm = 'bondage';
    } else if (category === 'feat') {
      exampleTerm = 'Power Attack';
    }
    await message.reply(`Usage: \`!${category} <name>\`\nExample: \`!${category} ${exampleTerm}\``);
    return;
  }

  const searchTerm = args.join(' ');

  try {
    // First, search knowledge base for this category
    const searchResults = await db.select()
      .from(knowledgeBase)
      .where(and(
        eq(knowledgeBase.category, category),
        sql`LOWER(${knowledgeBase.question}) LIKE LOWER(${'%' + searchTerm + '%'})`
      ))
      .limit(1);

    if (searchResults.length > 0) {
      const kb = searchResults[0];

      // Truncate if too long for Discord embed
      const truncatedAnswer = kb.answer.length > 4000
        ? kb.answer.substring(0, 3997) + '...'
        : kb.answer;

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`${emoji} ${kb.question}`)
        .setDescription(truncatedAnswer)
        .addFields(
          { name: 'Category', value: categoryName, inline: true },
          { name: 'Source', value: kb.aiGenerated ? '🤖 AI Generated' : (kb.sourceUrl || 'Manual Entry'), inline: true }
        )
        .setFooter({ text: `👍 ${kb.upvotes || 0} upvotes` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      return;
    }

    // Skip Wikipedia - we want ONLY Pathfinder 1e data, not generic D&D
    // Go straight to AI with strict Pathfinder 1e prompts
    if ('sendTyping' in message.channel) {
      await message.channel.sendTyping();
    }

    // Add game system context if specified
    const systemContext = gameSystem ? ` from ${gameSystem}` : '';

    // Adjust prompt based on category - enforce Pathfinder 1e ONLY
    let aiQuestion = '';
    if (category === 'kink') {
      aiQuestion = `Provide a concise, educational definition of "${searchTerm}" in the context of BDSM and kink practices. Include: 1) Clear definition (2-3 sentences), 2) Common practices or variations, 3) Safety/consent considerations if relevant. Keep response under 300 words. Be factual, respectful, and informative. Do NOT talk about D&D, Pathfinder, or tabletop games.`;
    } else if (category === 'spell') {
      aiQuestion = `Provide detailed information about the spell "${searchTerm}" from Pathfinder 1st Edition (1e). Include: spell level, school, casting time, components, range, duration, saving throw, spell resistance, and full description of effects. ONLY use information from Pathfinder 1e published by Paizo. DO NOT include D&D 5e, D&D 3.5e, or other game system information. If the spell does not exist in Pathfinder 1e, say so explicitly. Be specific and comprehensive about the Pathfinder 1e version only.`;
    } else if (category === 'feat') {
      aiQuestion = `Provide detailed information about the feat "${searchTerm}" from Pathfinder 1st Edition (1e). Include: feat type, prerequisites, benefit description, and special notes. ONLY use information from Pathfinder 1e published by Paizo. DO NOT include D&D 5e, D&D 3.5e, or other game system information. If the feat does not exist in Pathfinder 1e, say so explicitly. Be specific and comprehensive about the Pathfinder 1e version only.`;
    } else {
      aiQuestion = `Provide detailed information about the ${categoryName.toLowerCase()} "${searchTerm}"${systemContext}. Be specific and comprehensive.${gameSystem ? ` Only use information from ${gameSystem}. Do not include information from other game systems.` : ''}`;
    }

    const answer = await GeminiService.askGemini(aiQuestion);

    // Truncate if too long for Discord embed (max 4096 chars)
    const truncatedAnswer = answer.length > 4000
      ? answer.substring(0, 3997) + '...'
      : answer;

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`${emoji} ${searchTerm}`)
      .setDescription(truncatedAnswer)
      .addFields({ name: 'Category', value: `${categoryName} (AI Generated)`, inline: true })
      .setFooter({ text: `React ⭐ to save this to knowledge base • Use !learn to add custom entries` })
      .setTimestamp();

    const reply = await message.reply({ embeds: [embed] });

    // Add star reaction for saving
    await reply.react('⭐');

    // Listen for star reaction to save to KB
    const filter = (reaction: any, user: any) => {
      return reaction.emoji.name === '⭐' && !user.bot;
    };

    const collector = reply.createReactionCollector({ filter, time: 60000, max: 1 });

    collector.on('collect', async () => {
      try {
        const guildId = message.guild?.id || 'dm';
        await db.insert(knowledgeBase).values({
          guildId,
          question: searchTerm,
          answer,
          category,
          aiGenerated: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        await message.reply('✅ Saved to this server\'s knowledge base!');
      } catch (error) {
        console.error('Error saving to knowledge base:', error);
      }
    });

  } catch (error) {
    console.error(`Error in !${category} command:`, error);

    // Check if it's a quota error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('quota') || errorMessage.includes('429')) {
      await message.reply(
        `❌ AI service is currently over quota. Please:\n` +
        `1. Use \`!learnurl <url>\` to add ${categoryName.toLowerCase()}s from d20pfsrd.com\n` +
        `2. Use \`!learn ${searchTerm} | <description> | ${category}\` to add it manually\n` +
        `3. Try again in a few minutes when quota resets\n\n` +
        `Example: \`!learnurl <https://www.d20pfsrd.com/feats/${searchTerm.toLowerCase().replaceAll(' ', '-')}/>\``
      );
    } else {
      await message.reply(`❌ Sorry, I encountered an error looking up that ${categoryName.toLowerCase()}.`);
    }
  }
}

async function handleFeat(message: Message, args: string[]) {
  await handleKnowledgeLookup(message, args, 'feat', '⚔️', 'Feat', 'Pathfinder');
}

async function handleSpell(message: Message, args: string[]) {
  await handleKnowledgeLookup(message, args, 'spell', '✨', 'Spell');
}

// Character Stats
async function handleStats(message: Message, args: string[]) {
  try {
    const guildId = message.guild?.id || '';
    if (!guildId) {
      await message.reply('❌ This command can only be used in a server.');
      return;
    }

    let characterId: number | null = null;

    if (args.length === 0) {
      // Get character linked to this channel
      const mapping = await db.select()
        .from(channelCharacterMappings)
        .where(and(
          eq(channelCharacterMappings.channelId, message.channel.id),
          eq(channelCharacterMappings.guildId, guildId)
        ))
        .limit(1);

      if (mapping.length === 0) {
        await message.reply('No character linked to this channel. Use `!setchar <character_name>` first.');
        return;
      }
      characterId = mapping[0].characterId;
    } else {
      // Search by character name
      const characterName = args.join(' ');
      const characters = await db.select()
        .from(characterSheets)
        .where(sql`LOWER(${characterSheets.name}) LIKE LOWER(${'%' + characterName + '%'})`)
        .limit(1);

      if (characters.length === 0) {
        await message.reply(`Character "${characterName}" not found.`);
        return;
      }
      characterId = characters[0].id;
    }

    // Get or create stats for this character in this server
    let stats = await db.select()
      .from(characterStats)
      .where(and(
        eq(characterStats.characterId, characterId),
        eq(characterStats.guildId, guildId)
      ))
      .limit(1);

    if (stats.length === 0) {
      // Create initial stats for this server
      await db.insert(characterStats).values({
        characterId,
        guildId,
        totalMessages: 0,
        totalDiceRolls: 0,
        nat20Count: 0,
        nat1Count: 0,
        totalDamageDealt: 0
      });
      stats = await db.select()
        .from(characterStats)
        .where(and(
          eq(characterStats.characterId, characterId),
          eq(characterStats.guildId, guildId)
        ))
        .limit(1);
    }

    const stat = stats[0];
    const character = await db.select()
      .from(characterSheets)
      .where(eq(characterSheets.id, characterId))
      .limit(1);

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(`📊 ${character[0].name} - Stats`)
      .addFields(
        { name: '💬 Messages', value: (stat.totalMessages || 0).toString(), inline: true },
        { name: '🎲 Dice Rolls', value: (stat.totalDiceRolls || 0).toString(), inline: true },
        { name: '🎉 Natural 20s', value: (stat.nat20Count || 0).toString(), inline: true },
        { name: '💀 Natural 1s', value: (stat.nat1Count || 0).toString(), inline: true },
        { name: '⚔️ Damage Dealt', value: (stat.totalDamageDealt || 0).toString(), inline: true },
        { name: '📅 Last Active', value: stat.lastActive ? stat.lastActive.toLocaleString() : 'Never', inline: true }
      )
      .setTimestamp();

    if (character[0].avatarUrl) {
      const avatarUrl = character[0].avatarUrl.startsWith('http')
        ? character[0].avatarUrl
        : `https://warden.my${character[0].avatarUrl}`;
      embed.setThumbnail(avatarUrl);
    }

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in !stats command:', error);
    await message.reply('❌ Failed to retrieve stats.');
  }
}

async function handleLeaderboard(message: Message, args: string[]) {
  const category = args[0]?.toLowerCase() || 'messages';

  try {
    let orderBy;
    let title;
    let emoji;

    switch (category) {
      case 'messages':
      case 'msg':
        orderBy = desc(characterStats.totalMessages);
        title = '💬 Most Active Characters';
        emoji = '💬';
        break;
      case 'rolls':
      case 'dice':
        orderBy = desc(characterStats.totalDiceRolls);
        title = '🎲 Most Dice Rolls';
        emoji = '🎲';
        break;
      case 'crits':
      case 'nat20':
        orderBy = desc(characterStats.nat20Count);
        title = '🎉 Most Natural 20s';
        emoji = '🎉';
        break;
      case 'fails':
      case 'nat1':
        orderBy = desc(characterStats.nat1Count);
        title = '💀 Most Natural 1s';
        emoji = '💀';
        break;
      case 'damage':
        orderBy = desc(characterStats.totalDamageDealt);
        title = '⚔️ Most Damage Dealt';
        emoji = '⚔️';
        break;
      default:
        await message.reply('Usage: `!leaderboard <messages|rolls|crits|fails|damage>`');
        return;
    }

    const stats = await db.select({
      stats: characterStats,
      character: characterSheets
    })
      .from(characterStats)
      .innerJoin(characterSheets, eq(characterStats.characterId, characterSheets.id))
      .orderBy(orderBy)
      .limit(10);

    if (stats.length === 0) {
      await message.reply('No stats available yet. Start playing to track stats!');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle(title)
      .setTimestamp();

    let description = '';
    stats.forEach((entry, index) => {
      const rank = ['🥇', '🥈', '🥉'][index] || `${index + 1}.`;
      let value;

      switch (category) {
        case 'messages':
        case 'msg':
          value = entry.stats.totalMessages;
          break;
        case 'rolls':
        case 'dice':
          value = entry.stats.totalDiceRolls;
          break;
        case 'crits':
        case 'nat20':
          value = entry.stats.nat20Count;
          break;
        case 'fails':
        case 'nat1':
          value = entry.stats.nat1Count;
          break;
        case 'damage':
          value = entry.stats.totalDamageDealt;
          break;
        default:
          value = 0;
      }

      description += `${rank} **${entry.character.name}** - ${emoji} ${value}\n`;
    });

    embed.setDescription(description);
    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in !leaderboard command:', error);
    await message.reply('❌ Failed to retrieve leaderboard.');
  }
}

// ==================== UTILITY COMMANDS ====================
async function handleTime(message: Message, args: string[]) {
  try {
    const guildId = message.guild?.id || '';

    if (args.length === 0) {
      // Show current time
      const [time] = await db.select()
        .from(gameTime)
        .where(eq(gameTime.guildId, guildId));

      if (!time) {
        await message.reply('⏰ No game time set for this server. Use `!time set <date/time>` to set it.');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('⏰ Current Game Time')
        .addFields(
          { name: 'Date', value: time.currentDate, inline: true },
          { name: 'Time of Day', value: time.currentTime || 'Not set', inline: true },
          { name: 'Calendar System', value: time.calendar || 'Standard', inline: true }
        );

      if (time.notes) {
        embed.addFields({ name: 'Notes', value: time.notes });
      }

      await message.reply({ embeds: [embed] });
    } else if (args[0] === 'set') {
      // Set game time
      const timeString = args.slice(1).join(' ');
      if (!timeString) {
        await message.reply('Usage: `!time set <date and time>`\nExample: `!time set 15th of Mirtul, 1492 DR - Evening`');
        return;
      }

      const [existing] = await db.select()
        .from(gameTime)
        .where(eq(gameTime.guildId, guildId));

      if (existing) {
        await db.update(gameTime)
          .set({
            currentDate: timeString,
            updatedBy: message.author.id,
            updatedAt: new Date()
          })
          .where(eq(gameTime.guildId, guildId));
      } else {
        await db.insert(gameTime).values({
          guildId,
          currentDate: timeString,
          updatedBy: message.author.id
        });
      }

      await message.reply(`⏰ Game time set to: **${timeString}**`);
    }
  } catch (error) {
    console.error('Error in !time command:', error);
    await message.reply('❌ Failed to handle time command.');
  }
}

async function handleNote(message: Message, args: string[]) {
  try {
    const subcmd = args[0]?.toLowerCase();

    // Find user by Discord ID
    const [user] = await db.select()
      .from(users)
      .where(eq(users.discordUserId, message.author.id));

    if (!user) {
      await message.reply('❌ You need to connect your account first. Use `!connect <username> <password>`');
      return;
    }

    const guildId = message.guild?.id || '';

    switch (subcmd) {
      case 'add': {
        const content = args.slice(1).join(' ');
        if (!content) {
          await message.reply('Usage: `!note add <your note>`');
          return;
        }

        await db.insert(gmNotes).values({
          userId: user.id,
          guildId,
          title: `Note - ${new Date().toLocaleDateString()}`,
          content
        });

        await message.reply('📝 Note saved!');
        break;
      }

      case 'list': {
        const notes = await db.select()
          .from(gmNotes)
          .where(and(
            eq(gmNotes.userId, user.id),
            eq(gmNotes.guildId, guildId)
          ))
          .orderBy(desc(gmNotes.createdAt))
          .limit(10);

        if (notes.length === 0) {
          await message.reply('You have no notes for this server.');
          return;
        }

        const embed = new EmbedBuilder()
          .setColor('#95a5a6')
          .setTitle('📝 Your Notes')
          .setDescription(notes.map((n, i) =>
            `**${i + 1}.** ${n.title}\n${n.content.substring(0, 100)}${n.content.length > 100 ? '...' : ''}`
          ).join('\n\n'));

        await message.reply({ embeds: [embed] });
        break;
      }

      default:
        await message.reply('Usage: `!note <add|list> [args]`');
    }
  } catch (error) {
    console.error('Error in !note command:', error);
    await message.reply('❌ Failed to handle note command.');
  }
}

async function handleHC(message: Message, args: string[]) {
  try {
    const discordUserId = message.author.id;
    const guildId = message.guild?.id || '';
    const subcmd = args[0]?.toLowerCase();

    // If first arg is "list", show all entries
    if (subcmd === 'list') {
      const entries = await db.select()
        .from(hcList)
        .where(and(
          eq(hcList.discordUserId, discordUserId),
          eq(hcList.guildId, guildId)
        ))
        .orderBy(hcList.createdAt);

      if (entries.length === 0) {
        await message.reply('You have no HC entries for this server.');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('📋 Your HC List')
        .setDescription(entries.map((e, i) =>
          `**${i + 1}.** ${e.content}`
        ).join('\n'));

      await message.reply({ embeds: [embed] });
      return;
    }

    // If first arg is "edit" or "delete"
    if (subcmd === 'edit' || subcmd === 'delete') {
      const entryNum = parseInt(args[1]);
      if (isNaN(entryNum) || entryNum < 1) {
        await message.reply(`Usage: \`!hc ${subcmd} <number>\`\nUse \`!hc list\` to see entry numbers.`);
        return;
      }

      // Get all entries to find the one by index
      const entries = await db.select()
        .from(hcList)
        .where(and(
          eq(hcList.discordUserId, discordUserId),
          eq(hcList.guildId, guildId)
        ))
        .orderBy(hcList.createdAt);

      if (entryNum > entries.length) {
        await message.reply(`❌ Entry #${entryNum} doesn't exist. You have ${entries.length} entries.`);
        return;
      }

      const targetEntry = entries[entryNum - 1];

      if (subcmd === 'delete') {
        await db.delete(hcList)
          .where(eq(hcList.id, targetEntry.id));
        await message.reply(`✅ Deleted entry #${entryNum}: "${targetEntry.content}"`);
        return;
      }

      if (subcmd === 'edit') {
        const newContent = args.slice(2).join(' ');
        if (!newContent) {
          await message.reply('Usage: `!hc edit <number> <new text>`');
          return;
        }

        await db.update(hcList)
          .set({ content: newContent })
          .where(eq(hcList.id, targetEntry.id));

        await message.reply(`✅ Updated entry #${entryNum} to: "${newContent}"`);
        return;
      }
    }

    // Default: Add new entry (everything is the content)
    const content = args.join(' ');
    if (!content) {
      await message.reply(
        'Usage:\n' +
        '• `!hc <text>` - Add entry\n' +
        '• `!hc list` - Show all entries\n' +
        '• `!hc edit <#> <new text>` - Edit entry\n' +
        '• `!hc delete <#>` - Delete entry'
      );
      return;
    }

    await db.insert(hcList).values({
      discordUserId,
      guildId,
      content
    });

    await message.reply(`💡HC: ${content}`);

  } catch (error) {
    console.error('Error in !hc command:', error);
    await message.reply('❌ Failed to handle HC command.');
  }
}

// ==================== CHARACTER MEMORIES ====================
async function handleMemory(message: Message, args: string[]) {
  try {
    const guildId = message.guild?.id || '';
    const userId = message.author.id;

    // Parse: !Memory <Character> | <Memory>
    const fullText = args.join(' ');
    const parts = fullText.split('|').map(p => p.trim());

    if (parts.length < 2) {
      await message.reply(
        'Usage: `!Memory <Character> | <Memory>`\n\n' +
        'Examples:\n' +
        '• `!Memory Ogun | Had a dream about meeting their soulmate`\n' +
        '• `!Memory Elystrix | Discovered a secret about their past`\n\n' +
        'View memories: `!<Character> Memories`'
      );
      return;
    }

    const characterName = parts[0];
    const memory = parts.slice(1).join('|').trim();

    if (!characterName || !memory) {
      await message.reply('❌ Please provide both character name and memory.');
      return;
    }

    // Find character
    const [character] = await db.select()
      .from(characterSheets)
      .where(
        sql`LOWER(${characterSheets.name}) = LOWER(${characterName})`
      )
      .limit(1);

    if (!character) {
      await message.reply(`❌ Character "${characterName}" not found.`);
      return;
    }

    // Add memory
    await db.insert(characterMemories).values({
      characterId: character.id,
      guildId,
      memory,
      addedBy: userId
    });

    await message.reply(`✅ Memory added for **${character.name}**:\n"${memory}"`);

  } catch (error) {
    console.error('Error in !Memory command:', error);
    await message.reply('❌ Failed to add memory.');
  }
}

async function handleCharacterMemoriesView(message: Message, characterName: string) {
  try {
    const guildId = message.guild?.id || '';

    // Find character
    const [character] = await db.select()
      .from(characterSheets)
      .where(
        sql`LOWER(${characterSheets.name}) = LOWER(${characterName})`
      )
      .limit(1);

    if (!character) {
      // Don't reply if character not found (might be trying a dice roll)
      return;
    }

    // Get all memories for this character
    const memories = await db.select()
      .from(characterMemories)
      .where(eq(characterMemories.characterId, character.id))
      .orderBy(characterMemories.createdAt);

    if (memories.length === 0) {
      await message.reply(`📝 **${character.name}** has no memories yet.\n\nAdd one with: \`!Memory ${character.name} | <memory>\``);
      return;
    }

    // Build embed
    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`📝 ${character.name}'s Memories`)
      .setDescription(memories.length === 1 ? '1 memory' : `${memories.length} memories`)
      .setTimestamp();

    // Add memories as numbered list
    const memoryList = memories.map((mem, idx) => {
      const date = new Date(mem.createdAt).toLocaleDateString();
      return `**${idx + 1}.** ${mem.memory}\n*Added ${date}*`;
    }).join('\n\n');

    embed.addFields({ name: 'Memories', value: memoryList.substring(0, 1024) }); // Discord limit

    if (memoryList.length > 1024) {
      embed.setFooter({ text: 'Some memories truncated due to length' });
    }

    await message.reply({ embeds: [embed] });

  } catch (error) {
    console.error('Error viewing character memories:', error);
    await message.reply('❌ Failed to retrieve memories.');
  }
}

// === CHARACTER RELATIONSHIPS (RP Tier) ===

async function handleRelationship(message: Message, characterName: string, relationshipText: string) {
  try {
    const guildId = message.guild?.id || '';

    // Parse: "is OtherName's relationship. | Description"
    // Example: "is Natasha's spouse. | They're married."
    const parts = relationshipText.split('|').map(p => p.trim());
    const relationshipPart = parts[0]; // "is Natasha's spouse."
    const description = parts[1] || ''; // "They're married."

    // Extract: "is <name>'s <type>"
    const relationshipMatch = relationshipPart.match(/is\s+(.+?)['']s\s+(.+?)\.?$/i);
    if (!relationshipMatch) {
      await message.reply(
        'Usage: `!<CharName> is <OtherChar>\'s <relationship>. | <description>`\n\n' +
        'Examples:\n' +
        '• `!Bucky is Natasha\'s spouse. | They\'re married.`\n' +
        '• `!Elara is Theron\'s friend. | Met in the war.`\n' +
        '• `!Zara is Kael\'s enemy. | Betrayed her trust.`'
      );
      return;
    }

    const relatedCharacterName = relationshipMatch[1].trim();
    const relationshipType = relationshipMatch[2].trim();

    // Find the character
    const [character] = await db.select()
      .from(characterSheets)
      .where(
        sql`LOWER(${characterSheets.name}) = LOWER(${characterName})`
      )
      .limit(1);

    if (!character) {
      await message.reply(`❌ Character "${characterName}" not found.`);
      return;
    }

    // Add relationship
    await db.insert(characterRelationships).values({
      characterId: character.id,
      relatedCharacterName,
      relationshipType,
      description,
      guildId
    });

    await message.reply(
      `✅ Relationship added for **${character.name}**:\n` +
      `**${character.name}** is **${relatedCharacterName}'s ${relationshipType}**` +
      (description ? `\n*${description}*` : '')
    );

  } catch (error) {
    console.error('Error in relationship command:', error);
    await message.reply('❌ Failed to add relationship.');
  }
}

// === LORE SYSTEM (RP Tier) ===

async function handleLore(message: Message, args: string[]) {
  try {
    const guildId = message.guild?.id || '';
    const channelId = message.channel.id;

    // Subcommands: !lore list [tag], !lore delete <id>, !lore <note> <tag>
    if (args.length === 0) {
      // Show lore for current channel's tag
      const [channelTag] = await db.select()
        .from(channelLoreTags)
        .where(and(
          eq(channelLoreTags.guildId, guildId),
          eq(channelLoreTags.channelId, channelId)
        ));

      if (!channelTag) {
        await message.reply(
          '📚 **Lore System**\n\n' +
          'No lore tag set for this channel. Use `!set <tag>` to link this channel to a lore category.\n\n' +
          '**Commands:**\n' +
          '• `!lore <note> <tag>` - Add lore entry\n' +
          '• `!lore list [tag]` - View all lore (or by tag)\n' +
          '• `!lore delete <id>` - Remove a lore entry\n' +
          '• `!set <tag>` - Link channel to lore tag\n\n' +
          '**Example Tags:** history, geography, factions, culture, npcs'
        );
        return;
      }

      // Show lore for this channel's tag
      const entries = await db.select()
        .from(loreEntries)
        .where(and(
          eq(loreEntries.guildId, guildId),
          eq(loreEntries.tag, channelTag.tag)
        ))
        .orderBy(desc(loreEntries.createdAt));

      if (entries.length === 0) {
        await message.reply(`📚 No lore entries for tag **${channelTag.tag}** yet.\n\nAdd one with: \`!lore <note> ${channelTag.tag}\``);
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`📚 ${channelTag.tag.charAt(0).toUpperCase() + channelTag.tag.slice(1)} Lore`)
        .setDescription(`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`)
        .setTimestamp();

      const loreList = entries.map((entry, idx) => {
        const date = new Date(entry.createdAt).toLocaleDateString();
        return `**${entry.id}.** ${entry.content}\n*Added ${date}*`;
      }).join('\n\n');

      embed.addFields({ name: 'Entries', value: loreList.substring(0, 1024) });

      if (loreList.length > 1024) {
        embed.setFooter({ text: 'Some entries truncated. Use !lore list to see all.' });
      }

      await message.reply({ embeds: [embed] });
      return;
    }

    // !lore list [tag]
    if (args[0].toLowerCase() === 'list') {
      const filterTag = args[1]?.toLowerCase();

      let entries;
      if (filterTag) {
        entries = await db.select()
          .from(loreEntries)
          .where(and(
            eq(loreEntries.guildId, guildId),
            eq(loreEntries.tag, filterTag)
          ))
          .orderBy(desc(loreEntries.createdAt));
      } else {
        entries = await db.select()
          .from(loreEntries)
          .where(eq(loreEntries.guildId, guildId))
          .orderBy(loreEntries.tag, desc(loreEntries.createdAt));
      }

      if (entries.length === 0) {
        await message.reply(filterTag
          ? `📚 No lore entries for tag **${filterTag}**.`
          : '📚 No lore entries yet. Add one with `!lore <note> <tag>`'
        );
        return;
      }

      // Group by tag
      const byTag = entries.reduce((acc, entry) => {
        if (!acc[entry.tag]) acc[entry.tag] = [];
        acc[entry.tag].push(entry);
        return acc;
      }, {} as Record<string, typeof entries>);

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('📚 Server Lore')
        .setDescription(`${entries.length} total ${entries.length === 1 ? 'entry' : 'entries'}`)
        .setTimestamp();

      for (const [tag, tagEntries] of Object.entries(byTag)) {
        const tagList = (tagEntries as any[]).map(e => `**${e.id}.** ${e.content.substring(0, 100)}${e.content.length > 100 ? '...' : ''}`).join('\n');
        embed.addFields({
          name: `${tag} (${(tagEntries as any[]).length})`,
          value: tagList.substring(0, 1024),
          inline: false
        });
      }

      await message.reply({ embeds: [embed] });
      return;
    }

    // !lore delete <id>
    if (args[0].toLowerCase() === 'delete') {
      const loreId = parseInt(args[1]);
      if (isNaN(loreId)) {
        await message.reply('Usage: `!lore delete <id>`');
        return;
      }

      // Check if entry exists and belongs to this guild
      const [entry] = await db.select()
        .from(loreEntries)
        .where(and(
          eq(loreEntries.id, loreId),
          eq(loreEntries.guildId, guildId)
        ));

      if (!entry) {
        await message.reply(`❌ Lore entry #${loreId} not found.`);
        return;
      }

      await db.delete(loreEntries)
        .where(eq(loreEntries.id, loreId));

      await message.reply(`✅ Deleted lore entry #${loreId}: "${entry.content.substring(0, 100)}..."`);
      return;
    }

    // !lore <note> <tag>
    // Parse: last word is tag, rest is content
    if (args.length < 2) {
      await message.reply(
        'Usage: `!lore <note> <tag>`\n\n' +
        'Examples:\n' +
        '• `!lore The Great War began in 1342 history`\n' +
        '• `!lore Elves live in Silverwood Forest geography`\n' +
        '• `!lore The Crimson Guild controls trade factions`'
      );
      return;
    }

    const tag = args[args.length - 1].toLowerCase();
    const content = args.slice(0, -1).join(' ');

    // Get user from Discord ID
    const [user] = await db.select()
      .from(users)
      .where(eq(users.discordUserId, message.author.id));

    if (!user) {
      await message.reply('❌ Discord account not linked. Use `!connect <username> <password>` first.');
      return;
    }

    const [entry] = await db.insert(loreEntries).values({
      guildId,
      userId: user.id,
      tag,
      content
    }).returning();

    // Check if there's a channel set for this tag
    const [channelTag] = await db.select()
      .from(channelLoreTags)
      .where(and(
        eq(channelLoreTags.guildId, guildId),
        eq(channelLoreTags.tag, tag)
      ));

    // Reply in current channel
    await message.reply(`✅ Lore added to **${tag}** (ID: ${entry.id}):\n"${content}"`);

    // If there's a channel set for this tag, also post there
    if (channelTag) {
      try {
        const targetChannel = await message.guild?.channels.fetch(channelTag.channelId);
        if (targetChannel && targetChannel.isTextBased()) {
          const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`📚 New ${tag} Lore`)
            .setDescription(content)
            .setFooter({ text: `Added by ${message.author.tag} • ID: ${entry.id}` })
            .setTimestamp();

          await targetChannel.send({ embeds: [embed] });
        }
      } catch (channelError) {
        console.error('Error posting to lore channel:', channelError);
        // Don't fail the whole operation if we can't post to the channel
      }
    }

  } catch (error) {
    console.error('Error in !lore command:', error);
    await message.reply('❌ Failed to manage lore entry.');
  }
}

async function handleSet(message: Message, args: string[]) {
  try {
    const guildId = message.guild?.id || '';
    const channelId = message.channel.id;

    if (args.length === 0) {
      // Show current tag
      const [channelTag] = await db.select()
        .from(channelLoreTags)
        .where(and(
          eq(channelLoreTags.guildId, guildId),
          eq(channelLoreTags.channelId, channelId)
        ));

      if (!channelTag) {
        await message.reply(
          '📚 **Set Lore Tag**\n\n' +
          'No lore tag set for this channel.\n\n' +
          'Usage: `!set <tag>`\n\n' +
          'Examples:\n' +
          '• `!set history` - This channel will show history lore\n' +
          '• `!set geography` - This channel will show geography lore\n' +
          '• `!set factions` - This channel will show faction lore'
        );
        return;
      }

      await message.reply(`📚 This channel is linked to lore tag: **${channelTag.tag}**\n\nUse \`!lore\` to view entries.`);
      return;
    }

    const tag = args[0].toLowerCase();

    // Delete existing tag for this channel
    await db.delete(channelLoreTags)
      .where(and(
        eq(channelLoreTags.guildId, guildId),
        eq(channelLoreTags.channelId, channelId)
      ));

    // Insert new tag
    await db.insert(channelLoreTags).values({
      guildId,
      channelId,
      tag
    });

    await message.reply(`✅ Channel linked to lore tag: **${tag}**\n\nUse \`!lore\` to view entries or \`!lore <note> ${tag}\` to add.`);

  } catch (error) {
    console.error('Error in !set command:', error);
    await message.reply('❌ Failed to set lore tag.');
  }
}

async function handleNPC(message: Message, args: string[]) {
  const npcName = args.join(' ');
  if (!npcName) {
    await message.reply('Usage: `!npc <name>`\nExample: `!npc Mysterious Merchant`');
    return;
  }

  // Generate quick NPC stat block
  const stats = {
    str: Math.floor(Math.random() * 11) + 8,  // 8-18
    dex: Math.floor(Math.random() * 11) + 8,
    con: Math.floor(Math.random() * 11) + 8,
    int: Math.floor(Math.random() * 11) + 8,
    wis: Math.floor(Math.random() * 11) + 8,
    cha: Math.floor(Math.random() * 11) + 8
  };

  const hp = Math.floor(Math.random() * 30) + 10; // 10-40 HP
  const ac = Math.floor(Math.random() * 6) + 10;  // 10-15 AC

  const embed = new EmbedBuilder()
    .setColor('#16a085')
    .setTitle(`🎭 ${npcName}`)
    .setDescription('Quick NPC Stat Block')
    .addFields(
      { name: 'HP', value: `${hp}`, inline: true },
      { name: 'AC', value: `${ac}`, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: 'STR', value: `${stats.str}`, inline: true },
      { name: 'DEX', value: `${stats.dex}`, inline: true },
      { name: 'CON', value: `${stats.con}`, inline: true },
      { name: 'INT', value: `${stats.int}`, inline: true },
      { name: 'WIS', value: `${stats.wis}`, inline: true },
      { name: 'CHA', value: `${stats.cha}`, inline: true }
    )
    .setFooter({ text: 'Randomly generated NPC' });

  await message.reply({ embeds: [embed] });
}

async function handleMusic(message: Message) {
  const moods = [
    { mood: 'Epic Battle', suggestion: '🎵 Two Steps From Hell - Heart of Courage' },
    { mood: 'Mysterious', suggestion: '🎵 Adrian von Ziegler - Prophecy' },
    { mood: 'Tavern', suggestion: '🎵 Medieval Tavern Music' },
    { mood: 'Sad/Emotional', suggestion: '🎵 Peter Gundry - The Lonely Shepherd' },
    { mood: 'Exploration', suggestion: '🎵 Jeremy Soule - Skyrim Atmospheres' },
    { mood: 'Tense/Suspense', suggestion: '🎵 Dark Ambient Music' },
    { mood: 'Victory', suggestion: '🎵 E.S. Posthumus - Unstoppable' },
    { mood: 'Romance', suggestion: '🎵 Celtic Love Songs' },
    { mood: 'Horror', suggestion: '🎵 Atrium Carceri - Dark Ambient' },
    { mood: 'Peaceful', suggestion: '🎵 BrunuhVille - Spirit of the Wild' }
  ];

  const random = moods[Math.floor(Math.random() * moods.length)];

  const embed = new EmbedBuilder()
    .setColor('#1abc9c')
    .setTitle('🎵 Music Suggestion')
    .setDescription(`**Mood:** ${random.mood}\n**Suggestion:** ${random.suggestion}`)
    .setFooter({ text: 'Perfect for setting the scene!' });

  await message.reply({ embeds: [embed] });
}

// ==================== HALL OF FAME (STARBOARD) ====================
async function handleStarReaction(reaction: any) {
  try {
    const message = reaction.message;
    const starCount = reaction.count || 0;
    const STAR_THRESHOLD = 10; // Changed to 10 based on user preference
    const guildId = message.guild?.id || '';

    // Check if message is already in hall of fame
    const [existing] = await db.select()
      .from(hallOfFame)
      .where(eq(hallOfFame.messageId, message.id));

    if (starCount >= STAR_THRESHOLD) {
      // Add or update in Hall of Fame
      const contextMessages: any[] = [];

      // Fetch context messages (2 before and 2 after)
      try {
        const messages = await message.channel.messages.fetch({ limit: 5, around: message.id });
        messages.forEach((msg: any) => {
          if (msg.id !== message.id) {
            contextMessages.push({
              author: msg.author.username,
              content: msg.content,
              timestamp: msg.createdTimestamp
            });
          }
        });
      } catch (error) {
        console.error('Error fetching context messages:', error);
      }

      if (existing) {
        // Update star count
        await db.update(hallOfFame)
          .set({ starCount })
          .where(eq(hallOfFame.id, existing.id));
      } else {
        // Add to hall of fame
        await db.insert(hallOfFame).values({
          messageId: message.id,
          channelId: message.channel.id,
          guildId,
          authorId: message.author.id,
          characterName: null, // Could extract from webhook if needed
          content: message.content,
          starCount,
          contextMessages: JSON.stringify(contextMessages)
        });

        // Try to post to #hall-of-fame channel if it exists
        try {
          const guild = message.guild;
          if (guild) {
            const hallChannel = guild.channels.cache.find(
              (ch: any) => ch.name === 'hall-of-fame' && (ch.type === 0 || ch.type === 5)
            ) as TextChannel;

            if (hallChannel) {
              const embed = new EmbedBuilder()
                .setColor('#f1c40f')
                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                .setDescription(message.content || '*[No text content]*')
                .addFields({ name: 'Channel', value: `<#${message.channel.id}>`, inline: true })
                .addFields({ name: 'Stars', value: `⭐ ${starCount}`, inline: true })
                .setFooter({ text: `Message ID: ${message.id}` })
                .setTimestamp(message.createdTimestamp);

              const hallMessage = await hallChannel.send({ embeds: [embed] });

              // Store hall message ID
              await db.update(hallOfFame)
                .set({ hallMessageId: hallMessage.id })
                .where(eq(hallOfFame.messageId, message.id));
            }
          }
        } catch (error) {
          console.error('Error posting to hall-of-fame channel:', error);
        }
      }
    } else if (existing && starCount < STAR_THRESHOLD) {
      // Remove from hall of fame if stars drop below threshold
      await db.delete(hallOfFame)
        .where(eq(hallOfFame.id, existing.id));

      // Try to delete from hall channel
      if (existing.hallMessageId) {
        try {
          const guild = message.guild;
          if (guild) {
            const hallChannel = guild.channels.cache.find(
              (ch: any) => ch.name === 'hall-of-fame'
            ) as TextChannel;

            if (hallChannel) {
              const hallMsg = await hallChannel.messages.fetch(existing.hallMessageId);
              await hallMsg.delete();
            }
          }
        } catch (error) {
          console.error('Error deleting from hall-of-fame:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error handling star reaction:', error);
  }
}

// ==================== HALL OF FAME COMMANDS ====================
async function handleHall(message: Message, args: string[]) {
  try {
    const subcmd = args[0]?.toLowerCase();
    const guildId = message.guild?.id || '';

    if (subcmd === 'top') {
      // Show top 20 starred messages
      const topMessages = await db.select()
        .from(hallOfFame)
        .where(eq(hallOfFame.guildId, guildId))
        .orderBy(desc(hallOfFame.starCount))
        .limit(20);

      if (topMessages.length === 0) {
        await message.reply('⭐ No messages in the Hall of Fame yet! React with ⭐ to great moments.');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#f1c40f')
        .setTitle('⭐ Hall of Fame - Top 20')
        .setDescription(topMessages.map((msg, i) => {
          const preview = msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '');
          return `${i + 1}. **${msg.starCount}⭐** - ${preview}`;
        }).join('\n'))
        .setFooter({ text: `${topMessages.length} messages in Hall of Fame` });

      await message.reply({ embeds: [embed] });
    } else {
      // Show recent additions
      const recentMessages = await db.select()
        .from(hallOfFame)
        .where(eq(hallOfFame.guildId, guildId))
        .orderBy(desc(hallOfFame.addedToHallAt))
        .limit(10);

      if (recentMessages.length === 0) {
        await message.reply('⭐ No messages in the Hall of Fame yet! React with ⭐ to great moments.');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#f1c40f')
        .setTitle('⭐ Hall of Fame - Recent')
        .setDescription(recentMessages.map((msg, i) => {
          const preview = msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '');
          return `${i + 1}. **${msg.starCount}⭐** - ${preview}`;
        }).join('\n'))
        .setFooter({ text: 'Use !hall top for the top 20' });

      await message.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Error in !hall command:', error);
    await message.reply('❌ Failed to retrieve Hall of Fame.');
  }
}

// ==================== BOT SETTINGS ====================
async function handleBotSet(message: Message, args: string[]) {
  // Check admin permissions
  if (!isAdmin(message)) {
    await message.reply('❌ Only administrators can change bot settings.');
    return;
  }

  const guildId = message.guild?.id || '';

  // Handle subcommands
  if (args.length > 0) {
    const subcommand = args[0].toLowerCase();

    if (subcommand === 'help') {
      const helpEmbed = {
        title: '⚙️ Bot Settings Help',
        color: 0x5865F2,
        fields: [
          {
            name: '!botset',
            value: 'Set the announcement channel (this channel)'
          }
        ]
      };
      await message.reply({ embeds: [helpEmbed] });
      return;
    }
  }

  // Default: set announcement channel to current channel
  const channelId = message.channel.id;

  try {
    // Check if settings exist
    const [existing] = await db.select()
      .from(botSettings)
      .where(eq(botSettings.guildId, guildId));

    if (existing) {
      await db.update(botSettings)
        .set({
          announcementChannelId: channelId,
          updatedAt: new Date()
        })
        .where(eq(botSettings.guildId, guildId));
    } else {
      await db.insert(botSettings).values({
        guildId,
        announcementChannelId: channelId
      });
    }

    await message.reply(`✅ Bot announcement channel set to <#${channelId}>!\n\nThis channel will be used for:\n• Daily prompts (when scheduled)\n• Challenges\n• Bot announcements\n\nUse \`!botset prompt\` commands to configure daily prompts, or \`!botset help\` for all options.`);
  } catch (error) {
    console.error('Error in !botset command:', error);
    await message.reply('❌ Failed to set bot channel.');
  }
}

async function handleWeeklyReport(message: Message) {
  try {
    if (!message.guild) {
      await message.reply('This command can only be used in a server.');
      return;
    }

    await message.reply('📊 Generating weekly activity report...');
    await postWeeklyCharacterReport(message.guild.id);
  } catch (error) {
    console.error('Error in !weeklyreport command:', error);
    await message.reply('❌ Failed to generate weekly report.');
  }
}

async function handleMonthlyReport(message: Message) {
  try {
    if (!message.guild) {
      await message.reply('This command can only be used in a server.');
      return;
    }

    await message.reply('📅 Generating monthly summary...');
    await postMonthlyCharacterSummary(message.guild.id);
  } catch (error) {
    console.error('Error in !monthlyreport command:', error);
    await message.reply('❌ Failed to generate monthly summary.');
  }
}

async function handlePostLeaderboard(message: Message, args: string[]) {
  try {
    if (!message.guild) {
      await message.reply('This command can only be used in a server.');
      return;
    }

    const category = args[0]?.toLowerCase() || 'messages';
    const validCategories = ['messages', 'rolls', 'crits', 'fails', 'damage'];

    if (!validCategories.includes(category)) {
      await message.reply(`Usage: \`!postleaderboard <messages|rolls|crits|fails|damage>\`\n\nPosts the leaderboard to the announcement channel.`);
      return;
    }

    await message.reply(`🏆 Posting ${category} leaderboard to announcement channel...`);
    await postLeaderboardToChannel(message.guild.id, category);
  } catch (error) {
    console.error('Error in !postleaderboard command:', error);
    await message.reply('❌ Failed to post leaderboard.');
  }
}

// Helper function to track character activity and update stats
async function trackCharacterActivity(
  characterId: number,
  guildId: string,
  activityType: string,
  description: string,
  metadata?: any
) {
  try {
    if (!guildId) return; // Skip if no guild context

    // Get or create stats for this character in this server
    let stats = await db.select()
      .from(characterStats)
      .where(and(
        eq(characterStats.characterId, characterId),
        eq(characterStats.guildId, guildId)
      ))
      .limit(1);

    if (stats.length === 0) {
      await db.insert(characterStats).values({
        characterId,
        guildId,
        totalMessages: 0,
        totalDiceRolls: 0,
        nat20Count: 0,
        nat1Count: 0,
        totalDamageDealt: 0,
        lastActive: new Date()
      });
      stats = await db.select()
        .from(characterStats)
        .where(and(
          eq(characterStats.characterId, characterId),
          eq(characterStats.guildId, guildId)
        ))
        .limit(1);
    }

    const stat = stats[0];

    // Update stats based on activity type
    const updates: any = { lastActive: new Date() };

    switch (activityType) {
      case 'message':
        updates.totalMessages = (stat.totalMessages || 0) + 1;
        break;
      case 'roll':
        updates.totalDiceRolls = (stat.totalDiceRolls || 0) + 1;
        if (metadata?.nat20) {
          updates.nat20Count = (stat.nat20Count || 0) + 1;
        }
        if (metadata?.nat1) {
          updates.nat1Count = (stat.nat1Count || 0) + 1;
        }
        if (metadata?.damage) {
          updates.totalDamageDealt = (stat.totalDamageDealt || 0) + metadata.damage;
        }
        break;
    }

    await db.update(characterStats)
      .set(updates)
      .where(and(
        eq(characterStats.characterId, characterId),
        eq(characterStats.guildId, guildId)
      ));

    // Check for milestones and announce them
    const newStats = { ...stat, ...updates };

    // Message milestones (every 100 messages)
    if (updates.totalMessages && updates.totalMessages % 100 === 0 && updates.totalMessages > 0) {
      await announceCharacterMilestone(characterId, 'message_milestone', { count: updates.totalMessages });
    }

    // Natural 20 milestones (every 10)
    if (updates.nat20Count && updates.nat20Count % 10 === 0 && updates.nat20Count > 0) {
      await announceCharacterMilestone(characterId, 'nat20_milestone', { count: updates.nat20Count });
    }

    // Damage milestones (every 1000 damage)
    if (updates.totalDamageDealt && updates.totalDamageDealt >= 1000 &&
        Math.floor(updates.totalDamageDealt / 1000) > Math.floor((stat.totalDamageDealt || 0) / 1000)) {
      await announceCharacterMilestone(characterId, 'damage_milestone', {
        totalDamage: updates.totalDamageDealt
      });
    }

    // Add to activity feed
    await db.insert(activityFeed).values({
      characterId,
      activityType,
      description,
      metadata: metadata ? JSON.stringify(metadata) : null,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error tracking character activity:', error);
  }
}

// ===== NewsChannel Analytics =====

/**
 * Post weekly character activity report to announcement channel
 */
export async function postWeeklyCharacterReport(guildId: string) {
  try {
    if (!botClient) {
      console.log('Bot client not initialized');
      return;
    }

    const settings = await db.select()
      .from(botSettings)
      .where(eq(botSettings.guildId, guildId))
      .limit(1);

    if (settings.length === 0 || !settings[0].announcementChannelId) {
      console.log(`No announcement channel set for guild ${guildId}`);
      return;
    }

    const channel = await botClient.channels.fetch(settings[0].announcementChannelId);
    if (!channel?.isTextBased() || !('send' in channel)) {
      console.log(`Announcement channel ${settings[0].announcementChannelId} is not text-based`);
      return;
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get top characters by activity in the past week (using channel mappings to filter by guild)
    const topCharacters = await db.select({
      character: characterSheets,
      stats: characterStats
    })
      .from(characterStats)
      .innerJoin(characterSheets, eq(characterStats.characterId, characterSheets.id))
      .innerJoin(channelCharacterMappings, eq(channelCharacterMappings.characterId, characterSheets.id))
      .where(and(
        eq(channelCharacterMappings.guildId, guildId),
        sql`${characterStats.lastActive} >= ${oneWeekAgo}`
      ))
      .orderBy(desc(characterStats.totalMessages))
      .limit(5);

    if (topCharacters.length === 0) {
      await channel.send('📊 **Weekly Activity Report**\n\nNo character activity this week. Time to start a new adventure! 🎭');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📊 Weekly Character Activity Report')
      .setDescription(`Here are the most active characters from the past week!`)
      .setTimestamp();

    topCharacters.forEach((entry, index) => {
      const rank = ['🥇', '🥈', '🥉'][index] || `${index + 1}.`;
      embed.addFields({
        name: `${rank} ${entry.character.name}`,
        value: `💬 ${entry.stats.totalMessages} messages • 🎲 ${entry.stats.totalDiceRolls} rolls`,
        inline: false
      });
    });

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error posting weekly character report:', error);
  }
}

/**
 * Post monthly character summary to announcement channel
 */
export async function postMonthlyCharacterSummary(guildId: string) {
  try {
    if (!botClient) {
      console.log('Bot client not initialized');
      return;
    }

    const settings = await db.select()
      .from(botSettings)
      .where(eq(botSettings.guildId, guildId))
      .limit(1);

    if (settings.length === 0 || !settings[0].announcementChannelId) {
      console.log(`No announcement channel set for guild ${guildId}`);
      return;
    }

    const channel = await botClient.channels.fetch(settings[0].announcementChannelId);
    if (!channel?.isTextBased() || !('send' in channel)) {
      console.log(`Announcement channel ${settings[0].announcementChannelId} is not text-based`);
      return;
    }

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Get all guild characters active this month
    const activeCharacters = await db.select({
      character: characterSheets,
      stats: characterStats
    })
      .from(characterStats)
      .innerJoin(characterSheets, eq(characterStats.characterId, characterSheets.id))
      .innerJoin(channelCharacterMappings, eq(channelCharacterMappings.characterId, characterSheets.id))
      .where(and(
        eq(channelCharacterMappings.guildId, guildId),
        sql`${characterStats.lastActive} >= ${oneMonthAgo}`
      ));

    if (activeCharacters.length === 0) {
      await channel.send('📅 **Monthly Summary**\n\nNo character activity this month. The realm has been quiet... 🌙');
      return;
    }

    const totalMessages = activeCharacters.reduce((sum, c) => sum + (c.stats.totalMessages || 0), 0);
    const totalRolls = activeCharacters.reduce((sum, c) => sum + (c.stats.totalDiceRolls || 0), 0);
    const totalNat20s = activeCharacters.reduce((sum, c) => sum + (c.stats.nat20Count || 0), 0);
    const totalNat1s = activeCharacters.reduce((sum, c) => sum + (c.stats.nat1Count || 0), 0);

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle('📅 Monthly Character Summary')
      .setDescription(`Activity report for ${activeCharacters.length} characters over the past month`)
      .addFields(
        { name: '💬 Total Messages', value: totalMessages.toString(), inline: true },
        { name: '🎲 Total Dice Rolls', value: totalRolls.toString(), inline: true },
        { name: '🎉 Natural 20s', value: totalNat20s.toString(), inline: true },
        { name: '💀 Natural 1s', value: totalNat1s.toString(), inline: true },
        { name: '🎭 Active Characters', value: activeCharacters.length.toString(), inline: true },
        { name: '📊 Avg Rolls/Char', value: Math.round(totalRolls / activeCharacters.length).toString(), inline: true }
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error posting monthly character summary:', error);
  }
}

/**
 * Announce character milestone (level up, achievement, etc.)
 */
export async function announceCharacterMilestone(characterId: number, milestoneType: string, details: any) {
  try {
    if (!botClient) {
      console.log('Bot client not initialized');
      return;
    }

    const character = await db.select()
      .from(characterSheets)
      .where(eq(characterSheets.id, characterId))
      .limit(1);

    if (character.length === 0) return;

    // Get guild ID from channel mappings
    const mapping = await db.select()
      .from(channelCharacterMappings)
      .where(eq(channelCharacterMappings.characterId, characterId))
      .limit(1);

    if (mapping.length === 0) return;

    const settings = await db.select()
      .from(botSettings)
      .where(eq(botSettings.guildId, mapping[0].guildId))
      .limit(1);

    if (settings.length === 0 || !settings[0].announcementChannelId) {
      return;
    }

    const channel = await botClient.channels.fetch(settings[0].announcementChannelId);
    if (!channel?.isTextBased() || !('send' in channel)) {
      return;
    }

    let embed = new EmbedBuilder()
      .setTimestamp();

    switch (milestoneType) {
      case 'level_up':
        embed.setColor(0x00ff00)
          .setTitle(`🎉 Level Up!`)
          .setDescription(`**${character[0].name}** has reached **Level ${details.newLevel}**!`)
          .addFields({ name: 'Congratulations!', value: 'Your character grows stronger! 💪' });
        break;

      case 'nat20_milestone':
        embed.setColor(0xffd700)
          .setTitle(`🎉 Natural 20 Milestone!`)
          .setDescription(`**${character[0].name}** has rolled **${details.count}** Natural 20s!`)
          .addFields({ name: 'Lucky Streak!', value: 'The dice gods smile upon you! 🎲✨' });
        break;

      case 'message_milestone':
        embed.setColor(0x5865f2)
          .setTitle(`💬 Roleplay Milestone!`)
          .setDescription(`**${character[0].name}** has posted **${details.count}** messages!`)
          .addFields({ name: 'Dedicated Roleplayer!', value: 'Your storytelling knows no bounds! 📖' });
        break;

      case 'damage_milestone':
        embed.setColor(0xff0000)
          .setTitle(`⚔️ Combat Milestone!`)
          .setDescription(`**${character[0].name}** has dealt **${details.totalDamage}** total damage!`)
          .addFields({ name: 'Warrior Supreme!', value: 'Your enemies tremble before you! 💀' });
        break;

      default:
        return;
    }

    if (character[0].avatarUrl) {
      embed.setThumbnail(character[0].avatarUrl);
    }

    await channel.send({ embeds: [embed] });

    // Track milestone in activity feed
    await db.insert(activityFeed).values({
      characterId,
      activityType: milestoneType,
      description: `Milestone: ${milestoneType}`,
      metadata: JSON.stringify(details),
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error announcing character milestone:', error);
  }
}

/**
 * Post leaderboard to announcement channel
 */
export async function postLeaderboardToChannel(guildId: string, category: string = 'messages') {
  try {
    if (!botClient) {
      console.log('Bot client not initialized');
      return;
    }

    const settings = await db.select()
      .from(botSettings)
      .where(eq(botSettings.guildId, guildId))
      .limit(1);

    if (settings.length === 0 || !settings[0].announcementChannelId) {
      console.log(`No announcement channel set for guild ${guildId}`);
      return;
    }

    const channel = await botClient.channels.fetch(settings[0].announcementChannelId);
    if (!channel?.isTextBased() || !('send' in channel)) {
      console.log(`Announcement channel ${settings[0].announcementChannelId} is not text-based`);
      return;
    }

    let orderBy;
    let title;
    let emoji;
    let valueField: keyof typeof characterStats.$inferSelect;

    switch (category) {
      case 'messages':
        orderBy = desc(characterStats.totalMessages);
        title = '💬 Most Active Characters';
        emoji = '💬';
        valueField = 'totalMessages';
        break;
      case 'rolls':
        orderBy = desc(characterStats.totalDiceRolls);
        title = '🎲 Most Dice Rolls';
        emoji = '🎲';
        valueField = 'totalDiceRolls';
        break;
      case 'crits':
        orderBy = desc(characterStats.nat20Count);
        title = '🎉 Most Natural 20s';
        emoji = '🎉';
        valueField = 'nat20Count';
        break;
      case 'fails':
        orderBy = desc(characterStats.nat1Count);
        title = '💀 Most Natural 1s';
        emoji = '💀';
        valueField = 'nat1Count';
        break;
      case 'damage':
        orderBy = desc(characterStats.totalDamageDealt);
        title = '⚔️ Most Damage Dealt';
        emoji = '⚔️';
        valueField = 'totalDamageDealt';
        break;
      default:
        return;
    }

    const stats = await db.select({
      stats: characterStats,
      character: characterSheets
    })
      .from(characterStats)
      .innerJoin(characterSheets, eq(characterStats.characterId, characterSheets.id))
      .innerJoin(channelCharacterMappings, eq(characterSheets.id, channelCharacterMappings.characterId))
      .where(eq(channelCharacterMappings.guildId, guildId))
      .orderBy(orderBy)
      .limit(10);

    if (stats.length === 0) {
      await channel.send('📊 **Leaderboard**\n\nNo stats available yet. Start playing to track stats!');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle(title)
      .setDescription('Top 10 characters in this category')
      .setTimestamp();

    let description = '';
    stats.forEach((entry, index) => {
      const rank = ['🥇', '🥈', '🥉'][index] || `${index + 1}.`;
      const value = entry.stats[valueField] || 0;
      description += `${rank} **${entry.character.name}** - ${emoji} ${value}\n`;
    });

    embed.setDescription(description);

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error posting leaderboard to channel:', error);
  }
}

// ===== RP TIER COMMANDS =====
// All commands below require RP tier subscription

async function handlePrompt(message: Message, args: string[]) {
  try {
    // Check if user has RP tier access
    const userTier = await getUserTierFromDiscord(db, message.author.id);
    if (userTier !== 'rp') {
      await message.reply('🔒 This feature requires an **RP tier** subscription. Upgrade to access prompts, tropes, and advanced RP tools!');
      return;
    }

    const subcmd = args[0]?.toLowerCase();

    if (subcmd === 'random' && args.length > 1) {
      // !prompt random <category>
      const category = args.slice(1).join(' ').toLowerCase();
      const validCategories = ['character', 'world', 'combat', 'social', 'plot'];

      if (!validCategories.includes(category)) {
        await message.reply(`❌ Invalid category. Valid categories: ${validCategories.join(', ')}`);
        return;
      }

      const categoryPrompts = await db
        .select()
        .from(prompts)
        .where(eq(prompts.category, category));

      if (categoryPrompts.length === 0) {
        await message.reply(`❌ No prompts found for category "${category}".`);
        return;
      }

      const randomPrompt = categoryPrompts[Math.floor(Math.random() * categoryPrompts.length)];

      // Update use count
      await db.update(prompts)
        .set({
          useCount: (randomPrompt.useCount || 0) + 1,
          lastUsed: new Date()
        })
        .where(eq(prompts.id, randomPrompt.id));

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle(`💭 ${category.charAt(0).toUpperCase() + category.slice(1)} Prompt`)
        .setDescription(randomPrompt.promptText)
        .setFooter({ text: `Prompt #${randomPrompt.id} • RP Tier Feature` });

      await message.reply({ embeds: [embed] });
    } else {
      // !prompt - Random from any category
      const allPrompts = await db.select().from(prompts);

      if (allPrompts.length === 0) {
        await message.reply('❌ No prompts available. Add some prompts to the database!');
        return;
      }

      const randomPrompt = allPrompts[Math.floor(Math.random() * allPrompts.length)];

      // Update use count
      await db.update(prompts)
        .set({
          useCount: (randomPrompt.useCount || 0) + 1,
          lastUsed: new Date()
        })
        .where(eq(prompts.id, randomPrompt.id));

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle(`💭 ${randomPrompt.category.charAt(0).toUpperCase() + randomPrompt.category.slice(1)} Prompt`)
        .setDescription(randomPrompt.promptText)
        .setFooter({ text: `Prompt #${randomPrompt.id} • RP Tier Feature` });

      await message.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Error in !prompt command:', error);
    await message.reply('❌ Failed to retrieve prompt.');
  }
}

async function handleTrope(message: Message, args: string[]) {
  try {
    // Check if user has RP tier access
    const userTier = await getUserTierFromDiscord(db, message.author.id);
    if (userTier !== 'rp') {
      await message.reply('🔒 This feature requires an **RP tier** subscription. Upgrade to access prompts, tropes, and advanced RP tools!');
      return;
    }

    const category = args.join(' ').toLowerCase();
    let tropeList = [];

    if (category && category !== '') {
      const validCategories = ['archetype', 'dynamic', 'situation', 'plot'];
      if (!validCategories.includes(category)) {
        await message.reply(`❌ Invalid category. Valid categories: ${validCategories.join(', ')}`);
        return;
      }

      tropeList = await db
        .select()
        .from(tropes)
        .where(eq(tropes.category, category));
    } else {
      tropeList = await db.select().from(tropes);
    }

    if (tropeList.length === 0) {
      await message.reply('❌ No tropes available.');
      return;
    }

    const randomTrope = tropeList[Math.floor(Math.random() * tropeList.length)];

    // Update use count
    await db.update(tropes)
      .set({ useCount: (randomTrope.useCount || 0) + 1 })
      .where(eq(tropes.id, randomTrope.id));

    const embed = new EmbedBuilder()
      .setColor('#e74c3c')
      .setTitle(`🎭 ${randomTrope.name}`)
      .setDescription(randomTrope.description)
      .setFooter({ text: `${randomTrope.category.charAt(0).toUpperCase() + randomTrope.category.slice(1)} Trope • RP Tier Feature` });

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in !trope command:', error);
    await message.reply('❌ Failed to retrieve trope.');
  }
}

async function handlePromptSettings(message: Message, args: string[]) {
  // Check if user has admin permissions
  if (!isAdmin(message)) {
    await message.reply('❌ Only administrators can modify prompt settings.');
    return;
  }

  // Check if user has RP tier access
  const userTier = await getUserTierFromDiscord(db, message.author.id);
  if (userTier !== 'rp') {
    await message.reply('🔒 This feature requires an **RP tier** subscription. Upgrade to access daily prompts and advanced RP tools!');
    return;
  }

  const guildId = message.guild?.id;
  if (!guildId) {
    await message.reply('❌ This command can only be used in a server.');
    return;
  }

  const subcmd = args[0]?.toLowerCase();

  try {
    switch (subcmd) {
      case 'enable': {
        // !promptsettings enable <channel_id> <time>
        if (args.length < 3) {
          await message.reply('Usage: `!promptsettings enable <#channel> <HH:MM>`\nExample: `!promptsettings enable #rp-prompts 09:00`');
          return;
        }

        const channelMention = args[1];
        const time = args[2];

        // Parse channel ID from mention
        const channelIdMatch = channelMention.match(/<#(\d+)>/);
        if (!channelIdMatch) {
          await message.reply('❌ Invalid channel mention. Use #channel format.');
          return;
        }
        const channelId = channelIdMatch[1];

        // Validate time format (HH:MM)
        const timeMatch = time.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
        if (!timeMatch) {
          await message.reply('❌ Invalid time format. Use HH:MM (e.g., 09:00, 14:30)');
          return;
        }

        const formattedTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}:00`;

        // Get or create bot settings for this guild
        const existing = await db.select()
          .from(botSettings)
          .where(eq(botSettings.guildId, guildId))
          .limit(1);

        if (existing.length > 0) {
          await db.update(botSettings)
            .set({
              dailyPromptEnabled: true,
              dailyPromptChannelId: channelId,
              dailyPromptTime: formattedTime,
              updatedAt: new Date()
            })
            .where(eq(botSettings.guildId, guildId));
        } else {
          await db.insert(botSettings).values({
            guildId,
            dailyPromptEnabled: true,
            dailyPromptChannelId: channelId,
            dailyPromptTime: formattedTime
          });
        }

        await message.reply(`✅ Daily prompts enabled!\n📍 Channel: <#${channelId}>\n⏰ Time: ${time} (server time)`);
        break;
      }

      case 'disable': {
        await db.update(botSettings)
          .set({ dailyPromptEnabled: false, updatedAt: new Date() })
          .where(eq(botSettings.guildId, guildId));

        await message.reply('✅ Daily prompts disabled.');
        break;
      }

      case 'status': {
        const settings = await db.select()
          .from(botSettings)
          .where(eq(botSettings.guildId, guildId))
          .limit(1);

        if (settings.length === 0 || !settings[0].dailyPromptEnabled) {
          await message.reply('❌ Daily prompts are not enabled. Use `!promptsettings enable` to set up.');
          return;
        }

        const setting = settings[0];
        await message.reply(
          `📊 Daily Prompt Settings:\n` +
          `Status: ${setting.dailyPromptEnabled ? '✅ Enabled' : '❌ Disabled'}\n` +
          `Channel: <#${setting.dailyPromptChannelId}>\n` +
          `Time: ${setting.dailyPromptTime}\n` +
          `Last Posted: ${setting.lastPromptPosted ? new Date(setting.lastPromptPosted).toLocaleString() : 'Never'}`
        );
        break;
      }

      default:
        await message.reply(
          '**Prompt Settings Commands:**\n' +
          '`!promptsettings enable <#channel> <HH:MM>` - Enable daily prompts\n' +
          '`!promptsettings disable` - Disable daily prompts\n' +
          '`!promptsettings status` - View current settings'
        );
    }
  } catch (error) {
    console.error('Error in !promptsettings command:', error);
    await message.reply('❌ Failed to update prompt settings.');
  }
}

export function getDiscordBot() {
  return botClient;
}

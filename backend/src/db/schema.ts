import { pgTable, serial, text, timestamp, integer, boolean, time, varchar, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  email: text('email'),
  isAdmin: boolean('is_admin').default(false).notNull(),
  // PathCompanion account binding (optional)
  pathCompanionUsername: text('path_companion_username'),
  pathCompanionPassword: text('path_companion_password'), // Encrypted
  pathCompanionSessionTicket: text('path_companion_session_ticket'),
  pathCompanionPlayfabId: text('path_companion_playfab_id'),
  pathCompanionConnectedAt: timestamp('path_companion_connected_at'),
  // Discord integration
  discordUserId: text('discord_user_id').unique(), // Discord user ID for bot authentication
  discordBotToken: text('discord_bot_token'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // Storage quotas
  storageQuotaBytes: integer('storage_quota_bytes').default(1073741824), // 1GB default
  storageUsedBytes: integer('storage_used_bytes').default(0)
});

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  content: text('content'),
  userId: integer('user_id').notNull().references(() => users.id),
  parentId: integer('parent_id'),
  isFolder: boolean('is_folder').default(false).notNull(),
  s3Key: text('s3_key'),
  mimeType: text('mime_type'),
  size: integer('size'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const sharedDocuments = pgTable('shared_documents', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').notNull().references(() => documents.id),
  userId: integer('user_id').notNull().references(() => users.id),
  canEdit: boolean('can_edit').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const characterSheets = pgTable('character_sheets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  // Core stats (3-18 range typical for D&D)
  strength: integer('strength').notNull().default(10),
  dexterity: integer('dexterity').notNull().default(10),
  constitution: integer('constitution').notNull().default(10),
  intelligence: integer('intelligence').notNull().default(10),
  wisdom: integer('wisdom').notNull().default(10),
  charisma: integer('charisma').notNull().default(10),
  // Additional info
  characterClass: text('character_class'),
  level: integer('level').default(1),
  race: text('race'),
  alignment: text('alignment'),
  deity: text('deity'),
  size: text('size').default('Medium'),
  // Combat stats
  currentHp: integer('current_hp').default(0),
  maxHp: integer('max_hp').default(0),
  tempHp: integer('temp_hp').default(0),
  armorClass: integer('armor_class').default(10),
  touchAc: integer('touch_ac').default(10),
  flatFootedAc: integer('flat_footed_ac').default(10),
  initiative: integer('initiative').default(0),
  speed: integer('speed').default(30),
  baseAttackBonus: integer('base_attack_bonus').default(0),
  cmb: integer('cmb').default(0),
  cmd: integer('cmd').default(10),
  // Saving throws
  fortitudeSave: integer('fortitude_save').default(0),
  reflexSave: integer('reflex_save').default(0),
  willSave: integer('will_save').default(0),
  // Skills (stored as JSON for flexibility)
  skills: text('skills'), // JSON string of {skillName: {ranks: number, misc: number}}
  // Equipment & abilities
  weapons: text('weapons'), // JSON array of weapon objects
  armor: text('armor'), // JSON string of armor details
  feats: text('feats'), // JSON array of feat names
  specialAbilities: text('special_abilities'), // JSON array of ability descriptions
  spells: text('spells'), // JSON object of spells by level
  // PathCompanion integration
  isPathCompanion: boolean('is_path_companion').default(false),
  pathCompanionId: text('path_companion_id'), // Character ID in PlayFab
  pathCompanionData: text('path_companion_data'), // JSON string of full character data
  pathCompanionSession: text('path_companion_session'), // Session ticket for syncing
  lastSynced: timestamp('last_synced'),
  // Discord proxying
  avatarUrl: text('avatar_url'), // Avatar URL for Discord webhooks
  // Character Bio - Comprehensive Profile
  // Basic Identity
  fullName: text('full_name'),
  titles: text('titles'),
  species: text('species'),
  ageDescription: text('age_description'),
  culturalBackground: text('cultural_background'),
  pronouns: text('pronouns'),
  genderIdentity: text('gender_identity'),
  sexuality: text('sexuality'),
  occupation: text('occupation'),
  currentLocation: text('current_location'),
  // Goals & Motivations
  currentGoal: text('current_goal'),
  longTermDesire: text('long_term_desire'),
  coreMotivation: text('core_motivation'),
  deepestFear: text('deepest_fear'),
  coreBelief: text('core_belief'),
  coreMisconception: text('core_misconception'),
  moralCode: text('moral_code'),
  alignmentTendency: text('alignment_tendency'),
  // Personality
  personalityOneSentence: text('personality_one_sentence'),
  keyVirtues: text('key_virtues'),
  keyFlaws: text('key_flaws'),
  stressBehavior: text('stress_behavior'),
  habitsOrTells: text('habits_or_tells'),
  speechStyle: text('speech_style'),
  // Appearance
  physicalPresence: text('physical_presence'),
  identifyingTraits: text('identifying_traits'),
  clothingAesthetic: text('clothing_aesthetic'),
  // Skills & Abilities
  notableEquipment: text('notable_equipment'),
  skillsReliedOn: text('skills_relied_on'),
  skillsAvoided: text('skills_avoided'),
  // Backstory (Markdown)
  origin: text('origin'),
  greatestSuccess: text('greatest_success'),
  greatestFailure: text('greatest_failure'),
  regret: text('regret'),
  trauma: text('trauma'),
  // Relationships (Markdown)
  importantRelationships: text('important_relationships'),
  protectedRelationship: text('protected_relationship'),
  avoidedRelationship: text('avoided_relationship'),
  rival: text('rival'),
  affiliatedGroups: text('affiliated_groups'),
  // Beliefs
  beliefsPhilosophy: text('beliefs_philosophy'),
  // Public vs Private
  publicFacade: text('public_facade'),
  hiddenAspect: text('hidden_aspect'),
  secret: text('secret'),
  // Growth & Change (Markdown)
  recentChange: text('recent_change'),
  potentialChange: text('potential_change'),
  breakingPoint: text('breaking_point'),
  redemption: text('redemption'),
  // Legacy
  symbolOrMotif: text('symbol_or_motif'),
  legacy: text('legacy'),
  rememberedAs: text('remembered_as'),
  // Public Profile
  isPublic: boolean('is_public').default(false),
  publicSlug: text('public_slug'), // Unique slug for public URLs
  publicViews: integer('public_views').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  sharedDocuments: many(sharedDocuments),
  characterSheets: many(characterSheets)
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id]
  }),
  parent: one(documents, {
    fields: [documents.parentId],
    references: [documents.id]
  }),
  children: many(documents),
  sharedWith: many(sharedDocuments)
}));

export const sharedDocumentsRelations = relations(sharedDocuments, ({ one }) => ({
  document: one(documents, {
    fields: [sharedDocuments.documentId],
    references: [documents.id]
  }),
  user: one(users, {
    fields: [sharedDocuments.userId],
    references: [users.id]
  })
}));

export const characterSheetsRelations = relations(characterSheets, ({ one }) => ({
  user: one(users, {
    fields: [characterSheets.userId],
    references: [users.id]
  })
}));

export const channelCharacterMappings = pgTable('channel_character_mappings', {
  id: serial('id').primaryKey(),
  channelId: text('channel_id').notNull(),
  guildId: text('guild_id').notNull(),
  characterId: integer('character_id').notNull().references(() => characterSheets.id),
  userId: integer('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const channelCharacterMappingsRelations = relations(channelCharacterMappings, ({ one }) => ({
  character: one(characterSheets, {
    fields: [channelCharacterMappings.characterId],
    references: [characterSheets.id]
  }),
  user: one(users, {
    fields: [channelCharacterMappings.userId],
    references: [users.id]
  })
}));

// Knowledge Base for AI FAQ System (per-guild/server)
export const knowledgeBase = pgTable('knowledge_base', {
  id: serial('id').primaryKey(),
  guildId: text('guild_id').notNull(), // Discord server ID - each server has its own knowledge base
  question: text('question').notNull(),
  answer: text('answer').notNull(), // Markdown for Discord
  answerHtml: text('answer_html'), // HTML from Tiptap for web display
  sourceUrl: text('source_url'),
  category: text('category'),
  aiGenerated: boolean('ai_generated').default(false),
  createdBy: integer('created_by').references(() => users.id),
  upvotes: integer('upvotes').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Character Stats Tracking
export const characterStats = pgTable('character_stats', {
  id: serial('id').primaryKey(),
  characterId: integer('character_id').notNull().references(() => characterSheets.id),
  guildId: varchar('guild_id', { length: 255 }).notNull(),
  totalMessages: integer('total_messages').default(0),
  totalDiceRolls: integer('total_dice_rolls').default(0),
  nat20Count: integer('nat20_count').default(0),
  nat1Count: integer('nat1_count').default(0),
  totalDamageDealt: integer('total_damage_dealt').default(0),
  lastActive: timestamp('last_active'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  characterGuildUnique: unique().on(table.characterId, table.guildId)
}));

export const characterStatsRelations = relations(characterStats, ({ one }) => ({
  character: one(characterSheets, {
    fields: [characterStats.characterId],
    references: [characterSheets.id]
  })
}));

// Activity Feed
export const activityFeed = pgTable('activity_feed', {
  id: serial('id').primaryKey(),
  characterId: integer('character_id').notNull().references(() => characterSheets.id),
  activityType: text('activity_type').notNull(), // 'message', 'roll', 'crit', 'fail', etc.
  description: text('description').notNull(),
  metadata: text('metadata'), // JSON string
  timestamp: timestamp('timestamp').defaultNow().notNull()
});

export const activityFeedRelations = relations(activityFeed, ({ one }) => ({
  character: one(characterSheets, {
    fields: [activityFeed.characterId],
    references: [characterSheets.id]
  })
}));

// File Uploads
export const files = pgTable('files', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  fileName: text('file_name').notNull(),
  originalFileName: text('original_file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(), // Size in bytes
  s3Key: text('s3_key').notNull().unique(),
  s3Bucket: text('s3_bucket').notNull(),
  documentId: integer('document_id').references(() => documents.id), // Optional link to a document
  virusScanStatus: text('virus_scan_status').default('pending'), // 'pending', 'clean', 'infected', 'error'
  virusScanDetails: text('virus_scan_details'), // JSON string with scan results
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'), // Soft delete

  // File categories and optimization
  category: text('category').default('document'), // 'avatar', 'image', 'document', 'other'
  thumbnailS3Key: text('thumbnail_s3_key'),
  thumbnailUrl: text('thumbnail_url'),
  isOptimized: boolean('is_optimized').default(false)
});

export const filesRelations = relations(files, ({ one }) => ({
  user: one(users, {
    fields: [files.userId],
    references: [users.id]
  }),
  document: one(documents, {
    fields: [files.documentId],
    references: [documents.id]
  })
}));

// System Settings (for app-wide configuration)
export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Hall of Fame (Starboard)
export const hallOfFame = pgTable('hall_of_fame', {
  id: serial('id').primaryKey(),
  messageId: text('message_id').notNull().unique(),
  channelId: text('channel_id').notNull(),
  guildId: text('guild_id').notNull(),
  authorId: text('author_id').notNull(),
  characterName: text('character_name'),
  content: text('content').notNull(),
  starCount: integer('star_count').default(0),
  contextMessages: text('context_messages'), // JSON array of surrounding messages
  hallMessageId: text('hall_message_id'), // Message ID in hall-of-fame channel
  addedToHallAt: timestamp('added_to_hall_at').defaultNow().notNull()
});

// GM Notes (private notes for game masters)
export const gmNotes = pgTable('gm_notes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  guildId: text('guild_id').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  tags: text('tags'), // JSON array
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const gmNotesRelations = relations(gmNotes, ({ one }) => ({
  user: one(users, {
    fields: [gmNotes.userId],
    references: [users.id]
  })
}));

// In-game time tracking
export const gameTime = pgTable('game_time', {
  id: serial('id').primaryKey(),
  guildId: text('guild_id').notNull().unique(),
  currentDate: text('current_date').notNull(), // e.g., "15th of Mirtul, 1492 DR"
  currentTime: text('current_time'), // e.g., "Evening" or "14:30"
  calendar: text('calendar').default('Forgotten Realms'), // Calendar system
  notes: text('notes'),
  updatedBy: text('updated_by'), // Discord user ID
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Bot settings per guild
export const botSettings = pgTable('bot_settings', {
  id: serial('id').primaryKey(),
  guildId: text('guild_id').notNull().unique(),
  announcementChannelId: text('announcement_channel_id'),
  // Daily prompt settings (RP tier feature)
  dailyPromptEnabled: boolean('daily_prompt_enabled').default(false),
  dailyPromptChannelId: text('daily_prompt_channel_id'),
  dailyPromptTime: text('daily_prompt_time').default('09:00:00'),
  lastPromptPosted: timestamp('last_prompt_posted'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// HC (House Call/Custom) list - user-specific quick notes
export const hcList = pgTable('hc_list', {
  id: serial('id').primaryKey(),
  discordUserId: text('discord_user_id').notNull(), // Store Discord ID directly
  guildId: text('guild_id').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const hcListRelations = relations(hcList, ({ one }) => ({
  user: one(users, {
    fields: [hcList.discordUserId],
    references: [users.discordUserId]
  })
}));

// Character Memories - track important character moments and development
export const characterMemories = pgTable('character_memories', {
  id: serial('id').primaryKey(),
  characterId: integer('character_id').notNull().references(() => characterSheets.id),
  guildId: text('guild_id').notNull(),
  memory: text('memory').notNull(),
  addedBy: text('added_by').notNull(), // Discord user ID who added the memory
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// ===== RP TIER FEATURES =====
// All features below require 'rp' subscription tier

// RP Prompts (RP tier only)
export const prompts = pgTable('prompts', {
  id: serial('id').primaryKey(),
  category: text('category').notNull(), // 'character', 'world', 'combat', 'social', 'plot'
  promptText: text('prompt_text').notNull(),
  useCount: integer('use_count').default(0),
  lastUsed: timestamp('last_used'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // updatedAt: timestamp('updated_at').defaultNow().notNull(), // Column doesn't exist in production DB
});

// Tropes for RP inspiration (RP tier only)
export const tropes = pgTable('tropes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(), // 'archetype', 'dynamic', 'situation', 'plot'
  useCount: integer('use_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // updatedAt: timestamp('updated_at').defaultNow().notNull(), // Column doesn't exist in production DB
});

// Prompt Schedule - for automated daily prompts (RP tier only)
export const promptSchedule = pgTable('prompt_schedule', {
  id: serial('id').primaryKey(),
  guildId: text('guild_id').notNull(),
  channelId: text('channel_id').notNull(),
  time: text('time').notNull(), // HH:MM format
  category: text('category'), // Optional: specific category for scheduled prompts
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Lore Entries - World building notes for RP tier
export const loreEntries = pgTable('lore_entries', {
  id: serial('id').primaryKey(),
  guildId: text('guild_id').notNull(),
  userId: integer('user_id').notNull().references(() => users.id),
  tag: text('tag').notNull(), // e.g. 'history', 'geography', 'factions'
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Channel Lore Tags - Links channels to specific lore tags
export const channelLoreTags = pgTable('channel_lore_tags', {
  id: serial('id').primaryKey(),
  guildId: text('guild_id').notNull(),
  channelId: text('channel_id').notNull(),
  tag: text('tag').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueChannelTag: unique().on(table.guildId, table.channelId) // One tag per channel
}));

// Character Relationships - Track relationships between characters (RP tier)
export const characterRelationships = pgTable('character_relationships', {
  id: serial('id').primaryKey(),
  characterId: integer('character_id').notNull().references(() => characterSheets.id),
  relatedCharacterName: text('related_character_name').notNull(), // Name of the other character
  relationshipType: text('relationship_type').notNull(), // e.g. 'spouse', 'friend', 'enemy', 'sibling'
  description: text('description'), // Optional description
  guildId: text('guild_id').notNull(), // Server context
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const characterMemoriesRelations = relations(characterMemories, ({ one }) => ({
  character: one(characterSheets, {
    fields: [characterMemories.characterId],
    references: [characterSheets.id]
  })
}));

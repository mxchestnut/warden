import cron from 'node-cron';
import { db } from '../db/index.js';
import { botSettings, prompts } from '../db/schema.js';
import { eq, and, lt, sql } from 'drizzle-orm';
import { Client, TextChannel } from 'discord.js';

let schedulerStarted = false;

export function startPromptScheduler(client: Client) {
  if (schedulerStarted) {
    console.log('Prompt scheduler already running');
    return;
  }

  // Run every minute to check if it's time to post prompts
  cron.schedule('* * * * *', async () => {
    try {
      await checkAndPostDailyPrompts(client);
    } catch (error) {
      console.error('Error in prompt scheduler:', error);
    }
  });

  schedulerStarted = true;
  console.log('Daily prompt scheduler started');
}

async function checkAndPostDailyPrompts(client: Client) {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Find all guilds with daily prompts enabled and matching time
  const settingsToProcess = await db
    .select()
    .from(botSettings)
    .where(
      and(
        eq(botSettings.dailyPromptEnabled, true),
        eq(botSettings.dailyPromptTime, currentTime),
        // Only if not posted today
        sql`(${botSettings.lastPromptPosted} IS NULL OR ${botSettings.lastPromptPosted} < ${todayStart})`
      )
    );

  for (const settings of settingsToProcess) {
    try {
      await postDailyPrompt(client, settings);
    } catch (error) {
      console.error(`Error posting daily prompt for guild ${settings.guildId}:`, error);
    }
  }
}

async function postDailyPrompt(client: Client, settings: typeof botSettings.$inferSelect) {
  if (!settings.dailyPromptChannelId) {
    console.warn(`Daily prompt enabled but no channel set for guild ${settings.guildId}`);
    return;
  }

  // Get a random prompt
  const randomPrompt = await db
    .select()
    .from(prompts)
    .orderBy(sql`RANDOM()`)
    .limit(1);

  if (!randomPrompt.length) {
    console.warn('No prompts available in database');
    return;
  }

  const prompt = randomPrompt[0];

  try {
    // Get the channel and post the prompt
    const channel = await client.channels.fetch(settings.dailyPromptChannelId);

    if (!channel || !(channel instanceof TextChannel)) {
      console.warn(`Channel ${settings.dailyPromptChannelId} not found or not a text channel`);
      return;
    }

    const embed = {
      title: '📝 Daily Roleplay Prompt',
      description: prompt.promptText,
      color: 0x9b59b6, // Purple
      fields: [
        {
          name: 'Category',
          value: prompt.category.charAt(0).toUpperCase() + prompt.category.slice(1),
          inline: true
        }
      ],
      footer: {
        text: 'Warden Bot • Use !prompt for more prompts'
      },
      timestamp: new Date().toISOString()
    };

    await channel.send({ embeds: [embed] });

    // Update use count for the prompt
    await db
      .update(prompts)
      .set({
        useCount: (prompt.useCount || 0) + 1,
        lastUsed: new Date()
      })
      .where(eq(prompts.id, prompt.id));

    // Update last posted timestamp
    await db
      .update(botSettings)
      .set({ lastPromptPosted: new Date() })
      .where(eq(botSettings.guildId, settings.guildId));

    console.log(`Posted daily prompt to guild ${settings.guildId}`);
  } catch (error) {
    console.error(`Failed to post prompt to channel ${settings.dailyPromptChannelId}:`, error);
  }
}

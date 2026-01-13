/**
 * Discord event and handler types
 */

import { Message, Interaction, DiscordAPIError } from 'discord.js';

/**
 * Discord command handler type
 */
export type DiscordCommandHandler = (
  message: Message,
  args: string[]
) => Promise<void> | void;

/**
 * Discord interaction handler type
 */
export type DiscordInteractionHandler = (
  interaction: Interaction
) => Promise<void> | void;

/**
 * Discord error handler type
 */
export type DiscordErrorHandler = (
  error: Error | DiscordAPIError
) => Promise<void> | void;

/**
 * Discord message handler
 */
export type DiscordMessageHandler = (message: Message) => Promise<void> | void;

/**
 * Discord ready event handler
 */
export type DiscordReadyHandler = () => Promise<void> | void;

/**
 * Dice roll result
 */
export interface DiceRollResult {
  dice: string;
  total: number;
  rolls: number[];
  modifier: number;
}

/**
 * Skill check result
 */
export interface SkillCheckResult {
  diceRoll: DiceRollResult;
  dc?: number;
  success: boolean;
  description: string;
}

/**
 * Roll command options
 */
export interface RollCommandOptions {
  skill?: string;
  dc?: number;
  modifier?: number;
  advantage?: boolean;
  disadvantage?: boolean;
}

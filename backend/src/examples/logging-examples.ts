import logger, { logInfo, logError, logWarn, createLogger } from '../utils/logger';

/**
 * Example usage of the Pino logger throughout the application
 */

// ==============================================================================
// 1. BASIC LOGGING
// ==============================================================================

// Simple info log
logger.info('Server starting...');

// With data object
logger.info({ port: 3000, env: 'production' }, 'Server configuration');

// Using convenience functions
logInfo('User logged in successfully', { userId: 123 });
logError('Database connection failed', new Error('Connection timeout'));
logWarn('Rate limit approaching', { requests: 95, limit: 100 });

// ==============================================================================
// 2. CONTEXTUAL LOGGING (Child Loggers)
// ==============================================================================

const dbLogger = createLogger('database');
dbLogger.info('Connecting to database...');
dbLogger.error({ connectionString: 'postgres://...' }, 'Connection failed');

const authLogger = createLogger('auth');
authLogger.info({ userId: 123 }, 'User authenticated');
authLogger.warn({ userId: 456 }, 'Failed login attempt');

// ==============================================================================
// 3. ERROR LOGGING WITH STACK TRACES
// ==============================================================================

try {
  throw new Error('Something went wrong');
} catch (error) {
  logger.error({ err: error }, 'Error caught in try/catch');
  // or
  logError('Operation failed', error);
}

// ==============================================================================
// 4. STRUCTURED DATA LOGGING
// ==============================================================================

// Character creation
logger.info({
  event: 'character_created',
  characterId: 789,
  characterName: 'Aragorn',
  userId: 123,
  source: 'web',
}, 'New character created');

// Discord bot command
logger.info({
  event: 'discord_command',
  command: 'roll',
  userId: 456,
  serverId: 'server-123',
  args: ['1d20', '+5'],
}, 'Discord command executed');

// Payment event
logger.info({
  event: 'payment_success',
  userId: 123,
  amount: 9.99,
  currency: 'USD',
  plan: 'pro',
  provider: 'stripe',
}, 'Payment processed successfully');

// ==============================================================================
// 5. PERFORMANCE LOGGING
// ==============================================================================

const startTime = Date.now();
// ... do some work
const duration = Date.now() - startTime;

logger.info({
  operation: 'pathcompanion_sync',
  duration,
  charactersSync: 15,
}, 'PathCompanion sync completed');

// ==============================================================================
// 6. LOG LEVELS
// ==============================================================================

logger.trace({ detail: 'very detailed info' }, 'Trace message'); // Rarely used
logger.debug({ userId: 123 }, 'Debug information');
logger.info({ event: 'user_login' }, 'Informational message');
logger.warn({ usage: 95 }, 'Warning message');
logger.error({ err: new Error('Failed') }, 'Error message');
logger.fatal({ err: new Error('Critical') }, 'Fatal error'); // Application crash

// ==============================================================================
// 7. REAL EXAMPLE: CHARACTER SERVICE
// ==============================================================================

class CharacterService {
  private logger = createLogger('CharacterService');

  async createCharacter(userId: number, data: any) {
    this.logger.info({ userId, characterName: data.name }, 'Creating character');
    
    try {
      // Create character...
      const character = { id: 1, ...data };
      
      this.logger.info({
        event: 'character_created',
        characterId: character.id,
        userId,
      }, 'Character created successfully');
      
      return character;
    } catch (error) {
      this.logger.error({ err: error, userId, data }, 'Failed to create character');
      throw error;
    }
  }

  async syncWithPathCompanion(characterId: number) {
    const syncLogger = this.logger.child({ characterId, operation: 'pc_sync' });
    
    syncLogger.info('Starting PathCompanion sync');
    const startTime = Date.now();
    
    try {
      // Sync logic...
      const duration = Date.now() - startTime;
      
      syncLogger.info({ duration }, 'Sync completed successfully');
    } catch (error) {
      syncLogger.error({ err: error }, 'Sync failed');
      throw error;
    }
  }
}

// ==============================================================================
// 8. REAL EXAMPLE: DISCORD BOT
// ==============================================================================

class DiscordBot {
  private logger = createLogger('DiscordBot');

  handleCommand(command: string, userId: string, args: string[]) {
    const commandLogger = this.logger.child({ command, userId });
    
    commandLogger.info({ args }, 'Command received');
    
    try {
      // Execute command...
      commandLogger.info('Command executed successfully');
    } catch (error) {
      commandLogger.error({ err: error, args }, 'Command execution failed');
    }
  }
}

// ==============================================================================
// 9. REAL EXAMPLE: API ROUTE
// ==============================================================================

import { Request, Response } from 'express';

const routeLogger = createLogger('api.characters');

export const getCharacters = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  
  routeLogger.info({ userId }, 'Fetching characters');
  
  try {
    // Fetch characters...
    const characters: any[] = [];
    
    routeLogger.info({ userId, count: characters.length }, 'Characters fetched');
    res.json(characters);
  } catch (error) {
    routeLogger.error({ err: error, userId }, 'Failed to fetch characters');
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
};

// ==============================================================================
// 10. ENVIRONMENT-SPECIFIC LOGGING
// ==============================================================================

if (process.env.NODE_ENV === 'production') {
  logger.info('Running in production mode - JSON logs');
} else {
  logger.info('Running in development mode - pretty logs');
}

// ==============================================================================
// BEST PRACTICES:
// ==============================================================================
// 1. Always use structured logging (objects) instead of string concatenation
// 2. Use child loggers for context (userId, requestId, etc.)
// 3. Log important events: auth, payments, errors, performance
// 4. Use appropriate log levels (debug < info < warn < error < fatal)
// 5. Include relevant data but redact sensitive info (passwords, tokens)
// 6. Log before and after important operations
// 7. Include timing information for slow operations
// 8. Use consistent event names for log aggregation

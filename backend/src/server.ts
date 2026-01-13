import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root FIRST, before any other imports that use env vars
// Use process.cwd() which points to backend/ directory, so ../.env gets the root .env
dotenv.config({ path: path.join(process.cwd(), '../.env') });

// Validate environment variables before starting server
import env, { isProduction } from './config/env';

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { doubleCsrf } from 'csrf-csrf';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import authRoutes from './routes/auth'; // auth/index.ts
import characterRoutes from './routes/characters'; // characters/index.ts
import pathcompanionRoutes from './routes/characters/pathcompanion';
import discordRoutes from './routes/discord';
import systemRoutes from './routes/system'; // system/index.ts
import adminRoutes from './routes/admin';
import statsRoutes from './routes/stats';
import publicRoutes from './routes/public';
import { setupPassport } from './config/passport';
import { initializeDiscordBot } from './services/discordBot';
import { getSecretsWithFallback } from './config/secrets';
import { reinitializeDatabase, db } from './db';
import { sql } from 'drizzle-orm';
import { initializePasswordRotationTracking } from './db/passwordRotation';
import logger, { logInfo, logError, logWarn } from './utils/logger';
import { httpLogger } from './middleware/logging';
import { setupSwagger } from './config/swagger';

// Prevent multiple server starts using global variable
declare global {
  var __SERVER_STARTED__: boolean | undefined;
}

// Initialize Sentry
Sentry.init({
  dsn: 'https://3703aff1185c87a288fbe6470adcd55e@o4510280685977605.ingest.us.sentry.io/4510601564913664',
  integrations: [
    nodeProfilingIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of transactions
  // Profilingenv.NODE_ENV
  profilesSampleRate: 1.0, // Profile 100% of transactions
  // Environment
  environment: process.env.NODE_ENV || 'development',
});

async function startServer() {
  // Load secrets from AWS Secrets Manager (or .env in development)
  const secrets = await getSecretsWithFallback();

  // Reinitialize database connection with secret from AWS in production
  // Skip if running locally - we want to use the initial DATABASE_URL from .env
  if (isProduction) {
    logger.info('Production mode detected - loading DATABASE_URL from AWS Secrets Manager');
    await reinitializeDatabase(secrets.DATABASE_URL);
  } else {
    logger.info('Development mode - using database from .env file (loaded at module initialization)');
  }

  // Initialize Redis client (optional)
  let redisClient: any = null;
  const useRedis = env.USE_REDIS;

  if (useRedis) {
    try {
      redisClient = createClient({
        socket: {
          host: '127.0.0.1',
          port: 6379,
          connectTimeout: 3000 // 3 second timeout
        }
      });

      redisClient.on('error', (err: Error) => {
        logError('Redis Client Error', err);
      });
      redisClient.on('connect', () => logInfo('Connected to Redis for session storage'));

      await redisClient.connect();
    } catch (error: Error | unknown) {
      const errMessage = error instanceof Error ? error : new Error(String(error));
      logWarn('Redis not available - using in-memory session storage', errMessage);
      redisClient = null;
    }
  } else {
    logger.info('Redis disabled - using in-memory session storage');
  }

  const app = express();
  const PORT = env.PORT;

  // Set Gemini API key as environment variable for Gemini service
  process.env.GEMINI_API_KEY = secrets.GEMINI_API_KEY;

  // Initialize Warden Discord bot
  if (secrets.WARDEN_BOT_TOKEN) {
    initializeDiscordBot(secrets.WARDEN_BOT_TOKEN);
    logger.info('Warden bot initializing...');
  } else {
    logError('WARDEN_BOT_TOKEN not available - bot cannot start!');
    process.exit(1);
  }

  // Trust proxy (nginx)
  app.set('trust proxy', 1);

// HTTP Request Logging (should be early in middleware chain)
app.use(httpLogger);

// Compression middleware (should be early in the chain)
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6 // Balance between compression and CPU usage
}));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  // Disable HSTS for HTTP access (no SSL certificate on EC2)
  hsts: false,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use(cors({
  origin: isProduction
    ? ['https://warden.my', 'https://www.warden.my', 'http://54.235.52.122:3000', 'http://54.235.52.122']
    : ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // Higher limit for dev
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Body parsing and cookie middleware
app.use(cookieParser());

  app.use(express.json({ limit: '10mb' })); // Prevent DoS with large payloads
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Session configuration - use Redis if available, otherwise in-memory
  interface SessionConfigType {
    secret: string;
    resave: boolean;
    saveUninitialized: boolean;
    rolling?: boolean;
    cookie: {
      maxAge: number;
      httpOnly: boolean;
      secure: boolean;
      sameSite: string;
      domain?: string;
      path?: string;
    };
    store?: any;
  }
  
  const sessionConfig: SessionConfigType = {
    secret: secrets.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Refresh session on each request (activity-based)
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days, refreshed on activity
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax'
    }
  };

  if (redisClient) {
    sessionConfig.store = new RedisStore({
      client: redisClient,
      prefix: 'warden:sess:',
      ttl: 86400 * 30 // 30 days absolute maximum in seconds
    });
  }

  app.use(session(sessionConfig as any));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());
setupPassport();

// CSRF Protection
const csrfProtection = doubleCsrf({
  getSecret: () => secrets.SESSION_SECRET,
  getSessionIdentifier: (req) => req.session?.id || '',
  cookieName: 'warden.x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    domain: undefined,
    path: '/'
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});

const doubleCsrfProtection = csrfProtection.doubleCsrfProtection;

// CSRF token endpoint (no protection needed for GET)
app.get('/api/csrf-token', (req, res) => {
  const token = csrfProtection.generateCsrfToken(req, res);
  res.json({ csrfToken: token });
});

// Apply CSRF protection to all API routes except auth (login/register) and discord (bot integration)
// Auth routes handle their own CSRF for better UX
// Discord routes are called by the bot, which can't send CSRF tokens
app.use('/api/characters', doubleCsrfProtection);
app.use('/api/pathcompanion', doubleCsrfProtection);
app.use('/api/system', doubleCsrfProtection);
app.use('/api/admin', doubleCsrfProtection);
app.use('/api/stats', doubleCsrfProtection);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/pathcompanion', pathcompanionRoutes);
app.use('/api/discord', discordRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/public', publicRoutes); // No auth required for public profiles

// Swagger API Documentation
setupSwagger(app);

// Health check (also available at /api/system/health)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static frontend files
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// Serve index.html for all non-API routes (SPA support)
// Express 5 compatible fallback route
app.use((req, res, next) => {
  // Only serve index.html for non-API routes
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    next();
  }
});

  // Sentry error handler - must be before other error handlers
  Sentry.setupExpressErrorHandler(app);

  // Error handling middleware
  app.use((err: Error | unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const error = err instanceof Error ? err : new Error(String(err));
    const userId = (req.user as any)?.id;
    logger.error({ err: error, path: req.path, method: req.method, userId }, 'Request error');

    // Send error to Sentry
    Sentry.captureException(error, {
      user: req.user ? { id: (req.user as any).id, username: (req.user as any).username } : undefined,
      tags: {
        path: req.path,
        method: req.method,
      },
    });

    res.status(500).json({ error: 'Something went wrong!' });
  });

  app.listen(PORT, async () => {
    logger.info({ port: PORT, env: env.NODE_ENV }, 'Server started successfully');
    logger.info(`Secrets loaded from: ${isProduction ? 'AWS Secrets Manager' : '.env file'}`);

    // Initialize password rotation tracking
    await initializePasswordRotationTracking();
    logger.info('Password rotation tracking initialized');

    // Ensure Discord bot tables exist
    try {
      // HC list table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS hc_list (
          id SERIAL PRIMARY KEY,
          discord_user_id TEXT NOT NULL,
          guild_id TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_hc_list_user_guild ON hc_list(discord_user_id, guild_id);
      `);

      // Character Memories table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS character_memories (
          id SERIAL PRIMARY KEY,
          character_id INTEGER NOT NULL REFERENCES character_sheets(id) ON DELETE CASCADE,
          guild_id TEXT NOT NULL,
          memory TEXT NOT NULL,
          added_by TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_character_memories_char ON character_memories(character_id);
        CREATE INDEX IF NOT EXISTS idx_character_memories_guild ON character_memories(guild_id);
      `);

      // Hall of Fame table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS hall_of_fame (
          id SERIAL PRIMARY KEY,
          message_id TEXT NOT NULL UNIQUE,
          channel_id TEXT NOT NULL,
          guild_id TEXT NOT NULL,
          author_id TEXT NOT NULL,
          character_name TEXT,
          content TEXT NOT NULL,
          star_count INTEGER DEFAULT 0,
          context_messages TEXT,
          hall_message_id TEXT,
          added_to_hall_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);

      // Bot Settings table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS bot_settings (
          id SERIAL PRIMARY KEY,
          guild_id TEXT NOT NULL UNIQUE,
          announcement_channel_id TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);

      logger.info('Discord bot tables verified and ready');
    } catch (error) {
      logError('Error creating Discord bot tables', error as Error);
    }
  });
}

// Start the server
if (!global.__SERVER_STARTED__) {
  global.__SERVER_STARTED__ = true;
  startServer().catch(error => {
    logError('Failed to start server', error as Error);
    process.exit(1);
  });
}

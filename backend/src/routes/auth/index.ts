import { Router } from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { db } from '../../db';
import { users, discordConnectionCodes } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { isAuthenticated } from '../../middleware/auth';

const router = Router();

// Rate limiting for login attempts - 5 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for registration - 20 accounts per hour per IP (relaxed for testing)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many accounts created, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Encryption utilities for PathCompanion password
const ENCRYPTION_KEY = process.env.PATHCOMPANION_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

function encryptPassword(password: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

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

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user account
 *     description: Create a new Warden account with username, email, and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - email
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 example: aragorn
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Must contain uppercase, lowercase, number, and special character
 *                 example: MySecureP@ss123
 *               email:
 *                 type: string
 *                 format: email
 *                 example: aragorn@warden.my
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Account created successfully
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input or username/email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many registration attempts (max 20/hour per IP)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Register
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Input validation
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: 'Username must be between 3 and 50 characters' });
    }

    // Password strength requirements
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check for password complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      return res.status(400).json({
        error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      });
    }

    if (email && typeof email === 'string' && email.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    // Check if user already exists
    const [existingUser] = await db.select().from(users).where(eq(users.username, username));
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const [newUser] = await db.insert(users).values({
      username,
      password: hashedPassword,
      email
    }).returning();

    res.json({ message: 'User created successfully', userId: newUser.id });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login with username and password
 *     description: Authenticate and create a session. Returns session cookie.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: aragorn
 *               password:
 *                 type: string
 *                 format: password
 *                 example: MySecureP@ss123
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             description: Session cookie
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many login attempts (max 5 per 15 minutes)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Login
router.post('/login', loginLimiter, (req, res, next) => {
  passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Login failed' });
    }
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    }

    // Log the user in with session
    req.logIn(user, (err) => {
      if (err) {
        console.error('Session login error:', err);
        return res.status(500).json({ error: 'Login failed' });
      }

      // Regenerate session ID to prevent session fixation attacks
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) {
          console.error('Session regeneration error:', regenerateErr);
          return res.status(500).json({ error: 'Login failed' });
        }

        // Re-establish user in new session
        req.logIn(user, (reLoginErr) => {
          if (reLoginErr) {
            console.error('Re-login error:', reLoginErr);
            return res.status(500).json({ error: 'Login failed' });
          }

          // Save session explicitly to ensure persistence
          req.session.save((err) => {
            if (err) {
              console.error('Session save error:', err);
              return res.status(500).json({ error: 'Session save failed' });
            }

            console.log('Login successful for user:', user.username);
            console.log('Session ID:', req.sessionID);
            console.log('Session:', req.session);
            console.log('Cookies being sent:', res.getHeader('Set-Cookie'));

            // Auto-refresh PathCompanion session if connected
            if (user.pathCompanionUsername && user.pathCompanionPassword) {
              (async () => {
                try {
                  const PlayFabService = await import('../../services/playfab');
                  const decryptedPassword = decryptPassword(user.pathCompanionPassword);
                  const auth = await PlayFabService.loginToPlayFab(user.pathCompanionUsername, decryptedPassword);

                  // Update session ticket silently
                  await db.update(users)
                    .set({
                      pathCompanionSessionTicket: auth.sessionTicket,
                      pathCompanionConnectedAt: new Date()
                    })
                    .where(eq(users.id, user.id));

                  console.log('Auto-refreshed PathCompanion session for user:', user.username);
                } catch (error) {
                  console.error('Failed to auto-refresh PathCompanion session:', error);
                  // Don't fail the login if PathCompanion refresh fails
                }
              })();
            }

            res.json({
              message: 'Login successful',
              user: {
                id: user.id,
                username: user.username
              },
              sessionId: req.sessionID // Send session ID to frontend for debugging
            });
          });
        });
      });
    });
  })(req, res, next);
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logout successful' });
  });
});

// Logout all devices - invalidates all sessions for the user
router.post('/logout-all-devices', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const redisClient = (req.sessionStore as any).client;

    if (!redisClient) {
      return res.status(500).json({ error: 'Session store not available' });
    }

    // Get all session keys
    const sessionKeys = await redisClient.keys('warden:sess:*');

    let deletedCount = 0;

    // Check each session to see if it belongs to this user
    for (const key of sessionKeys) {
      try {
        const sessionData = await redisClient.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          // Check if this session belongs to the current user
          if (session.passport && session.passport.user === user.id) {
            await redisClient.del(key);
            deletedCount++;
          }
        }
      } catch (err) {
        console.error('Error processing session key:', key, err);
      }
    }

    console.log(`Logged out ${deletedCount} devices for user ${user.username}`);

    res.json({
      message: 'All devices logged out successfully',
      devicesLoggedOut: deletedCount
    });
  } catch (error) {
    console.error('Error logging out all devices:', error);
    res.status(500).json({ error: 'Failed to logout all devices' });
  }
});

// Get current user
router.get('/me', (req, res) => {
  // DEVELOPMENT ONLY: Mock user response when auth is disabled
  if (process.env.NODE_ENV !== 'production' && process.env.DISABLE_AUTH === 'true') {
    return res.json({
      user: {
        id: 1,
        username: 'dev-user',
        isAdmin: true,
        pathCompanionConnected: false,
        pathCompanionUsername: null
      }
    });
  }

  console.log('GET /me - Cookies received:', req.headers.cookie);
  console.log('GET /me - Session ID:', req.sessionID);
  console.log('GET /me - Session:', req.session);
  console.log('GET /me - User:', req.user);
  console.log('GET /me - isAuthenticated:', req.isAuthenticated());

  if (req.isAuthenticated()) {
    const user = req.user as any;
    res.json({
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin || false,
        pathCompanionConnected: !!user.pathCompanionSessionTicket,
        pathCompanionUsername: user.pathCompanionUsername
      }
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Connect PathCompanion account
router.post('/pathcompanion/connect', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { username, password } = req.body;

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Valid username and password required' });
    }

    // Import PlayFab service
    const PlayFabService = await import('../../services/playfab');

    // Login to PathCompanion to get session ticket
    const auth = await PlayFabService.loginToPlayFab(username, password);

    // Encrypt password for secure storage
    const encryptedPassword = encryptPassword(password);

    const [updatedUser] = await db.update(users)
      .set({
        pathCompanionUsername: username,
        pathCompanionPassword: encryptedPassword,
        pathCompanionSessionTicket: auth.sessionTicket,
        pathCompanionPlayfabId: auth.playfabId,
        pathCompanionConnectedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    res.json({
      message: 'PathCompanion account connected successfully',
      pathCompanionUsername: updatedUser.pathCompanionUsername,
      connectedAt: updatedUser.pathCompanionConnectedAt
    });
  } catch (error) {
    console.error('Failed to connect PathCompanion account:', error);
    res.status(500).json({
      error: 'Failed to connect PathCompanion account',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Disconnect PathCompanion account
router.post('/pathcompanion/disconnect', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;

    // Remove PathCompanion credentials
    await db.update(users)
      .set({
        pathCompanionUsername: null,
        pathCompanionPassword: null,
        pathCompanionSessionTicket: null,
        pathCompanionPlayfabId: null,
        pathCompanionConnectedAt: null
      })
      .where(eq(users.id, userId));

    res.json({ message: 'PathCompanion account disconnected successfully' });
  } catch (error) {
    console.error('Failed to disconnect PathCompanion account:', error);
    res.status(500).json({
      error: 'Failed to disconnect PathCompanion account',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get Discord settings
router.get('/discord-settings', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const [user] = await db.select({
      botToken: users.discordBotToken
    })
    .from(users)
    .where(eq(users.id, userId));

    // Don't send the full token, just indicate if it's configured
    res.json({ hasToken: !!user?.botToken });
  } catch (error) {
    console.error('Failed to get Discord settings:', error);
    res.status(500).json({ error: 'Failed to load Discord settings' });
  }
});

// Save Discord settings
router.post('/discord-settings', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { botToken } = req.body;

    // Validate bot token format if provided (basic check)
    if (botToken && botToken.length < 50) {
      return res.status(400).json({ error: 'Invalid Discord bot token format' });
    }

    await db.update(users)
      .set({ discordBotToken: botToken || null })
      .where(eq(users.id, userId));

    res.json({ message: 'Discord settings saved successfully', hasToken: !!botToken });
  } catch (error) {
    console.error('Failed to save Discord settings:', error);
    res.status(500).json({ error: 'Failed to save Discord settings' });
  }
});

// Delete account endpoint
router.post('/delete-account', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    // Verify password
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Delete user (CASCADE will delete related data)
    await db.delete(users).where(eq(users.id, userId));

    // Log out
    req.logout((err) => {
      if (err) console.error('Logout error:', err);
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Failed to delete account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

/**
 * @swagger
 * /api/auth/generate-discord-code:
 *   post:
 *     tags: [Authentication]
 *     summary: Generate a one-time code for Discord account linking
 *     description: Creates a unique code that expires in 15 minutes for secure Discord connection
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Code generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: A1B2C3D4E5F6
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                   example: 2026-01-13T12:15:00.000Z
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/generate-discord-code', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Invalidate any existing unused codes for this user
    await db
      .update(discordConnectionCodes)
      .set({ used: true })
      .where(
        and(
          eq(discordConnectionCodes.userId, userId),
          eq(discordConnectionCodes.used, false)
        )
      );

    // Generate a random 6-byte code (12 hex characters)
    const code = crypto.randomBytes(6).toString('hex').toUpperCase();
    
    // Code expires in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Store the code
    await db.insert(discordConnectionCodes).values({
      userId,
      code,
      expiresAt
    });

    res.json({ code, expiresAt });
  } catch (error) {
    console.error('Failed to generate Discord connection code:', error);
    res.status(500).json({ error: 'Failed to generate connection code' });
  }
});

export default router;

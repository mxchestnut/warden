import swaggerJsdoc from 'swagger-jsdoc';
import { Application } from 'express';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Warden API Documentation',
      version: '1.0.0',
      description: `
## Warden - Social Writing Platform & Discord Bot for Pathfinder 1E

**Warden** is a comprehensive platform for tabletop RPG players to manage their characters, 
collaborate on stories, and integrate with Discord.

### Features
- 🎭 **Character Management** - Create and manage Pathfinder 1E characters
- 📝 **Studio Writing Workspace** - Collaborative document editing with TipTap
- 🎲 **Discord Bot Integration** - Roll dice, manage characters, and more
- 👥 **Groups & Collaboration** - Share characters and documents with your party
- 🔒 **Secure Authentication** - Passport-based auth with session management
- 💎 **Subscription Tiers** - Free, Pro, and Master tiers with Stripe payments
- 🎮 **PathCompanion Integration** - Sync characters with PathCompanion.com

### Authentication
Most endpoints require authentication via session cookies. Use \`POST /api/auth/login\` first.

### Rate Limiting
API is rate-limited to 100 requests per 15 minutes in production (1000 in development).

### CSRF Protection
All POST/PUT/DELETE requests require a CSRF token from \`GET /api/csrf-token\`.
      `,
      contact: {
        name: 'Warden Support',
        url: 'https://warden.my',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://warden.my',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session cookie (set automatically after login)',
        },
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'x-csrf-token',
          description: 'CSRF token (get from /api/csrf-token)',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 123 },
            username: { type: 'string', example: 'aragorn' },
            email: { type: 'string', format: 'email', example: 'aragorn@warden.my' },
            tier: { 
              type: 'string', 
              enum: ['free', 'pro', 'master'], 
              example: 'pro',
              description: 'Subscription tier',
            },
            isAdmin: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Character: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 456 },
            userId: { type: 'integer', example: 123 },
            name: { type: 'string', example: 'Aragorn' },
            race: { type: 'string', example: 'Human' },
            class: { type: 'string', example: 'Ranger' },
            level: { type: 'integer', example: 5 },
            bio: { type: 'string', example: 'A ranger from the north...' },
            avatarUrl: { type: 'string', nullable: true },
            isPublic: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Document: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 789 },
            userId: { type: 'integer', example: 123 },
            title: { type: 'string', example: 'Campaign Notes' },
            content: { type: 'string', example: '<p>Session 1 notes...</p>' },
            folderId: { type: 'integer', nullable: true },
            isPublic: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Group: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Fellowship of the Ring' },
            description: { type: 'string', example: 'Our D&D party' },
            ownerId: { type: 'integer', example: 123 },
            inviteCode: { type: 'string', example: 'abc123xyz' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Authentication required' },
            message: { type: 'string', example: 'Please log in to access this resource' },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Not authenticated - session cookie required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Authentication required' },
            },
          },
        },
        Forbidden: {
          description: 'Authenticated but not authorized for this resource',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'You do not have permission to access this resource' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Resource not found' },
            },
          },
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Validation error', message: 'Invalid email format' },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Authentication', description: 'Login, register, logout, session management' },
      { name: 'Characters', description: 'Character CRUD, avatar upload, public profiles' },
      { name: 'Documents', description: 'Document management and Studio workspace' },
      { name: 'Groups', description: 'Party/group management and invitations' },
      { name: 'Discord', description: 'Discord bot integration endpoints' },
      { name: 'PathCompanion', description: 'PathCompanion.com character sync' },
      { name: 'Files', description: 'File upload and management (S3)' },
      { name: 'Admin', description: 'Admin-only endpoints (requires admin role)' },
      { name: 'Public', description: 'Public endpoints (no authentication required)' },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/routes/*.js',
    './dist/routes/*.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Application) => {
  // Swagger UI
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Warden API Documentation',
    customfavIcon: '/favicon.ico',
  }));

  // JSON endpoint for OpenAPI spec
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

export default swaggerSpec;

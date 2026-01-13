# Environment Variable Validation

## Overview

Warden now validates **all environment variables on startup** using Zod. This ensures:
- ✅ All required variables are present
- ✅ Values are in the correct format (URLs, numbers, etc.)
- ✅ Clear error messages if anything is missing
- ✅ Type-safe environment access throughout the codebase

**Location:** [backend/src/config/env.ts](backend/src/config/env.ts)

---

## Validated Variables

### Required (Server won't start without these)

| Variable | Type | Description |
|----------|------|-------------|
| `DATABASE_URL` | URL | PostgreSQL connection string |
| `SESSION_SECRET` | String (min 32 chars) | Session cookie signing secret |
| `WARDEN_BOT_TOKEN` | String (min 50 chars) | Discord bot token |
| `GEMINI_API_KEY` | String (min 20 chars) | Google Gemini API key |

### Optional (with defaults)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NODE_ENV` | enum | `development` | `development`, `production`, or `test` |
| `PORT` | Number | `3000` | Server port |
| `AWS_REGION` | String | `us-east-1` | AWS region |
| `USE_REDIS` | Boolean | `true` | Enable Redis for sessions |
| `LOG_LEVEL` | enum | `info` | `trace`, `debug`, `info`, `warn`, `error`, `fatal` |

### Optional (features)

| Variable | Type | Description |
|----------|------|-------------|
| `AWS_ACCESS_KEY_ID` | String | AWS credentials for S3 |
| `AWS_SECRET_ACCESS_KEY` | String | AWS secret key |
| `AWS_S3_BUCKET` | String | S3 bucket name |
| `PLAYFAB_TITLE_ID` | String | PathCompanion integration |
| `PLAYFAB_SECRET_KEY` | String | PathCompanion API key |
| `PATHCOMPANION_ENCRYPTION_KEY` | String | Encrypt PathCompanion passwords |
| `STRIPE_SECRET_KEY` | String | Stripe payment processing |
| `STRIPE_WEBHOOK_SECRET` | String | Stripe webhook verification |
| `STRIPE_PRICE_ID_PRO` | String | Pro tier price ID |
| `STRIPE_PRICE_ID_MASTER` | String | Master tier price ID |
| `SENTRY_DSN` | URL | Sentry error tracking |

---

## Usage

### Import Validated Environment

```typescript
import env from './config/env';

// Type-safe access
const port = env.PORT; // number
const nodeEnv = env.NODE_ENV; // 'development' | 'production' | 'test'
const databaseUrl = env.DATABASE_URL; // string (validated URL)
```

### Helper Functions

```typescript
import { isProduction, isDevelopment, isTest, requireEnv } from './config/env';

// Environment checks
if (isProduction) {
  // Production-only code
}

if (isDevelopment) {
  // Development-only code
}

// Require a specific env var (throws if not set)
const apiKey = requireEnv('GEMINI_API_KEY');
```

---

## Example Error Messages

If you start the server with **missing required variables**, you'll see:

```
❌ Environment validation failed:

  • DATABASE_URL: Required
    → PostgreSQL connection string (e.g., postgresql://user:pass@host:5432/db)
  
  • SESSION_SECRET: String must contain at least 32 character(s)
    → Session secret for cookie signing (min 32 characters)
  
  • WARDEN_BOT_TOKEN: Required
    → Discord bot token from Discord Developer Portal

Please check your .env file and ensure all required variables are set.
```

If a **URL is invalid**:

```
❌ Environment validation failed:

  • DATABASE_URL: Invalid url
    → PostgreSQL connection string (e.g., postgresql://user:pass@host:5432/db)
```

If **PORT is not a number**:

```
❌ Environment validation failed:

  • PORT: Invalid
```

---

## Adding New Environment Variables

### 1. Update the Schema

Edit [backend/src/config/env.ts](backend/src/config/env.ts):

```typescript
const envSchema = z.object({
  // ... existing vars ...
  
  // Add new variable
  MY_NEW_API_KEY: z.string().min(10).describe('My new API service key'),
  
  // Or optional with default
  MY_FEATURE_ENABLED: z.string().transform(val => val === 'true').default('false'),
});
```

### 2. Add to .env File

```bash
MY_NEW_API_KEY=sk_test_abc123xyz789
MY_FEATURE_ENABLED=true
```

### 3. Rebuild Backend

```bash
cd backend
npm run build
npm start
```

### 4. Use in Code

```typescript
import env from './config/env';

const apiKey = env.MY_NEW_API_KEY; // Type-safe!
```

---

## Schema Types

### String Validation

```typescript
// Required string
API_KEY: z.string()

// Minimum length
SESSION_SECRET: z.string().min(32)

// URL format
DATABASE_URL: z.string().url()

// Email format
ADMIN_EMAIL: z.string().email()

// Regex pattern
PHONE: z.string().regex(/^\+\d{10,15}$/)
```

### Number Validation

```typescript
// Parse string to number
PORT: z.string().regex(/^\d+$/).transform(Number)

// Or use coerce
PORT: z.coerce.number().min(1).max(65535)

// With default
MAX_CONNECTIONS: z.coerce.number().default(100)
```

### Boolean Validation

```typescript
// Parse string to boolean
FEATURE_ENABLED: z.string().transform(val => val === 'true').default('false')

// Or
DEBUG_MODE: z.enum(['true', 'false']).transform(val => val === 'true')
```

### Enum Validation

```typescript
// Only allow specific values
NODE_ENV: z.enum(['development', 'production', 'test'])

LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
```

### Optional with Default

```typescript
// Uses default if not provided
AWS_REGION: z.string().default('us-east-1')

PORT: z.string().default('3000')

LOG_LEVEL: z.enum(['info', 'debug']).default('info')
```

### Optional (undefined allowed)

```typescript
// Can be undefined
SENTRY_DSN: z.string().url().optional()

STRIPE_SECRET_KEY: z.string().optional()
```

---

## Type Safety

The validated environment is **fully typed**:

```typescript
// env.ts exports this type
export type Env = z.infer<typeof envSchema>;

// Example:
type Env = {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  SESSION_SECRET: string;
  WARDEN_BOT_TOKEN: string;
  GEMINI_API_KEY: string;
  USE_REDIS: boolean;
  LOG_LEVEL: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  // ... etc
}
```

TypeScript will **autocomplete** and **type-check** all env access:

```typescript
import env from './config/env';

env.PORT // ✅ number
env.NODE_ENV // ✅ 'development' | 'production' | 'test'
env.NONEXISTENT // ❌ TypeScript error!
```

---

## Testing

### Test with Missing Variables

Temporarily rename your `.env` file:

```bash
mv ../.env ../.env.backup
npm start
```

You'll see validation errors immediately.

### Test with Invalid Variables

Set invalid values in `.env`:

```bash
DATABASE_URL=not-a-url
SESSION_SECRET=short
PORT=abc123
```

Validation will fail with clear error messages.

### Restore .env

```bash
mv ../.env.backup ../.env
```

---

## Production Considerations

### AWS Secrets Manager

In production, secrets are loaded from AWS Secrets Manager **after** initial env validation. This is intentional:

1. **Startup validation** - Validates .env structure (even if values are placeholders)
2. **Runtime secrets** - Loads actual secrets from AWS Secrets Manager
3. **Reinitialize** - Updates sensitive values (DATABASE_URL, etc.)

### Docker/Kubernetes

Environment variables can be set in:

- `docker-compose.yml`:
  ```yaml
  environment:
    - NODE_ENV=production
    - PORT=3000
    - DATABASE_URL=${DATABASE_URL}
  ```

- Kubernetes ConfigMap/Secret:
  ```yaml
  env:
    - name: NODE_ENV
      value: production
    - name: DATABASE_URL
      valueFrom:
        secretKeyRef:
          name: warden-secrets
          key: database-url
  ```

---

## Migration from Old Code

### Before (Unsafe)

```typescript
const port = process.env.PORT || 3000; // Could be string "3000"
const isProduction = process.env.NODE_ENV === 'production'; // Typos not caught
const apiKey = process.env.API_KEY; // Could be undefined!
```

### After (Safe)

```typescript
import env, { isProduction } from './config/env';

const port = env.PORT; // Guaranteed number
if (isProduction) { // Type-safe
  const apiKey = env.GEMINI_API_KEY; // Guaranteed string
}
```

---

## Troubleshooting

### "Environment validation failed" on startup

1. Check `.env` file exists in project root
2. Verify all required variables are set
3. Check variable formats (URLs, numbers, etc.)
4. Look at error messages - they show exactly what's wrong

### Variable not being validated

1. Make sure it's added to `envSchema` in [env.ts](backend/src/config/env.ts)
2. Rebuild backend: `npm run build`
3. Restart server: `npm start`

### Type errors when accessing env

1. Import from `./config/env`, not `process.env`
2. Rebuild to update types: `npm run build`

---

## About Zod Updates

**Question:** Is updating Zod from 3.22.4 safe?

**Answer:** Yes! ✅

- Zod 3.x is stable - no breaking changes within v3
- You can safely update to 3.24+ (latest v3)
- Breaking changes were v2 → v3 (already migrated)
- Renovate will create PR for Zod updates if you enable it in [renovate.json](../renovate.json)

**To update Zod now:**
```bash
cd backend
npm install zod@latest
npm run build
npm start
```

---

## Related Documentation

- [TECH_STACK.md](../TECH_STACK.md) - Full technology stack
- [LOGGING.md](../LOGGING.md) - Pino logging system
- [Zod Documentation](https://zod.dev/) - Official Zod docs

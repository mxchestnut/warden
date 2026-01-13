# Warden - Logging System Documentation

## Overview

Warden uses **Pino** for structured, high-performance logging. Pino is one of the fastest Node.js loggers available and provides structured JSON logging that's easy to query and analyze in production.

## Features

- ✅ **Pretty Logs in Development** - Colored, human-readable output
- ✅ **JSON Logs in Production** - Machine-readable, structured data
- ✅ **HTTP Request Logging** - Automatic logging of all API requests
- ✅ **Sensitive Data Redaction** - Passwords, tokens, and cookies are hidden
- ✅ **Request ID Tracking** - Trace requests across the system
- ✅ **Child Loggers** - Context-specific logging (e.g., per-service)
- ✅ **Performance Tracking** - Log operation durations
- ✅ **Log Levels** - trace, debug, info, warn, error, fatal

---

## Configuration

### Logger Setup

Location: `backend/src/utils/logger.ts`

```typescript
import logger, { logInfo, logError, logWarn, logDebug, createLogger } from './utils/logger';
```

**Key Settings:**
- **Development:** Pretty-printed with colors, formatted timestamps
- **Production:** JSON format for log aggregation services (e.g., CloudWatch, Datadog)
- **Redaction:** Automatically removes sensitive fields from logs

**Redacted Fields:**
- `password`
- `authorization`
- `cookie`
- `token`
- `apiKey`
- `secret`

### HTTP Logging Middleware

Location: `backend/src/middleware/logging.ts`

Automatically logs all HTTP requests with:
- Request method, URL, and status code
- Response time in milliseconds
- User ID and username (if authenticated)
- Request ID for tracing

**Ignored Routes:** `/health`, `/ping`, `/metrics` (to reduce noise)

**Log Levels by Status Code:**
- 500-599: **error**
- 400-499: **warn**
- 300-399: **info**
- 200-299: **debug**

---

## Usage Examples

### 1. Basic Logging

```typescript
import logger, { logInfo, logError, logWarn } from './utils/logger';

// Simple info log
logger.info('User logged in successfully');

// With structured data
logger.info({ userId: 123, username: 'aragorn' }, 'User logged in');

// Using convenience functions
logInfo('Server started', { port: 3000 });
logError('Database connection failed', new Error('Timeout'));
logWarn('Rate limit approaching', { requests: 95, limit: 100 });
```

### 2. Child Loggers (Context-Specific)

```typescript
import { createLogger } from './utils/logger';

const authLogger = createLogger('auth');
authLogger.info({ userId: 123 }, 'User authenticated');
authLogger.warn({ userId: 456 }, 'Failed login attempt');

const dbLogger = createLogger('database');
dbLogger.info('Connection established');
dbLogger.error({ connectionString: 'postgres://...' }, 'Connection failed');
```

### 3. Error Logging with Stack Traces

```typescript
try {
  // Some operation
  throw new Error('Something went wrong');
} catch (error) {
  // Option 1: Full details
  logger.error({ err: error }, 'Operation failed');
  
  // Option 2: Convenience function
  logError('Operation failed', error);
}
```

### 4. Structured Event Logging

```typescript
// Character creation event
logger.info({
  event: 'character_created',
  characterId: 789,
  characterName: 'Aragorn',
  userId: 123,
  source: 'web'
}, 'New character created');

// Discord bot command
logger.info({
  event: 'discord_command',
  command: 'roll',
  userId: '456',
  serverId: 'server-123',
  args: ['1d20', '+5']
}, 'Discord command executed');

// Payment event
logger.info({
  event: 'payment_success',
  userId: 123,
  amount: 9.99,
  currency: 'USD',
  plan: 'pro',
  provider: 'stripe'
}, 'Payment processed successfully');
```

### 5. Performance Logging

```typescript
const startTime = Date.now();

// ... perform operation ...

const duration = Date.now() - startTime;

logger.info({
  operation: 'pathcompanion_sync',
  duration,
  charactersSync: 15
}, 'PathCompanion sync completed');
```

### 6. Service Class Example

```typescript
import { createLogger } from './utils/logger';

class CharacterService {
  private logger = createLogger('CharacterService');

  async createCharacter(userId: number, data: any) {
    this.logger.info({ userId, characterName: data.name }, 'Creating character');
    
    try {
      const character = await this.db.insert(data);
      
      this.logger.info({
        event: 'character_created',
        characterId: character.id,
        userId
      }, 'Character created successfully');
      
      return character;
    } catch (error) {
      this.logger.error({ err: error, userId }, 'Failed to create character');
      throw error;
    }
  }
}
```

### 7. API Route Example

```typescript
import { createLogger } from './utils/logger';

const routeLogger = createLogger('api.characters');

export const getCharacters = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  routeLogger.info({ userId }, 'Fetching characters');
  
  try {
    const characters = await fetchCharacters(userId);
    
    routeLogger.info({ userId, count: characters.length }, 'Characters fetched');
    res.json(characters);
  } catch (error) {
    routeLogger.error({ err: error, userId }, 'Failed to fetch characters');
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
};
```

---

## Log Levels

Pino supports 6 log levels (in order of severity):

| Level | Severity | Use Case |
|-------|----------|----------|
| `trace` | 10 | Very detailed debugging (rarely used) |
| `debug` | 20 | Debug information during development |
| `info` | 30 | **Standard application events** (default) |
| `warn` | 40 | Warning conditions (e.g., rate limits, deprecated features) |
| `error` | 50 | Error conditions that need attention |
| `fatal` | 60 | Critical errors causing application crash |

**Usage:**
```typescript
logger.trace('Very detailed debug info');
logger.debug('Debug information');
logger.info('Normal operation');
logger.warn('Warning condition');
logger.error('Error occurred');
logger.fatal('Critical failure - app crashing');
```

---

## Production Log Format

In production, logs are output as JSON:

```json
{
  "level": 30,
  "time": 1704067200000,
  "pid": 12345,
  "hostname": "warden-server",
  "msg": "User logged in",
  "userId": 123,
  "username": "aragorn",
  "event": "user_login"
}
```

This format is ideal for:
- AWS CloudWatch Logs
- Datadog
- Splunk
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Any log aggregation service

---

## Development Log Format

In development, logs are pretty-printed with colors:

```
[2024-01-01 12:00:00] INFO: User logged in
    userId: 123
    username: "aragorn"
    event: "user_login"
```

Colors by level:
- 🔵 **DEBUG** - Blue
- 🟢 **INFO** - Green
- 🟡 **WARN** - Yellow
- 🔴 **ERROR** - Red
- ⚫ **FATAL** - Red (bold)

---

## HTTP Request Logs

All HTTP requests are automatically logged by the `httpLogger` middleware:

```json
{
  "level": 30,
  "time": 1704067200000,
  "req": {
    "id": "req-abc123",
    "method": "POST",
    "url": "/api/characters",
    "headers": {
      "user-agent": "Mozilla/5.0...",
      "content-type": "application/json"
    }
  },
  "res": {
    "statusCode": 201
  },
  "responseTime": 45,
  "userId": 123,
  "username": "aragorn",
  "msg": "request completed"
}
```

---

## Best Practices

### ✅ DO:
1. **Use structured logging** - Always include data objects
   ```typescript
   logger.info({ userId, action: 'login' }, 'User logged in');
   ```

2. **Use child loggers for context** - Create module/service-specific loggers
   ```typescript
   const authLogger = createLogger('auth');
   ```

3. **Log important events** - Auth, payments, errors, data changes
   ```typescript
   logger.info({ event: 'payment_success', amount: 9.99 }, 'Payment processed');
   ```

4. **Include timing for slow operations**
   ```typescript
   const startTime = Date.now();
   // ... operation ...
   logger.info({ duration: Date.now() - startTime }, 'Operation completed');
   ```

5. **Use consistent event names** - Makes log aggregation easier
   ```typescript
   logger.info({ event: 'character_created' }, '...');
   logger.info({ event: 'character_updated' }, '...');
   logger.info({ event: 'character_deleted' }, '...');
   ```

### ❌ DON'T:
1. **Don't concatenate strings** - Use structured data instead
   ```typescript
   // ❌ Bad
   logger.info(`User ${userId} logged in`);
   
   // ✅ Good
   logger.info({ userId }, 'User logged in');
   ```

2. **Don't log sensitive data** - Already redacted, but be careful
   ```typescript
   // ❌ Bad
   logger.info({ password: user.password }, 'User created');
   
   // ✅ Good
   logger.info({ userId: user.id }, 'User created');
   ```

3. **Don't use console.log** - Always use the logger
   ```typescript
   // ❌ Bad
   console.log('Something happened');
   
   // ✅ Good
   logger.info('Something happened');
   ```

4. **Don't log inside loops** - Use summary logs instead
   ```typescript
   // ❌ Bad
   for (const character of characters) {
     logger.info({ characterId: character.id }, 'Processing character');
   }
   
   // ✅ Good
   logger.info({ count: characters.length }, 'Processing characters');
   ```

---

## Migration from console.log

### Find and Replace

```bash
# Find all console.log statements
grep -r "console.log" backend/src/

# Replace with structured logging
```

### Common Patterns

```typescript
// Before: console.log
console.log('Server started on port 3000');

// After: logger.info
logger.info({ port: 3000 }, 'Server started');

// Before: console.error
console.error('Error:', error);

// After: logger.error
logger.error({ err: error }, 'Error occurred');

// Before: console.warn
console.warn('Rate limit approaching');

// After: logger.warn
logger.warn({ usage: 95, limit: 100 }, 'Rate limit approaching');
```

---

## Viewing Logs

### Local Development

Logs appear in the terminal where you started the server:

```bash
cd backend
npm start
```

Pretty-printed output with colors.

### Production (PM2)

```bash
# View live logs
pm2 logs warden-backend

# View last 100 lines
pm2 logs warden-backend --lines 100

# View only error logs
pm2 logs warden-backend --err

# Save logs to file
pm2 logs warden-backend --out warden.log
```

### Production (CloudWatch/Datadog)

JSON logs can be shipped to log aggregation services:
- AWS CloudWatch Logs
- Datadog
- Splunk
- ELK Stack

Query examples:
```
# Find all login events
{ event = "user_login" }

# Find errors for user 123
{ userId = 123 AND level = "error" }

# Find slow operations (>1000ms)
{ duration > 1000 }
```

---

## Troubleshooting

### Logs not appearing?

1. Check that logger is imported:
   ```typescript
   import logger from './utils/logger';
   ```

2. Verify log level (default is `info`):
   ```typescript
   logger.info('This will show');
   logger.debug('This might not show');
   ```

3. Check environment variable:
   ```bash
   LOG_LEVEL=debug npm start
   ```

### Too many logs in production?

1. Increase log level:
   ```bash
   LOG_LEVEL=warn npm start
   ```

2. Use child loggers to filter by module
3. Ignore noisy routes in `httpLogger` middleware

### Want to see all logs in development?

```bash
LOG_LEVEL=trace npm start
```

---

## Files Overview

| File | Purpose |
|------|---------|
| `backend/src/utils/logger.ts` | Main logger configuration |
| `backend/src/middleware/logging.ts` | HTTP request logging middleware |
| `backend/src/examples/logging-examples.ts` | Usage examples and patterns |
| `LOGGING.md` | This documentation |

---

## Next Steps

1. **Migrate console.log statements** - Replace all `console.log` with `logger.*`
2. **Add structured logging** - Include relevant data objects
3. **Create child loggers** - Per-service or per-module loggers
4. **Set up log aggregation** - CloudWatch, Datadog, etc. (production)
5. **Monitor and alert** - Set up alerts for error logs

---

## Related Documentation

- [TECH_STACK.md](./TECH_STACK.md) - Full technology stack
- [TESTING.md](./TESTING.md) - Testing framework documentation
- [DATABASE_BACKUP.md](./DATABASE_BACKUP.md) - Database backup strategy
- [Pino Documentation](https://getpino.io/) - Official Pino docs

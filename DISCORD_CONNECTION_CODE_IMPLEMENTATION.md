# Discord Connection Code Implementation

**Date:** January 13, 2026  
**Feature:** Secure Discord account linking with one-time codes

---

## Overview

Replaced the insecure `!connect username password` command with a secure one-time connection code system. Users now generate a code from their profile settings and use it in Discord to link their account.

---

## Security Improvements

### Before (Insecure) ❌
```
!connect myusername MyPassword123!
```
- Password transmitted through Discord (even if message deleted)
- Risk of password exposure in message logs, bots, or Discord's systems
- Credentials could be intercepted or cached

### After (Secure) ✅
```
!connect A1B2C3D4E5F6
```
- No passwords transmitted through Discord
- One-time use codes (cannot be reused)
- Codes expire after 15 minutes
- Codes invalidated immediately after use

---

## Implementation Details

### 1. Database Schema

**New Table:** `discord_connection_codes`

```sql
CREATE TABLE "discord_connection_codes" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "code" text NOT NULL UNIQUE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used" boolean DEFAULT false NOT NULL
);
```

**Indexes:**
- `idx_discord_codes_code` - Fast code lookup
- `idx_discord_codes_user_id` - User queries
- `idx_discord_codes_expires_at` - Cleanup queries

**File:** `backend/drizzle/0005_add_discord_connection_codes.sql`

---

### 2. Backend API

**New Endpoint:** `POST /api/auth/generate-discord-code`

**Authentication:** Requires logged-in user (session cookie)

**Response:**
```json
{
  "code": "A1B2C3D4E5F6",
  "expiresAt": "2026-01-13T12:15:00.000Z"
}
```

**Behavior:**
1. Generates 12-character hex code (uppercase)
2. Invalidates any existing unused codes for user
3. Sets 15-minute expiration
4. Returns code and expiration timestamp

**File:** `backend/src/routes/auth/index.ts`

---

### 3. Discord Bot Handler

**Updated Command:** `handleConnect(message, args)`

**Old Behavior:**
```typescript
// Expects: !connect username password
// Authenticates via API call
// Deletes message after validation
```

**New Behavior:**
```typescript
// Expects: !connect CODE
// Validates code in database:
//   - Code exists
//   - Not used
//   - Not expired
// Links Discord ID to user
// Marks code as used
// Deletes message for security
```

**Validation:**
```typescript
WHERE 
  code = 'ABC123XYZ' AND
  used = false AND
  expires_at > NOW()
```

**File:** `backend/src/services/discordBot.ts`

---

### 4. Frontend UI

**Location:** Profile Settings → Discord Tab

**Features:**
1. **Generate Code Button**
   - Calls `/api/auth/generate-discord-code`
   - Shows loading state during generation
   
2. **Code Display**
   - Large monospace font (easy to read)
   - Green background (success color)
   - Copy-friendly format
   
3. **Instructions**
   - Step-by-step guide
   - Example command: `!connect A1B2C3D4E5F6`
   - Expiration time displayed
   
4. **Auto-invalidation**
   - Previous unused codes invalidated when generating new one
   - Only one active code per user at a time

**File:** `frontend-src/src/pages/ProfileSettings.tsx`

---

## User Flow

### Step 1: Generate Code (Website)

1. User logs into https://warden.my
2. Navigates to **Profile & Settings**
3. Clicks **Discord** tab
4. Clicks **"Generate Discord Connection Code"**
5. Code appears on screen with expiration time

**Example Display:**
```
Your connection code (expires in 15 minutes):

┌─────────────────────┐
│   A1B2C3D4E5F6      │
└─────────────────────┘

To connect your Discord account:
1. Open Discord
2. Send this command:

!connect A1B2C3D4E5F6

⏱️ Expires at 12:15:00 PM
```

---

### Step 2: Connect in Discord

1. User opens Discord
2. Sends command in any channel or DM to Warden bot:
   ```
   !connect A1B2C3D4E5F6
   ```
3. Bot deletes the message immediately
4. Bot validates code:
   - ✅ Code exists
   - ✅ Not used
   - ✅ Not expired
5. Bot links Discord ID to Warden account
6. Bot marks code as used
7. Bot sends success DM to user

**Success Message:**
```
✅ Successfully connected!

🎭 Account: aragorn
🎲 Characters: 3
🔗 PathCompanion: Connected

Your available characters:
• Aragorn (Level 20)
• Legolas (Level 18)
• Gimli (Level 17)

Next steps:
• Use !setchar <name> to link a character to a channel
• Use !roll <stat> to roll dice
• Type CharName: message to proxy as that character
• Use !help for more commands
```

---

### Step 3: Use Bot Commands

User can now use all Discord bot commands:
- `!setchar Aragorn` - Link character to channel
- `!profile` - View character sheet
- `!roll 1d20+5` - Roll dice
- `Aragorn: I draw my sword!` - Character proxying
- And all other commands (see DISCORD_BOT_COMMANDS.md)

---

## Error Handling

### Invalid Code
```
❌ Invalid or expired code.

Please generate a new code at https://warden.my/settings

⏱️ Connection codes expire after 15 minutes and can only be used once.
```

### Expired Code
```
❌ Invalid or expired code.

Please generate a new code at https://warden.my/settings
```

### Already Used Code
```
❌ Invalid or expired code.

Please generate a new code at https://warden.my/settings
```

### Wrong Format
```
❌ Usage: !connect <code>

🔐 How to connect your Discord account:
1. Go to https://warden.my/settings
2. Click "Generate Discord Connection Code"
3. Copy the code and use it here: !connect YOUR_CODE
```

---

## Database Cleanup (Future)

Recommended: Add cron job to clean up expired codes

```sql
-- Run daily
DELETE FROM discord_connection_codes
WHERE expires_at < NOW() - INTERVAL '24 hours';
```

Or use Postgres automatic cleanup:
```sql
-- Add to migration
CREATE INDEX idx_discord_codes_cleanup 
ON discord_connection_codes(expires_at) 
WHERE used = false;
```

---

## Migration Steps

### 1. Apply Database Migration

```bash
cd backend
npm run db:push
# Or manually run: backend/drizzle/0005_add_discord_connection_codes.sql
```

### 2. Build Backend

```bash
cd backend
npm run build
```

### 3. Build Frontend

```bash
cd frontend-src
npm run build
cp -r dist/* ../frontend/
```

### 4. Deploy

**Local:**
```bash
cd backend
npm start
```

**Production:**
```bash
ssh warden
cd warden-backend
git pull
npm install
npm run build
cd frontend-src
npm run build
cp -r dist/* ../frontend/
cd ../backend
pm2 restart warden-backend
```

---

## Testing Checklist

### Backend API
- [ ] Generate code returns 12-character hex string
- [ ] Code expires in exactly 15 minutes
- [ ] Previous unused codes are invalidated
- [ ] Requires authentication
- [ ] Returns correct expiration timestamp

### Discord Bot
- [ ] `!connect CODE` links account successfully
- [ ] Invalid code shows error message
- [ ] Expired code shows error message
- [ ] Used code cannot be reused
- [ ] Message is deleted after command
- [ ] Success DM is sent
- [ ] Discord ID is saved to users table
- [ ] Code is marked as used

### Frontend UI
- [ ] Button generates code on click
- [ ] Code displays in large, readable format
- [ ] Expiration time shown correctly
- [ ] Instructions are clear
- [ ] Error messages display properly
- [ ] Loading states work

---

## Security Benefits

✅ **No credentials over Discord**  
✅ **One-time use codes**  
✅ **Time-limited (15 minutes)**  
✅ **Immediate invalidation after use**  
✅ **No message logs with passwords**  
✅ **Similar to OAuth/2FA flows**  
✅ **User-friendly (no typing long passwords)**  

---

## Future Enhancements

### Email Verification
Add email requirement before generating codes:
```typescript
if (!user.emailVerified) {
  return res.status(403).json({ 
    error: 'Please verify your email before linking Discord' 
  });
}
```

### Rate Limiting
Limit code generation to prevent abuse:
```typescript
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Max 3 codes per 15 minutes
  message: 'Too many code generation attempts'
});
```

### Discord Notification
Notify user when Discord account is linked:
```typescript
// Send email notification
await sendEmail({
  to: user.email,
  subject: 'Discord Account Linked',
  body: `Your Discord account (${discordUser.tag}) was linked to Warden.`
});
```

---

## Documentation Updates

### Updated Files:
1. ✅ `DISCORD_BOT_COMMANDS.md` - Changed `!connect` command documentation
2. ✅ `backend/src/db/schema.ts` - Added `discordConnectionCodes` table
3. ✅ `backend/src/routes/auth/index.ts` - Added code generation endpoint
4. ✅ `backend/src/services/discordBot.ts` - Updated `handleConnect()` function
5. ✅ `frontend-src/src/pages/ProfileSettings.tsx` - Added code generation UI
6. ✅ `backend/drizzle/0005_add_discord_connection_codes.sql` - Database migration

---

## API Documentation

### Swagger/OpenAPI

Added to `/api/docs`:

```yaml
/api/auth/generate-discord-code:
  post:
    tags: [Authentication]
    summary: Generate one-time Discord connection code
    security:
      - cookieAuth: []
    responses:
      200:
        description: Code generated successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                code:
                  type: string
                  example: A1B2C3D4E5F6
                expiresAt:
                  type: string
                  format: date-time
      401:
        $ref: '#/components/responses/Unauthorized'
```

---

## Related Documentation

- [DISCORD_BOT_COMMANDS.md](../DISCORD_BOT_COMMANDS.md) - Full bot command reference
- [TECH_STACK.md](../TECH_STACK.md) - Technology stack overview
- [SECURITY_SETUP.md](../SECURITY_SETUP.md) - Security features

---

## Support

If users have issues connecting:

1. **Generate new code** - Old codes may have expired
2. **Check spelling** - Code is case-sensitive (uppercase)
3. **15-minute window** - Must use code within expiration time
4. **One-time use** - Generate new code if already used
5. **Contact support** - If persistent issues occur


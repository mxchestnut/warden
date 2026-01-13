# Avatar Upload & Discord Bot Integration

## Overview
The avatar system allows users to upload character avatars that are used for Discord bot proxy messages. Avatars can be uploaded via file upload or by providing a URL.

## Frontend Implementation

### Upload Button (CharacterEdit.tsx)
- Located in the "Avatar & PathCompanion" section
- Gold-themed upload button with file size and type validation
- Accepts: JPEG, JPG, PNG, GIF, WebP
- Max file size: 5MB
- Shows live preview of the uploaded avatar

### Features
1. **File Upload**: Click "Upload Avatar" button to select and upload an image file
2. **URL Input**: Manually enter an avatar URL (external or uploaded)
3. **Preview**: Displays a 128x128px preview of the current avatar
4. **Validation**: Client-side file size (5MB) and type checking

## Backend Implementation

### Upload Endpoint
**POST** `/api/characters/upload-avatar`
- Uses multer for multipart form data handling
- Stores files in `backend/uploads/avatars/`
- Filename format: `avatar-{timestamp}-{random}.{ext}`
- Returns both relative URL (for database) and full URL (for preview)

```json
{
  "url": "/api/characters/avatars/avatar-1234567890-123456789.jpg",
  "fullUrl": "http://localhost:3000/api/characters/avatars/avatar-1234567890-123456789.jpg"
}
```

### Serve Endpoint
**GET** `/api/characters/avatars/:filename`
- Public endpoint (no authentication required)
- Allows Discord webhooks to access avatar images
- Serves files from `backend/uploads/avatars/`

### Storage
- **Development**: Files stored locally in `backend/uploads/avatars/`
- **Production**: Same local storage (accessible via CloudFront/EC2)
- File permissions: Publicly readable for Discord webhook access

## Discord Bot Integration

### Webhook Avatar Usage
When a character sends a message via Discord proxy:
1. Bot retrieves character's `avatarUrl` from database
2. If URL is relative (starts with `/`):
   - Converts to absolute using `FRONTEND_URL` environment variable
   - Example: `/api/characters/avatars/file.jpg` → `http://54.242.214.56/api/characters/avatars/file.jpg`
3. If URL is absolute (starts with `http`):
   - Uses URL as-is
4. If no avatar is set:
   - Uses generated avatar: `https://ui-avatars.com/api/?name={characterName}&size=256&background=random`

### Webhook Configuration
```javascript
const webhookOptions = {
  content: messageText,
  username: character.name,
  avatarURL: avatarUrl  // Absolute URL required by Discord
};

await webhook.send(webhookOptions);
```

## Environment Variables

### Required for Production
```bash
# Backend URL for avatar serving
FRONTEND_URL=http://54.242.214.56  # Or CloudFront URL
```

### Required for File Upload
```bash
# Already configured via Express server
# No additional environment variables needed for local storage
```

## File Structure
```
backend/
  uploads/
    avatars/
      avatar-1234567890-123456789.jpg
      avatar-1234567890-987654321.png
  src/
    routes/
      characters.ts         # Upload and serve endpoints
    services/
      discordBot.ts         # Webhook integration
```

## Database Schema
```typescript
characterSheets {
  avatarUrl: text  // Can be relative URL, absolute URL, or null
}
```

## Usage Flow

### 1. Upload Avatar
```
User clicks "Upload Avatar" 
  → Selects image file
  → Frontend validates (5MB, image type)
  → POST /api/characters/upload-avatar
  → Backend saves to uploads/avatars/
  → Returns full URL
  → Frontend updates character.avatarUrl
  → User saves character
```

### 2. Discord Proxy Message
```
User sends Discord message with character prefix
  → Bot detects character
  → Retrieves character data including avatarUrl
  → Converts relative URL to absolute (if needed)
  → Creates/finds webhook for channel
  → Sends message with character name and avatar
  → Discord displays message with custom avatar
```

## Security Considerations

1. **File Upload**
   - Size limit: 5MB (prevents abuse)
   - Type restriction: Images only
   - Filename sanitization: Random generation prevents collisions
   - Authentication required for upload

2. **Public Serving**
   - Avatar endpoint is public (no auth)
   - Required for Discord webhooks to access images
   - Files served from dedicated directory only
   - No directory traversal possible

3. **Production**
   - Consider adding rate limiting to upload endpoint
   - Monitor disk usage for avatar storage
   - Consider S3 migration for scalability (config already exists in s3.ts)

## Future Enhancements

1. **S3 Integration**: Migrate from local storage to AWS S3 for better scalability
2. **Image Processing**: Resize/optimize images on upload
3. **CDN**: Use CloudFront for avatar delivery
4. **Deletion**: Cleanup old avatars when replaced
5. **Validation**: Server-side image validation (not just type/size)

# Swagger API Documentation - Setup Guide

## Overview

Warden now has **interactive API documentation** powered by Swagger/OpenAPI 3.0. This provides:
- 🔍 **Discoverable API** - Browse all endpoints with descriptions
- 🧪 **Try It Out** - Test endpoints directly from the browser
- 📄 **Auto-generated docs** - JSDoc comments create documentation automatically
- 📥 **OpenAPI Spec** - Export OpenAPI 3.0 JSON for external tools

---

## Accessing the Documentation

### Swagger UI (Interactive Docs)
**URL:** http://localhost:3000/api/docs

Features:
- Browse all API endpoints grouped by tags (Authentication, Characters, Documents, etc.)
- View request/response schemas
- Test endpoints with "Try it out" button
- See example responses and error codes
- Copy curl commands

### OpenAPI JSON Spec
**URL:** http://localhost:3000/api/docs.json

Use this to:
- Import into Postman
- Generate client SDKs (with OpenAPI Generator)
- Integrate with API testing tools
- Share with frontend developers

---

## Configuration

**Location:** [backend/src/config/swagger.ts](backend/src/config/swagger.ts)

### Key Settings:
```typescript
{
  openapi: '3.0.0',
  info: {
    title: 'Warden API Documentation',
    version: '1.0.0',
    description: 'Social Writing Platform & Discord Bot for Pathfinder 1E'
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Development' },
    { url: 'https://warden.my', description: 'Production' }
  ]
}
```

### Security Schemes:
- **cookieAuth** - Session cookie (set after login)
- **csrfToken** - CSRF token from `/api/csrf-token`

### Tags (Endpoint Groups):
- Authentication
- Characters
- Documents
- Groups
- Discord
- PathCompanion
- Files
- Admin
- Public

---

## Adding Documentation to Routes

### Basic Endpoint Documentation

Add JSDoc comments above route handlers:

```typescript
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
 */
router.post('/login', loginLimiter, (req, res, next) => {
  // Implementation...
});
```

### Using Schema References

Define reusable schemas in [swagger.ts](backend/src/config/swagger.ts):

```typescript
components: {
  schemas: {
    User: {
      type: 'object',
      properties: {
        id: { type: 'integer', example: 123 },
        username: { type: 'string', example: 'aragorn' },
        email: { type: 'string', format: 'email' },
        tier: { type: 'string', enum: ['free', 'pro', 'master'] }
      }
    }
  }
}
```

Then reference with `$ref: '#/components/schemas/User'`

### Common Response Templates

Defined in `components.responses`:
- `Unauthorized` - 401 Not authenticated
- `Forbidden` - 403 Not authorized
- `NotFound` - 404 Resource not found
- `ValidationError` - 400 Invalid input

Example usage:
```typescript
/**
 * @swagger
 * /api/characters/{id}:
 *   get:
 *     responses:
 *       200:
 *         description: Character retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
```

---

## Documentation Best Practices

### ✅ DO:
1. **Document all public endpoints** - Especially those used by the frontend
2. **Include examples** - Real-world examples in request/response schemas
3. **Describe parameters** - Explain what each parameter does
4. **List all status codes** - Document error cases, not just success
5. **Use tags** - Group related endpoints together
6. **Reference common schemas** - Don't duplicate User, Character, etc.

### ❌ DON'T:
1. **Don't skip error responses** - Document 400, 401, 403, 404, 500
2. **Don't use vague descriptions** - Be specific about what endpoint does
3. **Don't forget authentication** - Mark protected routes with security
4. **Don't duplicate schemas** - Use `$ref` for common types

---

## Example Documentation Patterns

### GET endpoint (list)
```typescript
/**
 * @swagger
 * /api/characters:
 *   get:
 *     tags: [Characters]
 *     summary: Get all characters for authenticated user
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of characters
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Character'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
```

### GET endpoint (single item with parameter)
```typescript
/**
 * @swagger
 * /api/characters/{id}:
 *   get:
 *     tags: [Characters]
 *     summary: Get character by ID
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Character ID
 *     responses:
 *       200:
 *         description: Character details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Character'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
```

### POST endpoint (create)
```typescript
/**
 * @swagger
 * /api/characters:
 *   post:
 *     tags: [Characters]
 *     summary: Create a new character
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - race
 *               - class
 *             properties:
 *               name:
 *                 type: string
 *                 example: Aragorn
 *               race:
 *                 type: string
 *                 example: Human
 *               class:
 *                 type: string
 *                 example: Ranger
 *               level:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 20
 *                 default: 1
 *     responses:
 *       201:
 *         description: Character created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Character'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
```

### PUT endpoint (update)
```typescript
/**
 * @swagger
 * /api/characters/{id}:
 *   put:
 *     tags: [Characters]
 *     summary: Update character
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               bio:
 *                 type: string
 *               level:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Character updated
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
```

### DELETE endpoint
```typescript
/**
 * @swagger
 * /api/characters/{id}:
 *   delete:
 *     tags: [Characters]
 *     summary: Delete character
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Character deleted
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
```

---

## Troubleshooting

### Docs not showing up?

1. **Check if swagger is loaded:**
   ```bash
   curl http://localhost:3000/api/docs.json | jq
   ```

2. **Verify route files are included:**
   Check `apis` array in [swagger.ts](backend/src/config/swagger.ts):
   ```typescript
   apis: [
     './src/routes/*.ts',
     './dist/routes/*.js',
   ]
   ```

3. **Rebuild backend:**
   ```bash
   npm run build && npm start
   ```

### JSDoc not parsing?

- Make sure comments start with `/**` (not `/*`)
- Use `@swagger` tag at the beginning
- Check YAML indentation (spaces, not tabs)
- Validate OpenAPI spec at https://editor.swagger.io/

### Endpoint not appearing?

- Check that route file is imported in [server.ts](backend/src/server.ts)
- Verify JSDoc comment is directly above route handler
- Look for syntax errors in the JSDoc comment

---

## Next Steps

1. **Document remaining routes** - Add JSDoc comments to all endpoints
2. **Add more schemas** - Define Document, Group, Comment, etc.
3. **Customize Swagger UI** - Add logo, change theme colors
4. **Export for Postman** - Import `/api/docs.json` into Postman collections
5. **Generate client SDK** - Use OpenAPI Generator for TypeScript/JavaScript client

---

## Related Documentation

- [TECH_STACK.md](./TECH_STACK.md) - Full technology stack
- [LOGGING.md](./LOGGING.md) - Logging system documentation
- [TESTING.md](./TESTING.md) - Testing framework documentation
- [Swagger Documentation](https://swagger.io/docs/specification/about/) - Official Swagger docs
- [OpenAPI 3.0 Spec](https://spec.openapis.org/oas/v3.0.0) - OpenAPI specification

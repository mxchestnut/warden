# Warden - Tech Stack & Architecture

## Infrastructure Overview

```
User Browser (warden.my)
    ↓
CloudFront CDN (Distribution: E2QUYD75WB2AL3)
    ↓
AWS EC2 Server (54.235.52.122)
    ↓
PM2 Process Manager
    ↓
Node.js Backend (Port 3000)
```

---

## Tech Stack

### Frontend
- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite 7.3.1
- **Router:** React Router DOM 7
- **Rich Text Editor:** TipTap 3.15.3 (25+ extensions)
- **Styling:** CSS Modules + vanilla CSS

**Source Location:** `/frontend-src/`  
**Build Output:** `/frontend-src/dist/`  
**Production Location:** `/frontend/` (what the server serves)

### Backend
- **Runtime:** Node.js
- **Framework:** Express
- **Language:** TypeScript
- **Database:** PostgreSQL (Neon hosted)
- **ORM:** Drizzle ORM
- **Session Store:** Redis (optional) or in-memory
- **Process Manager:** PM2

**Source Location:** `/backend/src/`  
**Build Output:** `/backend/dist/`  

### Database
- **Type:** PostgreSQL
- **Host:** Neon (cloud hosted)
- **ORM:** Drizzle
- **Migrations:** Drizzle Kit
- **Tables:** 30+ tables including users, characters, documents, groups, etc.

### External Services
- **Discord Bot:** Discord.js v14
- **File Storage:** AWS S3
- **Secrets Management:** AWS Secrets Manager (production)
- **AI Services:** Google Gemini API
- **Game Integration:** PathCompanion.com API
- **Error Tracking:** Sentry

---

## Deployment Flow

### Local Development → Production

```
1. LOCAL DEVELOPMENT
   ├─ Edit code in /frontend-src/ or /backend/src/
   ├─ Test locally:
   │  ├─ Frontend: npm run dev (port 5173)
   │  └─ Backend: npm start (port 3000)
   └─ Build:
      ├─ Frontend: npm run build → creates /frontend-src/dist/
      └─ Backend: npm run build → creates /backend/dist/

2. DEPLOY TO LOCAL FRONTEND FOLDER
   ├─ Copy: cp -r frontend-src/dist/* frontend/
   └─ This updates the production-ready files

3. COMMIT & PUSH TO GITHUB
   ├─ git add .
   ├─ git commit -m "message"
   └─ git push origin main

4. GITHUB ACTIONS AUTO-DEPLOY
   ├─ Workflow: .github/workflows/deploy.yml
   ├─ Triggers on: push to main branch
   ├─ Actions:
   │  ├─ SSH into AWS EC2 (54.235.52.122)
   │  ├─ cd warden-backend
   │  ├─ git pull origin main
   │  ├─ cd backend && npm install
   │  ├─ npm run build
   │  └─ pm2 restart warden-backend
   └─ Monitor: github.com/mxchestnut/warden/actions

5. CLOUDFRONT CACHE INVALIDATION (if needed)
   └─ aws cloudfront create-invalidation --distribution-id E2QUYD75WB2AL3 --paths "/*"
```

---

## Production Server Structure

**AWS EC2:** 54.235.52.122  
**User:** ec2-user  
**SSH Key:** ~/.ssh/warden-key-2026.pem  
**SSH Config:** Host warden

```
/home/ec2-user/
└── warden-backend/           # Git repository
    ├── .git/
    ├── backend/              # Backend source & build
    │   ├── src/             # TypeScript source
    │   ├── dist/            # Compiled JavaScript (PM2 runs this)
    │   ├── package.json
    │   └── drizzle/         # Database migrations
    ├── frontend/            # Production frontend (served by Express)
    │   ├── index.html
    │   └── assets/          # Compiled JS/CSS bundles
    └── frontend-src/        # Frontend source (not used in production)
        ├── src/
        ├── dist/            # Build output (copied to /frontend/)
        └── package.json
```

---

## How Requests Are Served

```
1. User visits warden.my
   ↓
2. DNS routes to CloudFront (E2QUYD75WB2AL3)
   ↓
3. CloudFront caches and forwards to EC2:3000
   ↓
4. Express server (backend/dist/server.js)
   ├─ API routes: /api/* → Backend logic
   └─ All other routes: /* → Serve /frontend/index.html (React SPA)
   ↓
5. React app loads in browser
   ├─ React Router handles client-side routing
   └─ Makes API calls back to /api/* endpoints
```

---

## Frontend Build Process

**Before deployment:**
```bash
cd frontend-src
npm run build              # Vite builds to dist/
cp -r dist/* ../frontend/  # Copy to production folder
```

**What gets built:**
- `index.html` - Entry point
- `assets/index-[hash].js` - JavaScript bundle (680KB+)
- `assets/index-[hash].css` - CSS bundle (14KB)

---

## Backend Process Management

**PM2 Configuration:**
- Process name: `warden-backend`
- Script: `backend/dist/server.js`
- Mode: Fork
- Auto-restart: Enabled

**Commands:**
```bash
pm2 list                    # View running processes
pm2 restart warden-backend  # Restart server
pm2 logs warden-backend     # View logs
pm2 save                    # Save PM2 state
```

---

## Environment Variables

**Production (.env on EC2):**
- `NODE_ENV=production`
- `DATABASE_URL` - PostgreSQL connection (from AWS Secrets Manager)
- `SESSION_SECRET` - Express session secret
- `DISCORD_BOT_TOKEN` - Discord bot auth
- `GEMINI_API_KEY` - Google AI
- `AWS_*` - S3 credentials
- `PLAYFAB_*` - Game integration

**Development (local .env):**
- Same variables, different values
- Uses local .env file, not AWS Secrets Manager

---

## GitHub Actions Secrets

Required in GitHub repo settings:
- `AWS_HOST` = 54.235.52.122
- `AWS_USERNAME` = ec2-user
- `AWS_SSH_KEY` = Contents of ~/.ssh/warden-key-2026.pem

---

## Current Frontend Architecture

**The OLD sidebar frontend you're seeing** is likely cached by CloudFront.

**The NEW React app** has:
- Top navigation bar (not sidebar)
- Routes: /, /groups, /studio, /documents, /characters, /login
- TipTap editor for documents
- Groups management
- Character integration

**To see the new frontend:**
1. Wait for CloudFront invalidation to complete (2-3 minutes)
2. Hard refresh browser (Cmd+Shift+R)
3. Or visit: http://54.235.52.122:3000 directly (bypasses CloudFront)

---

## Common Issues & Solutions

**"Changes not showing on warden.my"**
→ CloudFront cache. Run invalidation command.

**"Frontend not updating after deployment"**
→ Did you copy `frontend-src/dist/*` to `frontend/` before git push?

**"Backend errors after deployment"**
→ Check PM2 logs: `ssh warden "pm2 logs warden-backend"`

**"Database migration needed"**
→ Run: `ssh warden "cd warden-backend/backend && npx drizzle-kit push"`

---

## Next Steps Needed

1. **Update React app to use SIDEBAR layout** instead of top nav
2. **Order:** Characters, Groups, Studio (with Documents & File Manager inside)
3. **Match existing sidebar design** from the old frontend

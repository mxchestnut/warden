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
- **Framework:** React 19.2.3 + TypeScript 5.9.3
- **Build Tool:** Vite 7.3.1
- **Router:** React Router 7.1.1 (industry standard client-side routing)
- **Rich Text Editor:** TipTap 2.1.13 (25+ extensions)
- **Styling:** Tailwind CSS 4.1.18 + CSS Modules
- **Icons:** Lucide React 0.562.0 (560+ icons)
- **UI Utilities:** clsx, class-variance-authority, tailwind-merge

**Source Location:** `/frontend-src/`  
**Build Output:** `/frontend-src/dist/`  
**Production Location:** `/frontend/` (what the server serves)

### Backend
- **Runtime:** Node.js 22.21.1 LTS
- **Framework:** Express 5.2.1
- **Language:** TypeScript 5.9.3
- **Database:** PostgreSQL (Neon hosted)
- **ORM:** Drizzle ORM 0.45.1
- **Validation:** Zod 3.22.4
- **Session Store:** Redis 5.10.0 (optional) or in-memory
- **Security:** Helmet 8.1.0, CSRF protection, rate limiting
- **File Upload:** Multer 2.0.2, Sharp 0.34.5
- **Process Manager:** PM2

**Source Location:** `/backend/src/`  
**Build Output:** `/backend/dist/`  

### Database
- **Type:** PostgreSQL
- **Host:** Neon (cloud hosted)
- **ORM:** Drizzle ORM 0.45.1
- **Migrations:** Drizzle Kit 0.31.8
- **Driver:** node-postgres (pg) 8.16.3
- **Tables:** 30+ tables including users, characters, documents, groups, lore, relationships, etc.

### External Services
- **Discord Bot:** Discord.js 14.25.1
- **File Storage:** AWS S3 (via AWS SDK 3.966.0)
- **Secrets Management:** AWS Secrets Manager (production)
- **AI Services:** Google Gemini 2.5 Flash (via @google/generative-ai 0.24.1)
- **Game Integration:** PathCompanion.com API (via PlayFab SDK)
- **Error Tracking:** Sentry 10.32.1 (with profiling)
- **Payment Processing:** Stripe 20.1.2
- **Scheduled Tasks:** node-cron 4.2.1

### Development Tools
- **Package Manager:** npm 10.9.4
- **Type Checking:** TypeScript 5.9.3
- **Linting:** ESLint 9.39.2 with TypeScript plugin 8.52.0
- **Code Formatting:** Prettier 3.7.4
- **Git Hooks:** Husky 9.1.7 + lint-staged 16.2.7
- **Dev Server:** tsx 4.21.0 (TypeScript execution)
- **Build Tools:** Vite 7.3.1, tsc (TypeScript compiler)
- **API Documentation:** Swagger/OpenAPI 3.0 with swagger-jsdoc + swagger-ui-express
  - Interactive API docs at `/api/docs`
  - OpenAPI spec at `/api/docs.json`
  - JSDoc comments for endpoint documentation
- **Dependency Management:** Renovate
  - Automatic PRs for dependency updates
  - Automerge for minor/patch updates after CI passes
  - Weekly schedule (Mondays before 5am)
  - Security updates prioritized
  - Keeps Zod at 3.22.4 and TipTap at v2 (per constraints)
- **Logging:** Pino 10.1.0 with pino-http 11.0.0 and pino-pretty 14.1.0
  - Structured JSON logging in production
  - Pretty-printed colored logs in development
  - Automatic HTTP request logging with pino-http
  - Redacts sensitive fields (passwords, tokens, cookies)
  - Request IDs for tracing
  - Performance tracking and metrics

### Testing Framework
- **Unit & Integration Testing:** Vitest 4.0.16
  - Backend: API tests with Supertest 7.0.0
  - Frontend: Component tests with @testing-library/react 16.1.0
  - Code coverage tracking (70% backend, 60% frontend goals)
- **End-to-End Testing:** Playwright 1.57.0
  - Chromium browser automation
  - Authentication flows, character creation, payments
  - Runs against localhost:5173 (Vite dev server)
- **CI/CD:** GitHub Actions (comprehensive pipeline)
  - PR Quality Checks: Fast linting, type checking, build verification, security audit
  - Comprehensive Test Suite: Unit, integration, component, E2E tests with coverage
  - Pre-Deployment Checks: Quality gates before production
  - Production Deployment: Automated deploy to AWS EC2 with health checks
  - Staging Environment: Deploy to staging for QA testing (optional)
  - Database Backup Testing: Monthly verification of backup/restore
  - Parallel execution for speed
  - PR comments with test results
  - Commit notifications on deploy status
- **Documentation:** TESTING.md, CICD_PIPELINE.md (comprehensive guides)

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

4. CI/CD PIPELINE (GitHub Actions)
   ├─ PR Quality Checks (.github/workflows/pr-checks.yml)
   │  ├─ Backend/Frontend linting & type checking
   │  ├─ Build verification (both backend/frontend)
   │  ├─ Security audit (npm audit)
   │  └─ PR comment with results
   │
   ├─ Comprehensive Tests (.github/workflows/tests.yml)
   │  ├─ Backend unit & integration tests
   │  ├─ Frontend component tests
   │  ├─ E2E tests with Playwright
   │  ├─ Code coverage to Codecov
   │  └─ Test summary on PR
   │
   └─ Production Deploy (.github/workflows/deploy.yml)
      ├─ Pre-deployment quality gates
      ├─ SSH into AWS EC2 (54.235.52.122)
      ├─ git pull origin main
      ├─ npm install & build
      ├─ pm2 restart warden-backend
      ├─ Health check (/health endpoint)
      └─ Commit comment with status

5. CLOUDFRONT CACHE INVALIDATION (if needed)
   └─ aws cloudfront create-invalidation --distribution-id E2QUYD75WB2AL3 --paths "/*"
```

### Staging Environment (Optional)

```
1. Push to develop branch
   ↓
2. deploy-staging.yml triggers
   ├─ Build and test
   ├─ Deploy to staging server
   ├─ Smoke tests
   └─ PR comment with staging URL
   ↓
3. QA testing on staging
   ↓
4. Merge to main for production
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

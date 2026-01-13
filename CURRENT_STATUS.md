# Current Work Status
**Last Updated**: January 12, 2026

## ✅ What's Working

### Servers
- **Backend**: Running on port 3000
  - Discord bot connected (Warden#7958)
  - PathCompanion integration active
  - Session-based auth (in-memory)
  - Avatar upload system functional
  
- **Frontend**: Running on port 5173
  - Vite dev server
  - Clean, streamlined UI
  - Character management functional

### Pages Implemented
**Fully Functional:**
- Home - Warden-specific landing page
- Characters - List view with search, sort, and PathCompanion sync
- CharacterEdit - Full character editor with avatar upload
- ProfileSettings - User profile with PathCompanion & Discord bot configuration
- Login - Authentication
- AuthCallback, Invite, PendingApproval, Terms, Rules

**Coming Soon Placeholders:**
- Feed, Groups, Studio, Dashboard, Bookshelf, BetaMarketplace

## 🎯 Recent Changes

### Session: January 12, 2026
- ✅ Fixed Vite proxy configuration (port 8000 → 3000)
- ✅ Created ProfileSettings page replacing old Profile page
  - Account info display (username, ID, admin status)
  - PathCompanion account connection/disconnection
  - Discord bot token configuration
  - Tabbed interface for organization
- ✅ Added routing for `/me`, `/profile`, and `/settings` (all go to ProfileSettings)
- ✅ Implemented character search functionality
  - Real-time search by name, race, class, or bio
  - Search results counter
- ✅ Added character sorting options
  - Recently Added (default)
  - Alphabetical (A-Z)
  - Oldest First
- ✅ Empty states for no results and no characters

### Cleanup (Jan 11, 2026)
- ✅ Removed duplicate directories (`frontend-src 2/`, `new frontend/`)
- ✅ Removed work-shelf folder from workspace
- ✅ Moved 23+ unused pages to `pages/_unused/`
- ✅ Simplified App.tsx from 40+ routes to 16 essential routes
- ✅ Created simplified Warden-focused Home page
- ✅ Fixed TypeScript errors in Characters.tsx, auth.ts, GroupsList.css
- ✅ All backup files saved with `.bak` extension

### Features Added (Jan 11, 2026)
- ✅ Avatar file upload system (5MB limit, serves via `/api/characters/avatars/:filename`)
- ✅ Discord bot webhook integration with avatars
- ✅ Character edit page reorganization (avatar at top → basic info → abilities → sections)
- ✅ "Coming Soon" pages for future features

## 🚀 Quickcharacter search and sort functionality
- [ ] Test ProfileSettings PathCompanion connection flow
- [ ] Test Discord bot token configuration
- [ ] Test end-to-end character creation flow
- [ ] Test avatar upload and Discord webhook integration
- [ ] Verify all "Coming Soon" pages display correctly

### Medium Priority
- [ ] Review and remove unused npm dependencies
  - Consider removing: `epubjs`, `react-reader` (EPUB readers)
  - Consider removing: `matrix-js-sdk` (if not using Matrix chat)
  - Review Tiptap extensions (keep only what's needed for character editor)
  
- [ ] Update package.json name from "workshelf-frontend" to "warden-frontend"
- [ ] Test on production environment
- [ ] Build frontend and verify production build works
- [ ] Deploy updated frontend to production

### Low Priority / Future
- [ ] Implement Studio feature (currently Coming Soon)
- [ ] Implement Groups feature (currently Coming Soon)
- [ ] Implement Feed feature (currently Coming Soon)
- [ ] Add character export/import functionality
- [ ] Enhanced Discord bot commands
- [ ] Add character filtering by PathCompanion sync statues display correctly

### Medium Priority
- [ ] Review and remove unused npm dependencies
  - Consider removing: `epubjs`, `react-reader` (EPUB readers)
  - Consider removing: `matrix-js-sdk` (if not using Matrix chat)
  - Review Tiptap extensions (keep only what's needed for character editor)
  
- [ ] Update package.json name from "workshelf-frontend" to "warden-frontend"
- [ ] Test on production environment
- [ ] Build frontend and verify production build works

### Low Priority / Future
- [ ] Implement Studio feature (currently Coming Soon)
- [ ] Implement Groups feature (currently Coming Soon)
- [ ] Implement Feed feature (currently Coming Soon)
- [ ] Add character export/import functionality
- [ ] Enhanced Discord bot commands

## ⚠️ Known Issues

### Non-Critical Warnings
- Sentry profiling: Node.js version compatibility warning (can ignore)
- Express instrumentation: Loaded before Sentry.init() (can ignore)
- Discord ready event: Deprecation warning (will update in future)

### Potential Issues to Watch
- Backend sometimes crashes (exit code 137) - may need to restart
- In-memory sessions (Redis disabled) - sessions lost on server restart
- TypeScript errors may persist until TS server restart in VS Code

## 📁 Project Structure (with search & sort)
│   │   │   ├── CharacterEdit.tsx
│   │   │   ├── ProfileSettings.tsx (NEW - /me, /profile, /settings)
Warden/
├── backend/                    # Node.js/Express API (port 3000)
│   ├── dist/                   # Compiled JS
│   ├── src/                    # TypeScript source
│   │   ├── routes/
│   │   │   └── characters.ts   # Avatar upload endpoint
│   │   ├── services/
│   │   │   └── discordBot.ts   # Webhook integration
│   │   └── server.ts
│   └── uploads/avatars/        # Character avatar storage
│
├── frontend/                   # Production build output
│
├── frontend-src/              # Development source (port 5173)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── _unused/       # Backed up pages (23+ files)
│   │   │   ├── Home.tsx
│   │   │   ├── Characters.tsx
│   │   │   ├── CharacterEdit.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── Login.tsx
│   │   │   └── [Coming Soon pages]
│   │   ├── components/
│   │   ├── services/
│   │   │   └── auth.ts         # Updated User interface
│   │   └── App.tsx
│   ├── *.bak                   # Backup files (App.tsx.bak, Home.tsx.bak)
│   └── package.json            # (still named "workshelf-frontend")
│ ✅ (fixed from 8000)
- Lucide React icons
├── .env                        # Environment variables
├── CLEANUP_SUMMARY.md          # Detailed cleanup documentation
├── TECH_STACK.md              # Architecture documentation
└── README.md                   # Project overview
```

## 🔧 Environment

### Backend (.env)
- Database: SQLite (local file)
- Sessions: In-memory (no Redis)
- Discord bot token configured
- PathCompanion credentials configured
- Sentry disabled for development

### Frontend
- Vite 7.3.1
- React 19
- TypeScript
- Tailwind CSS
- API proxy to localhost:3000
Character search by name, race, class, bio
- Character sorting (Recent, A-Z, Oldest)
- PathCompanion integration with connect/disconnect UI
- Discord bot integration with token management
- Avatar upload system (5MB limit)
- Profile & Settings page with tabbed interface
**Backups Created:**
- `frontend-src/src/App.tsx.bak` - Original work-shelf App.tsx
- `frontend-src/src/pages/Home.tsx.bak` - Original work-shelf Home page
- `frontend-src/src/pages/_unused/` - 23 archived pages

**Can Be Restored If Needed:**
All removed files are safely backed up and can be restored from `_unused/` folder.

## 🎨 Design System

**Colors:**
- Background: `#37322E` (dark brown)
- Accent: `#D4AF37` (gold)
- Secondary: `#B34B0C` (orange)
- Text: `white`, `#B3B2B0` (gray)
- Borders: `#4A4540`

**Key Features:**
- Character-focused TTRPG management
- PathCompanion integration
- Discord bot integration
- Avatar upload system
- Clean, minimal UI with "Coming Soon" placeholders for future features

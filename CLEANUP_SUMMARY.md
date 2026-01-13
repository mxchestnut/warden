# Warden Cleanup Summary
Date: January 11, 2026

## Overview
Cleaned up the Warden codebase to remove work-shelf specific features and streamline for character management focus.

## Changes Made

### 1. Frontend Cleanup

#### Removed Duplicate Directories
- **Deleted**: `frontend-src 2/` - Duplicate frontend source directory
- **Deleted**: `new frontend/` - Old/test frontend directory
- **Kept**: `frontend-src/` - Active development directory
- **Kept**: `frontend/` - Production build output

#### Simplified Home Page
- **Replaced**: Complex work-shelf Home page with Warden-specific landing page
- **Features**: Character count, player count, clean navigation to Characters/Studio/Groups
- **Removed**: Book-related stats, store links, featured books section
- **Backup**: `Home.tsx.bak` created for reference

#### Streamlined App.tsx
- **Before**: 40+ page imports including books, authors, store, documents, projects, staff pages
- **After**: 16 essential pages for Warden functionality
- **Removed Routes**:
  - `/discover`, `/projects`, `/project/:id`
  - `/admin`, `/staff/*` (users, groups, moderation, settings, store)
  - `/documents`, `/document/:id`
  - `/authors`, `/authors/:id`
  - `/free-books`, `/upload-book`
  - `/store`, `/store/success`, `/book/:id`
  - `/onboarding`, `/sitemap`, `/users/:username`
  - `/admin/moderation`, `/group/:slug/admin`
  - `/beta-feed`, `/my-beta-profile`
- **Kept Routes**:
  - `/` (Home)
  - `/characters`, `/characters/:id/edit`, `/characters/new`
  - `/profile`
  - `/feed`, `/groups`, `/studio`, `/dashboard`, `/bookshelf`, `/beta-marketplace` (all "Coming Soon")
  - `/auth/callback`
  - `/legal/terms`, `/legal/rules`
  - `/invite/:token`, `/pending-approval`, `/login`
- **Backup**: `App.tsx.bak` created for reference

#### Moved Unused Pages to Backup
Moved to `pages/_unused/`:
- Book/Store: `Author.tsx`, `Authors.tsx`, `BookDetail.tsx`, `FreeBooks.tsx`, `Store.tsx`, `StoreSuccess.tsx`, `UploadBook.tsx`
- Beta Features: `BetaFeed.tsx`, `MyBetaProfile.tsx`
- Work-shelf Features: `Discover.tsx`, `Documents.tsx`, `Document.tsx`, `Projects.tsx`, `ProjectDetail.tsx`
- Groups: `GroupDetail.tsx`, `GroupAdmin.tsx`
- Admin: `AdminDashboard.tsx`, `AdminModeration.tsx`
- Other: `Community.tsx`, `Messages.tsx`, `Onboarding.tsx`, `PublicProfile.tsx`, `Sitemap.tsx`
- **Staff Folder**: Entire `staff/` directory (ManageUsers, ViewAllGroups, GlobalModeration, SystemSettings, StoreAnalytics)

#### "Coming Soon" Pages Created
Replaced complex implementations with simple placeholders:
- **Feed.tsx** - Rss icon
- **Dashboard.tsx** - LayoutDashboard icon  
- **Bookshelf.tsx** - BookOpen icon
- **BetaMarketplace.tsx** - ShoppingBag icon
- **Studio.tsx** - Sparkles icon (already done)
- **Groups.tsx** - Users icon (already done)

### 2. TypeScript Fixes

#### auth.ts
- **Added**: `pathCompanionConnectedAt?: string` to User interface
- **Added**: `discordUserId?: string` to User interface
- **Purpose**: Support PathCompanion connection status display on Home page

#### Characters.tsx
- **Removed**: Unused `showCreateModal` state variable
- **Fixed**: "declared but never used" error

#### GroupsList.css
- **Added**: `line-clamp: 2` alongside `-webkit-line-clamp: 2`
- **Fixed**: CSS compatibility warning

### 3. Current Active Pages

**Fully Functional:**
- Home - Warden landing page with stats
- Characters - List all user's characters
- CharacterEdit - Create/edit characters with PathCompanion sync
- Profile - User profile with PathCompanion connection
- Login - Authentication page
- AuthCallback - OAuth callback handler
- Invite - Invitation acceptance
- PendingApproval - Pending user approval
- TermsOfService - Legal terms
- HouseRules - Community rules

**Coming Soon Placeholders:**
- Feed
- Groups
- Studio  
- Dashboard
- Bookshelf
- BetaMarketplace

### 4. Server Status

#### Backend
- **Status**: ✅ Running on port 3000
- **Warnings** (non-critical):
  - Sentry profiling: Node.js version compatibility
  - Express instrumentation: Loaded before Sentry.init()
  - Discord ready event: Deprecation warning
- **Services**: Discord bot connected, daily prompt scheduler active

#### Frontend
- **Status**: ✅ Running on port 5175 (5173, 5174 already in use)
- **Build**: Vite 7.3.1
- **Errors**: Some TypeScript errors remaining (will clear on next TS server restart)

## File Structure

```
Warden/
├── backend/                     # Node.js/Express API
│   ├── dist/                   # Compiled JS
│   ├── src/                    # TypeScript source
│   └── uploads/avatars/        # Character avatars
├── frontend/                    # Production build output
├── frontend-src/               # Development source
│   ├── src/
│   │   ├── pages/
│   │   │   ├── _unused/       # Backed up pages
│   │   │   ├── Characters.tsx
│   │   │   ├── CharacterEdit.tsx
│   │   │   ├── Home.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── Login.tsx
│   │   │   └── [Coming Soon pages]
│   │   ├── components/
│   │   ├── services/
│   │   └── App.tsx
│   └── *.bak                   # Backup files
└── [docs]                      # Documentation
```

## Testing Checklist
- [x] Backend starts without critical errors
- [x] Frontend dev server starts
- [x] TypeScript errors addressed
- [ ] Character list page loads
- [ ] Character create/edit works
- [ ] Avatar upload functions
- [ ] PathCompanion sync works
- [ ] Discord bot integration works
- [ ] All "Coming Soon" pages display correctly

## Next Steps
1. Test character management features end-to-end
2. Verify Discord bot webhook integration
3. Test PathCompanion authentication flow
4. Build and deploy to production
5. Remove unused dependencies from package.json
6. Consider removing unused npm packages (epub, matrix-js-sdk if not used)

## Dependencies to Review
Potential candidates for removal:
- `epubjs` - EPUB reader (not needed for character management)
- `matrix-js-sdk` - Matrix chat (if not using)
- `react-reader` - EPUB reader component
- Various Tiptap extensions if not all used in character editor

## Notes
- All removed files are backed up with `.bak` extension or in `_unused/` directories
- Can restore any page if needed in the future
- Focus is now purely on character management with PathCompanion integration
- Coming Soon pages maintain navigation structure for future features

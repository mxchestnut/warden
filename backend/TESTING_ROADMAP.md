# Testing Roadmap to 70% Coverage

**Current Status:** 58.71% overall coverage (296 tests passing)  
**Target:** 70% coverage  
**Gap:** 11.29% remaining

**Last Updated:** January 15, 2026

---

## ✅ Completed Test Coverage

### Excellent Coverage (80%+)
- ✅ **routes/** - 94.11%
  - system.ts: 100% (4 tests)
  - public.ts: 94.73% (6 tests)
  - discord.ts: 91.66% (9 tests)
- ✅ **utils/** - 89.79%
  - imageOptimization.ts: 84.37% (20 tests)
  - logger.ts: 100% (16 tests)
  - params.ts: 100% (12 tests)
  - validation.ts: 100% (12 tests)
  - crypto.ts: 100% (17 tests)
- ✅ **config/** - 81.81%
  - s3.ts: 100% (12 tests)
  - secrets.ts: 96% (6 tests)
  - swagger.ts: 71.42% (4 tests)
  - passport.ts: 60.86% (6 tests)
  - env.ts: 100% (11 tests)

### Good Coverage (70-79%)
- ✅ **middleware/** - 72.34%
  - admin.ts: 100% (4 tests)
  - auth.ts: 100% (5 tests)
  - tailscale.ts: 100% (12 tests)
  - tier.ts: 100% (12 tests)
  - logging.ts: 7.14% ⚠️ (8 tests but mostly config)
- ✅ **db/** - 71.15%
  - passwordRotation.ts: 100% (13 tests) ⭐ NEW
  - schema.ts: 67.52% (13 tests)
  - index.ts: 30% (2 tests)

### Low Coverage (Need Work)
- ⚠️ **services/** - 35.63%
  - webSearch.ts: 100% (7 tests)
  - gemini.ts: 33.33% (8 tests)
  - playfab.ts: 30.53% (40 tests) ⭐ NEW

---

## 🎯 Priority Areas to Reach 70%

### HIGH PRIORITY - Quick Wins

#### 1. Missing Route Tests
**Impact:** ~3-5% coverage increase  
**Effort:** Low (2-3 hours)

Create test files for untested routes:

- [ ] **routes/admin.ts** - Admin panel routes
  - Test file: `tests/routes/admin.test.ts`
  - Endpoints to test:
    - GET /api/admin/users
    - PUT /api/admin/users/:id/tier
    - POST /api/admin/characters/:id/approve
    - DELETE /api/admin/characters/:id
    - POST /api/admin/prompts
  - Estimated: 10-12 tests

- [ ] **routes/pathcompanion.ts** - PathCompanion integration routes
  - Test file: `tests/routes/pathcompanion.test.ts`
  - Endpoints to test:
    - POST /api/pathcompanion/login
    - GET /api/pathcompanion/characters
    - POST /api/pathcompanion/import/:characterId
    - GET /api/pathcompanion/character/:characterId/sheet
  - Estimated: 8-10 tests
  - Note: Will need to mock PlayFab service

- [ ] **routes/stats.ts** - Statistics routes
  - Test file: `tests/routes/stats.test.ts`
  - Endpoints to test:
    - GET /api/stats/overview
    - GET /api/stats/leaderboard
    - GET /api/stats/activity
    - GET /api/stats/compare
    - GET /api/stats/damage-distribution
  - Estimated: 10-12 tests
  - Note: Complex database queries - use simplified mocks

#### 2. Database Layer Tests
**Impact:** ~2-3% coverage increase  
**Effort:** Medium (3-4 hours)

- [ ] **db/index.ts** - Database connection (currently 30%)
  - Test connection initialization
  - Test error handling
  - Test pool management
  - Estimated: 5-7 tests

### MEDIUM PRIORITY - Moderate Wins

#### 3. Service Layer Improvements
**Impact:** ~2-3% coverage increase  
**Effort:** High (complex external dependencies)

- [ ] **services/gemini.ts** - AI integration (currently 33.33%)
  - Lines 63-161 uncovered (URL scraping logic)
  - Options:
    - Add tests for `learnFromUrl()` with mocked axios/cheerio
    - Test d20pfsrd.com parsing logic
    - Test error handling for network failures
  - Estimated: 6-8 tests
  - Challenge: Complex DOM parsing and external API

- [ ] **services/playfab.ts** - PlayFab integration (currently 30.53%)
  - Lines 10-617, 684-775 uncovered (auth, character fetching)
  - High-value functions to test:
    - `loginToPlayFab()` - authentication flow
    - `getCharacters()` - character list retrieval
    - `getCharacterSheet()` - sheet data fetching
    - `compressCharacterData()` - data compression
    - `decompressCharacterData()` - data decompression
  - Estimated: 10-15 tests
  - Challenge: Requires extensive PlayFab SDK mocking

#### 4. Middleware Improvements
**Impact:** ~1-2% coverage increase  
**Effort:** Low-Medium

- [ ] **middleware/logging.ts** - HTTP logging (currently 7.14%)
  - Lines 19-72 uncovered (pino-http configuration)
  - Most is configuration, hard to test meaningfully
  - Could test: Custom log level logic, custom success/error messages
  - Estimated: 3-5 tests
  - Challenge: Configuration-heavy, low ROI

### LOW PRIORITY - Diminishing Returns

#### 5. Config Layer
**Impact:** ~1% coverage increase  
**Effort:** Low

- [ ] **config/passport.ts** - Passport.js config (currently 60.86%)
  - Lines 11-25 uncovered (serialize/deserialize users)
  - Could add integration tests for full auth flow
  - Estimated: 2-3 tests

- [ ] **config/swagger.ts** - API documentation (currently 71.42%)
  - Lines 203-204 uncovered
  - Minor - just export statements
  - Estimated: 1 test

---

## 📊 Estimated Coverage Gains

| Priority | Area | Tests to Add | Est. Coverage Gain | Effort |
|----------|------|--------------|-------------------|--------|
| HIGH | routes/admin.ts | 10-12 | +2-3% | Low |
| HIGH | routes/pathcompanion.ts | 8-10 | +2-3% | Low-Med |
| HIGH | routes/stats.ts | 10-12 | +2-3% | Low |
| MED | db/index.ts | 5-7 | +1-2% | Med |
| MED | services/gemini.ts | 6-8 | +1-2% | High |
| MED | services/playfab.ts | 10-15 | +1-2% | High |
| LOW | middleware/logging.ts | 3-5 | +0.5-1% | Low-Med |

**Total Estimated Gain:** 10-16% → **Could reach 68-74% coverage**

---

## 🚀 Recommended Next Steps

### Session 1: Complete Route Testing (Target: 63-65%)
1. Create `tests/routes/admin.test.ts` (12 tests)
2. Create `tests/routes/pathcompanion.test.ts` (10 tests)
3. Create `tests/routes/stats.test.ts` (12 tests)

**Expected Result:** 58.71% → ~64%

### Session 2: Database & Service Layer (Target: 68-70%)
1. Improve `tests/db/index.test.ts` (7 tests)
2. Add PlayFab compression/decompression tests (5 tests)
3. Add Gemini error handling tests (5 tests)

**Expected Result:** ~64% → ~68-70% ✅

---

## 💡 Testing Best Practices Applied

### What's Working Well
- ✅ Integration tests for routes using supertest
- ✅ Mocking strategy: Mock external deps, test actual route logic
- ✅ Dynamic imports to avoid circular dependencies
- ✅ Comprehensive error case testing
- ✅ Clear test descriptions and organization

### Challenges Encountered
- ⚠️ Complex Drizzle ORM query chains hard to mock properly
- ⚠️ External API services (PlayFab, Gemini) require extensive mocking
- ⚠️ Configuration-heavy files (logging.ts, passport.ts) provide low ROI

### Recommendations
- Focus on routes first - highest ROI, easiest to test
- Use simplified mocks for complex database queries
- Skip deep testing of external API integrations unless critical
- Prioritize business logic over configuration testing

---

## 📁 Test File Status

### Existing Test Files (28 files, 296 tests)
```
tests/
├── api.test.ts ✅ (10 tests)
├── character.test.ts ✅ (4 tests)
├── character-mechanics.test.ts ✅ (17 tests)
├── config/
│   ├── env.test.ts ✅ (11 tests)
│   ├── passport.test.ts ✅ (6 tests)
│   ├── s3.test.ts ✅ (12 tests)
│   ├── secrets.test.ts ✅ (6 tests)
│   └── swagger.test.ts ✅ (4 tests)
├── db/
│   ├── index.test.ts ✅ (2 tests)
│   ├── passwordRotation.test.ts ✅ (13 tests) ⭐ NEW
│   └── schema.test.ts ✅ (13 tests)
├── middleware/
│   ├── admin.test.ts ✅ (4 tests)
│   ├── auth.test.ts ✅ (5 tests)
│   ├── logging.test.ts ✅ (8 tests)
│   ├── tailscale.test.ts ✅ (12 tests)
│   └── tier.test.ts ✅ (12 tests)
├── routes/
│   ├── discord.test.ts ✅ (9 tests) ⭐ NEW
│   ├── public.test.ts ✅ (6 tests) ⭐ NEW
│   ├── server.test.ts ✅ (6 tests)
│   └── system.test.ts ✅ (4 tests) ⭐ NEW
├── services/
│   ├── gemini.test.ts ✅ (8 tests)
│   ├── playfab.test.ts ✅ (40 tests) ⭐ NEW
│   ├── logger.test.ts ✅ (16 tests)
│   └── webSearch.test.ts ✅ (7 tests)
└── utils/
    ├── crypto.test.ts ✅ (17 tests)
    ├── imageOptimization.test.ts ✅ (20 tests)
    ├── params.test.ts ✅ (12 tests)
    └── validation.test.ts ✅ (12 tests)
```

### Missing Test Files (Need to Create)
```
tests/routes/
├── admin.test.ts ❌ (TODO: 10-12 tests)
├── pathcompanion.test.ts ❌ (TODO: 8-10 tests)
└── stats.test.ts ❌ (TODO: 10-12 tests)
```

---

## 🎯 Quick Reference: Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test src/tests/routes/admin.test.ts

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm run test:coverage -- --reporter=html
```

---

## 📝 Notes for Next Session

### Context to Remember
- Started at 27.37% coverage, now at 58.71% (+31.34%)
- Added 178 new tests in this session
- Focus was on routes (94.11%) and db/passwordRotation.ts (100%)
- PlayFab extraction tests added but complex auth/API calls remain

### Quick Wins Available
1. **admin.ts routes** - straightforward CRUD operations
2. **pathcompanion.ts routes** - can mock PlayFab service layer
3. **stats.ts routes** - can use simplified database mocks

### What to Skip
- Deep testing of gemini.ts URL scraping (complex, low value)
- Deep testing of playfab.ts SDK calls (requires extensive mocking)
- logging.ts middleware (mostly configuration)

### Goal
**Reach 70% coverage by completing HIGH priority route tests**

---

*Document created: January 15, 2026*  
*Next update: After completing routes/admin.test.ts*

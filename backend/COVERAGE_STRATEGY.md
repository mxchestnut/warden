# Test Coverage Improvement Strategy

## Current Status (After Session)
- **Total Tests**: 138 passing
- **Overall Coverage**: 27.37%
- **Test Files**: 11

### Coverage by Component
| Component | Coverage | Status |
|-----------|----------|--------|
| middleware/auth.ts | 100% | ✅ Complete |
| utils/logger.ts | 100% | ✅ Complete |
| services/webSearch.ts | 100% | ✅ Complete |
| services/gemini.ts | 33.87% | 🟡 Partial |
| services/playfab.ts | 13.94% | 🔴 Low |

## Why Coverage is 27% Despite 100% on Some Files

The vitest config has `all: true`, which means it tracks coverage for **ALL source files**, not just tested ones. This includes:
- 10 route files (0% coverage)
- 5 config files (1 tested = env.ts)
- Additional service files (promptScheduler, discord bot, etc.)
- Database schemas and migrations
- Middleware files beyond auth.ts

## Path to 70% Coverage

### Phase 1: Config Files (Quick Wins) - +15%
Test these simple configuration modules:
- [ ] `config/secrets.ts` - Encryption key management
- [ ] `config/swagger.ts` - Swagger/OpenAPI setup
- [ ] `config/s3.ts` - S3 client configuration  
- [ ] `config/passport.ts` - Passport authentication strategies

**Estimated Impact**: +10-15% coverage

### Phase 2: Utility Functions - +10%
- [ ] `utils/validation.ts` ✅ (already done - 100%)
- [ ] `utils/crypto.ts` ✅ (already done - 100%)
- [ ] Any remaining utility files

**Estimated Impact**: Already complete

### Phase 3: Route Integration Tests - +30%
Use `supertest` for API endpoint testing:
- [ ] `routes/auth/index.ts` - Login, register, logout
- [ ] `routes/characters/index.ts` - CRUD operations
- [ ] `routes/discord.ts` - Discord bot commands
- [ ] `routes/stats.ts` - Statistics endpoints
- [ ] `routes/admin.ts` - Admin panel endpoints
- [ ] `routes/public.ts` - Public character viewing
- [ ] `routes/pathcompanion.ts` - PathCompanion integration
- [ ] `routes/system/index.ts` - Health checks

**Estimated Impact**: +25-35% coverage

### Phase 4: Service Coverage Improvement - +10%
- [ ] Improve `gemini.ts` from 33% → 70%
  - Currently skipped: `learnFromUrl` (requires integration test)
  - Lines 63-161 uncovered
  
- [ ] Improve `playfab.ts` from 13% → 50%
  - Most extraction functions untested
  - Lines 110-798 uncovered
  - Complex PlayFab SDK mocking needed

**Estimated Impact**: +8-12% coverage

## Recommended Next Steps

### Option A: Fast Track to 70% (Recommended)
1. ✅ Test config files (2-3 hours) → +15%
2. ✅ Add supertest route tests (4-6 hours) → +30%
3. Skip complex service mocking for now
**Result**: ~72% coverage in 1 day

### Option B: Comprehensive 100% Coverage
1. Test all config files
2. Test all routes with supertest
3. Mock PlayFab SDK completely
4. Refactor gemini.ts to use ES6 imports (enable better mocking)
5. Add integration tests for database operations
6. Add E2E tests with Playwright
**Result**: 90-100% coverage in 2-3 days

## Technical Debt to Address

### 1. Gemini Service Uses `require()`
```typescript
// Current (hard to mock):
const axios = require('axios');

// Better (easy to mock):
import axios from 'axios';
```
**Action**: Refactor to ES6 imports

### 2. PlayFab Service is Massive (800 lines)
- Should be split into smaller modules
- Extraction functions could be separate file
- Would make testing much easier

**Action**: Consider refactoring into:
- `playfab/auth.ts`
- `playfab/characters.ts`
- `playfab/extractors.ts`

### 3. Route Files Lack Separation of Concerns
Many routes have business logic inline instead of in service layer
**Action**: Extract business logic to services for easier unit testing

## Coverage Targets by Priority

### Critical (Must reach 70%)
- ✅ Authentication middleware - 100%
- ✅ Logging utilities - 100%
- ✅ Validation utilities - 100%
- ✅ Crypto utilities - 100%
- [ ] Auth routes - Target: 80%
- [ ] Character routes - Target: 75%

### Important (Should reach 50%)
- [ ] Config files - Target: 90%
- [ ] Discord bot routes - Target: 60%
- [ ] PlayFab service - Target: 50%

### Nice to Have (Can stay lower)
- Admin routes - Target: 40%
- Stats routes - Target: 40%
- Public routes - Target: 50%

## Next Session Plan

1. Install `supertest` for API testing:
   ```bash
   npm install --save-dev supertest @types/supertest
   ```

2. Create `tests/routes/auth.test.ts`:
   - Test POST /api/auth/register
   - Test POST /api/auth/login
   - Test POST /api/auth/logout
   - Test GET /api/auth/me

3. Create `tests/config/` directory:
   - Test secrets.ts
   - Test swagger.ts
   - Test s3.ts

4. Run coverage report and verify 70%+ achieved

## Commands

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test auth.test.ts

# Watch mode
npm run test:watch

# Coverage HTML report
npm run test:coverage && open coverage/index.html
```

## Success Criteria

- [ ] Overall coverage ≥ 70%
- [ ] All middleware ≥ 90%
- [ ] All utilities ≥ 90%
- [ ] Auth routes ≥ 80%
- [ ] Character routes ≥ 75%
- [ ] Config files ≥ 80%
- [ ] Zero flaky tests
- [ ] All tests run in < 5 seconds

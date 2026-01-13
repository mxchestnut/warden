# Testing Strategy & Guide

**Last Updated:** January 12, 2026

## Overview

Warden uses a comprehensive three-tier testing strategy:

1. **Unit & Integration Tests** - Vitest (Backend & Frontend)
2. **Component Tests** - React Testing Library (Frontend)
3. **End-to-End Tests** - Playwright (Critical User Flows)

---

## Testing Stack

### Backend Testing
- **Framework:** Vitest
- **API Testing:** Supertest
- **Coverage:** V8
- **Location:** `backend/src/tests/`

### Frontend Testing
- **Framework:** Vitest
- **Component Testing:** React Testing Library
- **User Simulation:** @testing-library/user-event
- **DOM Testing:** jsdom
- **Location:** `frontend-src/src/tests/`

### E2E Testing
- **Framework:** Playwright
- **Browser:** Chromium (Firefox/WebKit available)
- **Location:** `e2e/`

---

## Quick Start

### Run All Tests

```bash
# From project root
npm run test:all

# Individual test suites
npm run test:backend        # Backend unit tests
npm run test:frontend       # Frontend component tests
npm run test:e2e           # Playwright E2E tests
```

### Watch Mode (Development)

```bash
# Backend tests in watch mode
cd backend && npm run test:watch

# Frontend tests in watch mode
cd frontend-src && npm run test:watch

# E2E tests with UI
npm run test:e2e:ui
```

### Coverage Reports

```bash
# Backend coverage
cd backend && npm run test:coverage

# Frontend coverage
cd frontend-src && npm run test:coverage

# View HTML reports
open backend/coverage/index.html
open frontend-src/coverage/index.html
```

---

## Backend Testing

### File Structure

```
backend/src/tests/
├── setup.ts              # Test setup & global configuration
├── api.test.ts          # API integration tests
├── character.test.ts    # Character service unit tests
└── [feature].test.ts    # More test files
```

### Writing Backend Tests

#### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';

describe('Character Validation', () => {
  it('should validate character name', () => {
    const isValidName = (name: string) => {
      return name.length > 0 && name.length <= 50;
    };
    
    expect(isValidName('Aragorn')).toBe(true);
    expect(isValidName('')).toBe(false);
    expect(isValidName('a'.repeat(51))).toBe(false);
  });
});
```

#### API Integration Test Example

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../server';

describe('POST /api/characters', () => {
  it('should create a new character', async () => {
    const response = await request(app)
      .post('/api/characters')
      .send({
        name: 'Gandalf',
        race: 'Human',
        class: 'Wizard',
        level: 5
      })
      .set('Cookie', 'session=test-session-id');
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Gandalf');
  });
});
```

### Running Backend Tests

```bash
cd backend

# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage

# Run specific test file
npx vitest run src/tests/character.test.ts

# Interactive UI
npm run test:ui
```

---

## Frontend Testing

### File Structure

```
frontend-src/src/tests/
├── setup.ts                 # Test setup & DOM mocks
├── example.test.tsx        # Basic examples
├── components.test.tsx     # Component test examples
└── [component].test.tsx    # Component-specific tests
```

### Writing Frontend Tests

#### Component Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { CharacterCard } from '../components/CharacterCard';

describe('CharacterCard', () => {
  it('renders character information', () => {
    const character = {
      id: 1,
      name: 'Aragorn',
      race: 'Human',
      class: 'Ranger',
      level: 5
    };
    
    render(<CharacterCard character={character} />);
    
    expect(screen.getByText('Aragorn')).toBeInTheDocument();
    expect(screen.getByText(/Human/)).toBeInTheDocument();
    expect(screen.getByText(/Ranger/)).toBeInTheDocument();
    expect(screen.getByText(/Level 5/)).toBeInTheDocument();
  });

  it('calls onDelete when delete button clicked', async () => {
    const onDelete = vi.fn();
    const character = { id: 1, name: 'Test' };
    
    render(<CharacterCard character={character} onDelete={onDelete} />);
    
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await userEvent.click(deleteButton);
    
    expect(onDelete).toHaveBeenCalledWith(1);
  });
});
```

#### Hook Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCharacters } from '../hooks/useCharacters';

describe('useCharacters hook', () => {
  it('fetches characters on mount', async () => {
    const { result } = renderHook(() => useCharacters());
    
    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.characters).toBeInstanceOf(Array);
  });
});
```

### Running Frontend Tests

```bash
cd frontend-src

# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage

# Interactive UI
npm run test:ui
```

---

## E2E Testing (Playwright)

### File Structure

```
e2e/
├── auth.spec.ts                    # Authentication flows
├── character-creation.spec.ts      # Character creation & management
├── payments.spec.ts                # Stripe payment flows
└── [feature].spec.ts              # More E2E tests
```

### Writing E2E Tests

#### Example Flow Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('Character Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByPlaceholder(/username/i).fill('testuser');
    await page.getByPlaceholder(/password/i).fill('TestPass123!');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL('/');
  });

  test('should create a new character', async ({ page }) => {
    await page.goto('/characters/new');
    
    await page.getByLabel(/name/i).fill('Gandalf');
    await page.getByLabel(/race/i).fill('Human');
    await page.getByLabel(/class/i).fill('Wizard');
    await page.getByLabel(/level/i).fill('5');
    
    await page.getByRole('button', { name: /create/i }).click();
    
    await expect(page).toHaveURL(/\/characters/);
    await expect(page.getByText('Gandalf')).toBeVisible();
  });
});
```

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/auth.spec.ts

# View test report
npm run test:report
```

### E2E Test Configuration

Edit `playwright.config.ts` to:
- Add more browsers (Firefox, WebKit)
- Configure test timeout
- Set base URL
- Configure screenshots/videos
- Add mobile viewports

---

## Test Coverage Goals

### Minimum Coverage Requirements

| Layer | Lines | Functions | Branches | Statements |
|-------|-------|-----------|----------|------------|
| Backend | 70% | 70% | 70% | 70% |
| Frontend | 60% | 60% | 60% | 60% |

### Priority Testing Areas

**Critical (Must Test):**
- ✅ Authentication & Authorization
- ✅ Character CRUD operations
- ✅ Payment flows (Stripe integration)
- ✅ Data validation
- ✅ API error handling

**High Priority:**
- PathCompanion sync
- Discord bot commands
- File uploads
- Database migrations
- User permissions

**Medium Priority:**
- UI components
- Form validation
- Sorting/filtering
- Search functionality

**Low Priority:**
- Styling/CSS
- Analytics
- Non-critical UI elements

---

## CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on:
- ✅ Push to `main` branch
- ✅ Pull requests to `main` or `develop`
- ✅ Manual workflow dispatch

**Test Pipeline:**
1. Backend unit tests + linting + type checking
2. Frontend component tests + linting + type checking
3. E2E tests (after unit tests pass)
4. Security audit
5. Coverage upload to Codecov
6. PR comment with results

### Viewing CI Results

- **GitHub Actions:** `.github/workflows/tests.yml`
- **Test Reports:** Uploaded as artifacts
- **Coverage:** Codecov (requires setup)

---

## Best Practices

### Writing Good Tests

✅ **DO:**
- Write descriptive test names
- Test one thing per test
- Use arrange-act-assert pattern
- Mock external dependencies
- Test edge cases and errors
- Keep tests fast and isolated

❌ **DON'T:**
- Test implementation details
- Have tests depend on each other
- Use hardcoded timeouts excessively
- Ignore flaky tests
- Skip error cases
- Test third-party libraries

### Test Organization

```typescript
describe('Feature Name', () => {
  describe('Specific Functionality', () => {
    it('should do something specific', () => {
      // Test code
    });
    
    it('should handle error case', () => {
      // Error test
    });
  });
});
```

### Mocking Guidelines

```typescript
import { vi } from 'vitest';

// Mock a function
const mockFn = vi.fn();
mockFn.mockReturnValue('mocked value');

// Mock a module
vi.mock('../services/api', () => ({
  fetchCharacters: vi.fn(() => Promise.resolve([]))
}));

// Spy on existing function
const spy = vi.spyOn(console, 'log');
expect(spy).toHaveBeenCalled();
```

---

## Troubleshooting

### Common Issues

#### "Cannot find module" errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Tests timing out

```typescript
// Increase timeout in test
test('slow test', async () => {
  // test code
}, 30000); // 30 second timeout

// Or in vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 30000
  }
});
```

#### Playwright browser not found

```bash
# Reinstall browsers
npx playwright install chromium
```

#### Coverage not generating

```bash
# Install coverage provider
npm install -D @vitest/coverage-v8
```

---

## Next Steps

### Expand Test Coverage

1. Add tests for existing features:
   - [ ] All API endpoints
   - [ ] All React components
   - [ ] Critical user journeys

2. Set up pre-commit hooks:
   ```bash
   # Add to .husky/pre-commit
   npm run test:backend
   npm run test:frontend
   ```

3. Configure Codecov:
   - Sign up at https://codecov.io
   - Add `CODECOV_TOKEN` to GitHub secrets
   - Get coverage badges for README

4. Add visual regression testing:
   - Consider: Percy, Chromatic, or Playwright screenshots

5. Performance testing:
   - Lighthouse CI
   - k6 for load testing

---

## Resources

- **Vitest:** https://vitest.dev/
- **React Testing Library:** https://testing-library.com/react
- **Playwright:** https://playwright.dev/
- **Supertest:** https://github.com/visionmedia/supertest
- **Testing Best Practices:** https://testingjavascript.com/

---

## Commands Quick Reference

```bash
# Backend
cd backend
npm test                    # Run tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage
npm run test:ui            # Interactive UI

# Frontend
cd frontend-src
npm test                    # Run tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage
npm run test:ui            # Interactive UI

# E2E (from root)
npm run test:e2e           # Run E2E tests
npm run test:e2e:ui        # Interactive mode
npm run test:e2e:headed    # See browser
npm run test:e2e:debug     # Debug mode
npm run test:report        # View report

# All tests
npm run test:all           # Run everything
```

---

**Questions?** Check the individual test files for examples, or refer to the framework documentation linked above.

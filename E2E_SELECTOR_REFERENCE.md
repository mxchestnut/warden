# E2E Test Selector Reference

**Last Updated**: 2025-01-16  
**Purpose**: Mapping actual UI elements to test selectors for fixing E2E tests

## 🔍 Findings Summary

Based on inspection of React components, here are the actual UI elements versus what E2E tests expect:

---

## 1. Login Page (`/login`)

**File**: `frontend-src/src/pages/Login.tsx`

### ✅ Elements That Match Tests

| Test Selector | Actual Element | Status |
|---------------|----------------|--------|
| `getByRole('heading', { name: /login/i })` | ❌ Not found - heading says "Sign in to Warden" | **MISMATCH** |
| `getByPlaceholder(/username/i)` | ✅ `placeholder="Enter your username"` | **MATCH** |
| `getByPlaceholder(/password/i)` | ✅ `placeholder="Enter your password"` | **MATCH** |
| `getByRole('button', { name: /log in/i })` | ❌ Button text: "Sign in" | **MISMATCH** |

### ❌ Error Message - Test Failure

**Test Expects**: `/invalid|error|failed|denied/i`  
**Actual Error Display**:
```tsx
<div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
  {error}
</div>
```
**Error Message**: Just displays `error` state variable - likely "Login failed" or similar

**Fix Required**: 
- Option 1: Update test to look for actual error text
- Option 2: Update backend to return error messages matching test pattern

---

## 2. Navigation / Logout Button

**File**: `frontend-src/src/components/ui/Navigation.tsx`

### ❌ Logout Button - Test Failure

**Test Expects**: `getByText(/logout/i)`  
**Actual Button**:
```tsx
<button onClick={handleLogout}>
  <LogOut className="w-5 h-5" />
  <span>Log Out</span>  {/* Note: "Log Out" not "Logout" */}
</button>
```

**Fix**: Test selector should use:
```typescript
page.getByRole('button', { name: /log out/i })
// OR
page.getByText(/log out/i)  // Two words, not one
```

---

## 3. Character Creation Page (`/characters/new`)

**File**: `frontend-src/src/pages/CharacterEdit.tsx`

### ❌ Form Fields - All Tests Failing

**Test Expects**: `getByLabel(/name/i)`, `getByLabel(/race/i)`, `getByLabel(/class/i)`, `getByLabel(/level/i)`

**Actual Labels** (lines 460-490):
```tsx
<label className="block text-sm font-medium mb-2">
  Character Name *
</label>
<input type="text" placeholder="Enter character name" />

<label className="block text-sm font-medium mb-2">
  Race
</label>
<input type="text" placeholder="e.g., Human, Elf" />

<label className="block text-sm font-medium mb-2">
  Class
</label>
<input type="text" placeholder="e.g., Fighter, Wizard" />

<label className="block text-sm font-medium mb-2">
  Level
</label>
```

**Problem**: Labels don't use `htmlFor` attribute to associate with inputs!

**Fix Required**: Update CharacterEdit.tsx to add proper label associations:
```tsx
<label htmlFor="character-name" className="block text-sm font-medium mb-2">
  Character Name *
</label>
<input 
  id="character-name"
  type="text" 
  placeholder="Enter character name" 
/>
```

**Or** update tests to use placeholders instead:
```typescript
await page.getByPlaceholder(/enter character name/i).fill('Aragorn');
await page.getByPlaceholder(/e\.g\., human, elf/i).fill('Human');
await page.getByPlaceholder(/e\.g\., fighter, wizard/i).fill('Ranger');
// Level has no placeholder - need to add one or use label association
```

---

## 4. Settings/Profile Page (`/profile-settings`)

**File**: `frontend-src/src/pages/ProfileSettings.tsx`

### ❌ Subscription Status - Test Failure

**Test Expects**: `getByText(/subscription|plan|tier/i)` on `/settings`  
**Actual Route**: `/profile-settings` (not `/settings`)

**Component Inspection**: ProfileSettings.tsx doesn't show subscription tier info prominently

**Fix Required**:
1. Update test to navigate to `/profile-settings` instead of `/settings`
2. Check if subscription info exists in the component
3. If not, add subscription tier display

---

## 5. Pricing Page (`/pricing`)

**Test File**: `e2e/payments.spec.ts`

### ❌ Pricing Page - Not Found

**Test Expects**: Navigate to `/pricing` and find tiers  
**Actual**: No pricing page found in route inspection

**Routes Found** (from AppWithRouter.tsx):
- `/` - Home
- `/login` - Login
- `/register` - Register  
- `/characters` - Characters list
- `/characters/:id` - Character edit
- `/profile-settings` - Profile settings

**Fix Required**: 
- Either create a pricing page component
- Or skip/remove pricing tests if feature doesn't exist

---

## 🔧 Recommended Fixes

### Priority 1: Quick Wins (Update Tests)

1. **auth.spec.ts - Line 12**: Update button selector
```diff
- await page.getByRole('button', { name: /log in/i }).click();
+ await page.getByRole('button', { name: /sign in/i }).click();
```

2. **auth.spec.ts - Line 60**: Update logout selector
```diff
- await expect(page.getByText(/logout/i)).toBeVisible({ timeout: 5000 });
+ await expect(page.getByText(/log out/i)).toBeVisible({ timeout: 5000 });
```

3. **character-creation.spec.ts**: Use placeholders instead of labels
```diff
- await page.getByLabel(/name/i).fill('Aragorn');
+ await page.getByPlaceholder(/enter character name/i).fill('Aragorn');

- await page.getByLabel(/race/i).fill('Human');
+ await page.getByPlaceholder(/human, elf/i).fill('Human');

- await page.getByLabel(/class/i).fill('Ranger');
+ await page.getByPlaceholder(/fighter, wizard/i).fill('Ranger');
```

### Priority 2: Frontend Improvements (Better Accessibility)

1. **CharacterEdit.tsx**: Add proper label associations
```tsx
<label htmlFor="char-name">Character Name *</label>
<input id="char-name" ... />

<label htmlFor="char-race">Race</label>
<input id="char-race" ... />

<label htmlFor="char-class">Class</label>
<input id="char-class" ... />

<label htmlFor="char-level">Level</label>
<input id="char-level" ... />
```

2. **Login.tsx**: Already has good labels! ✅

### Priority 3: Feature Additions

1. Create pricing page or remove pricing tests
2. Add subscription tier display to profile settings
3. Improve error message consistency

---

## 📝 Test Update Checklist

- [ ] auth.spec.ts - Update "log in" button text to "sign in"
- [ ] auth.spec.ts - Update logout button text to "log out"  
- [ ] auth.spec.ts - Update heading check or skip
- [ ] auth.spec.ts - Check actual error message format
- [ ] character-creation.spec.ts - Use placeholders instead of labels
- [ ] payments.spec.ts - Update route to /profile-settings or skip tests
- [ ] payments.spec.ts - Check if pricing page exists, create or skip

---

## 🎯 Actual Working Selectors

### Login Page
```typescript
// Heading
page.getByRole('heading', { name: /sign in to warden/i })

// Username field  
page.getByPlaceholder(/enter your username/i)

// Password field
page.getByPlaceholder(/enter your password/i)

// Login button
page.getByRole('button', { name: /sign in/i })

// Register link
page.getByRole('link', { name: /don't have an account/i })
```

### Navigation
```typescript
// Logout button
page.getByRole('button', { name: /log out/i })

// Characters link
page.getByRole('button', { name: /characters/i })

// Settings link  
page.getByRole('button', { name: /settings/i })
```

### Character Edit
```typescript
// Name field
page.getByPlaceholder(/enter character name/i)

// Race field
page.getByPlaceholder(/e\.g\., human, elf/i)

// Class field
page.getByPlaceholder(/e\.g\., fighter, wizard/i)

// PathCompanion sync button
page.getByRole('button', { name: /sync with pathcompanion/i })

// Save button
page.getByRole('button', { name: /save/i })
```

---

## 🚀 Next Steps

1. Run `npx playwright codegen http://localhost:5173` to record actual interactions
2. Use Playwright Inspector to find exact selectors: `npx playwright test --debug`
3. Update test files with correct selectors from this reference
4. Re-run tests and iterate

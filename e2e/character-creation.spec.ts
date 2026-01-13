import { test, expect } from '@playwright/test';

// NOTE: Character creation tests require full feature implementation
// These are disabled pending UI/form completion
// Enable with: test.describe('Character Creation Flow', () => {
test.describe.skip('Character Creation Flow', () => {
  // Ensure test user exists before running the flow (idempotent)
  test.beforeAll(async ({ request }) => {
    await request.post('http://localhost:3000/api/auth/register', {
      data: {
        username: 'testuser',
        password: 'TestPass123!',
        email: 'testuser@example.com',
      },
    }).catch(() => {
      // If the user already exists, the endpoint returns 400; ignore it so tests proceed
    });
  });

  // Run login before each test
  test.beforeEach(async ({ page }) => {
    // Login via API to avoid UI flakiness and reuse session cookies
    const loginResponse = await page.request.post('http://localhost:3000/api/auth/login', {
      data: {
        username: 'testuser',
        password: 'TestPass123!',
      },
    });

    expect(loginResponse.ok()).toBeTruthy();

    await page.goto('/');
    await expect(page).toHaveURL('/');
  });

  test('should navigate to character creation page', async ({ page }) => {
    // Navigate directly to character creation page
    await page.goto('/characters/new');
    
    // Should show character creation form
    await expect(page).toHaveURL(/\/characters\/new/);
    
    // Verify form elements are visible
    await expect(page.getByLabel(/name/i)).toBeVisible();
  });

  test('should create a new character with required fields', async ({ page }) => {
    await page.goto('/characters/new');
    await expect(page).toHaveURL(/\/characters\/new/);
    
    // Fill in character details
    await page.getByLabel(/name/i).fill('Aragorn');
    await page.getByLabel(/race/i).fill('Human');
    await page.getByLabel(/class/i).fill('Ranger');
    await page.getByLabel(/level/i).fill('5');
    
    // Submit form - look for the main Save Character button specifically
    await page.getByRole('button', { name: 'Save Character' }).click();
    
    // Should redirect to characters list or character detail
    await expect(page).toHaveURL(/\/characters/, { timeout: 10000 });
    
    // Should show the new character
    await expect(page.getByText('Aragorn')).toBeVisible({ timeout: 5000 });
  });

  test('should show validation errors for empty required fields', async ({ page }) => {
    await page.goto('/characters/new');
    await expect(page).toHaveURL(/\/characters\/new/);
    
    // Try to submit without filling fields - use the specific Save Character button
    await page.getByRole('button', { name: 'Save Character' }).click();
    
    // Should show validation errors
    await expect(page.getByText(/name.*required/i)).toBeVisible({ timeout: 2000 });
  });

  test('should upload character avatar', async ({ page }) => {
    await page.goto('/characters/new');
    await expect(page).toHaveURL(/\/characters\/new/);
    
    // Fill in basic details
    await page.getByLabel(/name/i).fill('Gandalf');
    await page.getByLabel(/race/i).fill('Human');
    await page.getByLabel(/class/i).fill('Wizard');
    
    // Upload avatar (you'll need a test image)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image-data'),
    });
    
    // Submit form - use the specific Save Character button
    await page.getByRole('button', { name: 'Save Character' }).click();
    
    // Should show success message or redirect
    await expect(page).toHaveURL(/\/characters/, { timeout: 10000 });
  });

  test('should sync with PathCompanion', async ({ page }) => {
    await page.goto('/characters');
    
    // Assuming there's a sync button
    const syncButton = page.getByRole('button', { name: /sync.*pathcompanion/i });
    if (await syncButton.isVisible()) {
      await syncButton.click();
      
      // Should show syncing progress or success message
      await expect(
        page.getByText(/synced|syncing|connected/i)
      ).toBeVisible({ timeout: 10000 });
    }
  });
});

import { test, expect } from '@playwright/test';

test.describe('Character Creation Flow', () => {
  // Run login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/username/i).fill('testuser');
    await page.getByPlaceholder(/password/i).fill('TestPass123!');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL('/');
  });

  test('should navigate to character creation page', async ({ page }) => {
    // Click on Characters link
    await page.getByRole('link', { name: /characters/i }).click();
    
    // Should show characters page
    await expect(page).toHaveURL(/\/characters/);
    
    // Click create new character button
    await page.getByRole('button', { name: /create.*character/i }).click();
    
    // Should show character creation form
    await expect(page).toHaveURL(/\/characters\/new|\/character-edit/);
  });

  test('should create a new character with required fields', async ({ page }) => {
    await page.goto('/characters/new');
    
    // Fill in character details
    await page.getByLabel(/name/i).fill('Aragorn');
    await page.getByLabel(/race/i).fill('Human');
    await page.getByLabel(/class/i).fill('Ranger');
    await page.getByLabel(/level/i).fill('5');
    
    // Submit form
    await page.getByRole('button', { name: /create|save/i }).click();
    
    // Should redirect to characters list or character detail
    await expect(page).toHaveURL(/\/characters/, { timeout: 10000 });
    
    // Should show the new character
    await expect(page.getByText('Aragorn')).toBeVisible({ timeout: 5000 });
  });

  test('should show validation errors for empty required fields', async ({ page }) => {
    await page.goto('/characters/new');
    
    // Try to submit without filling fields
    await page.getByRole('button', { name: /create|save/i }).click();
    
    // Should show validation errors
    await expect(page.getByText(/name.*required/i)).toBeVisible({ timeout: 2000 });
  });

  test('should upload character avatar', async ({ page }) => {
    await page.goto('/characters/new');
    
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
    
    // Submit form
    await page.getByRole('button', { name: /create|save/i }).click();
    
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

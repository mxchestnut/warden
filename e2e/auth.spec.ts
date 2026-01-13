import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    
    // Check for login form elements
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
    await expect(page.getByPlaceholder(/username/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in invalid credentials
    await page.getByPlaceholder(/username/i).fill('invaliduser');
    await page.getByPlaceholder(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /log in/i }).click();
    
    // Check for error message
    await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to home after successful login', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in valid credentials (you'll need to create a test user)
    await page.getByPlaceholder(/username/i).fill('testuser');
    await page.getByPlaceholder(/password/i).fill('TestPass123!');
    await page.getByRole('button', { name: /log in/i }).click();
    
    // Should redirect to home page
    await expect(page).toHaveURL('/', { timeout: 5000 });
  });

  test('should persist session after page reload', async ({ page, context }) => {
    // First login
    await page.goto('/login');
    await page.getByPlaceholder(/username/i).fill('testuser');
    await page.getByPlaceholder(/password/i).fill('TestPass123!');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL('/');
    
    // Reload page
    await page.reload();
    
    // Should still be logged in
    await expect(page).toHaveURL('/');
    await expect(page.getByText(/logout/i)).toBeVisible({ timeout: 5000 });
  });
});

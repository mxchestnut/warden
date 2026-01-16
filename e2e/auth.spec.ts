import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {

  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    
    // Check for login form elements
    await expect(page.getByRole('heading', { name: /^login$/i })).toBeVisible();
    await expect(page.getByPlaceholder(/enter your username/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter your password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^log in$/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in invalid credentials
    await page.getByPlaceholder(/enter your username/i).fill('invaliduser');
    await page.getByPlaceholder(/enter your password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /^log in$/i }).click();
    
    // Check for error message in the error div
    await expect(
      page.locator('.bg-destructive\\/10')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to home after successful login', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in valid credentials
    await page.getByPlaceholder(/enter your username/i).fill('testuser');
    await page.getByPlaceholder(/enter your password/i).fill('TestPass123!');
    await page.getByRole('button', { name: /^log in$/i }).click();
    
    // Should redirect to home page
    await expect(page).toHaveURL('http://localhost:5173/', { timeout: 10000 });
  });

  test('should persist session after page reload', async ({ page }) => {
    // Login via API first (more reliable)
    const loginResponse = await page.request.post('http://localhost:3000/api/auth/login', {
      data: {
        username: 'testuser',
        password: 'TestPass123!',
      },
    });
    expect(loginResponse.ok()).toBeTruthy();
    
    // Navigate to home
    await page.goto('/');
    await expect(page).toHaveURL('http://localhost:5173/');
    
    // Reload page
    await page.reload();
    
    // Should still be logged in (not redirected to login)
    await expect(page).toHaveURL('http://localhost:5173/');
    await expect(page.getByRole('button', { name: /log out/i })).toBeVisible({ timeout: 5000 });
  });
});

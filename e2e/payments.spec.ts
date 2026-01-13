import { test, expect } from '@playwright/test';

test.describe('Stripe Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByPlaceholder(/username/i).fill('testuser');
    await page.getByPlaceholder(/password/i).fill('TestPass123!');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL('/');
  });

  test('should display pricing tiers', async ({ page }) => {
    await page.goto('/pricing');
    
    // Check for pricing tiers
    await expect(page.getByText(/free/i)).toBeVisible();
    await expect(page.getByText(/pro/i)).toBeVisible();
    
    // Check for pricing amounts
    await expect(page.getByText(/\$0/)).toBeVisible();
    await expect(page.getByText(/\$\d+/)).toBeVisible();
  });

  test('should initiate checkout for Pro tier', async ({ page }) => {
    await page.goto('/pricing');
    
    // Click upgrade to Pro button
    await page.getByRole('button', { name: /upgrade.*pro|get pro/i }).click();
    
    // Should redirect to Stripe checkout or show payment modal
    // Wait for either Stripe URL or payment form
    const isStripeCheckout = await page.waitForURL(
      /checkout\.stripe\.com/,
      { timeout: 5000 }
    ).catch(() => false);
    
    if (!isStripeCheckout) {
      // If not redirected to Stripe, check for payment form
      await expect(page.getByText(/payment/i)).toBeVisible();
    }
  });

  test.skip('should complete test payment successfully', async ({ page }) => {
    // This test is skipped by default - only run in test mode with Stripe test keys
    
    await page.goto('/pricing');
    await page.getByRole('button', { name: /upgrade.*pro/i }).click();
    
    // Wait for Stripe checkout page
    await page.waitForURL(/checkout\.stripe\.com/);
    
    // Fill in Stripe test card
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/card number/i).fill('4242424242424242');
    await page.getByPlaceholder(/mm.*yy/i).fill('12/34');
    await page.getByPlaceholder(/cvc/i).fill('123');
    await page.getByPlaceholder(/zip/i).fill('12345');
    
    // Submit payment
    await page.getByRole('button', { name: /pay|subscribe/i }).click();
    
    // Should redirect back to success page
    await expect(page).toHaveURL(/success|thank-you/, { timeout: 15000 });
  });

  test('should show subscription status', async ({ page }) => {
    await page.goto('/settings');
    
    // Should show current subscription tier
    await expect(
      page.getByText(/subscription|plan|tier/i)
    ).toBeVisible();
  });
});

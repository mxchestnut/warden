import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for E2E tests
 * Creates a test user that can be used across all test files
 */
async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:5173';
  const apiURL = 'http://localhost:3000';

  console.log('🧪 Setting up E2E test environment...');

  // Launch browser to get API request context
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Create test user (idempotent - won't fail if user already exists)
    console.log('📝 Creating test user...');
    const registerResponse = await page.request.post(`${apiURL}/api/auth/register`, {
      data: {
        username: 'testuser',
        password: 'TestPass123!',
        email: 'testuser@example.com',
      },
    });

    if (registerResponse.ok()) {
      const data = await registerResponse.json();
      console.log(`✅ Test user created: ${data.user.username} (Account Code: ${data.user.accountCode})`);
    } else if (registerResponse.status() === 400) {
      // User likely already exists
      console.log('ℹ️  Test user already exists, continuing...');
    } else {
      const errorText = await registerResponse.text();
      console.error(`⚠️  Unexpected response from register: ${registerResponse.status()} - ${errorText}`);
    }
  } catch (error) {
    console.error('❌ Failed to create test user:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('✅ E2E setup complete\n');
}

export default globalSetup;

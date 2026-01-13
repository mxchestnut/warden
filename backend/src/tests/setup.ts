import { beforeAll, afterAll, afterEach } from 'vitest';

// Setup that runs before all tests
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // You can initialize test database connection here if needed
  console.log('🧪 Test environment initialized');
});

// Cleanup that runs after all tests
afterAll(async () => {
  // Close database connections, cleanup resources
  console.log('✅ Test cleanup completed');
});

// Reset state after each test
afterEach(() => {
  // Clear any mocks or test state
});

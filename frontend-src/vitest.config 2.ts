import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.config.*',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      all: true,
      lines: 60,
      functions: 60,
      branches: 60,
      statements: 60,
    },
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

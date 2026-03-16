import { defineConfig } from 'vitest/config';

/**
 * S4 Ledger — Vitest Configuration
 * Unit tests for prod-app and demo-app JavaScript modules.
 */
export default defineConfig({
  test: {
    // Test file patterns
    include: [
      'tests/**/*.test.js',
      'prod-app/**/*.test.js',
      'demo-app/**/*.test.js',
    ],
    exclude: [
      'tests/e2e/**',
      'node_modules/**',
    ],

    // Environment
    environment: 'jsdom',

    // Coverage
    coverage: {
      provider: 'v8',
      include: [
        'prod-app/src/js/**/*.js',
        'demo-app/src/js/**/*.js',
      ],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.js',
        '**/*.spec.js',
      ],
      reporter: ['text', 'text-summary', 'lcov'],
      thresholds: {
        statements: 40,
        branches: 55,
        functions: 35,
        lines: 40,
      },
    },

    // Globals
    globals: true,

    // Setup
    setupFiles: ['tests/setup.js'],

    // Timeout
    testTimeout: 10000,
  },
});

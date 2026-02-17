import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Use happy-dom for faster tests (jsdom alternative)
    environment: 'happy-dom',

    // Enable Jest-like globals (describe, it, expect)
    globals: true,

    // Setup file for global mocks and matchers
    setupFiles: ['./__tests__/setup.ts'],

    // Test file patterns
    include: ['**/*.test.{ts,tsx}'],

    // Exclude patterns
    exclude: [
      '**/node_modules/**',
      '**/mcp/**',
      '.next',
      'dist',
      // Ludo Three.js tests require WebGL (not available in CI/test);
      // Ludo game store tests use Jest APIs incompatible with Vitest
      'lib/studio/ludo/three/**/__tests__/**',
      'lib/studio/ludo/game/stores/__tests__/**',
      'lib/studio/ludo/game/__tests__/gameState.test.ts',
      'components/studio/ludo/Board/__tests__/**',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        '.next/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
        '**/*.test.{ts,tsx}',
        '__tests__/**',
      ],
      // Coverage thresholds - fail tests if coverage drops below these
      // Note: These are starting thresholds; increase over time
      thresholds: {
        // Global thresholds
        statements: 30,
        branches: 25,
        functions: 30,
        lines: 30,
        // Per-file thresholds for critical files
        perFile: false, // Set to true to enforce per-file thresholds
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})

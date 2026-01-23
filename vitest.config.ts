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
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})

import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    testTimeout: 30000, // Longer timeout for E2E tests
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/main.ts',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    include: [
      'test/**/*.e2e-spec.ts',
      'test/**/*.integration.test.ts',
      'test/**/*.performance.test.ts',
      'test/**/*.security.test.ts',
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'src/**/*.spec.ts', // Exclude unit tests
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@gj/ir-schema': path.resolve(__dirname, '../../../packages/ir-schema/src'),
    },
  },
});
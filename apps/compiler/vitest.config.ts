import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
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
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@gj/ir-schema': path.resolve(__dirname, '../../packages/ir-schema/src'),
    },
  },
});
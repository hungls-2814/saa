import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // Scope to application tests only — keep the kit's .claude/** test files out.
    include: [
      'app/**/*.test.{ts,tsx}',
      'lib/**/*.test.{ts,tsx}',
      'i18n/**/*.test.{ts,tsx}',
      '*.test.{ts,tsx}',
    ],
    exclude: ['node_modules/**', '.claude/**', '.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'vitest.setup.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});

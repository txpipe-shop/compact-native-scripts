import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['__tests__/**/*.test.ts'],
    env: {
      TEST_INPUT: process.env.TEST_INPUT || 'examples/test-input.json',
    },
  },
});

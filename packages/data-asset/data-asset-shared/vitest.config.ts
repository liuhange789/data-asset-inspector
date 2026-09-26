import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts', 'src/__tests__/**/*.test.ts'],
    globals: true,
  },
})
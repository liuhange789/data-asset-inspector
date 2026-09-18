import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    include: [
      'packages/data-asset/*/tests/**/*.spec.ts',
      'packages/data-asset/*/src/__tests__/**/*.test.ts',
    ],
    globals: true,
  },
  resolve: {
    alias: {
      '@liuhange/dsh-data-asset-shared': resolve(__dirname, 'packages/data-asset/data-asset-shared/src/index.ts'),
    },
  },
})

import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts', 'src/__tests__/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@liuhange/dsh-data-asset-shared': resolve(__dirname, '../data-asset-shared/src/index.ts'),
    },
  },
})

import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

const sharedConfigDir = resolve(__dirname, 'packages/data-asset/data-asset-shared/config')
process.env.BUSINESS_RULES_PATH ??= resolve(sharedConfigDir, 'business-rules.json')
process.env.POLICY_REFS_PATH ??= resolve(sharedConfigDir, 'policy-references.json')

export default defineConfig({
  test: {
    include: [
      'packages/data-asset/*/tests/**/*.spec.ts',
      'packages/data-asset/*/src/__tests__/**/*.test.ts',
    ],
    globals: true,
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@liuhange/dsh-data-asset-shared': resolve(__dirname, 'packages/data-asset/data-asset-shared/src/index.ts'),
    },
  },
})

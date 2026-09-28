import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

const sharedConfigDir = resolve(__dirname, '../data-asset-shared/config')

process.env.BUSINESS_RULES_PATH ??= resolve(sharedConfigDir, 'business-rules.json')
process.env.POLICY_REFS_PATH ??= resolve(sharedConfigDir, 'policy-references.json')


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
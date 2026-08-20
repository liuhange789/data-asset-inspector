import type { PackagingRules } from '@deepseek-ai/dsh-data-asset-shared'

export class ComplianceGenerator {
  generate(packagingRules: PackagingRules): string[] {
    return packagingRules.complianceStatements.map(stmt => `✅ ${stmt}`)
  }
}

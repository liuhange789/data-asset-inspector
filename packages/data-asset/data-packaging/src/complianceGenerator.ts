import type { PackagingRules } from '@liuhange/dsh-data-asset-shared'

export class ComplianceGenerator {
  generate(packagingRules: PackagingRules): string[] {
    return packagingRules.complianceStatements.map(stmt => `✅ ${stmt}`)
  }
}

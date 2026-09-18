export interface TripleConditionConfig {
  pastTransactionKeywords: string[]
  ownershipControlKeywords: string[]
  economicBenefitKeywords: string[]
}

export interface ScreeningResult {
  passed: boolean
  missingConditions: string[]
}

export class AssetTripleConditionScreener {
  constructor(private config: TripleConditionConfig) {}

  screen(metadata: Record<string, unknown>): ScreeningResult {
    const text = JSON.stringify(metadata).toLowerCase()
    const missing: string[] = []

    const hasPastTransaction = this.config.pastTransactionKeywords.some(kw => text.includes(kw.toLowerCase()))
    if (!hasPastTransaction) missing.push('过去交易或事项形成')

    const hasOwnershipControl = this.config.ownershipControlKeywords.some(kw => text.includes(kw.toLowerCase()))
    if (!hasOwnershipControl) missing.push('企业拥有或控制')

    const hasEconomicBenefit = this.config.economicBenefitKeywords.some(kw => text.includes(kw.toLowerCase()))
    if (!hasEconomicBenefit) missing.push('预期带来经济利益')

    return {
      passed: missing.length === 0,
      missingConditions: missing,
    }
  }
}
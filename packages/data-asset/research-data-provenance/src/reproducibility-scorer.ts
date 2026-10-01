import { PolicyBasisBuilder } from './policy-basis-builder.js'
import type { ReproducibilityResult } from './types.js'

export class ReproducibilityScorer {
  private readonly policyBasisBuilder: PolicyBasisBuilder

  constructor(policyBasisBuilder?: PolicyBasisBuilder) {
    this.policyBasisBuilder = policyBasisBuilder ?? new PolicyBasisBuilder()
  }

  score(hasCode: boolean, hasEnv: boolean, hasParam: boolean): number {
    const presentCount = (hasCode ? 1 : 0) + (hasEnv ? 1 : 0) + (hasParam ? 1 : 0)
    return Math.round((presentCount / 3) * 100 * 100) / 100
  }

  buildResult(
    reproducibilityScore: number | null,
    missingItems: string[],
    skipped: boolean,
  ): ReproducibilityResult {
    return {
      reproducibilityScore,
      missingItems,
      policyBasis: this.policyBasisBuilder.buildScienceDataClause('第十一条'),
      judgmentStatus: '自动判定',
      skipped,
    }
  }
}
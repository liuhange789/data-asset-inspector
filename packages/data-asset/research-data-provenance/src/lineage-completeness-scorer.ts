import { PolicyBasisBuilder } from './policy-basis-builder.js'
import type { LineageDetectionResult } from './types.js'

export class LineageCompletenessScorer {
  private readonly policyBasisBuilder: PolicyBasisBuilder

  constructor(policyBasisBuilder?: PolicyBasisBuilder) {
    this.policyBasisBuilder = policyBasisBuilder ?? new PolicyBasisBuilder()
  }

  score(actualItemCount: number, expectedItemCount: number): number {
    if (expectedItemCount <= 0) {
      return 0
    }
    const ratio = actualItemCount / expectedItemCount
    return Math.round(ratio * 100 * 100) / 100
  }

  buildResult(
    completenessScore: number,
    missingItems: string[],
    brokenPoints: string[],
  ): LineageDetectionResult {
    return {
      completenessScore,
      missingItems,
      brokenPoints,
      policyBasis: this.policyBasisBuilder.buildScienceDataClause('第九条'),
      judgmentStatus: '自动判定',
    }
  }
}
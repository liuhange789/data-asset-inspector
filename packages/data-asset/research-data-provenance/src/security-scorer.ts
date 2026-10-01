import { PolicyBasisBuilder } from './policy-basis-builder.js'
import { evaluateQualityRule } from './normality-scorer.js'
import type { QualityDimensionConfig, QualityDimensionScore } from './types.js'

export class SecurityScorer {
  private readonly policyBasisBuilder: PolicyBasisBuilder

  constructor(policyBasisBuilder?: PolicyBasisBuilder) {
    this.policyBasisBuilder = policyBasisBuilder ?? new PolicyBasisBuilder()
  }

  score(records: Record<string, unknown>, config: QualityDimensionConfig): QualityDimensionScore {
    const issues: string[] = []
    let passedWeight = 0
    let enabledWeight = 0

    for (const rule of config.security.rules) {
      if (!rule.enabled) {
        continue
      }
      enabledWeight += rule.weight
      try {
        const passed = evaluateQualityRule(records, rule.judgmentLogic)
        if (passed) {
          passedWeight += rule.weight
        } else {
          issues.push(rule.description)
        }
      } catch (e) {
        issues.push(`${rule.description}（规则执行异常: ${(e as Error).message}）`)
      }
    }

    const scoreValue = enabledWeight <= 0 ? 100 : Math.round((passedWeight / enabledWeight) * 100 * 100) / 100

    return {
      dimension: '安全性',
      score: scoreValue,
      issues,
      policyBasis: this.policyBasisBuilder.buildQualityGuideClause('安全性维度'),
      judgmentStatus: '自动判定',
    }
  }
}

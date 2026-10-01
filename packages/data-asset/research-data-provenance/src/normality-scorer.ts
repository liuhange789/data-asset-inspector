import { PolicyBasisBuilder } from './policy-basis-builder.js'
import type { QualityDimensionConfig, QualityDimensionRule, QualityDimensionScore } from './types.js'

export interface DimensionScoreDetail {
  score: number
  issues: string[]
  failedRules: string[]
  ruleErrors: string[]
}

export class NormalityScorer {
  private readonly policyBasisBuilder: PolicyBasisBuilder

  constructor(policyBasisBuilder?: PolicyBasisBuilder) {
    this.policyBasisBuilder = policyBasisBuilder ?? new PolicyBasisBuilder()
  }

  score(records: Record<string, unknown>, config: QualityDimensionConfig): QualityDimensionScore {
    const detail = this.evaluateRules(records, config.normality.rules)
    return {
      dimension: '规范性',
      score: detail.score,
      issues: detail.issues,
      policyBasis: this.policyBasisBuilder.buildQualityGuideClause('规范性维度'),
      judgmentStatus: '自动判定',
    }
  }

  evaluateRules(records: Record<string, unknown>, rules: QualityDimensionRule[]): DimensionScoreDetail {
    const issues: string[] = []
    const failedRules: string[] = []
    const ruleErrors: string[] = []
    let passedWeight = 0
    let enabledWeight = 0

    for (const rule of rules) {
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
          failedRules.push(rule.ruleId)
        }
      } catch (e) {
        issues.push(`${rule.description}（规则执行异常: ${(e as Error).message}）`)
        failedRules.push(rule.ruleId)
        ruleErrors.push(rule.ruleId)
      }
    }

    const score = enabledWeight <= 0 ? 100 : Math.round((passedWeight / enabledWeight) * 100 * 100) / 100
    return { score, issues, failedRules, ruleErrors }
  }
}

export function evaluateQualityRule(records: Record<string, unknown>, judgmentLogic: string): boolean {
  const match = judgmentLogic.match(/^(\S+)\s+(exists|!exists|===|!==|=~|!~)(?:\s+(.+))?$/)
  if (!match) {
    throw new Error(`无法解析判定逻辑: ${judgmentLogic}`)
  }
  const field = match[1]
  const op = match[2]
  if (!field || !op) {
    throw new Error(`无法解析判定逻辑: ${judgmentLogic}`)
  }
  const value = match[3] ?? ''
  const raw = records[field]
  const present = raw !== undefined && raw !== null && (typeof raw !== 'string' || raw.trim() !== '')

  switch (op) {
    case 'exists':
      return present
    case '!exists':
      return !present
    case '===':
      return present && String(raw) === value
    case '!==':
      return !present || String(raw) !== value
    case '=~':
      return present && new RegExp(value).test(String(raw))
    case '!~':
      return !present || !new RegExp(value).test(String(raw))
    default:
      throw new Error(`不支持的操作符: ${op}`)
  }
}
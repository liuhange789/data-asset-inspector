import type { ScoringContext, DimensionScoringResult, QualityIssue } from './types.js'
import type { QualityScoringConfig } from '@liuhange/dsh-data-asset-shared'

export class ConsistencyScorer {
  score(context: ScoringContext): DimensionScoringResult {
    const config = context.config as QualityScoringConfig
    const issues: QualityIssue[] = []

    if (context.records.length === 0) {
      return { score: 0, issues }
    }

    const rules = config.consistency.crossFieldRules
    let totalChecks = 0
    let satisfiedChecks = 0

    for (const rule of rules) {
      const missingFields = rule.fields.filter(f => !context.fieldNames.includes(f))
      if (missingFields.length > 0) {
        issues.push({
          dimension: 'consistency',
          description: `约束规则引用字段 ${missingFields.join(', ')} 不存在，已跳过`,
          location: `约束规则 ${rule.name}`,
          severity: 'low',
        })
        continue
      }

      for (let i = 0; i < context.records.length; i++) {
        const record = context.records[i]!
        const result = this.checkConstraint(record, rule)
        totalChecks++
        if (result.satisfied) {
          satisfiedChecks++
        } else {
          issues.push({
            dimension: 'consistency',
            description: `约束规则 ${rule.name} 不满足: ${result.reason}`,
            location: `行 ${i + 1}`,
            severity: 'medium',
          })
        }
      }
    }

    if (totalChecks === 0) {
      return { score: 100, issues }
    }

    const score = Math.floor((satisfiedChecks / totalChecks) * 100)
    return { score, issues }
  }

  private checkConstraint(
    record: Record<string, unknown>,
    rule: { name: string; fields: string[]; constraint: string; value?: unknown },
  ): { satisfied: boolean; reason: string } {
    const fields = rule.fields
    const constraint = rule.constraint

    if (constraint === 'after' && fields.length >= 2) {
      const before = record[fields[0]!]
      const after = record[fields[1]!]
      if (before === null || before === undefined || after === null || after === undefined) {
        return { satisfied: true, reason: '字段为空，跳过约束' }
      }
      const beforeDate = new Date(String(before))
      const afterDate = new Date(String(after))
      if (afterDate >= beforeDate) {
        return { satisfied: true, reason: '' }
      }
      return { satisfied: false, reason: `${fields[1]}(${after}) 早于 ${fields[0]}(${before})` }
    }

    if (constraint === 'before' && fields.length >= 2) {
      const before = record[fields[0]!]
      const after = record[fields[1]!]
      if (before === null || before === undefined || after === null || after === undefined) {
        return { satisfied: true, reason: '字段为空，跳过约束' }
      }
      const beforeDate = new Date(String(before))
      const afterDate = new Date(String(after))
      if (beforeDate < afterDate) {
        return { satisfied: true, reason: '' }
      }
      return { satisfied: false, reason: `${fields[0]}(${before}) 不早于 ${fields[1]}(${after})` }
    }

    if (constraint === 'equal' && fields.length >= 2) {
      const v1 = record[fields[0]!]
      const v2 = record[fields[1]!]
      if (v1 === v2) {
        return { satisfied: true, reason: '' }
      }
      return { satisfied: false, reason: `${fields[0]}(${v1}) 不等于 ${fields[1]}(${v2})` }
    }

    if (constraint === 'notEqual' && fields.length >= 2) {
      const v1 = record[fields[0]!]
      const v2 = record[fields[1]!]
      if (v1 !== v2) {
        return { satisfied: true, reason: '' }
      }
      return { satisfied: false, reason: `${fields[0]}(${v1}) 等于 ${fields[1]}(${v2})` }
    }

    if (constraint === 'greaterThan' && fields.length >= 1) {
      const v = record[fields[0]!]
      const threshold = rule.value
      if (v === null || v === undefined || threshold === undefined) {
        return { satisfied: true, reason: '字段为空，跳过约束' }
      }
      if (Number(v) > Number(threshold)) {
        return { satisfied: true, reason: '' }
      }
      return { satisfied: false, reason: `${fields[0]}(${v}) 不大于 ${threshold}` }
    }

    if (constraint === 'lessThan' && fields.length >= 1) {
      const v = record[fields[0]!]
      const threshold = rule.value
      if (v === null || v === undefined || threshold === undefined) {
        return { satisfied: true, reason: '字段为空，跳过约束' }
      }
      if (Number(v) < Number(threshold)) {
        return { satisfied: true, reason: '' }
      }
      return { satisfied: false, reason: `${fields[0]}(${v}) 不小于 ${threshold}` }
    }

    return { satisfied: true, reason: `未知约束类型: ${constraint}` }
  }
}
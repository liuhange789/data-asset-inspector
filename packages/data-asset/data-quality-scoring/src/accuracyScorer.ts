import type { ScoringContext, DimensionScoringResult, QualityIssue } from './types.js'
import type { QualityScoringConfig } from '@liuhange/dsh-data-asset-shared'

export class AccuracyScorer {
  score(context: ScoringContext): DimensionScoringResult {
    const config = context.config as QualityScoringConfig
    const issues: QualityIssue[] = []

    if (context.records.length === 0) {
      return { score: 0, issues }
    }

    const formatRules = config.accuracy.formatRules
    const domainRules = config.accuracy.domainRules

    let formatCompliance = 1
    let formatWeightSum = 0
    let formatWeightedCompliance = 0

    for (const rule of formatRules) {
      if (!context.fieldNames.includes(rule.fieldName)) {
        issues.push({
          dimension: 'accuracy',
          description: `格式规则引用字段 ${rule.fieldName} 不存在，已跳过`,
          location: `格式规则 ${rule.fieldName}`,
          severity: 'low',
        })
        continue
      }

      let compliant = 0
      let total = 0
      for (let i = 0; i < context.records.length; i++) {
        const record = context.records[i]!
        const value = record[rule.fieldName]
        if (value === null || value === undefined || String(value).trim() === '') {
          continue
        }
        total++
        try {
          const regex = new RegExp(rule.pattern)
          if (regex.test(String(value))) {
            compliant++
          } else {
            issues.push({
              dimension: 'accuracy',
              description: `字段 ${rule.fieldName} 值 "${value}" 不符合格式规则`,
              location: `行 ${i + 1}, 列 ${rule.fieldName}`,
              severity: 'medium',
            })
          }
        } catch {
          issues.push({
            dimension: 'accuracy',
            description: `格式规则 ${rule.fieldName} 正则编译失败`,
            location: `格式规则 ${rule.fieldName}`,
            severity: 'high',
          })
        }
      }

      if (total > 0) {
        formatWeightedCompliance += (compliant / total) * rule.weight
        formatWeightSum += rule.weight
      }
    }

    if (formatWeightSum > 0) {
      formatCompliance = formatWeightedCompliance / formatWeightSum
    }

    let domainCompliance = 1
    let domainWeightSum = 0
    let domainWeightedCompliance = 0

    for (const rule of domainRules) {
      if (!context.fieldNames.includes(rule.fieldName)) {
        issues.push({
          dimension: 'accuracy',
          description: `值域规则引用字段 ${rule.fieldName} 不存在，已跳过`,
          location: `值域规则 ${rule.fieldName}`,
          severity: 'low',
        })
        continue
      }

      let compliant = 0
      let total = 0
      for (let i = 0; i < context.records.length; i++) {
        const record = context.records[i]!
        const value = record[rule.fieldName]
        if (value === null || value === undefined || String(value).trim() === '') {
          continue
        }
        total++
        const numValue = Number(value)
        if (isNaN(numValue)) {
          issues.push({
            dimension: 'accuracy',
            description: `字段 ${rule.fieldName} 值 "${value}" 不是数字，无法校验值域`,
            location: `行 ${i + 1}, 列 ${rule.fieldName}`,
            severity: 'medium',
          })
          continue
        }
        if (rule.min !== undefined && rule.max !== undefined) {
          if (numValue >= rule.min && numValue <= rule.max) {
            compliant++
          } else {
            issues.push({
              dimension: 'accuracy',
              description: `字段 ${rule.fieldName} 值 ${numValue} 超出值域 [${rule.min}, ${rule.max}]`,
              location: `行 ${i + 1}, 列 ${rule.fieldName}`,
              severity: 'medium',
            })
          }
        } else if (rule.allowedValues !== undefined) {
          if (rule.allowedValues.includes(value)) {
            compliant++
          } else {
            issues.push({
              dimension: 'accuracy',
              description: `字段 ${rule.fieldName} 值 "${value}" 不在允许值列表中`,
              location: `行 ${i + 1}, 列 ${rule.fieldName}`,
              severity: 'medium',
            })
          }
        }
      }

      if (total > 0) {
        domainWeightedCompliance += (compliant / total) * rule.weight
        domainWeightSum += rule.weight
      }
    }

    if (domainWeightSum > 0) {
      domainCompliance = domainWeightedCompliance / domainWeightSum
    }

    const score = Math.floor((formatCompliance * 0.5 + domainCompliance * 0.5) * 100)
    return { score, issues }
  }
}
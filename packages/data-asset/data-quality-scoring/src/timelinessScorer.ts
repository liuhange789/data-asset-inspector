import type { ScoringContext, DimensionScoringResult, QualityIssue } from './types.js'
import type { QualityScoringConfig } from '@liuhange/dsh-data-asset-shared'

export class TimelinessScorer {
  score(context: ScoringContext): DimensionScoringResult {
    const config = context.config as QualityScoringConfig
    const issues: QualityIssue[] = []

    if (context.records.length === 0) {
      return { score: 0, issues }
    }

    const timestampField = config.timeliness.timestampField
    const thresholdHours = config.timeliness.freshnessThresholdHours

    if (!context.fieldNames.includes(timestampField)) {
      issues.push({
        dimension: 'timeliness',
        description: `时间戳字段 ${timestampField} 不存在`,
        location: `时间戳字段 ${timestampField}`,
        severity: 'high',
      })
      return { score: 0, issues }
    }

    const now = Date.now()
    const thresholdMs = thresholdHours * 60 * 60 * 1000
    let staleCount = 0
    let validCount = 0

    for (let i = 0; i < context.records.length; i++) {
      const record = context.records[i]!
      const timestampValue = record[timestampField]
      if (timestampValue === null || timestampValue === undefined || String(timestampValue).trim() === '') {
        continue
      }

      const recordTime = new Date(String(timestampValue)).getTime()
      if (isNaN(recordTime)) {
        issues.push({
          dimension: 'timeliness',
          description: `时间戳值 "${timestampValue}" 无法解析为日期`,
          location: `行 ${i + 1}, 列 ${timestampField}`,
          severity: 'medium',
        })
        continue
      }

      validCount++
      const age = now - recordTime
      if (age > thresholdMs) {
        staleCount++
        issues.push({
          dimension: 'timeliness',
          description: `数据已过期，距今 ${Math.floor(age / (60 * 60 * 1000))} 小时`,
          location: `行 ${i + 1}, 列 ${timestampField}`,
          severity: 'medium',
        })
      }
    }

    if (validCount === 0) {
      return { score: 0, issues }
    }

    const staleRatio = staleCount / validCount
    const score = Math.floor((1 - staleRatio) * 100)
    return { score, issues }
  }
}
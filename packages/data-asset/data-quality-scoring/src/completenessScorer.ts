import type { ScoringContext, DimensionScoringResult, QualityIssue } from './types.js'
import type { QualityScoringConfig } from '@liuhange/dsh-data-asset-shared'

export class CompletenessScorer {
  score(context: ScoringContext): DimensionScoringResult {
    const config = context.config as QualityScoringConfig
    const missingMarkers = config.completeness.missingMarkers
    const issues: QualityIssue[] = []

    if (context.records.length === 0 || context.fieldNames.length === 0) {
      return { score: 0, issues }
    }

    let totalValues = 0
    let missingValues = 0

    for (let i = 0; i < context.records.length; i++) {
      const record = context.records[i]!
      for (const fieldName of context.fieldNames) {
        totalValues++
        const value = record[fieldName]
        if (this.isMissing(value, missingMarkers)) {
          missingValues++
          issues.push({
            dimension: 'completeness',
            description: `字段 ${fieldName} 缺失`,
            location: `行 ${i + 1}, 列 ${fieldName}`,
            severity: 'medium',
          })
        }
      }
    }

    if (totalValues === 0) {
      return { score: 0, issues }
    }

    const score = Math.floor(((totalValues - missingValues) / totalValues) * 100)
    return { score, issues }
  }

  private isMissing(value: unknown, markers: string[]): boolean {
    if (value === null || value === undefined) {
      return true
    }
    const strValue = String(value).trim()
    return markers.includes(strValue)
  }
}
import type { DimensionScoringResult, QualityIssue } from './types.js'

export class IssueCollector {
  collect(dimensionResults: DimensionScoringResult[]): QualityIssue[] {
    const issues: QualityIssue[] = []
    for (const result of dimensionResults) {
      issues.push(...result.issues)
    }
    return issues
  }
}
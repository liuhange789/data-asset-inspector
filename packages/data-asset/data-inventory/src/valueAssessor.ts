import type { ValueAssessmentRules } from '@deepseek-ai/dsh-data-asset-shared'

export interface ValueAssessResult {
  stars: number
  label: string
  recommendation: string
}

export class ValueAssessor {
  assess(fileName: string, rules: ValueAssessmentRules): ValueAssessResult {
    const ruleLevels = [rules.highValue, rules.mediumValue, rules.lowValue]

    for (const rule of ruleLevels) {
      for (const keyword of rule.keywords) {
        if (fileName.includes(keyword)) {
          return {
            stars: rule.score,
            label: rule.label,
            recommendation: rule.recommendation,
          }
        }
      }
    }

    return {
      stars: rules.defaultValue.score,
      label: rules.defaultValue.label,
      recommendation: rules.defaultValue.recommendation,
    }
  }
}

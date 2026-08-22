import type { SensitivityClassificationConfig } from '@liuhange/dsh-data-asset-shared'
import type { MatchResult, InvalidRule } from './types.js'

export class FieldValueMatcher {
  match(
    sampleValues: unknown[],
    rules: SensitivityClassificationConfig['fieldValueRules'],
  ): { result: MatchResult; invalidRules: InvalidRule[] } {
    const invalidRules: InvalidRule[] = []

    if (sampleValues.length === 0) {
      return { result: { matched: false }, invalidRules }
    }

    for (const rule of rules) {
      try {
        const regex = new RegExp(rule.pattern)
        const matched = sampleValues.some(v => v !== null && v !== undefined && regex.test(String(v)))
        if (matched) {
          return {
            result: { matched: true, name: rule.name, pattern: rule.pattern, level: rule.level },
            invalidRules,
          }
        }
      } catch {
        invalidRules.push({ ruleName: rule.name, reason: '正则编译失败' })
      }
    }

    return { result: { matched: false }, invalidRules }
  }
}
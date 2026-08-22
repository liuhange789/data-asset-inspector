import type { SensitivityClassificationConfig } from '@liuhange/dsh-data-asset-shared'
import type { MatchResult, InvalidRule } from './types.js'

export class FieldNameMatcher {
  match(
    fieldName: string,
    rules: SensitivityClassificationConfig['fieldNameRules'],
  ): { result: MatchResult; invalidRules: InvalidRule[] } {
    const invalidRules: InvalidRule[] = []

    for (const rule of rules) {
      try {
        const regex = new RegExp(rule.pattern, 'i')
        if (regex.test(fieldName)) {
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
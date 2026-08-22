import type { SensitivityClassificationConfig } from '@liuhange/dsh-data-asset-shared'
import type { FieldClassification, SensitivityLevel, InvalidRule } from './types.js'
import { FieldNameMatcher } from './fieldNameMatcher.js'
import { FieldValueMatcher } from './fieldValueMatcher.js'

export class SensitivityClassifier {
  private fieldNameMatcher = new FieldNameMatcher()
  private fieldValueMatcher = new FieldValueMatcher()

  classify(
    fields: string[],
    fieldSamples: Record<string, unknown[]>,
    config: SensitivityClassificationConfig,
  ): { classifications: FieldClassification[]; invalidRules: InvalidRule[] } {
    const classifications: FieldClassification[] = []
    const allInvalidRules: InvalidRule[] = []

    for (const fieldName of fields) {
      const samples = fieldSamples[fieldName] ?? []

      const nameResult = this.fieldNameMatcher.match(fieldName, config.fieldNameRules)
      allInvalidRules.push(...nameResult.invalidRules)

      let level: string
      let identifiedBy: { ruleName: string; matchType: string }

      if (nameResult.result.matched) {
        level = nameResult.result.level ?? config.defaultLevel
        identifiedBy = { ruleName: nameResult.result.name ?? 'unknown', matchType: 'fieldName' }
      } else {
        const valueResult = this.fieldValueMatcher.match(samples, config.fieldValueRules)
        allInvalidRules.push(...valueResult.invalidRules)

        if (valueResult.result.matched) {
          level = valueResult.result.level ?? config.defaultLevel
          identifiedBy = { ruleName: valueResult.result.name ?? 'unknown', matchType: 'fieldValue' }
        } else {
          level = config.defaultLevel
          identifiedBy = { ruleName: 'default', matchType: 'default' }
        }
      }

      classifications.push({
        fieldName,
        sensitivityLevel: level as SensitivityLevel,
        identifiedBy,
        recommendedStrategy: 'none',
      })
    }

    return { classifications, invalidRules: allInvalidRules }
  }
}
import { REMEDIATION_SUGGESTION_FALLBACK } from './invariant.js'
import { PolicyBasisBuilder } from './policy-basis-builder.js'
import type { RemediationSuggestionConfig, RemediationSuggestion } from './types.js'

export class RemediationSuggestionGenerator {
  private readonly policyBasisBuilder: PolicyBasisBuilder

  constructor(policyBasisBuilder?: PolicyBasisBuilder) {
    this.policyBasisBuilder = policyBasisBuilder ?? new PolicyBasisBuilder()
  }

  generate(missingItems: string[], config: RemediationSuggestionConfig | null | undefined): RemediationSuggestion[] {
    if (!missingItems || missingItems.length === 0) {
      return []
    }
    const suggestions: RemediationSuggestion[] = []
    const seen = new Set<string>()
    for (const item of missingItems) {
      if (seen.has(item)) {
        continue
      }
      seen.add(item)
      suggestions.push(this.resolveSuggestion(item, config))
    }
    return suggestions
  }

  private resolveSuggestion(missingItemType: string, config: RemediationSuggestionConfig | null | undefined): RemediationSuggestion {
    if (config && config.suggestions) {
      const exact = config.suggestions[missingItemType]
      if (exact) {
        return {
          missingItemType: exact.missingItemType,
          suggestion: exact.suggestion,
          policyBasis: exact.policyBasis,
        }
      }
      const prefixMatch = this.findByPrefix(missingItemType, config.suggestions)
      if (prefixMatch) {
        return {
          missingItemType,
          suggestion: prefixMatch.suggestion,
          policyBasis: prefixMatch.policyBasis,
        }
      }
    }
    return {
      missingItemType,
      suggestion: REMEDIATION_SUGGESTION_FALLBACK,
      policyBasis: this.policyBasisBuilder.buildScienceDataClause('第九条'),
    }
  }

  private findByPrefix(missingItemType: string, suggestions: RemediationSuggestionConfig['suggestions']): { suggestion: string; policyBasis: string } | null {
    for (const key of Object.keys(suggestions)) {
      if (missingItemType.startsWith(key) || key.startsWith(missingItemType)) {
        const entry = suggestions[key]
        if (entry) {
          return { suggestion: entry.suggestion, policyBasis: entry.policyBasis }
        }
      }
    }
    return null
  }
}
import type {
  RegulationKnowledgeBase,
  ExtractedRule,
  QualityDimension,
} from './types.js'

export function extractRulesFromKnowledgeBase(kb: RegulationKnowledgeBase): ExtractedRule[] {
  const rules: ExtractedRule[] = []

  for (const law of kb.nationalLaws) {
    for (const clause of law.relevantClauses) {
      if (!clause.extractedRules || clause.extractedRules.length === 0) {
        console.warn(`RuleExtractor: 条款 ${law.lawName} ${clause.clauseId} 无 extractedRules，跳过`)
        continue
      }
      for (const rule of clause.extractedRules) {
        if (!rule.policyBasis) {
          console.warn(`RuleExtractor: 规则 ${rule.ruleId} 无 policyBasis，跳过`)
          continue
        }
        rules.push({ ...rule })
      }
    }
  }

  for (const policy of kb.nationalPolicies) {
    for (const clause of policy.relevantClauses) {
      if (!clause.extractedRules || clause.extractedRules.length === 0) {
        console.warn(`RuleExtractor: 条款 ${policy.policyName} ${clause.clauseId} 无 extractedRules，跳过`)
        continue
      }
      for (const rule of clause.extractedRules) {
        if (!rule.policyBasis) {
          console.warn(`RuleExtractor: 规则 ${rule.ruleId} 无 policyBasis，跳过`)
          continue
        }
        rules.push({ ...rule })
      }
    }
  }

  for (const std of kb.nationalStandards) {
    for (const clause of std.relevantClauses) {
      if (!clause.extractedRules || clause.extractedRules.length === 0) {
        console.warn(`RuleExtractor: 条款 ${std.standardName} ${clause.clauseId} 无 extractedRules，跳过`)
        continue
      }
      for (const rule of clause.extractedRules) {
        if (!rule.policyBasis) {
          console.warn(`RuleExtractor: 规则 ${rule.ruleId} 无 policyBasis，跳过`)
          continue
        }
        rules.push({ ...rule })
      }
    }
  }

  for (const prov of kb.provincialStandards) {
    for (const clause of prov.relevantClauses) {
      if (!clause.extractedRules || clause.extractedRules.length === 0) {
        continue
      }
      for (const rule of clause.extractedRules) {
        if (!rule.policyBasis) {
          console.warn(`RuleExtractor: 规则 ${rule.ruleId} 无 policyBasis，跳过`)
          continue
        }
        rules.push({ ...rule })
      }
    }
  }

  return rules
}

export function extractHotlineWhitelist(kb: RegulationKnowledgeBase): string[] {
  return kb.hotlineWhitelist.map((h) => h.hotline)
}

export function extractQualityDimensions(kb: RegulationKnowledgeBase): QualityDimension[] {
  const std = kb.nationalStandards.find((s) => s.standardNumber === 'GB/T 36344-2018')
  return std?.qualityDimensions ?? []
}

export function extractRequiredFields(kb: RegulationKnowledgeBase): string[] {
  const std = kb.nationalStandards.find((s) => s.standardNumber === 'GB/T 39554.2-2020')
  return std?.requiredElements ?? []
}

export function extractProcessCoreStepKeywords(kb: RegulationKnowledgeBase): string[] {
  const std = kb.nationalStandards.find((s) => s.standardNumber === 'GB/T 36114-2018')
  const clause = std?.relevantClauses.find((c) => c.clauseId === '附录A')
  const rule = clause?.extractedRules.find((r) => r.ruleId === 'LOG_PROCESS_COMPLETENESS_001')
  return rule?.keywords ?? []
}
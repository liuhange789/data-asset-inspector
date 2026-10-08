import { loadJsonConfig } from '@liuhange/dsh-data-asset-shared'
import type { ErrorType, ReferenceSystem, RegulationKnowledgeBase, ExtractedRule } from './types.js'

export interface PolicyDoc {
  name: string
  docNumber: string
  coreRequirement: string
}

const EXCLUDED_STANDARDS = [
  'GB/T 47949-2026',
  'GB/T 47950-2026',
  '国办发〔2015〕46号',
]

export function filterPolicyBasis(basis: string[]): string[] {
  return basis.filter((b) => !EXCLUDED_STANDARDS.some((ex) => b.includes(ex)))
}

export function resolvePolicyBasis(
  stage: string,
  packPolicyBasis?: PolicyDoc[],
): string[] {
  if (packPolicyBasis && packPolicyBasis.length > 0) {
    return packPolicyBasis.map((d) => `依据：《${d.name}》（${d.docNumber}）—${d.coreRequirement}`)
  }

  try {
    const config = loadJsonConfig(
      'POLICY_REFS_PATH',
      'config/policy-references.json',
      '@liuhange/dsh-data-asset-shared/config/policy-references.json',
    )
    const refs = (config as { policyReferences: { stage: string; documents: PolicyDoc[] }[] }).policyReferences
    const stageEntry = refs?.find((s) => s.stage === stage)
    if (!stageEntry) {
      console.warn(`Policy stage "${stage}" not configured`)
      return [`依据：政策依据未配置（stage=${stage}）`]
    }
    const raw = stageEntry.documents.map((d) => `依据：《${d.name}》（${d.docNumber}）—${d.coreRequirement}`)
    return filterPolicyBasis(raw)
  } catch {
    return ['依据：政策依据配置加载失败']
  }
}
const ERROR_TYPE_DOC_MAP: Record<ErrorType, string> = {
  missing: '国办发〔2017〕47号',
  semantic: 'GB/T 36114-2018',
  logical: '国办发〔2018〕45号',
  warning: '',
}

function extractClauseNumber(standardClause: string): string {
  const match = standardClause.match(/第[\d.]+[条节项]/)
  return match ? match[0] : '待补充条'
}

function findRuleInKnowledgeBase(
  regulationKnowledgeBase: RegulationKnowledgeBase,
  ruleId?: string,
): ExtractedRule | null {
  if (!ruleId) return null
  const allSources = [
    ...regulationKnowledgeBase.nationalLaws.flatMap((l) => l.relevantClauses.flatMap((c) => c.extractedRules)),
    ...regulationKnowledgeBase.nationalPolicies.flatMap((p) => p.relevantClauses.flatMap((c) => c.extractedRules)),
    ...regulationKnowledgeBase.nationalStandards.flatMap((s) => s.relevantClauses.flatMap((c) => c.extractedRules)),
    ...regulationKnowledgeBase.provincialStandards.flatMap((p) => p.relevantClauses.flatMap((c) => c.extractedRules)),
  ]
  return allSources.find((r) => r.ruleId === ruleId) ?? null
}

export function resolveErrorDetailPolicyBasis(
  errorType: ErrorType,
  standardClause: string,
  referenceSystem: ReferenceSystem | null,
  policyReferences: PolicyDoc[],
  regulationKnowledgeBase?: RegulationKnowledgeBase | null,
  ruleId?: string,
): string {
  if (errorType === 'warning') {
    return '依据：服务完善性建议（非法定强制要素）'
  }

  if (regulationKnowledgeBase) {
    const explicitRuleId = ruleId ?? standardClause.match(/ruleId=([^\s]+)/)?.[1]
    const rule = findRuleInKnowledgeBase(regulationKnowledgeBase, explicitRuleId)
    if (rule) {
      return rule.policyBasis
    }
  }

  const docNumber = ERROR_TYPE_DOC_MAP[errorType]
  const doc = policyReferences.find((d) => d.docNumber === docNumber)

  if (!doc) {
    return `依据：政策依据未配置（stage=${errorType}）`
  }

  const clauseNum = extractClauseNumber(standardClause)

  if (referenceSystem) {
    if (errorType === 'missing' || errorType === 'logical') {
      const govOrder = referenceSystem.layer1_govOrders.find((e) => e.docNumber === docNumber)
      if (govOrder) {
        return `依据：《${doc.name}》（${docNumber}）${govOrder.clause}`
      }
    }
    if (errorType === 'semantic') {
      const std = referenceSystem.layer2_nationalStandards.find((s) => s.standardNumber === docNumber)
      if (std && std.elements.length > 0) {
        return `依据：《${std.standardName}》（${docNumber}）${std.elements[0]!.clause}`
      }
    }
  }

  return `依据：《${doc.name}》（${docNumber}）${clauseNum}`
}

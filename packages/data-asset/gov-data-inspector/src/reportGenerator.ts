import type { ErrorDetail, FormatIssue, DetectionRates, UnmatchedWarning, ReferenceSystem, ConfigPackWarning, RegulationKnowledgeBase, ExtractedRule } from './types.js'
import { deduplicateCrossEngine } from './inspectionOrchestrator.js'
import { resolveErrorDetailPolicyBasis, resolvePolicyBasis, type PolicyDoc } from './policyBasis.js'

export interface ReportGeneratorInput {
  rawErrorDetails: ErrorDetail[]
  formatIssues: FormatIssue[]
  suspectedErrors: ErrorDetail[]
  detectionRates: DetectionRates
  completeness: number
  missingFields: number
  semanticErrors: number
  logicalErrors: number
  serviceConvenience: number
  totalGuidesChecked: number
  warnings: UnmatchedWarning[]
  referenceSystem: ReferenceSystem | null
  policyReferences: PolicyDoc[]
  severityMapping?: Record<string, string>
  regulationKnowledgeBase?: RegulationKnowledgeBase | null
}

export interface ReportGeneratorOutput {
  errorDetails: ErrorDetail[]
  formatIssues: FormatIssue[]
  suspectedErrors: ErrorDetail[]
  detectionRates: DetectionRates
  reportPolicyBasis: string[]
  metricsWarnings: ConfigPackWarning[]
  completeness: number
  missingFields: number
  semanticErrors: number
  logicalErrors: number
  serviceConvenience: number
  totalGuidesChecked: number
  warnings: UnmatchedWarning[]
}

function annotatePolicyBasis(
  errorDetail: ErrorDetail,
  referenceSystem: ReferenceSystem | null,
  policyReferences: PolicyDoc[],
  regulationKnowledgeBase?: RegulationKnowledgeBase | null,
): ErrorDetail {
  const policyBasis = resolveErrorDetailPolicyBasis(
    errorDetail.errorType,
    errorDetail.standardClause ?? '',
    referenceSystem,
    policyReferences,
    regulationKnowledgeBase,
  )
  const sourceMatch = regulationKnowledgeBase ? findRuleInKB(regulationKnowledgeBase, errorDetail.standardClause) : null
  return {
    ...errorDetail,
    policyBasis,
    ...(sourceMatch ? { sourceDocument: sourceMatch.sourceDocument, sourceClause: sourceMatch.sourceClause } : {}),
  }
}

function findRuleInKB(kb: RegulationKnowledgeBase, standardClause?: string): ExtractedRule | null {
  if (!standardClause) return null
  const ruleIdMatch = standardClause.match(/ruleId=([^\s]+)/)
  const ruleId = ruleIdMatch?.[1]
  if (!ruleId) return null
  const allRules: ExtractedRule[] = [
    ...kb.nationalLaws.flatMap((l) => l.relevantClauses.flatMap((c) => c.extractedRules)),
    ...kb.nationalPolicies.flatMap((p) => p.relevantClauses.flatMap((c) => c.extractedRules)),
    ...kb.nationalStandards.flatMap((s) => s.relevantClauses.flatMap((c) => c.extractedRules)),
    ...kb.provincialStandards.flatMap((p) => p.relevantClauses.flatMap((c) => c.extractedRules)),
  ]
  return allRules.find((r) => r.ruleId === ruleId) ?? null
}

export function enrichWithPolicyBasis<T>(
  result: T,
  regulationKnowledgeBase: RegulationKnowledgeBase | null,
): T & { policyBasis: string; sourceDocument: string; sourceClause: string } {
  if (!regulationKnowledgeBase) {
    return { ...result, policyBasis: '依据：待补充法规依据', sourceDocument: '', sourceClause: '' }
  }
  const standardClause = (result as { standardClause?: string }).standardClause
  const rule = findRuleInKB(regulationKnowledgeBase, standardClause)
  if (rule) {
    return { ...result, policyBasis: rule.policyBasis, sourceDocument: rule.sourceDocument, sourceClause: rule.sourceClause }
  }
  return { ...result, policyBasis: '依据：待补充法规依据', sourceDocument: '', sourceClause: '' }
}

export function annotateFormatIssuePolicyBasis(
  formatIssue: FormatIssue,
  regulationKnowledgeBase: RegulationKnowledgeBase | null,
): FormatIssue {
  const enriched = enrichWithPolicyBasis(formatIssue, regulationKnowledgeBase)
  const { policyBasis, sourceDocument, sourceClause } = enriched
  return {
    ...formatIssue,
    ...(policyBasis ? { policyBasis } : {}),
    ...(sourceDocument ? { sourceDocument } : {}),
    ...(sourceClause ? { sourceClause } : {}),
  }
}

function validateMetrics(detectionRates: DetectionRates): ConfigPackWarning[] {
  const warnings: ConfigPackWarning[] = []
  const { missingFieldDetectionRate, semanticDetectionRate, logicalDetectionRate, formatDetectionRate, falsePositiveRate } = detectionRates
  if (typeof missingFieldDetectionRate === 'number' && missingFieldDetectionRate < 0.90) {
    warnings.push({ type: 'CONFIG_PACK_WARNING', code: 'METRICS_NOT_MET', message: `漏项检出率 ${missingFieldDetectionRate.toFixed(2)} 未达标（≥0.90）` })
  }
  if (typeof semanticDetectionRate === 'number' && semanticDetectionRate < 0.50) {
    warnings.push({ type: 'CONFIG_PACK_WARNING', code: 'METRICS_NOT_MET', message: `语义检出率 ${semanticDetectionRate.toFixed(2)} 未达标（≥0.50）` })
  }
  if (typeof logicalDetectionRate === 'number' && logicalDetectionRate < 0.80) {
    warnings.push({ type: 'CONFIG_PACK_WARNING', code: 'METRICS_NOT_MET', message: `逻辑检出率 ${logicalDetectionRate.toFixed(2)} 未达标（≥0.80）` })
  }
  if (typeof formatDetectionRate === 'number' && formatDetectionRate < 0.90) {
    warnings.push({ type: 'CONFIG_PACK_WARNING', code: 'METRICS_NOT_MET', message: `格式检出率 ${formatDetectionRate.toFixed(2)} 未达标（≥0.90）` })
  }
  if (typeof falsePositiveRate === 'number' && falsePositiveRate > 0.12) {
    warnings.push({ type: 'CONFIG_PACK_WARNING', code: 'METRICS_NOT_MET', message: `误报率 ${falsePositiveRate.toFixed(2)} 未达标（≤0.12）` })
  }
  return warnings
}

export const ReportGenerator = {
  generate(input: ReportGeneratorInput): ReportGeneratorOutput {
    let dedupedDetails: ErrorDetail[]
    try {
      dedupedDetails = deduplicateCrossEngine(input.rawErrorDetails)
    } catch {
      dedupedDetails = input.rawErrorDetails
    }

    const annotatedDetails = dedupedDetails.map((d) =>
      annotatePolicyBasis(d, input.referenceSystem, input.policyReferences, input.regulationKnowledgeBase),
    )

    const annotatedFormatIssues = input.regulationKnowledgeBase
      ? input.formatIssues.map((f) => annotateFormatIssuePolicyBasis(f, input.regulationKnowledgeBase ?? null))
      : input.formatIssues

    const reportPolicyBasis = resolvePolicyBasis('GOV_DATA_INSPECTION', input.policyReferences)

    const metricsWarnings = validateMetrics(input.detectionRates)

    return {
      errorDetails: annotatedDetails,
      formatIssues: annotatedFormatIssues,
      suspectedErrors: input.suspectedErrors,
      detectionRates: input.detectionRates,
      reportPolicyBasis,
      metricsWarnings,
      completeness: input.completeness,
      missingFields: input.missingFields,
      semanticErrors: input.semanticErrors,
      logicalErrors: input.logicalErrors,
      serviceConvenience: input.serviceConvenience,
      totalGuidesChecked: input.totalGuidesChecked,
      warnings: input.warnings,
    }
  },
}
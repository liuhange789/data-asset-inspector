import type { ErrorDetail, FormatIssue, DetectionRates, UnmatchedWarning, ReferenceSystem, ConfigPackWarning } from './types.js'
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
): ErrorDetail {
  const policyBasis = resolveErrorDetailPolicyBasis(
    errorDetail.errorType,
    errorDetail.standardClause ?? '',
    referenceSystem,
    policyReferences,
  )
  return { ...errorDetail, policyBasis }
}

function validateMetrics(detectionRates: DetectionRates): ConfigPackWarning[] {
  const warnings: ConfigPackWarning[] = []
  if (detectionRates.missingFieldDetectionRate < 0.90) {
    warnings.push({ type: 'CONFIG_PACK_WARNING', code: 'METRICS_NOT_MET', message: `漏项检出率 ${detectionRates.missingFieldDetectionRate.toFixed(2)} 未达标（≥0.90）` })
  }
  if (detectionRates.semanticDetectionRate < 0.50) {
    warnings.push({ type: 'CONFIG_PACK_WARNING', code: 'METRICS_NOT_MET', message: `语义检出率 ${detectionRates.semanticDetectionRate.toFixed(2)} 未达标（≥0.50）` })
  }
  if (detectionRates.logicalDetectionRate < 0.80) {
    warnings.push({ type: 'CONFIG_PACK_WARNING', code: 'METRICS_NOT_MET', message: `逻辑检出率 ${detectionRates.logicalDetectionRate.toFixed(2)} 未达标（≥0.80）` })
  }
  if (detectionRates.formatDetectionRate < 0.90) {
    warnings.push({ type: 'CONFIG_PACK_WARNING', code: 'METRICS_NOT_MET', message: `格式检出率 ${detectionRates.formatDetectionRate.toFixed(2)} 未达标（≥0.90）` })
  }
  if (detectionRates.falsePositiveRate > 0.12) {
    warnings.push({ type: 'CONFIG_PACK_WARNING', code: 'METRICS_NOT_MET', message: `误报率 ${detectionRates.falsePositiveRate.toFixed(2)} 未达标（≤0.12）` })
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
      annotatePolicyBasis(d, input.referenceSystem, input.policyReferences),
    )

    const reportPolicyBasis = resolvePolicyBasis('GOV_DATA_INSPECTION', input.policyReferences)

    const metricsWarnings = validateMetrics(input.detectionRates)

    return {
      errorDetails: annotatedDetails,
      formatIssues: input.formatIssues,
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
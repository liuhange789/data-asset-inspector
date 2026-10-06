import type { ErrorDetail, DetectionRates, GroundTruth } from './types.js'

export interface MetricsInput {
  semanticErrorCount: number
  logicalErrorCount: number
  missingFieldCount: number
  formatIssueCount: number
  totalGuides: number
  requiredFieldCount: number
  totalFieldCount: number
  errorDetails: ErrorDetail[]
  falsePositiveCount?: number
  groundTruth?: GroundTruth

  scoreWeights: { completeness: number; accuracy: number; traceability: number }
}

function computeRateOrNA(detected: number, truthCount: number | undefined): number | 'N/A' {
  if (truthCount !== undefined && truthCount > 0) {
    return Math.min(100, Math.round((detected / truthCount) * 100))
  }
  return 'N/A'
}

export const QualityMetricsCalculator = {
  calculate(input: MetricsInput): DetectionRates {
    const {
      semanticErrorCount,
      logicalErrorCount,
      missingFieldCount,
      formatIssueCount,
      requiredFieldCount,
      totalGuides,
      totalFieldCount,
      errorDetails,
      falsePositiveCount = 0,
      groundTruth,

      scoreWeights,
    } = input

    const semanticDetectionRate = computeRateOrNA(semanticErrorCount, groundTruth?.realSemanticErrorCount)
    const logicalDetectionRate = computeRateOrNA(logicalErrorCount, groundTruth?.realLogicalErrorCount)
    const missingFieldDetectionRate = computeRateOrNA(missingFieldCount, groundTruth?.realMissingFieldCount)
    const formatDetectionRate = computeRateOrNA(formatIssueCount, groundTruth?.realFormatIssueCount)

    const totalReportedErrors = semanticErrorCount + logicalErrorCount + missingFieldCount
    const falsePositiveRate: number | 'N/A' = groundTruth !== undefined
      ? totalReportedErrors > 0 ? Math.round((falsePositiveCount / totalReportedErrors) * 100) : 0
      : 'N/A'

    const totalRequiredSlots = requiredFieldCount * totalGuides
    const completenessScore =
      totalRequiredSlots > 0
        ? Math.round((1 - missingFieldCount / totalRequiredSlots) * 100)
        : 0

    const totalErrors = semanticErrorCount + logicalErrorCount + formatIssueCount
    const accuracyScore =
      totalFieldCount > 0 ? Math.round((1 - totalErrors / totalFieldCount) * 100) : 100

    const traceableCount = errorDetails.filter((d) =>
      d.dataSource !== undefined && d.standardClause !== undefined && d.standardClause !== '',
    ).length
    const traceabilityScore =
      errorDetails.length > 0 ? Math.round((traceableCount / errorDetails.length) * 100) : 100

    const { completeness: w1, accuracy: w2, traceability: w3 } = scoreWeights
    const overallScore = Math.round(
      w1 * completenessScore + w2 * accuracyScore + w3 * traceabilityScore,
    )

    return {
      semanticDetectionRate,
      logicalDetectionRate,
      missingFieldDetectionRate,
      formatDetectionRate,
      falsePositiveRate,
      completenessScore,
      accuracyScore,
      traceabilityScore,
      overallScore,
    }
  },
}
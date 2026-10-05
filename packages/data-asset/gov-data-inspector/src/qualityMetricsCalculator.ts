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

export const QualityMetricsCalculator = {
  calculate(input: MetricsInput): DetectionRates {
    const {
      semanticErrorCount,
      logicalErrorCount,
      missingFieldCount,
      formatIssueCount,
      totalGuides,
      requiredFieldCount,
      totalFieldCount,
      errorDetails,
      falsePositiveCount = 0,
      groundTruth,

      scoreWeights,
    } = input

    const semanticDetectionRate: number = groundTruth?.realSemanticErrorCount
      ? Math.min(100, Math.round((semanticErrorCount / groundTruth.realSemanticErrorCount) * 100))
      : totalGuides > 0 ? Math.min(100, Math.round((semanticErrorCount / totalGuides) * 100)) : 0

    const logicalDetectionRate: number = groundTruth?.realLogicalErrorCount
      ? Math.min(100, Math.round((logicalErrorCount / groundTruth.realLogicalErrorCount) * 100))
      : totalGuides > 0 ? Math.min(100, Math.round((logicalErrorCount / totalGuides) * 100)) : 0

    const missingFieldDetectionRate: number = groundTruth?.realMissingFieldCount
      ? Math.min(100, Math.round((missingFieldCount / groundTruth.realMissingFieldCount) * 100))
      : totalFieldCount > 0 ? Math.round((missingFieldCount / totalFieldCount) * 100) : 0

    const formatDetectionRate: number = groundTruth?.realFormatIssueCount
      ? Math.min(100, Math.round((formatIssueCount / groundTruth.realFormatIssueCount) * 100))
      : totalFieldCount > 0 ? Math.round((formatIssueCount / totalFieldCount) * 100) : 0

    const totalReportedErrors = semanticErrorCount + logicalErrorCount + missingFieldCount
    const falsePositiveRate =
      totalReportedErrors > 0 ? Math.round((falsePositiveCount / totalReportedErrors) * 100) : 0

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
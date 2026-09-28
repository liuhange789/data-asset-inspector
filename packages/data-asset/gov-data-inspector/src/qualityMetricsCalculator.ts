import type { ErrorDetail, DetectionRates } from './types.js'

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
  trueSemanticErrorCount?: number
  trueLogicalErrorCount?: number
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
      trueSemanticErrorCount,
      trueLogicalErrorCount,
      scoreWeights,
    } = input

    const semanticDetectionRate: number | '未度量' =
      trueSemanticErrorCount !== undefined && trueSemanticErrorCount > 0
        ? Math.round((semanticErrorCount / trueSemanticErrorCount) * 100)
        : '未度量'

    const logicalDetectionRate: number | '未度量' =
      trueLogicalErrorCount !== undefined && trueLogicalErrorCount > 0
        ? Math.round((logicalErrorCount / trueLogicalErrorCount) * 100)
        : '未度量'

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
      falsePositiveRate,
      completenessScore,
      accuracyScore,
      traceabilityScore,
      overallScore,
    }
  },
}
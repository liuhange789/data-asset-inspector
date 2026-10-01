import type {
  QualityCheckResult,
  GrossErrorRateResult,
  PipelineInspectionConfig,
} from './types.js'

export class GrossErrorRateCalculator {
  calculate(
    checkResults: QualityCheckResult[],
    totalPoints: number,
    config: PipelineInspectionConfig,
  ): GrossErrorRateResult {
    const grossErrorPointIds = new Set<string>()

    for (const result of checkResults) {
      if (result.errorClass === 'A') {
        grossErrorPointIds.add(result.objectId)
      }
    }

    const grossErrorPoints = grossErrorPointIds.size
    const threshold = config.grossErrorRate.thresholdRate

    let rate = 0
    if (totalPoints > 0) {
      rate = grossErrorPoints / totalPoints
    }

    const passed = rate <= threshold

    return {
      totalPoints,
      grossErrorPoints,
      rate: Math.round(rate * 10000) / 10000,
      threshold,
      passed,
      policyBasis: config.grossErrorRate.policyBasis,
    }
  }
}
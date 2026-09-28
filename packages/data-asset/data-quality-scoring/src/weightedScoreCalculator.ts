import type { QualityDimensions } from './types.js'
import type { QualityScoringConfig } from '@liuhange/dsh-data-asset-shared'

export class WeightedScoreCalculator {
  calculate(
    dimensions: QualityDimensions,
    weights: QualityScoringConfig['weights'],
  ): {
    totalScore: number
    weightsNormalized: boolean
    normalizedWeights: QualityScoringConfig['weights']
  } {
    const weightSum = weights.completeness + weights.accuracy + weights.consistency + weights.timeliness
    let normalizedWeights = { ...weights }
    let weightsNormalized = false

    if (weightSum <= 0) {
      normalizedWeights = {
        completeness: 0.25,
        accuracy: 0.25,
        consistency: 0.25,
        timeliness: 0.25,
      }
      weightsNormalized = true
    } else if (weightSum !== 1) {
      normalizedWeights = {
        completeness: weights.completeness / weightSum,
        accuracy: weights.accuracy / weightSum,
        consistency: weights.consistency / weightSum,
        timeliness: weights.timeliness / weightSum,
      }
      weightsNormalized = true
    }

    const totalScore = Math.floor(
      dimensions.completeness.score * normalizedWeights.completeness +
      dimensions.accuracy.score * normalizedWeights.accuracy +
      dimensions.consistency.score * normalizedWeights.consistency +
      dimensions.timeliness.score * normalizedWeights.timeliness,
    )

    return { totalScore, weightsNormalized, normalizedWeights }
  }
}
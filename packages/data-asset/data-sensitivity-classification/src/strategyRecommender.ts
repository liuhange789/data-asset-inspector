import type { SensitivityClassificationConfig } from '@liuhange/dsh-data-asset-shared'
import type { SensitivityLevel, RecommendedStrategy } from './types.js'

export class StrategyRecommender {
  recommend(
    level: SensitivityLevel,
    levelMapping: SensitivityClassificationConfig['levelMapping'],
  ): RecommendedStrategy {
    const strategy = levelMapping[level] ?? 'partial'
    return strategy as RecommendedStrategy
  }
}
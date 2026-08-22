import type { QualityDimensions } from './types.js'
import type { QualityScoringConfig } from '@liuhange/dsh-data-asset-shared'

export class SuggestionGenerator {
  generate(
    dimensions: QualityDimensions,
    thresholds: QualityScoringConfig['thresholds'],
  ): string[] {
    const suggestions: string[] = []

    if (dimensions.completeness.score < thresholds.completeness) {
      suggestions.push(`完整性得分 ${dimensions.completeness.score} 低于阈值 ${thresholds.completeness}，建议补充缺失字段数据或使用插值/众数填充`)
    }

    if (dimensions.accuracy.score < thresholds.accuracy) {
      suggestions.push(`准确性得分 ${dimensions.accuracy.score} 低于阈值 ${thresholds.accuracy}，建议校验数据格式和值域，修正不合规记录`)
    }

    if (dimensions.consistency.score < thresholds.consistency) {
      suggestions.push(`一致性得分 ${dimensions.consistency.score} 低于阈值 ${thresholds.consistency}，建议检查跨字段约束规则，修正逻辑冲突记录`)
    }

    if (dimensions.timeliness.score < thresholds.timeliness) {
      suggestions.push(`时效性得分 ${dimensions.timeliness.score} 低于阈值 ${thresholds.timeliness}，建议更新过期数据或调整时效阈值`)
    }

    return suggestions
  }
}
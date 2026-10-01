import type {
  QualityCheckResult,
  QualityElementScore,
  QualityElementConfig,
} from './types.js'

const ELEMENT_KEYWORDS: Record<string, string[]> = {
  '数学精度': ['高程中误差', '平面位置中误差', '接边精度', '同名格网高程值'],
  '地理精度': ['概念一致性', '面重叠', '面缝隙', '伪节点', '悬挂点', '重复采集', '格网参数'],
  '整饰质量': ['属性值正确性', 'RFC 7946', 'Shapefile完整性'],
  '附件质量': ['坐标系', '高程基准', '附件'],
}

export class QualityElementScorer {
  score(
    checkResults: QualityCheckResult[],
    config: QualityElementConfig,
  ): { scores: QualityElementScore[]; totalScore: number } {
    const scores: QualityElementScore[] = []
    const deductionMap = {
      A: config.errorClassThresholds.classAScoreDeduction,
      B: config.errorClassThresholds.classBScoreDeduction,
      C: config.errorClassThresholds.classCScoreDeduction,
      D: config.errorClassThresholds.classDScoreDeduction,
    }

    for (const element of config.qualityElements.elements) {
      const keywords = ELEMENT_KEYWORDS[element.elementName] ?? []
      let totalDeduction = 0

      for (const result of checkResults) {
        if (keywords.some((kw) => result.checkName.includes(kw))) {
          totalDeduction += deductionMap[result.errorClass]
        }
      }

      const score = Math.max(0, 100 - totalDeduction)
      scores.push({
        elementName: element.elementName,
        weight: element.weight,
        score,
        policyBasis: element.policyBasis,
      })
    }

    let totalScore = 0
    for (const s of scores) {
      totalScore += s.weight * s.score
    }

    return { scores, totalScore: Math.round(totalScore * 100) / 100 }
  }
}
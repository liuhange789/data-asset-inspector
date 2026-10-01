import type {
  QualityCheckResult,
  QualityElementScore,
  QualityElementConfig,
} from './types.js'

const ELEMENT_KEYWORDS: Record<string, string[]> = {
  '空间参考系': ['坐标系', '高程基准'],
  '位置精度': ['接边'],
  '逻辑一致性': [
    '重复',
    '孤立',
    '连通',
    '缺坐标',
    '管径',
    '材质',
    '埋设',
    '流向',
    '属性',
    '字段',
    '工作区',
    '排水',
  ],
  '时间精度': ['时间'],
  '栅格质量': ['栅格'],
  '附件质量': ['附件'],
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
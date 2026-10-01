import type {
  QualityCheckResult,
  QualityElementScore,
  QualityElementConfig,
} from './types.js'

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
      const keywords = element.keywords ?? []
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
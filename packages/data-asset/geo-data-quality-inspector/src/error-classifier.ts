import type { QualityCheckResult, ErrorClassStatistics } from './types.js'

export class ErrorClassifier {
  classify(
    checkResults: QualityCheckResult[],
    policyBasis: string,
  ): ErrorClassStatistics {
    let classACount = 0
    let classBCount = 0
    let classCCount = 0
    let classDCount = 0

    for (const result of checkResults) {
      switch (result.errorClass) {
        case 'A':
          classACount++
          break
        case 'B':
          classBCount++
          break
        case 'C':
          classCCount++
          break
        case 'D':
          classDCount++
          break
      }
    }

    return {
      classACount,
      classBCount,
      classCCount,
      classDCount,
      totalCount: classACount + classBCount + classCCount + classDCount,
      policyBasis,
    }
  }

  calculateProportions(stats: ErrorClassStatistics): {
    classAProportion: number
    classBProportion: number
    classCProportion: number
    classDProportion: number
  } {
    const total = stats.totalCount
    if (total === 0) {
      return {
        classAProportion: 0,
        classBProportion: 0,
        classCProportion: 0,
        classDProportion: 0,
      }
    }
    return {
      classAProportion: Math.round((stats.classACount / total) * 10000) / 100,
      classBProportion: Math.round((stats.classBCount / total) * 10000) / 100,
      classCProportion: Math.round((stats.classCCount / total) * 10000) / 100,
      classDProportion: Math.round((stats.classDCount / total) * 10000) / 100,
    }
  }
}
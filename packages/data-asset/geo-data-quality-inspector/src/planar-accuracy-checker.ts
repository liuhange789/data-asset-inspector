import type {
  GeoDataset,
  GeoAccuracyConfig,
  PlanarAccuracyResult,
  CheckPoint,
  QualityCheckResult,
} from './types.js'

export class PlanarAccuracyChecker {
  check(
    dataset: GeoDataset,
    config: GeoAccuracyConfig,
  ): PlanarAccuracyResult {
    const checkResults: QualityCheckResult[] = []
    const checkPoints = dataset.checkPoints ?? []

    const validPoints = checkPoints.filter(
      (cp) => cp.measuredX !== undefined && cp.measuredY !== undefined && cp.referenceX !== undefined && cp.referenceY !== undefined,
    )

    if (validPoints.length === 0) {
      checkResults.push({
        checkName: '平面位置中误差检查',
        errorClass: 'D',
        objectId: 'dataset',
        description: '无有效平面检测点（缺少 measuredX/measuredY/referenceX/referenceY），跳过平面精度检查',
        policyBasis: config.planarAccuracy.policyBasis,
      })
      return {
        rmse: null,
        checkPointCount: 0,
        passed: null,
        checkResults,
      }
    }

    const rmse = this.calculatePlanarRmse(validPoints)
    const threshold = config.planarAccuracy.rmseThresholdMeter
    const passed = rmse <= threshold

    if (!passed) {
      checkResults.push({
        checkName: '平面位置中误差检查',
        errorClass: 'B',
        objectId: 'dataset',
        description: `平面位置中误差 ${rmse.toFixed(4)} 米超过阈值 ${threshold} 米`,
        policyBasis: config.planarAccuracy.policyBasis,
      })
    }

    return {
      rmse: Math.round(rmse * 10000) / 10000,
      checkPointCount: validPoints.length,
      passed,
      checkResults,
    }
  }

  private calculatePlanarRmse(checkPoints: CheckPoint[]): number {
    if (checkPoints.length === 0) return 0
    let sumSquares = 0
    for (const cp of checkPoints) {
      const dx = (cp.measuredX ?? 0) - (cp.referenceX ?? 0)
      const dy = (cp.measuredY ?? 0) - (cp.referenceY ?? 0)
      sumSquares += dx * dx + dy * dy
    }
    return Math.sqrt(sumSquares / checkPoints.length)
  }
}
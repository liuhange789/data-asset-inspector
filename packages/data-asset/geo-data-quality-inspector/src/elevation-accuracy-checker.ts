import type {
  GeoDataset,
  GeoAccuracyConfig,
  ElevationAccuracyResult,
  CheckPoint,
  QualityCheckResult,
} from './types.js'

export class ElevationAccuracyChecker {
  check(
    dataset: GeoDataset,
    config: GeoAccuracyConfig,
  ): ElevationAccuracyResult {
    const checkResults: QualityCheckResult[] = []
    const checkPoints = dataset.checkPoints ?? []
    const checkPointCount = checkPoints.length
    const minCheckPoints = config.checkPointCount.minCheckPoints
    const maxCheckPoints = config.checkPointCount.maxCheckPoints

    if (checkPointCount < minCheckPoints) {
      checkResults.push({
        checkName: '高程中误差检测点数检查',
        errorClass: 'B',
        objectId: 'dataset',
        description: `检测点数 ${checkPointCount} 不足，最少需要 ${minCheckPoints} 个检测点，数据不足不计算中误差`,
        policyBasis: config.checkPointCount.policyBasis,
      })
      return {
        rmse: null,
        checkPointCount,
        passed: null,
        method: '桩点法',
        degradationReason: `检测点数 ${checkPointCount} 不足，数据不足不计算中误差`,
        checkResults,
      }
    }

    if (checkPointCount > maxCheckPoints) {
      checkResults.push({
        checkName: '高程中误差检测点数检查',
        errorClass: 'D',
        objectId: 'dataset',
        description: `检测点数 ${checkPointCount} 超过最大值 ${maxCheckPoints}，建议精简检测点`,
        policyBasis: config.checkPointCount.policyBasis,
      })
    }

    const highPrecisionAvailable = dataset.highPrecisionReferenceAvailable === true
    const crossValidationPoints = dataset.crossValidationPoints ?? []

    if (highPrecisionAvailable && crossValidationPoints.length >= minCheckPoints) {
      return this.checkByHighPrecision(config, crossValidationPoints, checkResults)
    }

    if (crossValidationPoints.length >= minCheckPoints) {
      return this.checkByCrossValidation(config, crossValidationPoints, checkResults)
    }

    if (!highPrecisionAvailable) {
      return this.checkByStakeMethod(config, checkPoints, checkResults, config.highPrecisionReference.degradationReason)
    }

    return this.checkByStakeMethod(config, checkPoints, checkResults)
  }

  private checkByStakeMethod(
    config: GeoAccuracyConfig,
    checkPoints: CheckPoint[],
    checkResults: QualityCheckResult[],
    degradationReason?: string,
  ): ElevationAccuracyResult {
    const rmse = this.calculateElevationRmse(checkPoints)
    const threshold = config.elevationAccuracy.rmseThresholdMeter
    const passed = rmse <= threshold

    if (!passed) {
      checkResults.push({
        checkName: '高程中误差检查',
        errorClass: 'B',
        objectId: 'dataset',
        description: `高程中误差 ${rmse.toFixed(4)} 米超过阈值 ${threshold} 米（桩点法）`,
        policyBasis: config.elevationAccuracy.policyBasis,
      })
    }

    const result: ElevationAccuracyResult = {
      rmse: Math.round(rmse * 10000) / 10000,
      checkPointCount: checkPoints.length,
      passed,
      method: '桩点法',
      checkResults,
    }
    if (degradationReason !== undefined) {
      result.degradationReason = degradationReason
    }
    return result
  }

  private checkByHighPrecision(

    config: GeoAccuracyConfig,
    crossValidationPoints: CheckPoint[],
    checkResults: QualityCheckResult[],
  ): ElevationAccuracyResult {
    const rmse = this.calculateElevationRmse(crossValidationPoints)
    const threshold = config.elevationAccuracy.rmseThresholdMeter
    const passed = rmse <= threshold

    if (!passed) {
      checkResults.push({
        checkName: '高程中误差检查',
        errorClass: 'B',
        objectId: 'dataset',
        description: `高程中误差 ${rmse.toFixed(4)} 米超过阈值 ${threshold} 米（高精度资料定点验证）`,
        policyBasis: config.highPrecisionReference.policyBasis,
      })
    }

    return {
      rmse: Math.round(rmse * 10000) / 10000,
      checkPointCount: crossValidationPoints.length,
      passed,
      method: '高精度资料定点验证',
      checkResults,
    }
  }

  private checkByCrossValidation(

    config: GeoAccuracyConfig,
    crossValidationPoints: CheckPoint[],
    checkResults: QualityCheckResult[],
  ): ElevationAccuracyResult {
    const rmse = this.calculateElevationRmse(crossValidationPoints)
    const threshold = config.crossValidation.toleranceMeter
    const passed = rmse <= threshold

    if (!passed) {
      checkResults.push({
        checkName: '高程中误差检查',
        errorClass: 'B',
        objectId: 'dataset',
        description: `高程中误差 ${rmse.toFixed(4)} 米超过交叉验证容差 ${threshold} 米（参考资料交叉验证）`,
        policyBasis: config.crossValidation.policyBasis,
      })
    }

    return {
      rmse: Math.round(rmse * 10000) / 10000,
      checkPointCount: crossValidationPoints.length,
      passed,
      method: '参考资料交叉验证',
      checkResults,
    }
  }

  private calculateElevationRmse(checkPoints: CheckPoint[]): number {
    if (checkPoints.length === 0) return 0
    let sumSquares = 0
    for (const cp of checkPoints) {
      const diff = cp.measuredElevation - cp.referenceElevation
      sumSquares += diff * diff
    }
    return Math.sqrt(sumSquares / checkPoints.length)
  }
}
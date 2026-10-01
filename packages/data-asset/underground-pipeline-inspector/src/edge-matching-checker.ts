import type {
  PipelinePoint,
  PipelineInspectionConfig,
  EdgeMatchingResult,
  QualityCheckResult,
} from './types.js'

export class EdgeMatchingChecker {
  check(
    points: PipelinePoint[],
    config: PipelineInspectionConfig,
  ): { edgeMatchingResult: EdgeMatchingResult; checkResults: QualityCheckResult[] } {
    const checkResults: QualityCheckResult[] = []
    const mismatchedPairs: { pointIdA: string; pointIdB: string; distance: number }[] = []

    const tolerance = config.edgeMatching.toleranceMeter
    const neighborThreshold = tolerance * 100

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const pointA = points[i]!
        const pointB = points[j]!
        if (pointA.pointId === pointB.pointId) continue

        const distance = this.calculateDistance(pointA, pointB)
        if (distance <= neighborThreshold && distance > tolerance) {
          mismatchedPairs.push({
            pointIdA: pointA.pointId,
            pointIdB: pointB.pointId,
            distance,
          })
          checkResults.push({
            checkName: '接边点一致性检查',
            errorClass: 'B',
            objectId: `${pointA.pointId}-${pointB.pointId}`,
            description: `接边点 ${pointA.pointId} 与 ${pointB.pointId} 坐标偏差 ${distance.toFixed(6)} 米，超过容差 ${tolerance} 米`,
            policyBasis: config.edgeMatching.policyBasis,
          })
        }
      }
    }

    const edgeMatchingResult: EdgeMatchingResult = {
      mismatchedPairs,
      policyBasis: config.edgeMatching.policyBasis,
    }

    return { edgeMatchingResult, checkResults }
  }

  private calculateDistance(a: PipelinePoint, b: PipelinePoint): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
  }
}
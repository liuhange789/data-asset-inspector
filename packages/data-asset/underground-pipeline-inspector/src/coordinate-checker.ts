import type {
  PipelineDataset,
  PipelineInspectionConfig,
  CoordinateCheckResult,
  QualityCheckResult,
} from './types.js'

export class CoordinateChecker {
  check(
    dataset: PipelineDataset,
    config: PipelineInspectionConfig,
  ): { coordinateResult: CoordinateCheckResult; checkResults: QualityCheckResult[] } {
    const checkResults: QualityCheckResult[] = []
    const missingCoordinatePoints: { pointId: string; description: string }[] = []

    const pointMap = new Map<string, boolean>()
    for (const point of dataset.points) {
      pointMap.set(point.pointId, true)
    }

    for (const segment of dataset.segments) {
      if (!pointMap.has(segment.startPointId)) {
        missingCoordinatePoints.push({
          pointId: segment.startPointId,
          description: `管段 ${segment.segmentId} 起点引用 ${segment.startPointId} 不存在，无法定位坐标`,
        })
        checkResults.push({
          checkName: '缺坐标检查',
          errorClass: 'B',
          objectId: segment.segmentId,
          description: `管段 ${segment.segmentId} 起点引用 ${segment.startPointId} 不存在，无法定位坐标`,
          policyBasis: config.fieldIntegrity.policyBasis,
        })
      }
      if (!pointMap.has(segment.endPointId)) {
        missingCoordinatePoints.push({
          pointId: segment.endPointId,
          description: `管段 ${segment.segmentId} 终点引用 ${segment.endPointId} 不存在，无法定位坐标`,
        })
        checkResults.push({
          checkName: '缺坐标检查',
          errorClass: 'B',
          objectId: segment.segmentId,
          description: `管段 ${segment.segmentId} 终点引用 ${segment.endPointId} 不存在，无法定位坐标`,
          policyBasis: config.fieldIntegrity.policyBasis,
        })
      }
    }

    const coordinateResult: CoordinateCheckResult = {
      missingCoordinatePoints,
      policyBasis: config.fieldIntegrity.policyBasis,
    }

    return { coordinateResult, checkResults }
  }
}
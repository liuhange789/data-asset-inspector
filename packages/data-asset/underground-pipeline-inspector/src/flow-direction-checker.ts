import type {
  PipelineDataset,
  PipelineAttributeConfig,
  FlowDirectionCheckResult,
  QualityCheckResult,
} from './types.js'

export class FlowDirectionChecker {
  check(
    dataset: PipelineDataset,
    config: PipelineAttributeConfig,
  ): { flowDirectionResult: FlowDirectionCheckResult; checkResults: QualityCheckResult[] } {
    const checkResults: QualityCheckResult[] = []
    const invalidFlowSegments: { segmentId: string; description: string }[] = []

    const pointElevationMap = new Map<string, number>()
    for (const point of dataset.points) {
      pointElevationMap.set(point.pointId, point.elevation)
    }

    const allowedFlowDirections = new Set(config.flowDirectionEnum.allowedValues)

    for (const segment of dataset.segments) {
      if (segment.flowDirection === undefined) continue

      if (!allowedFlowDirections.has(segment.flowDirection)) {
        invalidFlowSegments.push({
          segmentId: segment.segmentId,
          description: `管段 ${segment.segmentId} 流向 ${segment.flowDirection} 不在合法枚举中`,
        })
        checkResults.push({
          checkName: '排水流向检查',
          errorClass: 'C',
          objectId: segment.segmentId,
          description: `管段 ${segment.segmentId} 流向 ${segment.flowDirection} 不在合法枚举中`,
          policyBasis: config.flowDirectionEnum.policyBasis,
        })
        continue
      }

      if (segment.flowDirection === '未知') continue

      const startElevation = pointElevationMap.get(segment.startPointId)
      const endElevation = pointElevationMap.get(segment.endPointId)
      if (startElevation === undefined || endElevation === undefined) continue

      const elevationDiff = startElevation - endElevation
      const epsilon = 1e-9

      if (segment.flowDirection === '顺流' && elevationDiff < -epsilon) {
        invalidFlowSegments.push({
          segmentId: segment.segmentId,
          description: `管段 ${segment.segmentId} 流向为顺流但起点高程 ${startElevation} 低于终点高程 ${endElevation}`,
        })
        checkResults.push({
          checkName: '排水流向检查',
          errorClass: 'C',
          objectId: segment.segmentId,
          description: `管段 ${segment.segmentId} 流向为顺流但起点高程 ${startElevation} 低于终点高程 ${endElevation}`,
          policyBasis: config.flowDirectionEnum.policyBasis,
        })
      } else if (segment.flowDirection === '逆流' && elevationDiff > epsilon) {
        invalidFlowSegments.push({
          segmentId: segment.segmentId,
          description: `管段 ${segment.segmentId} 流向为逆流但起点高程 ${startElevation} 高于终点高程 ${endElevation}`,
        })
        checkResults.push({
          checkName: '排水流向检查',
          errorClass: 'C',
          objectId: segment.segmentId,
          description: `管段 ${segment.segmentId} 流向为逆流但起点高程 ${startElevation} 高于终点高程 ${endElevation}`,
          policyBasis: config.flowDirectionEnum.policyBasis,
        })
      }
    }

    const flowDirectionResult: FlowDirectionCheckResult = {
      invalidFlowSegments,
      policyBasis: config.flowDirectionEnum.policyBasis,
    }

    return { flowDirectionResult, checkResults }
  }
}
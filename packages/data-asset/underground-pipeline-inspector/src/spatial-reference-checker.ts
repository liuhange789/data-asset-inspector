import type {
  PipelineDataset,
  PipelineInspectionConfig,
  SpatialReferenceCheckResult,
  QualityCheckResult,
} from './types.js'

export class SpatialReferenceChecker {
  check(
    dataset: PipelineDataset,
    config: PipelineInspectionConfig,
  ): { spatialReferenceResult: SpatialReferenceCheckResult; checkResults: QualityCheckResult[] } {
    const checkResults: QualityCheckResult[] = []
    const invalidSrid: { pointId: string; description: string }[] = []
    const invalidVerticalDatum: { pointId: string; description: string }[] = []

    const allowedSridSet = new Set(config.legalCoordinateSystems.allowedSridList)
    const allowedDatumSet = new Set(config.verticalDatum.allowedDatumList)

    for (const point of dataset.points) {
      if (point.srid !== undefined && point.srid !== '') {
        if (!allowedSridSet.has(point.srid)) {
          invalidSrid.push({
            pointId: point.pointId,
            description: `管线点 ${point.pointId} 坐标系 ${point.srid} 不在合法坐标系列表中`,
          })
          checkResults.push({
            checkName: '坐标系检查',
            errorClass: 'A',
            objectId: point.pointId,
            description: `管线点 ${point.pointId} 坐标系 ${point.srid} 不在合法坐标系列表中`,
            policyBasis: config.legalCoordinateSystems.policyBasis,
          })
        }
      }

      if (point.verticalDatum !== undefined && point.verticalDatum !== '') {
        if (!allowedDatumSet.has(point.verticalDatum)) {
          invalidVerticalDatum.push({
            pointId: point.pointId,
            description: `管线点 ${point.pointId} 高程基准 ${point.verticalDatum} 不在合法高程基准列表中`,
          })
          checkResults.push({
            checkName: '高程基准检查',
            errorClass: 'A',
            objectId: point.pointId,
            description: `管线点 ${point.pointId} 高程基准 ${point.verticalDatum} 不在合法高程基准列表中`,
            policyBasis: config.verticalDatum.policyBasis,
          })
        }
      }
    }

    const spatialReferenceResult: SpatialReferenceCheckResult = {
      invalidSrid,
      invalidVerticalDatum,
      policyBasis: config.legalCoordinateSystems.policyBasis,
    }

    return { spatialReferenceResult, checkResults }
  }
}
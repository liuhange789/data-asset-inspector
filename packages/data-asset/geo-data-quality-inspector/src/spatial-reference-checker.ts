import type {
  GeoDataset,
  GeoAccuracyConfig,
  SpatialReferenceCheckResult,
  QualityCheckResult,
} from './types.js'

export class SpatialReferenceChecker {
  check(
    dataset: GeoDataset,
    config: GeoAccuracyConfig,
  ): { spatialReferenceResult: SpatialReferenceCheckResult; checkResults: QualityCheckResult[] } {
    const checkResults: QualityCheckResult[] = []
    const invalidSrid: { featureId: string; description: string }[] = []
    const invalidVerticalDatum: { featureId: string; description: string }[] = []

    const allowedSridSet = new Set(config.spatialReference.allowedSridList)
    const allowedDatumSet = new Set(config.spatialReference.allowedVerticalDatumList)

    const sr = dataset.spatialReference
    let resolvable = true

    if (sr !== undefined) {
      if (sr.srid !== undefined && sr.srid !== '') {
        if (!allowedSridSet.has(sr.srid)) {
          invalidSrid.push({
            featureId: 'dataset',
            description: `数据集坐标系 ${sr.srid} 不在合法坐标系列表中`,
          })
          checkResults.push({
            checkName: '坐标系检查',
            errorClass: 'A',
            objectId: 'dataset',
            description: `数据集坐标系 ${sr.srid} 不在合法坐标系列表中`,
            policyBasis: config.spatialReference.policyBasis,
          })
          resolvable = false
        }
      }

      if (sr.verticalDatum !== undefined && sr.verticalDatum !== '') {
        if (!allowedDatumSet.has(sr.verticalDatum)) {
          invalidVerticalDatum.push({
            featureId: 'dataset',
            description: `数据集高程基准 ${sr.verticalDatum} 不在合法高程基准列表中`,
          })
          checkResults.push({
            checkName: '高程基准检查',
            errorClass: 'A',
            objectId: 'dataset',
            description: `数据集高程基准 ${sr.verticalDatum} 不在合法高程基准列表中`,
            policyBasis: config.spatialReference.policyBasis,
          })
          resolvable = false
        }
      }

      if (sr.srid === undefined || sr.srid === '') {
        resolvable = false
      }
    } else {
      resolvable = false
    }

    const spatialReferenceResult: SpatialReferenceCheckResult = {
      invalidSrid,
      invalidVerticalDatum,
      resolvable,
      checkResults,
    }

    return { spatialReferenceResult, checkResults }
  }
}
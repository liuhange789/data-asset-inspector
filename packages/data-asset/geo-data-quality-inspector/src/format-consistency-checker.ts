import type {
  GeoDataset,
  FormatConsistencyResult,
  QualityCheckResult,
} from './types.js'
import type { GeoAccuracyConfig } from './types.js'
import { SHAPEFILE_REQUIRED_EXTENSIONS, VALID_GEOMETRY_TYPES } from './invariant.js'

export class FormatConsistencyChecker {
  check(
    dataset: GeoDataset,
    config: GeoAccuracyConfig,
  ): FormatConsistencyResult {
    const checkResults: QualityCheckResult[] = []
    let shapefileComplete = true
    let missingExtensions: string[] = []
    let geoJsonValid = true
    let blocked = false

    if (dataset.format === 'Shapefile') {
      const manifest = dataset.shapefileManifest
      if (manifest !== undefined) {
        missingExtensions = manifest.missingExtensions
        if (missingExtensions.length > 0) {
          shapefileComplete = false
          blocked = true
          checkResults.push({
            checkName: 'Shapefile完整性检查',
            errorClass: 'A',
            objectId: 'dataset',
            description: `Shapefile 缺少必要文件: ${missingExtensions.join(', ')}（需包含 ${SHAPEFILE_REQUIRED_EXTENSIONS.join('/')}），阻断该数据集后续检查`,
            policyBasis: config.spatialReference.policyBasis,
          })
        }
      } else {
        missingExtensions = [...SHAPEFILE_REQUIRED_EXTENSIONS]
        shapefileComplete = false
        blocked = true
        checkResults.push({
          checkName: 'Shapefile完整性检查',
          errorClass: 'A',
          objectId: 'dataset',
          description: `Shapefile 缺少清单信息，无法验证必要文件（需包含 ${SHAPEFILE_REQUIRED_EXTENSIONS.join('/')}），阻断该数据集后续检查`,
          policyBasis: config.spatialReference.policyBasis,
        })
      }
    }

    if (dataset.format === 'GeoJSON') {
      for (const feature of dataset.features) {
        const geom = feature.geometry
        if (!VALID_GEOMETRY_TYPES.includes(geom.type as (typeof VALID_GEOMETRY_TYPES)[number])) {
          geoJsonValid = false
          checkResults.push({
            checkName: 'RFC 7946合规检查',
            errorClass: 'A',
            objectId: feature.featureId,
            description: `要素 ${feature.featureId} 几何类型 ${geom.type} 不符合 RFC 7946 规范`,
            policyBasis: config.spatialReference.policyBasis,
          })
        }

        if (geom.coordinates === undefined && geom.geometries === undefined) {
          geoJsonValid = false
          checkResults.push({
            checkName: 'RFC 7946合规检查',
            errorClass: 'A',
            objectId: feature.featureId,
            description: `要素 ${feature.featureId} 缺少 coordinates 字段，不符合 RFC 7946 规范`,
            policyBasis: config.spatialReference.policyBasis,
          })
        }
      }
    }

    return {
      shapefileComplete,
      missingExtensions,
      geoJsonValid,
      blocked,
      checkResults,
    }
  }
}
import type {
  GeoDataset,
  LogicalConsistencyResult,
  QualityCheckResult,
} from './types.js'
import type { GeoAccuracyConfig } from './types.js'

const VALID_CLASSIFICATION_CODES = new Set([
  '110000',
  '120000',
  '130000',
  '140000',
  '150000',
  '160000',
  '170000',
  '180000',
  '190000',
  '200000',
  '210000',
  '220000',
  '230000',
  '240000',
  '250000',
  '260000',
  '270000',
  '280000',
  '290000',
  '300000',
])

export class LogicalConsistencyChecker {
  check(
    dataset: GeoDataset,
    config: GeoAccuracyConfig,
  ): LogicalConsistencyResult {
    const checkResults: QualityCheckResult[] = []
    const invalidClassificationCodes: { featureId: string; description: string }[] = []

    for (const feature of dataset.features) {
      if (feature.classificationCode !== undefined && feature.classificationCode !== '') {
        if (!VALID_CLASSIFICATION_CODES.has(feature.classificationCode)) {
          invalidClassificationCodes.push({
            featureId: feature.featureId,
            description: `要素 ${feature.featureId} 分类码 ${feature.classificationCode} 不在合法分类码列表中`,
          })
          checkResults.push({
            checkName: '概念一致性检查',
            errorClass: 'C',
            objectId: feature.featureId,
            description: `要素 ${feature.featureId} 分类码 ${feature.classificationCode} 不在合法分类码列表中`,
            policyBasis: config.spatialReference.policyBasis,
          })
        }
      }
    }

    return { invalidClassificationCodes, checkResults }
  }
}
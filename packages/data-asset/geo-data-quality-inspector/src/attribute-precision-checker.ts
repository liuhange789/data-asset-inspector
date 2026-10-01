import type {
  GeoDataset,
  AttributePrecisionResult,
  QualityCheckResult,
} from './types.js'
import type { GeoAccuracyConfig } from './types.js'

const ATTRIBUTE_RULES: Record<string, { allowedValues?: Set<string>; range?: { min: number; max: number } }> = {
  featureType: {
    allowedValues: new Set([
      '建筑物',
      '道路',
      '水系',
      '植被',
      '地形',
      '管线',
      '垣栅',
      '地貌',
      '土质',
      '居民地',
      '工矿设施',
      '交通设施',
      '水利设施',
      '其他',
    ]),
  },
}

export class AttributePrecisionChecker {
  check(
    dataset: GeoDataset,
    config: GeoAccuracyConfig,
  ): AttributePrecisionResult {
    const checkResults: QualityCheckResult[] = []
    const invalidAttributeValues: { featureId: string; fieldName: string; description: string }[] = []

    for (const feature of dataset.features) {
      if (feature.featureType !== undefined && feature.featureType !== '') {
        const rule = ATTRIBUTE_RULES['featureType']
        if (rule?.allowedValues && !rule.allowedValues.has(feature.featureType)) {
          invalidAttributeValues.push({
            featureId: feature.featureId,
            fieldName: 'featureType',
            description: `要素 ${feature.featureId} featureType 值 ${feature.featureType} 不在合法枚举中`,
          })
          checkResults.push({
            checkName: '属性值正确性检查',
            errorClass: 'C',
            objectId: feature.featureId,
            description: `要素 ${feature.featureId} featureType 值 ${feature.featureType} 不在合法枚举中`,
            policyBasis: config.spatialReference.policyBasis,
          })
        }
      }

      const props = feature.properties
      for (const [key, value] of Object.entries(props)) {
        if (typeof value === 'string' && value === '') {
          invalidAttributeValues.push({
            featureId: feature.featureId,
            fieldName: key,
            description: `要素 ${feature.featureId} 属性 ${key} 值为空字符串`,
          })
          checkResults.push({
            checkName: '属性值正确性检查',
            errorClass: 'D',
            objectId: feature.featureId,
            description: `要素 ${feature.featureId} 属性 ${key} 值为空字符串`,
            policyBasis: config.spatialReference.policyBasis,
          })
        }
      }
    }

    return { invalidAttributeValues, checkResults }
  }
}
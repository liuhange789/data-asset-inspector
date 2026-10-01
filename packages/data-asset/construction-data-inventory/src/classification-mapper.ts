import type { ClassificationConfig, UnifiedAssetItem } from './types.js'
import { POLICY_STANDARD_NAME } from './invariant.js'

export interface ClassificationMapResult {
  assets: UnifiedAssetItem[]
  warnings: string[]
  unclassified: string[]
}

export class ClassificationMapper {
  map(unifiedAssets: UnifiedAssetItem[], classificationConfig: ClassificationConfig | null): ClassificationMapResult {
    const warnings: string[] = []
    const unclassified: string[] = []
    const policyBasis = `依据：${POLICY_STANDARD_NAME}分类体系`

    if (!classificationConfig || !Array.isArray(classificationConfig.nodes) || classificationConfig.nodes.length === 0) {
      warnings.push('分类配置未提供，所有数据项标记为"未分类"')
      for (const asset of unifiedAssets) {
        asset.classificationCode = ''
        asset.policyBasis = ''
        unclassified.push(asset.assetId)
      }
      return { assets: unifiedAssets, warnings, unclassified }
    }

    for (const asset of unifiedAssets) {
      const matchedRules = this.findMatchingRules(asset.dataType, classificationConfig.nodes)

      if (matchedRules.length === 0) {
        asset.classificationCode = ''
        asset.policyBasis = ''
        unclassified.push(asset.assetId)
        warnings.push(`资产 ${asset.assetId} 无法分类，标记为"未分类"，原始数据类型: ${asset.dataType}`)
      } else if (matchedRules.length === 1) {
        asset.classificationCode = matchedRules[0]!.classificationCode
        asset.policyBasis = policyBasis
      } else {
        const selectedRule = matchedRules[0]!
        asset.classificationCode = selectedRule.classificationCode
        asset.policyBasis = policyBasis
        warnings.push(`资产 ${asset.assetId} 多规则匹配，已按优先级选取 ${selectedRule.classificationCode}`)
      }
    }

    return { assets: unifiedAssets, warnings, unclassified }
  }

  private findMatchingRules(dataType: string, nodes: ClassificationConfig['nodes']): ClassificationConfig['nodes'] {
    const matched: ClassificationConfig['nodes'] = []
    for (const node of nodes) {
      if (node.mappedDataTypes && node.mappedDataTypes.includes(dataType)) {
        matched.push(node)
      }
    }
    return matched
  }

  isValidClassificationCode(code: string, config: ClassificationConfig): boolean {
    return config.nodes.some((node) => node.classificationCode === code)
  }
}
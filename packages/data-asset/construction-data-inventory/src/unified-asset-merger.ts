import type { UnifiedAssetItem } from './types.js'

export class UnifiedAssetMerger {
  merge(adaptedAssetLists: Array<{ assets: UnifiedAssetItem[]; warnings: string[]; errors: string[] }>): {
    unifiedAssets: UnifiedAssetItem[]
    warnings: string[]
    errors: string[]
  } {
    const unifiedAssets: UnifiedAssetItem[] = []
    const warnings: string[] = []
    const errors: string[] = []

    for (const list of adaptedAssetLists) {
      if (!list) continue
      warnings.push(...(list.warnings ?? []))
      errors.push(...(list.errors ?? []))
      for (const asset of list.assets ?? []) {
        unifiedAssets.push(asset)
      }
    }

    return { unifiedAssets, warnings, errors }
  }
}
import type { UnifiedAssetItem } from './types.js'

export interface SourceAdapter {
  adapt(sourcePath: string, systemId: string, projectId: string): {
    assets: UnifiedAssetItem[]
    warnings: string[]
    errors: string[]
  }
}
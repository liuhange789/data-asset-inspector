import { ScanSourceAdapterFactory } from './scanSourceAdapter.js'
import { AssetTripleConditionScreener, type TripleConditionConfig } from './assetTripleConditionScreener.js'
import { OwnershipClueAnnotator, type OwnershipClueRules } from './ownershipClueAnnotator.js'
import { ScanReportGenerator } from './scanReportGenerator.js'
import type { AssetItem, ScanReport } from './types.js'
import type { PolicyDocument } from '@liuhange/dsh-data-asset-shared'

export interface ScanExecutorConfig {
  tripleCondition: TripleConditionConfig
  ownershipClueRules: OwnershipClueRules
  scanScaleLimit: number
  policyDocuments: PolicyDocument[]
}

export class ScanExecutor {
  private screener: AssetTripleConditionScreener
  private annotator: OwnershipClueAnnotator
  private reportGenerator: ScanReportGenerator

  constructor(private config: ScanExecutorConfig) {
    this.screener = new AssetTripleConditionScreener(config.tripleCondition)
    this.annotator = new OwnershipClueAnnotator(config.ownershipClueRules)
    this.reportGenerator = new ScanReportGenerator(config.policyDocuments)
  }

  execute(
    scanSource: string,
    sourceType: 'directory' | 'database',
    outputPathDir?: string,
  ): ScanReport {
    const adapter = ScanSourceAdapterFactory.create(sourceType)
    const metadata = adapter.scan(scanSource, this.config.scanScaleLimit)

    const assetItems: AssetItem[] = metadata.map(obj => {
      const screening = this.screener.screen(obj as unknown as Record<string, unknown>)
      const ownershipClues = this.annotator.annotate(obj as unknown as Record<string, unknown>)
      const item: AssetItem = {
        id: obj.id,
        name: obj.name,
        sourceType,
        metadata: obj as unknown as Record<string, unknown>,
        initialScreening: screening.passed ? '初筛通过' as const : '初筛不通过' as const,
        ownershipClues,
      }
      if (screening.missingConditions.length > 0) {
        item.missingConditions = screening.missingConditions
      }
      return item
    })

    return this.reportGenerator.generate(assetItems, scanSource, sourceType, outputPathDir)
  }
}
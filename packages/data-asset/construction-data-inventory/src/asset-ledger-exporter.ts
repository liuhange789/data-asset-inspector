import { writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import type { AssetLedgerEntry, UnifiedAssetItem } from './types.js'

export class AssetLedgerExporter {
  export(assetList: UnifiedAssetItem[], outputPath: string): string {
    const ledger = this.buildLedger(assetList)
    const fullPath = resolve(outputPath)
    const lastSep = fullPath.lastIndexOf(sep)
    const dir = lastSep > 0 ? fullPath.substring(0, lastSep) : ''
    if (dir && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(fullPath, JSON.stringify(ledger, null, 2), 'utf-8')
    return fullPath
  }

  buildLedger(assetList: UnifiedAssetItem[]): AssetLedgerEntry[] {
    const inventoryTime = new Date().toISOString()
    return assetList.map((asset) => ({
      assetCode: asset.assetCode,
      classificationCode: asset.classificationCode,
      sourceSystemId: asset.sourceSystemId,
      inventoryTime,
      judgmentStatus: asset.judgmentStatus,
    }))
  }

  exportToPath(assetList: UnifiedAssetItem[], outputPathDir: string): string {
    const fullPath = resolve(outputPathDir, 'asset-ledger.json')
    if (!existsSync(outputPathDir)) {
      mkdirSync(outputPathDir, { recursive: true })
    }
    const ledger = this.buildLedger(assetList)
    writeFileSync(fullPath, JSON.stringify(ledger, null, 2), 'utf-8')
    return fullPath
  }
}
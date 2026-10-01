import { readFileSync } from 'node:fs'
import type { UnifiedAssetItem } from './types.js'
import type { SourceAdapter } from './source-adapter.js'

interface AcceptanceRecord {
  acceptanceId: string
  acceptancePart: string
  acceptanceConclusion: string
  acceptanceDate: string
  acceptanceType?: string
}

export class AcceptanceDocAdapter implements SourceAdapter {
  adapt(sourcePath: string, systemId: string, projectId: string): {
    assets: UnifiedAssetItem[]
    warnings: string[]
    errors: string[]
  } {
    const assets: UnifiedAssetItem[] = []
    const warnings: string[] = []
    const errors: string[] = []

    let content: string
    try {
      content = readFileSync(sourcePath, 'utf-8')
    } catch (e) {
      errors.push(`验收文件读取失败: ${sourcePath} - ${(e as Error).message}`)
      return { assets, warnings, errors }
    }

    let records: AcceptanceRecord[]
    try {
      const parsed = JSON.parse(content)
      records = Array.isArray(parsed) ? (parsed as AcceptanceRecord[]) : [parsed as AcceptanceRecord]
    } catch (e) {
      errors.push(`验收文件解析失败: ${sourcePath} - ${(e as Error).message}`)
      return { assets, warnings, errors }
    }

    const collectionTime = new Date().toISOString()
    for (const record of records) {
      if (!record || typeof record !== 'object') {
        warnings.push('验收记录格式不合法，已跳过')
        continue
      }
      if (typeof record.acceptanceId !== 'string' || record.acceptanceId.trim() === '') {
        warnings.push('验收记录缺少acceptanceId，已跳过')
        continue
      }
      const dataType = this.mapAcceptanceTypeToDataType(record.acceptanceType ?? '')
      assets.push({
        assetId: `ACCEPTANCE-${record.acceptanceId}`,
        sourceSystemId: systemId,
        dataType,
        projectId,
        collectionTime: record.acceptanceDate || collectionTime,
        classificationCode: '',
        assetCode: '',
        judgmentStatus: '自动判定',
      })
    }

    return { assets, warnings, errors }
  }

  private mapAcceptanceTypeToDataType(acceptanceType: string): string {
    if (!acceptanceType) return '验收属性'
    if (acceptanceType.includes('质量')) return '质量属性'
    return '验收属性'
  }
}
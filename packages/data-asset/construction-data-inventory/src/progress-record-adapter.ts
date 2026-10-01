import { readFileSync } from 'node:fs'
import type { UnifiedAssetItem } from './types.js'
import type { SourceAdapter } from './source-adapter.js'

interface ProgressRecord {
  recordId: string
  processNode: string
  completionTime: string
  quantity?: number
  processType?: string
}

export class ProgressRecordAdapter implements SourceAdapter {
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
      errors.push(`进度文件读取失败: ${sourcePath} - ${(e as Error).message}`)
      return { assets, warnings, errors }
    }

    let records: ProgressRecord[]
    try {
      const parsed = JSON.parse(content)
      records = Array.isArray(parsed) ? (parsed as ProgressRecord[]) : [parsed as ProgressRecord]
    } catch (e) {
      errors.push(`进度文件解析失败: ${sourcePath} - ${(e as Error).message}`)
      return { assets, warnings, errors }
    }

    const collectionTime = new Date().toISOString()
    for (const record of records) {
      if (!record || typeof record !== 'object') {
        warnings.push('进度记录格式不合法，已跳过')
        continue
      }
      if (typeof record.recordId !== 'string' || record.recordId.trim() === '') {
        warnings.push('进度记录缺少recordId，已跳过')
        continue
      }
      const dataType = this.mapProcessTypeToDataType(record.processType ?? '')
      assets.push({
        assetId: `PROGRESS-${record.recordId}`,
        sourceSystemId: systemId,
        dataType,
        projectId,
        collectionTime: record.completionTime || collectionTime,
        classificationCode: '',
        assetCode: '',
        judgmentStatus: '自动判定',
      })
    }

    return { assets, warnings, errors }
  }

  private mapProcessTypeToDataType(processType: string): string {
    if (!processType) return '进度记录-行为'
    if (processType.includes('阶段')) return '进度记录-项目阶段'
    if (processType.includes('专业')) return '进度记录-专业领域'
    return '进度记录-行为'
  }
}
import { readFileSync } from 'node:fs'
import type { UnifiedAssetItem } from './types.js'
import type { SourceAdapter } from './source-adapter.js'

interface ContractRecord {
  contractId: string
  contractType: string
  signDate: string
  parties: string[]
  amount?: number
}

export class ContractAdapter implements SourceAdapter {
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
      errors.push(`合同文件读取失败: ${sourcePath} - ${(e as Error).message}`)
      return { assets, warnings, errors }
    }

    let records: ContractRecord[]
    try {
      const parsed = JSON.parse(content)
      records = Array.isArray(parsed) ? (parsed as ContractRecord[]) : [parsed as ContractRecord]
    } catch (e) {
      errors.push(`合同文件解析失败: ${sourcePath} - ${(e as Error).message}`)
      return { assets, warnings, errors }
    }

    const collectionTime = new Date().toISOString()
    for (const record of records) {
      if (!record || typeof record !== 'object') {
        warnings.push('合同记录格式不合法，已跳过')
        continue
      }
      if (typeof record.contractId !== 'string' || record.contractId.trim() === '') {
        warnings.push('合同记录缺少contractId，已跳过')
        continue
      }
      const dataType = this.mapContractTypeToDataType(record.contractType ?? '')
      assets.push({
        assetId: `CONTRACT-${record.contractId}`,
        sourceSystemId: systemId,
        dataType,
        projectId,
        collectionTime,
        classificationCode: '',
        assetCode: '',
        judgmentStatus: '自动判定',
      })
    }

    return { assets, warnings, errors }
  }

  private mapContractTypeToDataType(contractType: string): string {
    if (!contractType) return '参建方信息-组织角色'
    if (contractType.includes('材料') || contractType.includes('采购')) {
      return '材料清单-组织角色'
    }
    return '参建方信息-组织角色'
  }
}
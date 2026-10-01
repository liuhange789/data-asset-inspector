import type { InventoryReport, UnifiedAssetItem } from './types.js'

const SENSITIVE_FIELD_PATTERNS = [
  'amount',
  'price',
  'cost',
  'fee',
  'quote',
  'quotation',
  '合同金额',
  '报价',
  '费用',
  '金额',
  '参建方报价',
]

const UNKNOWN_SENSITIVE_REPLACEMENT = '***'

export class ReportDesensitizer {
  desensitize(report: InventoryReport): { report: InventoryReport; warnings: string[] } {
    const warnings: string[] = []
    const desensitizedAssetList = report.assetList.map((asset) => {
      const cleaned = this.desensitizeAsset(asset, warnings)
      return cleaned
    })

    return {
      report: {
        ...report,
        assetList: desensitizedAssetList,
      },
      warnings,
    }
  }

  desensitizeAsset(asset: UnifiedAssetItem, warnings: string[]): UnifiedAssetItem {
    const cleaned: UnifiedAssetItem = { ...asset }
    const keys = Object.keys(cleaned) as (keyof UnifiedAssetItem)[]
    for (const key of keys) {
      if (this.isSensitiveField(String(key))) {
        const value = cleaned[key]
        if (value !== undefined && value !== null && String(value) !== '') {
          warnings.push(`敏感字段 ${String(key)} 已脱敏`)
          ;(cleaned as unknown as Record<string, unknown>)[key as string] = UNKNOWN_SENSITIVE_REPLACEMENT
        }
      }
    }
    return cleaned
  }

  desensitizeRecord(record: Record<string, unknown>): Record<string, unknown> {
    const warnings: string[] = []
    return this.desensitizeGenericRecord(record, warnings)
  }

  private desensitizeGenericRecord(record: Record<string, unknown>, warnings: string[]): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {}
    for (const key of Object.keys(record)) {
      if (this.isSensitiveField(key)) {
        const value = record[key]
        if (value !== undefined && value !== null && String(value) !== '') {
          warnings.push(`敏感字段 ${key} 已脱敏`)
          cleaned[key] = UNKNOWN_SENSITIVE_REPLACEMENT
        } else {
          cleaned[key] = value
        }
      } else {
        cleaned[key] = record[key]
      }
    }
    return cleaned
  }

  private isSensitiveField(fieldName: string): boolean {
    const lower = fieldName.toLowerCase()
    return SENSITIVE_FIELD_PATTERNS.some((pattern) => lower.includes(pattern.toLowerCase()))
  }
}
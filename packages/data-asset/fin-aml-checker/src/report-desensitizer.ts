export interface DesensitizeConfig {
  sensitiveFields: string[]
  replacement: string
}

const DEFAULT_SENSITIVE_FIELDS = [
  'accountHolderName',
  'idCardNumber',
  'phoneNumber',
  'bankCardNumber',
  'address',
  'idNumber',
  'customerName',
  'holderName',
  '身份证号',
  '账户持有人姓名',
  '电话号码',
  '银行卡号',
  '地址',
]

const DEFAULT_REPLACEMENT = '***'

export class ReportDesensitizer {
  private readonly sensitiveFields: Set<string>
  private readonly replacement: string
  private readonly warnings: string[]

  constructor(config?: DesensitizeConfig | null) {
    const fields = config?.sensitiveFields ?? DEFAULT_SENSITIVE_FIELDS
    this.sensitiveFields = new Set(fields)
    this.replacement = config?.replacement ?? DEFAULT_REPLACEMENT
    this.warnings = []
  }

  desensitize<T extends Record<string, unknown>>(record: T): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    for (const key of Object.keys(record)) {
      if (this.sensitiveFields.has(key)) {
        result[key] = this.replacement
      } else {
        result[key] = record[key]
      }
    }

    return result
  }

  desensitizeBatch<T extends Record<string, unknown>>(records: T[]): Record<string, unknown>[] {
    return records.map((record) => this.desensitize(record))
  }

  desensitizeReport(report: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    for (const key of Object.keys(report)) {
      const value = report[key]
      if (this.sensitiveFields.has(key)) {
        result[key] = this.replacement
        this.warnings.push(`敏感字段 ${key} 已脱敏处理`)
      } else if (Array.isArray(value)) {
        result[key] = value.map((item) => {
          if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            return this.desensitize(item as Record<string, unknown>)
          }
          return item
        })
      } else if (value !== null && typeof value === 'object') {
        result[key] = this.desensitize(value as Record<string, unknown>)
      } else {
        result[key] = value
      }
    }

    return result
  }

  getWarnings(): string[] {
    return [...this.warnings]
  }

  clearWarnings(): void {
    this.warnings.length = 0
  }
}
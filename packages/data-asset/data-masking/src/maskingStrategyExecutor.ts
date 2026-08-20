import type { MaskingStrategy, SensitiveFieldType } from '@deepseek-ai/dsh-data-asset-shared'

export class MaskingStrategyExecutor {
  execute(value: string, _type: SensitiveFieldType, strategy: MaskingStrategy): string {
    const resolvedStrategy = this.resolveStrategy(strategy)
    switch (resolvedStrategy) {
      case 'FULL':
        return '***'
      case 'PARTIAL':
        return this.applyPartial(value)
      case 'GENERALIZE':
        return '<脱敏数据>'
    }
  }

  resolveStrategy(strategy: MaskingStrategy): MaskingStrategy {
    if (strategy === 'FULL' || strategy === 'PARTIAL' || strategy === 'GENERALIZE') {
      return strategy
    }
    return 'PARTIAL'
  }

  private applyPartial(value: string, keepPrefix = 3, keepSuffix = 4): string {
    if (value.length <= keepPrefix + keepSuffix) {
      return '***'
    }
    return value.slice(0, keepPrefix) + '***' + value.slice(-keepSuffix)
  }
}

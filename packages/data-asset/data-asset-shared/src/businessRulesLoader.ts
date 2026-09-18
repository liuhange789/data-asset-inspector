import * as fs from 'fs'
import * as path from 'path'
import type { BusinessRulesConfig, BusinessRulesLoadResult, ConfigStatus } from './types.js'
import { defaultBusinessRules } from './defaultBusinessRules.js'

export class BusinessRulesLoader {
  private cachedResult: BusinessRulesLoadResult | null = null
  private readonly configPath: string

  constructor(configPath?: string) {
    this.configPath = configPath
      ? path.resolve(configPath)
      : path.resolve(process.cwd(), 'config', 'business-rules.json')
  }

  load(): BusinessRulesLoadResult {
    if (this.cachedResult) {
      return this.cachedResult
    }

    const result = this.loadInternal()
    this.cachedResult = result
    return result
  }

  private loadInternal(): BusinessRulesLoadResult {
    if (!fs.existsSync(this.configPath)) {
      return this.createDefaultResult('DEFAULT_MISSING')
    }

    let raw: string
    try {
      raw = fs.readFileSync(this.configPath, 'utf-8')
    } catch {
      return this.createDefaultResult('DEFAULT_PARSE')
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return this.createDefaultResult('DEFAULT_PARSE')
    }

    if (!this.isBusinessRulesConfig(parsed)) {
      return this.createDefaultResult('DEFAULT_PARSE')
    }

    if (!this.isVersionCompatible(parsed.version)) {
      return this.createDefaultResult('DEFAULT_VERSION')
    }

    if (!this.hasRequiredNodes(parsed)) {
      return this.createDefaultResult('DEFAULT_PARTIAL')
    }

    return {
      config: parsed,
      status: 'CONFIG_LOADED' as ConfigStatus,
    }
  }

  private createDefaultResult(status: ConfigStatus): BusinessRulesLoadResult {
    return {
      config: defaultBusinessRules,
      status,
    }
  }

  private isBusinessRulesConfig(value: unknown): value is BusinessRulesConfig {
    return (
      typeof value === 'object' &&
      value !== null &&
      'version' in value &&
      'valueAssessment' in value &&
      'sensitivePatterns' in value &&
      'cleaningRules' in value &&
      'compliance' in value &&
      'packaging' in value
    )
  }

  private isVersionCompatible(version: unknown): boolean {
    if (typeof version !== 'string') {
      return false
    }
    return version.startsWith('1.') || version.startsWith('3.')
  }

  private hasRequiredNodes(config: BusinessRulesConfig): boolean {
    return (
      config.valueAssessment !== undefined &&
      config.sensitivePatterns !== undefined &&
      config.maskingLevels !== undefined &&
      config.cleaningRules !== undefined &&
      config.compliance !== undefined &&
      config.packaging !== undefined
    )
  }

  clearCache(): void {
    this.cachedResult = null
  }
}

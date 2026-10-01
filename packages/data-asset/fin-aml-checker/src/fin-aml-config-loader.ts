import { loadJsonConfig } from '@liuhange/dsh-data-asset-shared'
import {
  defaultThresholdConfig,
  defaultExemptionConfig,
  defaultExchangeRateConfig,
  defaultHolidayConfig,
} from './default-threshold-config.js'
import { CONFIG_PATHS, SHARED_CONFIG_PATHS, ENV_VARS } from './invariant.js'
import type {
  ThresholdConfig,
  ExemptionConfig,
  ExchangeRateConfig,
  HolidayConfig,
  ConfigLoadResult,
  ConfigLoadStatus,
} from './types.js'

export class FinAmlConfigLoader {
  private readonly configPath: string | undefined

  constructor(configPath?: string) {
    this.configPath = configPath
  }

  load(): ConfigLoadResult {
    const warnings: string[] = []
    let overallStatus: ConfigLoadStatus = 'CONFIG_LOADED'

    const thresholdResult = this.loadSingleConfig<ThresholdConfig>(
      ENV_VARS.threshold,
      this.resolvePath(CONFIG_PATHS.threshold),
      SHARED_CONFIG_PATHS.threshold,
      defaultThresholdConfig,
      warnings,
    )
    if (thresholdResult.status !== 'CONFIG_LOADED' && overallStatus === 'CONFIG_LOADED') {
      overallStatus = thresholdResult.status
    }

    const exemptionResult = this.loadSingleConfig<ExemptionConfig>(
      ENV_VARS.exemption,
      this.resolvePath(CONFIG_PATHS.exemption),
      SHARED_CONFIG_PATHS.exemption,
      defaultExemptionConfig,
      warnings,
    )
    if (exemptionResult.status !== 'CONFIG_LOADED' && overallStatus === 'CONFIG_LOADED') {
      overallStatus = exemptionResult.status
    }

    const exchangeRateResult = this.loadSingleConfig<ExchangeRateConfig>(
      ENV_VARS.exchangeRate,
      this.resolvePath(CONFIG_PATHS.exchangeRate),
      SHARED_CONFIG_PATHS.exchangeRate,
      defaultExchangeRateConfig,
      warnings,
    )
    if (exchangeRateResult.status !== 'CONFIG_LOADED' && overallStatus === 'CONFIG_LOADED') {
      overallStatus = exchangeRateResult.status
    }

    const holidayResult = this.loadSingleConfig<HolidayConfig>(
      ENV_VARS.holiday,
      this.resolvePath(CONFIG_PATHS.holiday),
      SHARED_CONFIG_PATHS.holiday,
      defaultHolidayConfig,
      warnings,
    )
    if (holidayResult.status !== 'CONFIG_LOADED' && overallStatus === 'CONFIG_LOADED') {
      overallStatus = holidayResult.status
    }

    return {
      thresholdConfig: thresholdResult.config,
      exemptionConfig: exemptionResult.config,
      exchangeRateConfig: exchangeRateResult.config,
      holidayConfig: holidayResult.config,
      loadStatus: overallStatus,
      warnings,
    }
  }

  private resolvePath(defaultPath: string): string {
    if (this.configPath) {
      const base = this.configPath.replace(/[/\\]+$/, '')
      const fileName = defaultPath.split('/').pop() ?? defaultPath
      return `${base}/${fileName}`
    }
    return defaultPath
  }

  private loadSingleConfig<T>(
    envVar: string,
    localPath: string,
    sharedPackagePath: string,
    defaultConfig: T,
    warnings: string[],
  ): { config: T; status: ConfigLoadStatus } {
    try {
      const raw = loadJsonConfig(envVar, localPath, sharedPackagePath)
      return this.validateConfig<T>(raw, defaultConfig, warnings)
    } catch (e) {
      const message = (e as Error).message
      if (message.includes('CONFIG_NOT_FOUND')) {
        warnings.push(`配置文件缺失: ${localPath}，使用缺省配置`)
        return { config: defaultConfig, status: 'DEFAULT_MISSING' }
      }
      warnings.push(`配置文件解析失败: ${localPath}，使用缺省配置。错误: ${message}`)
      return { config: defaultConfig, status: 'DEFAULT_PARSE' }
    }
  }

  private validateConfig<T>(
    raw: Record<string, unknown>,
    defaultConfig: T,
    warnings: string[],
  ): { config: T; status: ConfigLoadStatus } {
    const version = raw.version
    if (typeof version !== 'string' || !version.startsWith('1.')) {
      warnings.push(`配置版本号不兼容: ${String(version)}，使用缺省配置`)
      return { config: defaultConfig, status: 'DEFAULT_VERSION' }
    }

    const config = raw as unknown as T
    if (!this.checkRequiredFields(config)) {
      warnings.push('配置必填节点缺失，使用缺省配置')
      return { config: defaultConfig, status: 'DEFAULT_PARTIAL' }
    }

    return { config, status: 'CONFIG_LOADED' }
  }

  private checkRequiredFields(config: unknown): boolean {
    if (config === null || typeof config !== 'object') return false
    const obj = config as Record<string, unknown>
    return typeof obj.version === 'string' && typeof obj.lastUpdated === 'string'
  }
}
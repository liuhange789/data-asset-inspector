import { loadJsonConfig } from '@liuhange/dsh-data-asset-shared'
import {
  QUALITY_DIMENSION_CONFIG_ENV,
  QUALITY_DIMENSION_CONFIG_LOCAL,
  REMEDIATION_SUGGESTION_CONFIG_ENV,
  REMEDIATION_SUGGESTION_CONFIG_LOCAL,
} from './invariant.js'
import { defaultQualityDimensionConfig, defaultRemediationSuggestionConfig } from './default-quality-dimension-config.js'
import type {
  ConfigLoadResult,
  ConfigLoadStatus,
  QualityDimensionConfig,
  RemediationSuggestionConfig,
} from './types.js'

export class ProvenanceConfigLoader {
  private readonly qualityDimensionConfigPath: string | undefined
  private readonly remediationSuggestionConfigPath: string | undefined
  private cachedResult: ConfigLoadResult | null = null

  constructor(configPath?: { qualityDimensionConfigPath?: string; remediationSuggestionConfigPath?: string }) {
    this.qualityDimensionConfigPath = configPath?.qualityDimensionConfigPath
    this.remediationSuggestionConfigPath = configPath?.remediationSuggestionConfigPath
  }

  load(): ConfigLoadResult {
    if (this.cachedResult) {
      return this.cachedResult
    }
    const result: ConfigLoadResult = {
      qualityDimensionConfig: this.loadQualityDimensionConfig(),
      remediationSuggestionConfig: this.loadRemediationSuggestionConfig(),
      loadStatus: {
        qualityDimension: this.qualityDimensionStatus,
        remediationSuggestion: this.remediationSuggestionStatus,
      },
    }
    this.cachedResult = result
    return result
  }

  private qualityDimensionStatus: ConfigLoadStatus = 'CONFIG_LOADED'
  private remediationSuggestionStatus: ConfigLoadStatus = 'CONFIG_LOADED'

  private loadQualityDimensionConfig(): QualityDimensionConfig {
    try {
      const raw = this.qualityDimensionConfigPath
        ? loadJsonConfig(QUALITY_DIMENSION_CONFIG_ENV, this.qualityDimensionConfigPath, QUALITY_DIMENSION_CONFIG_LOCAL)
        : loadJsonConfig(QUALITY_DIMENSION_CONFIG_ENV, QUALITY_DIMENSION_CONFIG_LOCAL, QUALITY_DIMENSION_CONFIG_LOCAL)
      const parsed = raw as unknown
      if (!this.isQualityDimensionConfig(parsed)) {
        this.qualityDimensionStatus = 'DEFAULT_PARSE'
        return defaultQualityDimensionConfig
      }
      if (!this.isVersionCompatible(parsed.version)) {
        this.qualityDimensionStatus = 'DEFAULT_VERSION'
        return defaultQualityDimensionConfig
      }
      if (!this.hasAllDimensions(parsed)) {
        this.qualityDimensionStatus = 'DEFAULT_PARTIAL'
        return defaultQualityDimensionConfig
      }
      return parsed
    } catch {
      this.qualityDimensionStatus = 'DEFAULT_MISSING'
      return defaultQualityDimensionConfig
    }
  }

  private loadRemediationSuggestionConfig(): RemediationSuggestionConfig {
    try {
      const raw = this.remediationSuggestionConfigPath
        ? loadJsonConfig(REMEDIATION_SUGGESTION_CONFIG_ENV, this.remediationSuggestionConfigPath, REMEDIATION_SUGGESTION_CONFIG_LOCAL)
        : loadJsonConfig(REMEDIATION_SUGGESTION_CONFIG_ENV, REMEDIATION_SUGGESTION_CONFIG_LOCAL, REMEDIATION_SUGGESTION_CONFIG_LOCAL)
      const parsed = raw as unknown
      if (!this.isRemediationSuggestionConfig(parsed)) {
        this.remediationSuggestionStatus = 'DEFAULT_PARSE'
        return defaultRemediationSuggestionConfig
      }
      if (!this.isVersionCompatible(parsed.version)) {
        this.remediationSuggestionStatus = 'DEFAULT_VERSION'
        return defaultRemediationSuggestionConfig
      }
      return parsed
    } catch {
      this.remediationSuggestionStatus = 'DEFAULT_MISSING'
      return defaultRemediationSuggestionConfig
    }
  }

  private isVersionCompatible(version: unknown): boolean {
    return typeof version === 'string' && (version.startsWith('1.') || version.startsWith('3.'))
  }

  private isQualityDimensionConfig(value: unknown): value is QualityDimensionConfig {
    return (
      typeof value === 'object' &&
      value !== null &&
      'version' in value &&
      'lastUpdated' in value &&
      'weights' in value &&
      'accuracy' in value &&
      'completeness' in value &&
      'consistency' in value &&
      'timeliness' in value &&
      'normality' in value &&
      'security' in value
    )
  }

  private hasAllDimensions(config: QualityDimensionConfig): boolean {
    return (
      config.weights !== undefined &&
      config.accuracy !== undefined &&
      config.completeness !== undefined &&
      config.consistency !== undefined &&
      config.timeliness !== undefined &&
      config.normality !== undefined &&
      config.security !== undefined
    )
  }

  private isRemediationSuggestionConfig(value: unknown): value is RemediationSuggestionConfig {
    return (
      typeof value === 'object' &&
      value !== null &&
      'version' in value &&
      'lastUpdated' in value &&
      'suggestions' in value
    )
  }

  clearCache(): void {
    this.cachedResult = null
  }
}
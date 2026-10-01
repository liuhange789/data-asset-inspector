import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type {
  ClassificationConfig,
  ConfigLoadResult,
  EncodingRuleConfig,
  SourceAdapterConfig,
} from './types.js'
import type { ConfigLoadStatus } from './invariant.js'
import {
  DEFAULT_CLASSIFICATION_CONFIG_PATH,
  DEFAULT_ENCODING_RULE_CONFIG_PATH,
  DEFAULT_SOURCE_ADAPTER_CONFIG_PATH,
} from './invariant.js'
import { defaultClassificationConfig } from './default-classification-config.js'
import { defaultEncodingRuleConfig } from './default-encoding-rule-config.js'

export class ConstructionConfigLoader {
  private readonly configPath: string

  constructor(configPath?: string) {
    this.configPath = configPath ?? process.cwd()
  }

  load(): ConfigLoadResult {
    const classificationResult = this.loadClassificationConfig()
    const encodingResult = this.loadEncodingRuleConfig()
    const sourceResult = this.loadSourceAdapterConfig()

    const statuses: ConfigLoadStatus[] = [
      classificationResult.status,
      encodingResult.status,
      sourceResult.status,
    ]

    const loadStatus = this.aggregateStatus(statuses)

    return {
      classificationConfig: classificationResult.config,
      encodingRuleConfig: encodingResult.config,
      sourceAdapterConfig: sourceResult.config,
      loadStatus,
    }
  }

  private aggregateStatus(statuses: ConfigLoadStatus[]): ConfigLoadStatus {
    if (statuses.every((s) => s === 'CONFIG_LOADED')) {
      return 'CONFIG_LOADED'
    }
    if (statuses.every((s) => s === 'DEFAULT_MISSING')) {
      return 'DEFAULT_MISSING'
    }
    if (statuses.some((s) => s === 'DEFAULT_PARSE')) {
      return 'DEFAULT_PARSE'
    }
    if (statuses.some((s) => s === 'DEFAULT_VERSION')) {
      return 'DEFAULT_VERSION'
    }
    return 'DEFAULT_PARTIAL'
  }

  private loadClassificationConfig(): { config: ClassificationConfig; status: ConfigLoadStatus } {
    const filePath = resolve(this.configPath, DEFAULT_CLASSIFICATION_CONFIG_PATH)
    if (!existsSync(filePath)) {
      return { config: defaultClassificationConfig, status: 'DEFAULT_MISSING' }
    }
    try {
      const raw = readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(raw) as ClassificationConfig
      if (!parsed.version || !Array.isArray(parsed.nodes)) {
        return { config: defaultClassificationConfig, status: 'DEFAULT_VERSION' }
      }
      return { config: parsed, status: 'CONFIG_LOADED' }
    } catch {
      return { config: defaultClassificationConfig, status: 'DEFAULT_PARSE' }
    }
  }

  private loadEncodingRuleConfig(): { config: EncodingRuleConfig; status: ConfigLoadStatus } {
    const filePath = resolve(this.configPath, DEFAULT_ENCODING_RULE_CONFIG_PATH)
    if (!existsSync(filePath)) {
      return { config: defaultEncodingRuleConfig, status: 'DEFAULT_MISSING' }
    }
    try {
      const raw = readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(raw) as EncodingRuleConfig
      if (!parsed.version || typeof parsed.classificationCodeLength !== 'number') {
        return { config: defaultEncodingRuleConfig, status: 'DEFAULT_VERSION' }
      }
      return { config: parsed, status: 'CONFIG_LOADED' }
    } catch {
      return { config: defaultEncodingRuleConfig, status: 'DEFAULT_PARSE' }
    }
  }

  private loadSourceAdapterConfig(): { config: SourceAdapterConfig; status: ConfigLoadStatus } {
    const filePath = resolve(this.configPath, DEFAULT_SOURCE_ADAPTER_CONFIG_PATH)
    const defaultConfig: SourceAdapterConfig = {
      version: '1.0.0',
      lastUpdated: '2024-01-01T00:00:00.000Z',
      adapters: [
        { type: 'IFC', adapterClassName: 'IfcModelAdapter', supportedVersions: ['IFC2X3', 'IFC4'] },
        { type: 'CONTRACT', adapterClassName: 'ContractAdapter', supportedVersions: ['1.0'] },
        { type: 'PROGRESS', adapterClassName: 'ProgressRecordAdapter', supportedVersions: ['1.0'] },
        { type: 'ACCEPTANCE', adapterClassName: 'AcceptanceDocAdapter', supportedVersions: ['1.0'] },
      ],
    }
    if (!existsSync(filePath)) {
      return { config: defaultConfig, status: 'DEFAULT_MISSING' }
    }
    try {
      const raw = readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(raw) as SourceAdapterConfig
      if (!parsed.version || !Array.isArray(parsed.adapters)) {
        return { config: defaultConfig, status: 'DEFAULT_VERSION' }
      }
      return { config: parsed, status: 'CONFIG_LOADED' }
    } catch {
      return { config: defaultConfig, status: 'DEFAULT_PARSE' }
    }
  }
}
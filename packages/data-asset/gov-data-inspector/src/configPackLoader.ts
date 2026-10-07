import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { loadJsonConfig } from '@liuhange/dsh-data-asset-shared'
import type { ConfigPack } from './configPack.js'
import { normalizeConfigPack } from './configPack.js'
import { ConfigPackSchemaValidator } from './configPackSchemaValidator.js'
import type { ConfigPackWarning, LoadSource, ReferenceSystem } from './types.js'
import defaultConfigPack from './default-config-pack.json' with { type: 'json' }

export interface ConfigPackLoadResult {
  configPack: ConfigPack
  loadSource: LoadSource
  warnings: ConfigPackWarning[]
}

function attachValidShortValues(raw: Record<string, unknown>, normalized: ConfigPack): ConfigPack {
  const values = raw.validShortValues
  if (Array.isArray(values) && values.length > 0) {
    normalized.validShortValues = values as string[]
  }
  return normalized
}

function tryLoadFromFilePath(warnings: ConfigPackWarning[]): ConfigPack | null {
  const envPath = process.env.GOV_CONFIG_PACK_PATH
  if (!envPath) return null

  try {
    const raw = readFileSync(envPath, 'utf-8')
    try {
      const parsed = JSON.parse(raw)
      const normalized = normalizeConfigPack(parsed)
      const validation = ConfigPackSchemaValidator.validate(normalized)
      if (!validation.valid) {
        warnings.push({
          type: 'CONFIG_PACK_WARNING',
          code: 'GOV_CONFIG_PACK_SCHEMA_INVALID',
          message: `文件配置包 Schema 校验失败: ${validation.errors.map((e) => e.path).join(', ')}`,
        })
        return null
      }
      return attachValidShortValues(parsed, normalized)
    } catch (e) {
      warnings.push({
        type: 'CONFIG_PACK_WARNING',
        code: 'GOV_CONFIG_PACK_PARSE_ERROR',
        message: `文件配置包 JSON 解析失败: ${(e as Error).message}`,
      })
      return null
    }
  } catch (e) {
    warnings.push({
      type: 'CONFIG_PACK_WARNING',
      code: 'GOV_CONFIG_PACK_NOT_FOUND',
      message: `文件配置包加载失败: ${(e as Error).message}`,
    })
    return null
  }
}

function tryLoadFromNpmPackage(warnings: ConfigPackWarning[]): ConfigPack | null {
  const packageName = process.env.GOV_CONFIG_PACK_PACKAGE
  if (!packageName) return null

  try {
    const require = createRequire(import.meta.url)
    const raw = require(packageName)
    try {
      const normalized = normalizeConfigPack(raw)
      const validation = ConfigPackSchemaValidator.validate(normalized)
      if (!validation.valid) {
        warnings.push({
          type: 'CONFIG_PACK_WARNING',
          code: 'GOV_CONFIG_PACK_SCHEMA_INVALID',
          message: `npm 包配置包 Schema 校验失败: ${validation.errors.map((e) => e.path).join(', ')}`,
        })
        return null
      }
      return attachValidShortValues(raw, normalized)
    } catch (e) {
      warnings.push({
        type: 'CONFIG_PACK_WARNING',
        code: 'GOV_CONFIG_PACK_PARSE_ERROR',
        message: `npm 包配置包解析失败: ${(e as Error).message}`,
      })
      return null
    }
  } catch (e) {
    warnings.push({
      type: 'CONFIG_PACK_WARNING',
      code: 'GOV_CONFIG_PACK_NOT_FOUND',
      message: `npm 包配置包加载失败: ${(e as Error).message}`,
    })
    return null
  }
}

function tryLoadDefault(warnings: ConfigPackWarning[]): ConfigPack {
  try {
    const normalized = normalizeConfigPack(defaultConfigPack as Record<string, unknown>)
    const validation = ConfigPackSchemaValidator.validate(normalized)
    if (!validation.valid) {
      warnings.push({
        type: 'CONFIG_PACK_WARNING',
        code: 'GOV_CONFIG_PACK_FALLBACK',
        message: `缺省配置包 Schema 校验失败: ${validation.errors.map((e) => e.path).join(', ')}`,
      })
    }
    return attachValidShortValues(defaultConfigPack as Record<string, unknown>, normalized)
  } catch (e) {
    warnings.push({
      type: 'CONFIG_PACK_WARNING',
      code: 'GOV_CONFIG_PACK_FALLBACK',
      message: `缺省配置包加载失败: ${(e as Error).message}`,
    })
    return defaultConfigPack as unknown as ConfigPack
  }
}

const FORBIDDEN_STANDARDS = ['DB1405/T 085-2025', 'GB/T 47949-2026', 'GB/T 47950-2026']
const DEFAULT_REF_SYSTEM_PATH = 'config/reference-system.json'
const SHARED_REF_SYSTEM_PATH = '@liuhange/dsh-data-asset-shared/config/reference-system.json'

export interface ReferenceSystemLoadResult {
  referenceSystem: ReferenceSystem | null
  warnings: ConfigPackWarning[]
}

export const ReferenceSystemLoader = {
  load(): ReferenceSystemLoadResult {
    const warnings: ConfigPackWarning[] = []
    const envPath = process.env.REFERENCE_SYSTEM_PATH
    let raw: unknown

    try {
      if (envPath) {
        if (!existsSync(envPath)) {
          return { referenceSystem: null, warnings: [{ type: 'CONFIG_PACK_WARNING', code: 'REFERENCE_SYSTEM_MISSING', message: '四层参照系配置缺失，已降级至 v3.3.4 模式' }] }
        }
        raw = JSON.parse(readFileSync(envPath, 'utf-8'))
      } else {
        raw = loadJsonConfig('REFERENCE_SYSTEM_PATH', DEFAULT_REF_SYSTEM_PATH, SHARED_REF_SYSTEM_PATH)
      }
    } catch {
      return { referenceSystem: null, warnings: [{ type: 'CONFIG_PACK_WARNING', code: 'REFERENCE_SYSTEM_MISSING', message: '四层参照系配置缺失，已降级至 v3.3.4 模式' }] }
    }

    if (typeof raw !== 'object' || raw === null) {
      throw new Error('REFERENCE_SYSTEM_INVALID: 参照系配置格式校验失败')
    }

    const obj = raw as Record<string, unknown>
    const layer1 = obj.layer1_govOrders
    const layer2 = obj.layer2_nationalStandards
    const layer3 = obj.layer3_provincialStandards
    const layer4 = obj.layer4_evaluationIndicators

    if (!Array.isArray(layer1) || !Array.isArray(layer2) || !Array.isArray(layer3) || typeof layer4 !== 'object' || layer4 === null) {
      throw new Error('REFERENCE_SYSTEM_INVALID: 参照系配置格式校验失败')
    }
    if (layer1.length === 0 || layer2.length === 0 || layer3.length === 0) {
      throw new Error('REFERENCE_SYSTEM_INVALID: 参照系配置格式校验失败')
    }

    if (layer1.length !== 22) {
      warnings.push({ type: 'CONFIG_PACK_WARNING', code: 'REFERENCE_ELEMENT_COUNT_MISMATCH', message: `layer1_govOrders 要素数量为 ${layer1.length}，期望 22` })
    }
    if (layer3.length !== 36) {
      warnings.push({ type: 'CONFIG_PACK_WARNING', code: 'REFERENCE_ELEMENT_COUNT_MISMATCH', message: `layer3_provincialStandards 要素数量为 ${layer3.length}，期望 36` })
    }

    const allSourceStrings = JSON.stringify(raw)
    for (const forbidden of FORBIDDEN_STANDARDS) {
      if (allSourceStrings.includes(forbidden)) {
        throw new Error(`REFERENCE_SYSTEM_INVALID: 参照系配置包含禁止标准 ${forbidden}`)
      }
    }

    return { referenceSystem: raw as ReferenceSystem, warnings }
  },
}

export const ConfigPackLoader = {
  load(): ConfigPackLoadResult {
    const warnings: ConfigPackWarning[] = []

    const fromFile = tryLoadFromFilePath(warnings)
    if (fromFile) {
      const refResult = ReferenceSystemLoader.load()
      warnings.push(...refResult.warnings)
      if (refResult.referenceSystem) {
        fromFile.referenceSystem = refResult.referenceSystem
      }
      return { configPack: fromFile, loadSource: 'file', warnings }
    }

    const fromNpm = tryLoadFromNpmPackage(warnings)
    if (fromNpm) {
      const refResult = ReferenceSystemLoader.load()
      warnings.push(...refResult.warnings)
      if (refResult.referenceSystem) {
        fromNpm.referenceSystem = refResult.referenceSystem
      }
      return { configPack: fromNpm, loadSource: 'npm', warnings }
    }

    if (warnings.length > 0) {
      warnings.push({
        type: 'CONFIG_PACK_WARNING',
        code: 'GOV_CONFIG_PACK_FALLBACK',
        message: '配置包加载回退至缺省配置包',
      })
    }

    const fromDefault = tryLoadDefault(warnings)
    const refResult = ReferenceSystemLoader.load()
    warnings.push(...refResult.warnings)
    if (refResult.referenceSystem) {
      fromDefault.referenceSystem = refResult.referenceSystem
    }
    return { configPack: fromDefault, loadSource: 'default', warnings }
  },
}
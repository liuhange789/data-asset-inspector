import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { ConfigPack } from './configPack.js'
import { normalizeConfigPack } from './configPack.js'
import { ConfigPackSchemaValidator } from './configPackSchemaValidator.js'
import type { ConfigPackWarning, LoadSource } from './types.js'
import defaultConfigPack from './default-config-pack.json' with { type: 'json' }

export interface ConfigPackLoadResult {
  configPack: ConfigPack
  loadSource: LoadSource
  warnings: ConfigPackWarning[]
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
      return normalized
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
      return normalized
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
    return normalized
  } catch (e) {
    warnings.push({
      type: 'CONFIG_PACK_WARNING',
      code: 'GOV_CONFIG_PACK_FALLBACK',
      message: `缺省配置包加载失败: ${(e as Error).message}`,
    })
    return defaultConfigPack as unknown as ConfigPack
  }
}

export const ConfigPackLoader = {
  load(): ConfigPackLoadResult {
    const warnings: ConfigPackWarning[] = []

    const fromFile = tryLoadFromFilePath(warnings)
    if (fromFile) {
      return { configPack: fromFile, loadSource: 'file', warnings }
    }

    const fromNpm = tryLoadFromNpmPackage(warnings)
    if (fromNpm) {
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
    return { configPack: fromDefault, loadSource: 'default', warnings }
  },
}
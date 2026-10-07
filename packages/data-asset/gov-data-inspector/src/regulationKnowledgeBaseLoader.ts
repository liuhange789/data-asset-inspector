import { loadJsonConfig } from '@liuhange/dsh-data-asset-shared'
import type { RegulationKnowledgeBase, ConfigPackWarning } from './types.js'
import { RegulationKnowledgeBaseValidator } from './regulationKnowledgeBaseValidator.js'

export interface RegulationKnowledgeBaseLoadResult {
  regulationKnowledgeBase: RegulationKnowledgeBase | null
  degraded: boolean
  degradedReason?: string
  warnings: ConfigPackWarning[]
}

const MAX_FILE_SIZE = 2 * 1024 * 1024

let cached: RegulationKnowledgeBase | null = null
let cachedLoaded = false

export const RegulationKnowledgeBaseLoader = {
  load(): RegulationKnowledgeBaseLoadResult {
    if (cachedLoaded && cached !== null) {
      return { regulationKnowledgeBase: cached, degraded: false, warnings: [] }
    }

    const warnings: ConfigPackWarning[] = []

    let raw: unknown
    try {
      raw = loadJsonConfig(
        'REGULATION_KB_PATH',
        'config/regulation-knowledge-base.json',
        '@liuhange/dsh-gov-data-inspector/regulation-knowledge-base.json',
      )
    } catch {
      warnings.push({ type: 'CONFIG_PACK_WARNING', code: 'REGULATION_KB_MISSING', message: '法规知识库文件加载失败，回退至配置包模式' })
      cachedLoaded = true
      cached = null
      return { regulationKnowledgeBase: null, degraded: true, degradedReason: 'REGULATION_KB_MISSING', warnings }
    }

    try {
      const jsonStr = JSON.stringify(raw)
      if (jsonStr.length > MAX_FILE_SIZE) {
        warnings.push({ type: 'CONFIG_PACK_WARNING', code: 'REGULATION_KB_SIZE_EXCEEDED', message: `法规知识库体积超过2MB（当前${Math.round(jsonStr.length / 1024)}KB），拒绝加载` })
        cachedLoaded = true
        cached = null
        return { regulationKnowledgeBase: null, degraded: true, degradedReason: 'REGULATION_KB_SIZE_EXCEEDED', warnings }
      }
    } catch {
      warnings.push({ type: 'CONFIG_PACK_WARNING', code: 'REGULATION_KB_INVALID', message: '法规知识库序列化失败' })
      cachedLoaded = true
      cached = null
      return { regulationKnowledgeBase: null, degraded: true, degradedReason: 'REGULATION_KB_INVALID', warnings }
    }

    const validation = RegulationKnowledgeBaseValidator.validate(raw)
    if (!validation.valid) {
      const errorSummary = validation.errors.map((e) => `${e.path}: ${e.message}`).join('; ')
      warnings.push({ type: 'CONFIG_PACK_WARNING', code: 'REGULATION_KB_INVALID', message: `法规知识库结构校验失败：${errorSummary}` })
      cachedLoaded = true
      cached = null
      return { regulationKnowledgeBase: null, degraded: true, degradedReason: 'REGULATION_KB_INVALID', warnings }
    }

    cached = raw as RegulationKnowledgeBase
    cachedLoaded = true
    return { regulationKnowledgeBase: cached, degraded: false, warnings }
  },

  isLoaded(): boolean {
    return cachedLoaded && cached !== null
  },

  get(): RegulationKnowledgeBase | null {
    return cached
  },
}
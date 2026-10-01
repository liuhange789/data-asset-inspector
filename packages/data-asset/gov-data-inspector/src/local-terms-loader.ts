import { existsSync } from 'node:fs'
import { loadJsonConfig } from '@liuhange/dsh-data-asset-shared'

export interface LocalTerms {
  materials: string[]
  conditions: string[]
}

const DEFAULT_LOCAL_TERMS_PATH = 'config/local-standard-terms.json'
const SHARED_LOCAL_TERMS_PATH = '@liuhange/dsh-data-asset-shared/config/local-standard-terms.json'

export const LocalTermsLoader = {
  load(configPath?: string, inlineTerms?: { materials: string[]; conditions: string[] }): LocalTerms {
    if (inlineTerms && (inlineTerms.materials.length > 0 || inlineTerms.conditions.length > 0)) {
      return {
        materials: inlineTerms.materials.filter((m): m is string => typeof m === 'string'),
        conditions: inlineTerms.conditions.filter((c): c is string => typeof c === 'string'),
      }
    }

    try {
      if (configPath && !existsSync(configPath)) {
        return { materials: [], conditions: [] }
      }
      const path = configPath ?? DEFAULT_LOCAL_TERMS_PATH
      const raw = loadJsonConfig('LOCAL_TERMS_PATH', path, SHARED_LOCAL_TERMS_PATH)
      const parsed = raw as unknown
      if (typeof parsed !== 'object' || parsed === null) return { materials: [], conditions: [] }
      const obj = parsed as Record<string, unknown>
      const materials = Array.isArray(obj.materials) ? obj.materials.filter((m): m is string => typeof m === 'string') : []
      const conditions = Array.isArray(obj.conditions) ? obj.conditions.filter((c): c is string => typeof c === 'string') : []
      return { materials, conditions }
    } catch {
      return { materials: [], conditions: [] }
    }
  },
}
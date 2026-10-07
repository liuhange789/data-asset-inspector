import type { ExtractedRule, ConfigPackWarning, RegulationKnowledgeBase } from './types.js'

export interface ProvincialConfigLoadResult {
  localAdaptive: ExtractedRule[] | null
  degraded: boolean
  degradedReason?: string
  warnings: ConfigPackWarning[]
}

const provinceCache = new Map<string, ExtractedRule[]>()

export const ProvincialConfigLoader = {
  load(provinceBasis: string, regulationKnowledgeBase?: RegulationKnowledgeBase | null): ProvincialConfigLoadResult {
    if (provinceCache.has(provinceBasis)) {
      return { localAdaptive: provinceCache.get(provinceBasis)!, degraded: false, warnings: [] }
    }

    if (!regulationKnowledgeBase) {
      return {
        localAdaptive: null,
        degraded: true,
        degradedReason: 'PROVINCIAL_CONFIG_MISSING',
        warnings: [{ type: 'CONFIG_PACK_WARNING', code: 'PROVINCIAL_CONFIG_MISSING', message: `法规知识库未加载，无法加载省级配置（${provinceBasis}）` }],
      }
    }

    const provStandards = regulationKnowledgeBase.provincialStandards.filter((s) => s.province === provinceBasis)
    if (provStandards.length === 0) {
      return {
        localAdaptive: null,
        degraded: true,
        degradedReason: 'PROVINCIAL_CONFIG_MISSING',
        warnings: [{ type: 'CONFIG_PACK_WARNING', code: 'PROVINCIAL_CONFIG_MISSING', message: `未找到省份"${provinceBasis}"的省级标准配置` }],
      }
    }

    const localAdaptive: ExtractedRule[] = []
    for (const prov of provStandards) {
      for (const clause of prov.relevantClauses) {
        for (const rule of clause.extractedRules) {
          localAdaptive.push({ ...rule })
        }
      }
    }

    provinceCache.set(provinceBasis, localAdaptive)
    return { localAdaptive, degraded: false, warnings: [] }
  },

  clearCache(): void {
    provinceCache.clear()
  },
}
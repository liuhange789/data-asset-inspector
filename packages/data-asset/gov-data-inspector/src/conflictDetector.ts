import type { ExtractedRule } from './types.js'

export interface ConflictEntry {
  ruleId: string
  coreRule: ExtractedRule
  localRule: ExtractedRule
  reason: string
}

export interface ConflictDetectResult {
  conflicts: ConflictEntry[]
  clean: boolean
}

function rulesConflict(core: ExtractedRule, local: ExtractedRule): boolean {
  if (core.pattern !== local.pattern && local.pattern !== undefined) return true
  if (core.keywords !== undefined && local.keywords !== undefined) {
    if (JSON.stringify(core.keywords) !== JSON.stringify(local.keywords)) return true
  }
  if (core.fieldList !== undefined && local.fieldList !== undefined) {
    if (JSON.stringify(core.fieldList) !== JSON.stringify(local.fieldList)) return true
  }
  return false
}

export const ConflictDetector = {
  detect(coreRules: ExtractedRule[], localAdaptive: ExtractedRule[]): ConflictDetectResult {
    const conflicts: ConflictEntry[] = []

    for (const localRule of localAdaptive) {
      const coreRule = coreRules.find((c) => c.ruleId === localRule.ruleId)
      if (coreRule && rulesConflict(coreRule, localRule)) {
        conflicts.push({
          ruleId: localRule.ruleId,
          coreRule,
          localRule,
          reason: '核心规则不可被地方适配覆盖',
        })
      }
    }

    return { conflicts, clean: conflicts.length === 0 }
  },
}
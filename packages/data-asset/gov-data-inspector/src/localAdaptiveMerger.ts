import type { ExtractedRule, ConfigPackWarning } from './types.js'
import { ConflictDetector } from './conflictDetector.js'

export interface LocalAdaptiveMergeResult {
  mergedRules: ExtractedRule[]
  conflicts: Array<{ ruleId: string; reason: string }>
  warnings: ConfigPackWarning[]
}

export const LocalAdaptiveMerger = {
  merge(coreRules: ExtractedRule[], localAdaptive: ExtractedRule[]): LocalAdaptiveMergeResult {
    const warnings: ConfigPackWarning[] = []
    const conflictResult = ConflictDetector.detect(coreRules, localAdaptive)

    const conflictRuleIds = new Set(conflictResult.conflicts.map((c) => c.ruleId))
    for (const conflict of conflictResult.conflicts) {
      warnings.push({
        type: 'CONFIG_PACK_WARNING',
        code: 'CORE_RULE_CONFLICT',
        message: `地方适配规则 ${conflict.ruleId} 试图覆盖核心规则，已拒绝：${conflict.reason}`,
      })
    }

    const allowedLocal = localAdaptive.filter((r) => !conflictRuleIds.has(r.ruleId))
    const mergedRules = [...coreRules, ...allowedLocal]

    return {
      mergedRules,
      conflicts: conflictResult.conflicts.map((c) => ({ ruleId: c.ruleId, reason: c.reason })),
      warnings,
    }
  },
}
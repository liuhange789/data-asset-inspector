import type { ErrorDetail, StandardRule } from './types.js'
import { ErrorDetailBuilder } from './errorDetailBuilder.js'

function extractTimeLimitDays(timeLimit: unknown): number | null {
  const str = String(timeLimit ?? '')
  const match = str.match(/(\d+)\s*个?\s*工作日/)
  if (!match || !match[1]) return null
  return parseInt(match[1], 10)
}

function ruleSiteInspection(
  guide: Record<string, unknown>,
  guideId: string,
  rule: StandardRule,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  const process = String(guide['办理流程'] ?? '')
  const timeLimit = String(guide['办理时限'] ?? '')
  const triggerKw = rule.triggerKeywords[0]
  if (!triggerKw || !process.includes(triggerKw) || !timeLimit) return []
  const days = extractTimeLimitDays(timeLimit)
  if (days === null) return []
  const threshold = rule.threshold ?? 5
  if (days < threshold) {
    return [
      ErrorDetailBuilder.build(
        {
          guideId,
          field: '办理时限',
          errorType: 'logical',
          description: `办理流程含"${triggerKw}"环节，但办理时限仅为${days}个工作日，少于${threshold}个工作日，存在逻辑矛盾。[条款:${rule.standardClause}]`,
          suggestion: `建议将办理时限调整为不少于${threshold}个工作日，以确保${triggerKw}环节可充分执行`,
          dataSource: 'standard',
          standardClause: rule.standardClause,
        },
        severityMapping,
      ),
    ]
  }
  return []
}

function ruleInstantHandle(
  guide: Record<string, unknown>,
  guideId: string,
  rule: StandardRule,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  const process = String(guide['办理流程'] ?? '')
  const timeLimit = String(guide['办理时限'] ?? '')
  const triggerKw = rule.triggerKeywords[0]
  if (!triggerKw || !process.includes(triggerKw) || !timeLimit) return []
  const days = extractTimeLimitDays(timeLimit)
  if (days === null) return []
  const threshold = rule.threshold ?? 1
  if (days > threshold) {
    return [
      ErrorDetailBuilder.build(
        {
          guideId,
          field: '办理时限',
          errorType: 'logical',
          description: `办理流程含"${triggerKw}"环节，但办理时限为${days}个工作日，与当场办理语义矛盾。[条款:${rule.standardClause}]`,
          suggestion: `建议将办理流程改为非当场办理，或将办理时限调整为${threshold}个工作日以内`,
          dataSource: 'standard',
          standardClause: rule.standardClause,
        },
        severityMapping,
      ),
    ]
  }
  return []
}

function ruleConditionProxy(
  guide: Record<string, unknown>,
  guideId: string,
  rule: StandardRule,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  const condition = String(guide['办理条件'] ?? '')
  const process = String(guide['办理流程'] ?? '')
  if (!condition || !process) return []
  const inPersonKws = rule.triggerKeywords.filter((kw) => kw.includes('本人'))
  const proxyKws = rule.triggerKeywords.filter((kw) => !kw.includes('本人'))
  const requiresInPerson = inPersonKws.some((kw) => condition.includes(kw))
  const allowsProxy = proxyKws.some((kw) => process.includes(kw))
  if (requiresInPerson && allowsProxy) {
    return [
      ErrorDetailBuilder.build(
        {
          guideId,
          field: '办理流程',
          errorType: 'logical',
          description: `办理条件要求"本人到场"，但办理流程允许代办/委托办理，两者存在逻辑矛盾。[条款:${rule.standardClause}]`,
          suggestion: `建议统一办理条件与流程：若确需本人到场则取消代办选项，若允许代办则调整办理条件`,
          dataSource: 'standard',
          standardClause: rule.standardClause,
        },
        severityMapping,
      ),
    ]
  }
  return []
}

function ruleMaterialCondition(
  guide: Record<string, unknown>,
  guideId: string,
  rule: StandardRule,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  const condition = String(guide['办理条件'] ?? '')
  const materialStr = String(guide['申请材料'] ?? '')
  if (!condition || !materialStr) return []
  const proofKeywords = rule.triggerKeywords
  const requiredProofs = proofKeywords.filter((kw) => condition.includes(kw))
  if (requiredProofs.length === 0) return []
  const missingMaterials = requiredProofs.filter((proof) => !materialStr.includes(proof))
  if (missingMaterials.length > 0) {
    return missingMaterials.map((mat) =>
      ErrorDetailBuilder.build(
        {
          guideId,
          field: '申请材料',
          errorType: 'logical',
          description: `办理条件要求"${mat}"，但申请材料清单中未列入该证明材料，条件与材料清单不匹配。[条款:${rule.standardClause}]`,
          suggestion: `建议在申请材料清单中补充"${mat}"，或调整办理条件中对该证明的要求`,
          dataSource: 'standard',
          standardClause: rule.standardClause,
        },
        severityMapping,
      ),
    )
  }
  return []
}

function ruleConditionAgeProxy(
  guide: Record<string, unknown>,
  guideId: string,
  rule: StandardRule,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  const condition = String(guide['办理条件'] ?? '')
  const process = String(guide['办理流程'] ?? '')
  if (!condition || !process) return []
  if (!rule.triggerKeywords || rule.triggerKeywords.length === 0) return []
  const ageKeywords = rule.triggerKeywords.filter((kw) => !kw.includes('代办'))
  const proxyKeywords = rule.triggerKeywords.filter((kw) => kw.includes('代办'))
  if (ageKeywords.length === 0 || proxyKeywords.length === 0) return []
  const ageHit = ageKeywords.some((kw) => condition.includes(kw))
  const proxyHit = proxyKeywords.some((kw) => process.includes(kw))
  if (ageHit && proxyHit) {
    return [
      ErrorDetailBuilder.build(
        {
          guideId,
          field: '办理流程',
          errorType: 'logical',
          description: `办理条件要求年满18周岁，但办理流程允许监护人代办，两者存在逻辑矛盾。[条款:${rule.standardClause}]`,
          suggestion: `建议明确：未成年人由监护人代办，或删除年龄限制`,
          dataSource: 'standard',
          standardClause: rule.standardClause,
        },
        severityMapping,
      ),
    ]
  }
  return []
}

const RULE_DISPATCH: Record<
  string,
  (guide: Record<string, unknown>, guideId: string, rule: StandardRule, severityMapping?: Record<string, string>) => ErrorDetail[]
> = {
  LOG_SITE_INSPECTION_001: ruleSiteInspection,
  LOG_INSTANT_HANDLE_001: ruleInstantHandle,
  LOG_CONDITION_PROXY_001: ruleConditionProxy,
  LOG_MATERIAL_CONDITION_001: ruleMaterialCondition,
  LOG_CONDITION_AGE_PROXY_001: ruleConditionAgeProxy,
}

export const LogicRuleEngine = {
  detect(
    guide: Record<string, unknown>,
    guideId: string,
    rules: StandardRule[],
    severityMapping?: Record<string, string>,
  ): ErrorDetail[] {
    if (!rules || rules.length === 0) {
      throw new Error('GOV_DATA_LOGIC_RULES_MISSING: logicErrorRules配置缺失，逻辑检测已中止')
    }
    const details: ErrorDetail[] = []
    for (const rule of rules) {
      const handler = RULE_DISPATCH[rule.ruleId]
      if (!handler) continue
      const hasAllFields = rule.triggerFields.every((f) => {
        const val = guide[f]
        return val !== undefined && val !== null && (typeof val !== 'string' || val.trim() !== '')
      })
      if (!hasAllFields) continue
      details.push(...handler(guide, guideId, rule, severityMapping))
    }
    return details
  },
}
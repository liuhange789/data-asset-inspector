import type { ErrorDetail, StandardRule } from './types.js'
import { ErrorDetailBuilder } from './errorDetailBuilder.js'

export interface LogicRuleEngineOptions {
  processCoreStepKeywords?: string[]
  processSimplifiedStepAliases?: Record<string, string[]>
  processCoreStepCombinations?: string[][]
  validProcessPhrases?: string[]
}

function isLogicDebug(): boolean {
  return process.env.GOV_LOGIC_DEBUG === '1' || process.env.GOV_LOGIC_DEBUG === 'true'
}

function extractTimeLimitDays(timeLimit: unknown): number | null {
  const str = String(timeLimit ?? '')
  if (/即时|当场/.test(str)) return 0
  const match = str.match(/(\d+(?:\.\d+)?)\s*个?\s*(?:工作日|天|日)/)
  if (!match || !match[1]) return null
  return parseFloat(match[1])
}

function ruleSiteInspection(
  guide: Record<string, unknown>,
  guideId: string,
  rule: StandardRule,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  const debug = isLogicDebug()
  const process = String(guide['办理流程'] ?? '')
  const timeLimit = String(guide['办理时限'] ?? '')
  const triggerKw = rule.triggerKeywords[0]
  if (!triggerKw) {
    if (debug) console.log(`[logic-debug] ruleId=${rule.ruleId} event=eval reason=triggerKeywordMissing`)
    return []
  }
  if (!process.includes(triggerKw)) {
    if (debug) console.log(`[logic-debug] ruleId=${rule.ruleId} event=eval reason=processNotContainTrigger`)
    return []
  }
  if (!timeLimit) {
    if (debug) console.log(`[logic-debug] ruleId=${rule.ruleId} event=eval reason=timeLimitEmpty`)
    return []
  }
  const days = extractTimeLimitDays(timeLimit)
  if (days === null) {
    if (debug) console.log(`[logic-debug] ruleId=${rule.ruleId} event=eval reason=timeParseFail timeLimit=${timeLimit}`)
    return []
  }
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
ruleId: rule.ruleId,
        },
        severityMapping,
      ),
    ]
  }
  if (debug) console.log(`[logic-debug] ruleId=${rule.ruleId} event=eval reason=belowThreshold days=${days} threshold=${threshold}`)
  return []
}

function ruleInstantHandle(
  guide: Record<string, unknown>,
  guideId: string,
  rule: StandardRule,
  severityMapping?: Record<string, string>,
  options?: LogicRuleEngineOptions,
): ErrorDetail[] {
  const debug = isLogicDebug()
  const process = String(guide['办理流程'] ?? '')
  const timeLimit = String(guide['办理时限'] ?? '')
  const triggerKw = rule.triggerKeywords[0]
  if (!triggerKw) {
    if (debug) console.log(`[logic-debug] ruleId=${rule.ruleId} event=eval reason=triggerKeywordMissing`)
    return []
  }
  if (!process.includes(triggerKw)) {
    if (debug) console.log(`[logic-debug] ruleId=${rule.ruleId} event=eval reason=processNotContainTrigger`)
    return []
  }
  if (options?.validProcessPhrases && options.validProcessPhrases.length > 0) {
    const conditionText = String(guide['办理条件'] ?? '')
    const fullText = process + conditionText
    if (options.validProcessPhrases.some((phrase) => fullText.includes(phrase))) return []
  }
  if (!timeLimit) {
    if (debug) console.log(`[logic-debug] ruleId=${rule.ruleId} event=eval reason=timeLimitEmpty`)
    return []
  }
  const days = extractTimeLimitDays(timeLimit)
  if (days === null) {
    if (debug) console.log(`[logic-debug] ruleId=${rule.ruleId} event=eval reason=timeParseFail timeLimit=${timeLimit}`)
    return []
  }
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
ruleId: rule.ruleId,
        },
        severityMapping,
      ),
    ]
  }
  if (debug) console.log(`[logic-debug] ruleId=${rule.ruleId} event=eval reason=withinThreshold days=${days} threshold=${threshold}`)
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
ruleId: rule.ruleId,
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
  const materialRefPhrases = ['申请材料', '提交材料', '材料清单', '材料要求']
  if (materialRefPhrases.some((p) => condition.includes(p)) && materialStr) return []
  const authoritivePhrases = ['暂由各地区自行规定', '按有关规定', '按相关标准', '按相关规定', '按标准执行', '参照执行', '按有关规定执行']
  if (authoritivePhrases.some((p) => condition.includes(p))) return []
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
ruleId: rule.ruleId,
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
  if (!condition) return []
  if (!rule.triggerKeywords || rule.triggerKeywords.length === 0) return []
  const ageKeywords = rule.triggerKeywords.filter((kw) => !kw.includes('代办'))
  const proxyKeywords = rule.anyFieldKeywords ?? rule.triggerKeywords.filter((kw) => kw.includes('代办'))
  if (ageKeywords.length === 0 || proxyKeywords.length === 0) return []
  const ageHit = ageKeywords.some((kw) => condition.includes(kw))
  const guideValues = Object.values(guide).filter((v): v is string => typeof v === 'string')
  const proxyHit = proxyKeywords.some((kw) => guideValues.some((v) => v.includes(kw)))
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
ruleId: rule.ruleId,
        },
        severityMapping,
      ),
    ]
  }
  return []
}

const flowImagePattern = /\.(png|jpg|jpeg|gif|bmp|webp|svg)(\?.*)?$/i
const flowChartPhrases = ['详见流程图', '见下图', '流程图', '见附图', '详见附图', '见图', '见流程图', '点击查看流程图', '扫描二维码查看']

function isImageFlow(process: string): boolean {
  const trimmed = process.trim()
  if (!trimmed) return true
  if (flowImagePattern.test(trimmed)) return true
  if (flowChartPhrases.some((p) => trimmed === p)) return true
  return false
}

function ruleProcessCompleteness(
  guide: Record<string, unknown>,
  guideId: string,
  rule: StandardRule,
  severityMapping?: Record<string, string>,
  options?: LogicRuleEngineOptions,
): ErrorDetail[] {
  const process = String(guide['办理流程'] ?? '')
  if (!process) return []
  if (isImageFlow(process)) return []
  const hasArrow = process.includes('→') || process.includes('->') || process.includes('➡') || process.includes('=>')
  if (hasArrow && options?.processCoreStepKeywords && options.processCoreStepKeywords.length > 0) {
    const aliases = options?.processSimplifiedStepAliases ?? {}
    const allCoreHit = options.processCoreStepKeywords.every((core) => {
      if (process.includes(core)) return true
      const coreAliases = aliases[core]
      if (Array.isArray(coreAliases) && coreAliases.some((a) => process.includes(a))) return true
      return false
    })
    if (allCoreHit) return []
  }
  if (hasArrow && options?.processCoreStepCombinations && options.processCoreStepCombinations.length > 0) {
    const aliases = options?.processSimplifiedStepAliases ?? {}
    const anyCombinationHit = options.processCoreStepCombinations.some((combo) =>
      combo.every((kw) => {
        if (process.includes(kw)) return true
        const kwAliases = aliases[kw]
        if (Array.isArray(kwAliases) && kwAliases.some((a) => process.includes(a))) return true
        return false
      }),
    )
    if (anyCombinationHit) return []
  }
  const requiredSteps = rule.triggerKeywords
  const missingSteps = requiredSteps.filter((kw) => !process.includes(kw))
  if (missingSteps.length > 0) {
    return [
      ErrorDetailBuilder.build(
        {
          guideId,
          field: '办理流程',
          errorType: 'logical',
          description: `办理流程缺失环节：${missingSteps.join('、')}，流程应包含受理/审核/审批/办结/送达五个环节。[条款:${rule.standardClause}]`,
          suggestion: rule.suggestionTemplate,
          dataSource: 'standard',
          standardClause: rule.standardClause,
ruleId: rule.ruleId,
        },
        severityMapping,
      ),
    ]
  }
  return []
}

function ruleSiteVisitCount(
  guide: Record<string, unknown>,
  guideId: string,
  rule: StandardRule,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  const val = guide['到办事现场次数']
  if (val === undefined || val === null) return []
  const strVal = String(val).trim()
  if (!strVal) return []
  const num = parseInt(strVal, 10)
  if (isNaN(num) || num < 0 || !/^\d+$/.test(strVal)) {
    return [
      ErrorDetailBuilder.build(
        {
          guideId,
          field: '到办事现场次数',
          errorType: 'logical',
          description: `到办事现场次数值"${strVal}"不规范，必须为非负整数。[条款:${rule.standardClause}]`,
          suggestion: rule.suggestionTemplate,
          dataSource: 'standard',
          standardClause: rule.standardClause,
ruleId: rule.ruleId,
        },
        severityMapping,
      ),
    ]
  }
  return []
}

function ruleSampleDownload(
  guide: Record<string, unknown>,
  guideId: string,
  rule: StandardRule,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  const details: ErrorDetail[] = []
  const emptyForm = guide['空表下载']
  const sampleForm = guide['样表下载']
  if (emptyForm === undefined || emptyForm === null || String(emptyForm).trim() === '') {
    details.push(
      ErrorDetailBuilder.build(
        {
          guideId,
          field: '空表下载',
          errorType: 'logical',
          description: `事项未提供空表下载服务。[条款:${rule.standardClause}]`,
          suggestion: rule.suggestionTemplate,
          dataSource: 'standard',
          standardClause: rule.standardClause,
ruleId: rule.ruleId,
        },
        severityMapping,
      ),
    )
  }
  if (sampleForm === undefined || sampleForm === null || String(sampleForm).trim() === '') {
    details.push(
      ErrorDetailBuilder.build(
        {
          guideId,
          field: '样表下载',
          errorType: 'logical',
          description: `事项未提供样表下载服务。[条款:${rule.standardClause}]`,
          suggestion: rule.suggestionTemplate,
          dataSource: 'standard',
          standardClause: rule.standardClause,
ruleId: rule.ruleId,
        },
        severityMapping,
      ),
    )
  }
  return details
}

function ruleConditionFieldMisplaced(
  guide: Record<string, unknown>,
  guideId: string,
  rule: StandardRule,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  const condition = String(guide['办理条件'] ?? guide['受理条件'] ?? '')
  if (!condition) return []
  for (const kw of rule.triggerKeywords) {
    if (condition.includes(kw)) {
      return [
        ErrorDetailBuilder.build(
          {
            guideId,
            field: '办理条件',
            errorType: 'logical',
            description: `办理条件字段内容错位：包含材料名称"${kw}"，疑似材料清单误填入条件字段。${rule.standardClause ?? ''}`,
            suggestion: rule.suggestionTemplate,
            dataSource: 'standard',
            standardClause: rule.standardClause,
ruleId: rule.ruleId,
          },
          severityMapping,
        ),
      ]
    }
  }
  return []
}

function ruleProcessTimeLimitInconsistent(
  guide: Record<string, unknown>,
  guideId: string,
  rule: StandardRule,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  const process = String(guide['办理流程'] ?? '')
  const timeLimit = guide['办理时限']
  if (!process || !timeLimit) return []
  if (isLogicDebug()) console.log(`[logic-debug] ruleId=${rule.ruleId} event=call process=${process} timeLimit=${String(timeLimit)}`)
  const stepMatches = process.matchAll(/(\d+(?:\.\d+)?)\s*个?\s*(?:工作日|天)/g)
  let sumDays = 0
  for (const m of stepMatches) {
    if (m[1]) sumDays += parseFloat(m[1])
  }
  const commitDays = extractTimeLimitDays(timeLimit)
  if (commitDays === null) return []
  if (sumDays === 0) {
    if (/\d+\s*个?\s*(?:工作日|天)/.test(process)) return []
    return [
      ErrorDetailBuilder.build(
        {
          guideId,
          field: '办理流程',
          errorType: 'warning',
          description: `流程缺少分步时限描述，无法与承诺办结时限${commitDays}个工作日进行比对。${rule.standardClause ?? ''}`,
          suggestion: '办理流程应补充各环节的工作日时限描述',
          dataSource: 'standard',
          standardClause: rule.standardClause,
ruleId: rule.ruleId,
        },
        severityMapping,
      ),
    ]
  }
  if (sumDays !== commitDays) {
    return [
      ErrorDetailBuilder.build(
        {
          guideId,
          field: '办理时限',
          errorType: 'logical',
          description: `时限不一致：流程步骤时限合计${sumDays}个工作日，承诺办结时限${commitDays}个工作日。${rule.standardClause ?? ''}`,
          suggestion: rule.suggestionTemplate,
          dataSource: 'standard',
          standardClause: rule.standardClause,
ruleId: rule.ruleId,
        },
        severityMapping,
      ),
    ]
  }
  return []
}

function ruleInstantTimeLimitContradiction(
  guide: Record<string, unknown>,
  guideId: string,
  rule: StandardRule,
  severityMapping?: Record<string, string>,
  options?: LogicRuleEngineOptions,
): ErrorDetail[] {
  const process = String(guide['办理流程'] ?? '')
  const timeLimit = guide['办理时限']
  if (!process) return []
  const isInstant = rule.triggerKeywords.some((kw) => process.includes(kw))
  if (!isInstant) return []
  if (options?.validProcessPhrases && options.validProcessPhrases.length > 0) {
    const conditionText = String(guide['办理条件'] ?? '')
    const fullText = process + conditionText
    if (options.validProcessPhrases.some((phrase) => fullText.includes(phrase))) return []
  }
  const days = extractTimeLimitDays(timeLimit)
  if (days === null) return []
  if (days > 1) {
    return [
      ErrorDetailBuilder.build(
        {
          guideId,
          field: '办理时限',
          errorType: 'logical',
          description: `即办件时限矛盾：办理流程含即办标记，但承诺时限为${days}个工作日（应当场办结）。${rule.standardClause ?? ''}`,
          suggestion: rule.suggestionTemplate,
          dataSource: 'standard',
          standardClause: rule.standardClause,
ruleId: rule.ruleId,
        },
        severityMapping,
      ),
    ]
  }
  return []
}

const RULE_DISPATCH: Record<
  string,
  (guide: Record<string, unknown>, guideId: string, rule: StandardRule, severityMapping?: Record<string, string>, options?: LogicRuleEngineOptions) => ErrorDetail[]
> = {
  LOG_SITE_INSPECTION_001: ruleSiteInspection,
  LOG_INSTANT_HANDLE_001: ruleInstantHandle,
  LOG_CONDITION_PROXY_001: ruleConditionProxy,
  LOG_MATERIAL_CONDITION_001: ruleMaterialCondition,
  LOG_CONDITION_AGE_PROXY_001: ruleConditionAgeProxy,
  LOG_PROCESS_COMPLETENESS_001: ruleProcessCompleteness,
  LOG_SITE_VISIT_COUNT_001: ruleSiteVisitCount,
  LOG_SAMPLE_DOWNLOAD_001: ruleSampleDownload,
  LOG_CONDITION_FIELD_MISPLACED_001: ruleConditionFieldMisplaced,
  LOG_PROCESS_TIME_LIMIT_INCONSISTENT_001: ruleProcessTimeLimitInconsistent,
  LOG_INSTANT_TIME_LIMIT_CONTRADICTION_001: ruleInstantTimeLimitContradiction,
}

export const LogicRuleEngine = {
  detect(
    guide: Record<string, unknown>,
    guideId: string,
    rules: StandardRule[],
    severityMapping?: Record<string, string>,
    options?: LogicRuleEngineOptions,
  ): ErrorDetail[] {
    if (!rules || rules.length === 0) {
      throw new Error('GOV_DATA_LOGIC_RULES_MISSING: logicErrorRules配置缺失，逻辑检测已中止')
    }
    const debug = isLogicDebug()
    const details: ErrorDetail[] = []
    for (const rule of rules) {
      const handler = RULE_DISPATCH[rule.ruleId]
      if (!handler) {
        if (debug) console.log(`[logic-debug] ruleId=${rule.ruleId} event=skip reason=handlerNotRegistered`)
        continue
      }
      if (rule.scanMode !== 'anyField') {
        const hasAllFields = rule.triggerFields.every((f) => {
          const val = guide[f]
          return val !== undefined && val !== null && (typeof val !== 'string' || val.trim() !== '')
        })
        if (!hasAllFields) {
          if (debug) {
            const missingFields = rule.triggerFields.filter((f) => {
              const val = guide[f]
              return val === undefined || val === null || (typeof val === 'string' && val.trim() === '')
            })
            console.log(`[logic-debug] ruleId=${rule.ruleId} event=skip reason=fieldMissing fields=${missingFields.join(',')}`)
          }
          continue
        }
      }
      const handlerResults = handler(guide, guideId, rule, severityMapping, options)
      if (debug && handlerResults.length === 0) {
        console.log(`[logic-debug] ruleId=${rule.ruleId} event=eval reason=notTriggered`)
      }
      details.push(...handlerResults)
    }
    return details
  },
}
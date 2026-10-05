import type { ErrorDetail, KnowledgeBase, StandardTimeLimit, StandardMaterial, StandardCondition, ItemTypeMatchResult, UnmatchedWarning, SemanticConflictRules } from './types.js'
import { ErrorDetailBuilder } from './errorDetailBuilder.js'
import { UnmatchedWarningBuilder } from './unmatchedWarningBuilder.js'
import { LocalTermsLoader } from './local-terms-loader.js'


interface ItemTypeMatchingConfig {
  [itemType: string]: { keywords: string[]; codePrefix: string }
}

interface DetectOptions {
  degradedMode?: boolean | undefined
  itemTypeOverride?: string | undefined
  localTermsPath?: string | undefined
  degradedSimilarityThreshold?: number | undefined
  inlineLocalTerms?: { materials: string[]; conditions: string[] } | undefined
  semanticConflictRules?: SemanticConflictRules | undefined
}

export interface SemanticDetectResult {
  details: ErrorDetail[]
  unmatched?: boolean
  warning?: UnmatchedWarning
}

const FLOW_FIELD_KEYS = ['办理流程', '工作流程', '流程描述', '业务流程', '办理环节']

function matchItemType(
  guide: Record<string, unknown>,
  itemTypeMatching: ItemTypeMatchingConfig | undefined,
  options?: { itemTypeOverride?: string | undefined },
): ItemTypeMatchResult {
  const itemName = String(guide['事项名称'] ?? '')
  const itemCode = String(guide['事项编码'] ?? '')
  console.log('[matchItemType] input:', { itemName, itemCode, hasOverride: !!options?.itemTypeOverride, hasConfig: !!itemTypeMatching })

  if (options?.itemTypeOverride) {
    console.log('[matchItemType] matchSource=manual, itemType=', options.itemTypeOverride)
    return { itemType: options.itemTypeOverride, matchSource: 'manual' }
  }

  if (!itemTypeMatching) {
    console.log('[matchItemType] no match: itemTypeMatching config missing')
    return { itemType: null, matchSource: null }
  }

  for (const [itemType, rule] of Object.entries(itemTypeMatching)) {
    if (rule.keywords.some((kw) => itemName.includes(kw))) {
      console.log('[matchItemType] matchSource=name, itemType=', itemType)
      return { itemType, matchSource: 'name' }
    }
  }

  for (const [itemType, rule] of Object.entries(itemTypeMatching)) {
    if (itemCode && itemCode.startsWith(rule.codePrefix)) {
      console.log('[matchItemType] matchSource=code, itemType=', itemType)
      return { itemType, matchSource: 'code' }
    }
  }

  for (const flowKey of FLOW_FIELD_KEYS) {
    const flowText = String(guide[flowKey] ?? '')
    if (!flowText) continue
    for (const [itemType, rule] of Object.entries(itemTypeMatching)) {
      if (rule.keywords.some((kw) => flowText.includes(kw))) {
        console.log('[matchItemType] matchSource=flow, itemType=', itemType)
        return { itemType, matchSource: 'flow' }
      }
    }
  }

  console.log('[matchItemType] no match: no keyword/codePrefix hit')
  return { itemType: null, matchSource: null }
}

function extractTimeLimitDays(timeLimit: unknown): number | null {
  const str = String(timeLimit ?? '')
  const match = str.match(/(\d+)\s*个?\s*工作日/)
  if (!match || !match[1]) return null
  return parseInt(match[1], 10)
}

function detectTimeLimit(
  guide: Record<string, unknown>,
  guideId: string,
  itemType: string,
  kb: KnowledgeBase,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  const timeLimitStr = String(guide['办理时限'] ?? '')
  const days = extractTimeLimitDays(timeLimitStr)
  if (days === null) return []
  const stdEntry = kb.timeLimits.find((t: StandardTimeLimit) => t.itemType === itemType)
  if (!stdEntry) return []
  if (days > stdEntry.legalUpperLimit) {
    return [
      ErrorDetailBuilder.build(
        {
          guideId,
          field: '办理时限',
          errorType: 'semantic',
          description: `办理时限"${timeLimitStr}"（${days}个工作日）超出法定上限${stdEntry.legalUpperLimit}个工作日。[数据源:${stdEntry.dataSource},条款:${stdEntry.standardClause}]`,
          suggestion: `建议将办理时限调整为不超过${stdEntry.legalUpperLimit}个工作日，法定下限为${stdEntry.legalLowerLimit}个工作日`,
          dataSource: stdEntry.dataSource,
          standardClause: stdEntry.standardClause,
        },
        severityMapping,
      ),
    ]
  }
  return []
}

function detectMaterials(
  guide: Record<string, unknown>,
  guideId: string,
  itemType: string,
  kb: KnowledgeBase,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  const materialStr = String(guide['申请材料'] ?? '')
  if (!materialStr) return []
  const materials = materialStr.split(/[、,，;；\n]/).map((s) => s.trim()).filter(Boolean)
  const stdMaterials = kb.materials.filter((m: StandardMaterial) => m.itemType === itemType)
  if (stdMaterials.length === 0) return []
  const details: ErrorDetail[] = []
  for (const mat of materials) {
    const matched = stdMaterials.some((std: StandardMaterial) => {
      const stdName = std.standardName
      return mat === stdName || mat.includes(stdName) || stdName.includes(mat) || levenshteinSimilarity(mat, stdName) >= 0.95
    })
    if (!matched) {
      const closest = findClosestMaterial(mat, stdMaterials)
      details.push(
        ErrorDetailBuilder.build(
          {
            guideId,
            field: '申请材料',
            errorType: 'semantic',
            description: `申请材料"${mat}"与标准材料清单不匹配。标准材料清单中该事项类型应包含：${stdMaterials.map((m) => m.standardName).join('、')}。[数据源:${closest?.dataSource ?? 'unknown'},条款:${closest?.standardClause ?? 'unknown'}]`,
            suggestion: closest
              ? `建议将"${mat}"修改为标准名称"${closest.standardName}"。${closest.basisClause}`
              : `建议核实"${mat}"是否为该事项标准材料，或补充至标准材料清单`,
            dataSource: closest?.dataSource,
            standardClause: closest?.standardClause,
          },
          severityMapping,
        ),
      )
    }
  }
  return details
}

function levenshteinSimilarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  const dist = levenshtein(a, b)
  return 1 - dist / maxLen
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) {
    const row = dp[i]!
    row[0] = i
  }
  for (let j = 0; j <= n; j++) {
    dp[0]![j] = j
  }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const prevRow = dp[i - 1]!
      const currRow = dp[i]!
      if (a[i - 1] === b[j - 1]) currRow[j] = prevRow[j - 1]!
      else currRow[j] = Math.min(prevRow[j]!, currRow[j - 1]!, prevRow[j - 1]!) + 1
    }
  }
  return dp[m]![n]!
}

function findClosestMaterial(
  mat: string,
  stdMaterials: StandardMaterial[],
): StandardMaterial | null {
  let best: StandardMaterial | null = null
  let bestSim = 0
  for (const std of stdMaterials) {
    const sim = levenshteinSimilarity(mat, std.standardName)
    if (sim > bestSim) {
      bestSim = sim
      best = std
    }
  }
  return best
}

function detectConditions(
  guide: Record<string, unknown>,
  guideId: string,
  itemType: string,
  kb: KnowledgeBase,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  const conditionStr = String(guide['办理条件'] ?? '')
  if (!conditionStr) return []
  const stdConditions = kb.conditions.filter((c: StandardCondition) => c.itemType === itemType)
  if (stdConditions.length === 0) return []
  const details: ErrorDetail[] = []
  for (const std of stdConditions) {
    if (!conditionStr.includes(std.elementName) && !conditionStr.includes(std.standardValue)) {
      details.push(
        ErrorDetailBuilder.build(
          {
            guideId,
            field: '办理条件',
            errorType: 'semantic',
            description: `办理条件中缺失标准要素"${std.elementName}"，标准值应为"${std.standardValue}"。[数据源:${std.dataSource},条款:${std.standardClause}]`,
            suggestion: `建议在办理条件中补充"${std.elementName}"要求，标准值为"${std.standardValue}"`,
            dataSource: std.dataSource,
            standardClause: std.standardClause,
          },
          severityMapping,
        ),
      )
    }
  }
  return details
}

function checkConditionProcessConflict(
  guide: Record<string, unknown>,
  guideId: string,
  rules: SemanticConflictRules,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  const condition = String(guide['办理条件'] ?? '')
  if (!condition) return []
  const ageHit = rules.ageKeywords.some((kw) => condition.includes(kw))
  if (!ageHit) return []
  const guideValues = Object.values(guide).filter((v): v is string => typeof v === 'string')
  const proxyHit = rules.proxyKeywords.some((kw) => guideValues.some((v) => v.includes(kw)))
  if (proxyHit) {
    return [
      ErrorDetailBuilder.build(
        {
          guideId,
          field: '办理条件',
          errorType: 'logical',
          description: `办理条件含年龄限制，但指南中存在代办表述，存在逻辑矛盾。[语义矛盾检测]`,
          suggestion: `建议明确：未成年人由监护人代办，或删除年龄限制`,
          dataSource: 'standard',
          standardClause: '语义矛盾检测·条件流程冲突',
        },
        severityMapping,
      ),
    ]
  }
  return []
}

function checkMaterialConditionConflict(
  guide: Record<string, unknown>,
  guideId: string,
  rules: SemanticConflictRules,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  const condition = String(guide['办理条件'] ?? '')
  const materialStr = String(guide['申请材料'] ?? '')
  if (!condition || !materialStr) return []
  const requiredProofs = rules.proofKeywords.filter((kw) => condition.includes(kw))
  if (requiredProofs.length === 0) return []
  const missingMaterials = requiredProofs.filter((proof) => !materialStr.includes(proof))
  if (missingMaterials.length > 0) {
    return missingMaterials.map((mat) =>
      ErrorDetailBuilder.build(
        {
          guideId,
          field: '申请材料',
          errorType: 'semantic',
          description: `办理条件要求"${mat}"，但申请材料清单中未列入该证明材料，条件与材料清单不匹配。[语义矛盾检测]`,
          suggestion: `建议在申请材料清单中补充"${mat}"，或调整办理条件中对该证明的要求`,
          dataSource: 'standard',
          standardClause: '语义矛盾检测·材料条件冲突',
        },
        severityMapping,
      ),
    )
  }
  return []
}

function checkTimeProcessConflict(
  guide: Record<string, unknown>,
  guideId: string,
  rules: SemanticConflictRules,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  const process = String(guide['办理流程'] ?? '')
  const timeLimitStr = String(guide['办理时限'] ?? '')
  if (!process || !timeLimitStr) return []
  const days = extractTimeLimitDays(timeLimitStr)
  if (days === null) return []
  const details: ErrorDetail[] = []
  if (process.includes('现场勘查') && days < rules.siteInspectionThreshold) {
    details.push(
      ErrorDetailBuilder.build(
        {
          guideId,
          field: '办理时限',
          errorType: 'semantic',
          description: `办理流程含"现场勘查"环节，但办理时限仅为${days}个工作日，少于${rules.siteInspectionThreshold}个工作日，存在语义矛盾。[语义矛盾检测]`,
          suggestion: `建议将办理时限调整为不少于${rules.siteInspectionThreshold}个工作日`,
          dataSource: 'standard',
          standardClause: '语义矛盾检测·时限流程冲突',
        },
        severityMapping,
      ),
    )
  }
  if (process.includes('当场办理') && days > rules.instantHandleThreshold) {
    details.push(
      ErrorDetailBuilder.build(
        {
          guideId,
          field: '办理时限',
          errorType: 'semantic',
          description: `办理流程含"当场办理"环节，但办理时限为${days}个工作日，与当场办理语义矛盾。[语义矛盾检测]`,
          suggestion: `建议将办理流程改为非当场办理，或将办理时限调整为${rules.instantHandleThreshold}个工作日以内`,
          dataSource: 'standard',
          standardClause: '语义矛盾检测·时限流程冲突',
        },
        severityMapping,
      ),
    )
  }
  return details
}

function checkConditionCompleteness(
  guide: Record<string, unknown>,
  guideId: string,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  const condition = String(guide['办理条件'] ?? '').trim()
  if (!condition) return []
  if (condition.length < 10 || condition === '无' || condition === '无要求') {
    return [
      ErrorDetailBuilder.build(
        {
          guideId,
          field: '办理条件',
          errorType: 'semantic',
          description: `办理条件描述过于简略（"${condition}"），无法有效指导申请人。[结构完整性校验]`,
          suggestion: `建议补充具体的办理条件描述，明确申请人需满足的资格、条件等要求`,
          dataSource: 'standard',
          standardClause: '结构完整性校验·条件描述简略',
        },
        severityMapping,
      ),
    ]
  }
  return []
}

function checkMaterialCompleteness(
  guide: Record<string, unknown>,
  guideId: string,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  const material = String(guide['申请材料'] ?? '').trim()
  if (!material) return []
  const hasPunctuation = /[、,，;；]/.test(material)
  if (!hasPunctuation && material.length < 15) {
    return [
      ErrorDetailBuilder.build(
        {
          guideId,
          field: '申请材料',
          errorType: 'semantic',
          description: `申请材料清单可能不完整（"${material}"），材料清单通常应包含多项材料并以标点分隔。[结构完整性校验]`,
          suggestion: `建议补充完整的申请材料清单，使用顿号、逗号等标点分隔各项材料`,
          dataSource: 'standard',
          standardClause: '结构完整性校验·材料清单不完整',
        },
        severityMapping,
      ),
    ]
  }
  return []
}

function isSubstringIdentical(item: string, term: string): boolean {
  if (!item || !term) return false
  return term.includes(item) || item.includes(term)
}

function normalizeOnlineDepthValue(raw: string): string {
  return raw.replace(/（[^（）]*）/g, '').replace(/\([^()]*\)/g, '').trim()
}

function checkOnlineDepthValidity(
  guide: Record<string, unknown>,
  guideId: string,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  const depth = String(guide['网上办理深度'] ?? '').trim()
  if (!depth) return []
  const normalized = normalizeOnlineDepthValue(depth)
  if (!normalized) return []
  const validValues = ['全程网办', '部分网办', '网上预审', '现场办理', '不见面审批']
  if (!validValues.includes(normalized)) {
    return [
      ErrorDetailBuilder.build(
        {
          guideId,
          field: '网上办理深度',
          errorType: 'semantic',
          description: `网上办理深度值"${depth}"不规范，应为以下枚举值之一：全程网办、部分网办、网上预审、现场办理、不见面审批。[结构完整性校验]`,
          suggestion: `建议将网上办理深度修改为标准枚举值之一`,
          dataSource: 'standard',
          standardClause: '结构完整性校验·网办深度不规范',
        },
        severityMapping,
      ),
    ]
  }
  return []
}

function matchAndReport(
  item: string,
  terms: string[],
  threshold: number,
  field: '申请材料' | '办理条件',
  guideId: string,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  if (terms.length === 0) return []
  if (terms.some((t) => isSubstringIdentical(item, t))) return []
  let maxSim = 0
  let closestTerm = ''
  for (const term of terms) {
    const sim = levenshteinSimilarity(item, term)
    if (sim > maxSim) {
      maxSim = sim
      closestTerm = term
    }
  }
  if (item === closestTerm) return []

  if (maxSim >= 0.99) return []
  if (maxSim >= threshold) {
    return [
      ErrorDetailBuilder.build(
        {
          guideId,
          field,
          errorType: 'semantic',
          description: `${field}"${item}"与标准词表存在差异，疑似错误。[降级模式·本地词表校验]`,
          suggestion: `建议核实"${item}"是否为标准${field}名称`,
          dataSource: 'standard',
          standardClause: '降级模式·本地词表校验',
        },
        severityMapping,
      ),
    ]
  }
  if (maxSim === 0) {
    return [
      ErrorDetailBuilder.build(
        {
          guideId,
          field,
          errorType: 'semantic',
          description: `${field}"${item}"与本地词表无任何匹配，疑似错误。[降级模式·本地词表校验]`,
          suggestion: `建议核实"${item}"是否为标准${field}名称`,
          dataSource: 'standard',
          standardClause: '降级模式·本地词表校验',
        },
        severityMapping,
      ),
    ]
  }
  return [
    ErrorDetailBuilder.build(
      {
        guideId,
        field,
        errorType: 'semantic',
        description: `${field}"${item}"与本地词表匹配度极低（相似度${maxSim.toFixed(2)}），疑似错误。[降级模式·本地词表校验]`,
        suggestion: `建议核实"${item}"是否为标准${field}名称`,
        dataSource: 'standard',
        standardClause: '降级模式·本地词表校验',
      },
      severityMapping,
    ),
  ]
}

function detectApproximateSubstring(
  cond: string,
  terms: string[],
  guideId: string,
  severityMapping?: Record<string, string>,
): ErrorDetail | null {
  if (terms.length === 0 || !cond) return null
  if (terms.some((t) => cond.includes(t))) return null
  for (const term of terms) {
    if (cond.length < term.length) continue
    for (let i = 0; i <= cond.length - term.length; i++) {
      const w = cond.substring(i, i + term.length)
      if (w === term) continue
      if (levenshtein(w, term) <= 2) {
        return ErrorDetailBuilder.build(
          {
            guideId,
            field: '办理条件',
            errorType: 'semantic',
            description: `办理条件段中"${w}"与标准表述"${term}"高度相似，可能存在笔误。[降级模式·本地词表校验]`,
            suggestion: `建议将"${w}"修改为标准表述"${term}"`,
            dataSource: 'standard',
            standardClause: '降级模式·本地词表校验',
          },
          severityMapping,
        )
      }
    }
  }
  return null
}

function splitMultiContent(value: string): string[] {
  if (!value || !value.trim()) return []
  const trimmed = value.trim()
  const numberedRegex = /[一二三四五六七八九十]+\s*[、.．]|[\d]+\s*[.、．]/
  const sepRegex = /[；;，,、\n。且并和与]/
  if (numberedRegex.test(trimmed)) {
    const parts = trimmed.split(numberedRegex)
    return parts
      .map((s) => s.trim().replace(/^[；;，,、\n。且并和与]+|[；;，,、\n。且并和与]+$/g, '').trim())
      .filter((s) => s.length > 0)
  }
  return trimmed.split(sepRegex).map((s) => s.trim()).filter(Boolean)
}

function detectLocalTermsMismatch(
  guide: Record<string, unknown>,
  guideId: string,
  options: DetectOptions,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  const localTerms = LocalTermsLoader.load(options.localTermsPath, options.inlineLocalTerms)
  if (localTerms.materials.length === 0 && localTerms.conditions.length === 0) {
    return []
  }
  const threshold = options.degradedSimilarityThreshold ?? 0.80
  const details: ErrorDetail[] = []
  const materialStr = String(guide['申请材料'] ?? '')
  if (materialStr && localTerms.materials.length > 0) {
    const materials = splitMultiContent(materialStr)
    for (const mat of materials) {
      details.push(...matchAndReport(mat, localTerms.materials, threshold, '申请材料', guideId, severityMapping))
    }
  }
  details.push(...detectConditionTermsMismatch(guide, guideId, options, severityMapping))
  return details
}

function detectConditionTermsMismatch(
  guide: Record<string, unknown>,
  guideId: string,
  options: DetectOptions,
  severityMapping?: Record<string, string>,
): ErrorDetail[] {
  const localTerms = LocalTermsLoader.load(options.localTermsPath, options.inlineLocalTerms)
  if (localTerms.conditions.length === 0) return []
  const threshold = options.degradedSimilarityThreshold ?? 0.80
  const conditionStr = String(guide['办理条件'] ?? '')
  if (!conditionStr) return []
  const details: ErrorDetail[] = []
  const condParts = splitMultiContent(conditionStr)
  for (const cond of condParts) {
    const condDetails = matchAndReport(cond, localTerms.conditions, threshold, '办理条件', guideId, severityMapping)
    details.push(...condDetails)
    if (condDetails.length === 0) {
      const sub = detectApproximateSubstring(cond, localTerms.conditions, guideId, severityMapping)
      if (sub) details.push(sub)
    }
  }
  return details
}


function deduplicateErrors(errors: ErrorDetail[]): ErrorDetail[] {
  const logicalKeys = new Set(errors.filter((e) => e.errorType === 'logical').map((e) => `${e.field}:${e.standardClause ?? ''}`))
  return errors.filter((e) => !(e.errorType === 'semantic' && logicalKeys.has(`${e.field}:${e.standardClause ?? ''}`)))
}

export const SemanticRuleEngine = {
  detect(
    guide: Record<string, unknown>,
    guideId: string,
    kb: KnowledgeBase,
    itemTypeMatching: ItemTypeMatchingConfig | undefined,
    severityMapping?: Record<string, string>,
    options?: DetectOptions,
  ): SemanticDetectResult {
    const matchResult = matchItemType(guide, itemTypeMatching, options)
    const itemType = matchResult.itemType

    if (!itemType) {
      const conflictDetails: ErrorDetail[] = []
      if (options?.semanticConflictRules) {
        conflictDetails.push(...checkConditionProcessConflict(guide, guideId, options.semanticConflictRules, severityMapping))
        conflictDetails.push(...checkMaterialConditionConflict(guide, guideId, options.semanticConflictRules, severityMapping))
        conflictDetails.push(...checkTimeProcessConflict(guide, guideId, options.semanticConflictRules, severityMapping))
      }
      const conditionTermDetails = detectConditionTermsMismatch(guide, guideId, options ?? {}, severityMapping)
      const warning = UnmatchedWarningBuilder.build(guideId)
      return { details: deduplicateErrors([...conflictDetails, ...conditionTermDetails]), unmatched: true, warning }
    }

    const isKbMissing = !kb || !kb.timeLimits || !kb.materials || !kb.conditions
    const hasKbData = !isKbMissing && (kb.timeLimits.length > 0 || kb.materials.length > 0 || kb.conditions.length > 0)

    if ((isKbMissing || !hasKbData) && options?.degradedMode) {
      const conflictDetails: ErrorDetail[] = []
      if (options?.semanticConflictRules) {
        conflictDetails.push(...checkConditionProcessConflict(guide, guideId, options.semanticConflictRules, severityMapping))
        conflictDetails.push(...checkMaterialConditionConflict(guide, guideId, options.semanticConflictRules, severityMapping))
        conflictDetails.push(...checkTimeProcessConflict(guide, guideId, options.semanticConflictRules, severityMapping))
      }
      const structuralDetails: ErrorDetail[] = []
      structuralDetails.push(...checkConditionCompleteness(guide, guideId, severityMapping))
      structuralDetails.push(...checkMaterialCompleteness(guide, guideId, severityMapping))
      structuralDetails.push(...checkOnlineDepthValidity(guide, guideId, severityMapping))
      const localTermsDetails = detectLocalTermsMismatch(guide, guideId, options, severityMapping)
      return { details: deduplicateErrors([...conflictDetails, ...structuralDetails, ...localTermsDetails]) }
    }

    if (isKbMissing) {
      throw new Error('GOV_DATA_KB_MISSING: 标准知识库不可用，语义错误检测已中止')
    }

    const conflictDetails: ErrorDetail[] = []
    if (options?.semanticConflictRules) {
      conflictDetails.push(...checkConditionProcessConflict(guide, guideId, options.semanticConflictRules, severityMapping))
      conflictDetails.push(...checkMaterialConditionConflict(guide, guideId, options.semanticConflictRules, severityMapping))
      conflictDetails.push(...checkTimeProcessConflict(guide, guideId, options.semanticConflictRules, severityMapping))
    }
    const details: ErrorDetail[] = []
    details.push(...detectTimeLimit(guide, guideId, itemType, kb, severityMapping))
    details.push(...detectMaterials(guide, guideId, itemType, kb, severityMapping))
    details.push(...detectConditions(guide, guideId, itemType, kb, severityMapping))
    details.push(...detectConditionTermsMismatch(guide, guideId, options ?? {}, severityMapping))
    return { details: deduplicateErrors([...conflictDetails, ...details]) }
  },

  matchItemType,
  extractTimeLimitDays,
}
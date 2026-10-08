import type { ErrorDetail } from './types.js'
import { ErrorDetailBuilder } from './errorDetailBuilder.js'

export interface MissingFieldDetectorOptions {
  fieldResidueValues?: string[]
}

function isPlaceholderMatch(val: string, placeholderValues: string[]): boolean {
  const trimmed = val.trim()
  if (placeholderValues.includes(trimmed)) return true
  for (const p of placeholderValues) {
    if (!p) continue
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(^|[;；,，、\\s])${escaped}([;；,，、\\s]|$)`, 'u')
    if (re.test(trimmed)) return true
  }
  return false
}

function isMissing(val: unknown, placeholderValues: string[]): boolean {
  return val === undefined || val === null ||
    (typeof val === 'string' && val.trim() === '') ||
    (Array.isArray(val) && val.length === 0) ||
    (typeof val === 'string' && isPlaceholderMatch(val, placeholderValues))
}

const INVALID_CONTENT_TEMPLATES = new Set([
  '符合条件', '符合要求', '按规定执行', '按相关要求',
  '详见', '另见', '参见', '附后',
  '其他', '其它', '相关材料', '相关证明',
  '符合', '合格', '达标', '同意', '通过', '正常', '有效', '可行',
  '适当', '相关', '视情况', '酌情', '妥当', '可以', '可行',
  '满足条件', '满足要求', '按标准执行', '参照执行', '依规执行',
  '按规定', '按要求', '依规定', '照规定', '按规范', '依规范', '照规范',
  '按法规', '依法规', '照法规', '按照规定', '依照规定', '按照要求', '依照要求',
  '符合规定', '符合规范', '符合标准', '视相关规定', '按相关规定', '参照相关规定',
  '满足规定', '满足规范', '满足标准', '执行规定', '执行标准', '执行规范',
  '视情', '待定', '待确认', '待核实', '待确定', '另行通知', '另行规定',
  '参照办理', '参照执行', '参照管理', '参照管理', '参照标准',
])

const SUBSTANTIVE_WORDS = [
  '办理', '申请', '提交', '审核', '许可', '登记', '备案', '审批', '受理',
  '送达', '邮寄', '下载', '网上', '网办', '现场', '窗口', '具备', '拥有', '符合', '提供',
  '证书', '报告', '工作日', '电话', '地址', '街道', '收费', '免费', '时间',
  '深度', '全程', '原件', '复印件', '身份', '营业', '法人', '预约', '支付',
  '快递', '物流', '监督', '监管', '市场', '服务', '中心', '大厅', '执照',
  '证明', '材料', '流程', '条件', '时限', '地点', '标准', '方式', '发证',
  '审查', '核查', '验收', '认定', '认证', '批准', '注册', '签字', '盖章',
]

const COMMON_REQUIRED_FIELDS = ['事项名称', '实施主体', '办理条件', '申请材料', '办理流程', '办理时限', '办理地点', '咨询电话', '监督电话'] as const

export const REQUIRED_FIELDS_BY_ITEM_TYPE: Record<string, string[]> = {
  '行政许可': ['事项名称', '实施主体', '办理条件', '申请材料', '办理流程', '办理时限', '收费标准', '办理地点', '咨询电话', '监督电话', '办理时间', '网上办理深度', '结果送达方式', '表格下载'],
  '行政确认': ['事项名称', '实施主体', '办理条件', '申请材料', '办理流程', '办理时限', '办理地点', '咨询电话', '监督电话', '办理时间'],
  '行政给付': ['事项名称', '实施主体', '办理条件', '申请材料', '办理流程', '办理时限', '办理地点', '咨询电话', '监督电话'],
  '其他': ['事项名称', '实施主体', '办理条件', '申请材料', '办理流程', '办理时限', '收费标准', '办理地点', '咨询电话', '监督电话', '办理时间', '网上办理深度', '结果送达方式', '表格下载'],
}

function getRequiredFieldsByItemType(itemType: string | null): string[] {
  if (itemType && REQUIRED_FIELDS_BY_ITEM_TYPE[itemType]) {
    return [...REQUIRED_FIELDS_BY_ITEM_TYPE[itemType]!]
  }
  return [...COMMON_REQUIRED_FIELDS]
}

function isInvalidContent(val: unknown): string | null {
  if (typeof val !== 'string') return null
  const trimmed = val.trim()
  if (trimmed.length === 0) return null
  if (trimmed.length < 2) return '内容过于简略，无法指导办事'
  if (trimmed.replace(/[^\p{L}\p{N}]/gu, '').length === 0) return '内容仅含标点符号，无有效信息'

  const hasSubstantiveContent = SUBSTANTIVE_WORDS.some((w) => trimmed.includes(w))
  const hasNumberedItems = /[一二三四五六七八九十]+\s*[、.．]|[\d]+\s*[.、．]/.test(trimmed)
  const separatedItems = trimmed.split(/[；;，,、\n]/).filter((s) => s.trim().length > 0)
  const hasMultipleItems = separatedItems.length > 1

  if (trimmed.length > 10 && (hasNumberedItems || (hasMultipleItems && hasSubstantiveContent))) {
    return null
  }

  if (INVALID_CONTENT_TEMPLATES.has(trimmed)) return '内容为无效模板语，无实质信息'
  if (trimmed.length < 4 && !hasSubstantiveContent) {
    return '内容缺乏实质性动词或名词，无法指导办事'
  }
  return null
}

export const MissingFieldDetector = {
  detect(
    guide: Record<string, unknown>,
    guideId: string,
    requiredElements: string[],
    severityMapping?: Record<string, string>,
    policyBasisText?: string,
    standardClause?: string,
    options?: MissingFieldDetectorOptions,
  ): ErrorDetail[] {

    if (!requiredElements || requiredElements.length === 0) {
      throw new Error('GOV_DATA_RULES_MISSING: guideRequiredElements配置缺失，无法执行漏项检测')
    }
    const basisText = policyBasisText ?? '办事指南应包含完整核心要素'
    const placeholderValues = options?.fieldResidueValues ?? []
    const details: ErrorDetail[] = []
    for (const elem of requiredElements) {
      const val = guide[elem]
      if (isMissing(val, placeholderValues)) {
        details.push(
          ErrorDetailBuilder.build(
            {
              guideId,
              field: elem,
              errorType: 'missing',
              description: `办事指南"${guideId}"缺失必填字段"${elem}"，该字段为办事指南核心要素，缺失将影响办事指南可用性`,
              suggestion: `请补充"${elem}"字段内容，确保办事指南核心要素完整。${basisText}`,
              dataSource: 'standard',
              standardClause: standardClause ?? '',
              ruleId: `MISSING-${elem}`,
            },
            severityMapping,
          ),
        )
      } else {
        const invalidReason = isInvalidContent(val)
        if (invalidReason) {
          details.push(
            ErrorDetailBuilder.build(
              {
                guideId,
                field: elem,
                errorType: 'missing',
                description: `办事指南"${guideId}"字段"${elem}"${invalidReason}，该字段为办事指南核心要素`,
                suggestion: `请补充"${elem}"字段的有效内容。${basisText}`,
                dataSource: 'standard',
                standardClause: standardClause ?? '',
                ruleId: `MISSING-${elem}`,
              },
              severityMapping,
            ),
          )
        }
      }
    }
    return details
  },

  checkFieldOverlap(core: string[], extended: string[]): string[] {
    const coreSet = new Set(core)
    return extended.filter((f) => coreSet.has(f))
  },

  COMMON_REQUIRED_FIELDS,
  REQUIRED_FIELDS_BY_ITEM_TYPE,
  getRequiredFieldsByItemType,

  detectGraded(
    guide: Record<string, unknown>,
    guideId: string,
    coreRequiredFields: string[],
    extendedRequiredFields: string[],
    severityMapping?: Record<string, string>,
    policyBasisText?: string,
    standardClause?: string,
    itemType?: string,
    options?: MissingFieldDetectorOptions,
  ): { coreDetails: ErrorDetail[]; extendedDetails: ErrorDetail[] } {

    if (!coreRequiredFields || coreRequiredFields.length === 0) {
      throw new Error('GOV_DATA_RULES_MISSING: coreRequiredFields配置缺失，无法执行分级漏项检测')
    }
    const basisText = policyBasisText ?? '办事指南应包含完整核心要素'
    const stdClause = standardClause ?? ''
    const placeholderValues = options?.fieldResidueValues ?? []
    const coreDetails: ErrorDetail[] = []
    const extendedDetails: ErrorDetail[] = []

    const requiredFields = itemType && REQUIRED_FIELDS_BY_ITEM_TYPE[itemType]
      ? new Set(REQUIRED_FIELDS_BY_ITEM_TYPE[itemType]!)
      : new Set(COMMON_REQUIRED_FIELDS)




    const processRequiredField = (elem: string) => {
      const val = guide[elem]
      if (isMissing(val, placeholderValues)) {
        coreDetails.push(
          ErrorDetailBuilder.build(
            {
              guideId,
              field: elem,
              errorType: 'missing',
              description: `办事指南"${guideId}"缺失核心要素字段"${elem}"，该字段为办事指南核心要素，缺失将影响办事指南可用性`,
              suggestion: `请补充"${elem}"字段内容，确保办事指南核心要素完整。${basisText}`,
              dataSource: 'standard',
              standardClause: stdClause,
              ruleId: `MISSING-${elem}`,
            },
            severityMapping,
          ),
        )
      } else {
        const invalidReason = isInvalidContent(val)
        if (invalidReason) {
          coreDetails.push(
            ErrorDetailBuilder.build(
              {
                guideId,
                field: elem,
                errorType: 'missing',
                description: `办事指南"${guideId}"字段"${elem}"${invalidReason}，该字段为办事指南核心要素`,
                suggestion: `请补充"${elem}"字段的有效内容。${basisText}`,
                dataSource: 'standard',
                standardClause: stdClause,
                ruleId: `MISSING-${elem}`,
              },
              severityMapping,
            ),
          )
        }
      }
    }

    const processOptionalField = (elem: string) => {
      const val = guide[elem]
      if (isMissing(val, placeholderValues)) {
        extendedDetails.push(
          ErrorDetailBuilder.build(
            {
              guideId,
              field: elem,
              errorType: 'warning',
              description: `办事指南"${guideId}"缺失扩展要素字段"${elem}"，建议补充以提升服务完整性`,
              suggestion: `建议补充"${elem}"字段内容，提升办事指南服务完善性`,
              dataSource: 'standard',
              standardClause: '扩展要素·服务完善性建议',
            },
            severityMapping,
          ),
        )
      }
    }

    for (const elem of coreRequiredFields) {
      processRequiredField(elem)
    }

    if (!extendedRequiredFields || extendedRequiredFields.length === 0) {
      return { coreDetails, extendedDetails }
    }
    const overlap = this.checkFieldOverlap(coreRequiredFields, extendedRequiredFields)
    const effectiveExtended = overlap.length > 0
      ? extendedRequiredFields.filter((f) => !new Set(overlap).has(f))
      : extendedRequiredFields
    for (const elem of effectiveExtended) {
      if (requiredFields && requiredFields.has(elem)) {
        processRequiredField(elem)
      } else {
        processOptionalField(elem)
      }
    }
    return { coreDetails, extendedDetails }
  },
}
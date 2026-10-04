import type { ErrorDetail } from './types.js'
import { ErrorDetailBuilder } from './errorDetailBuilder.js'

const PLACEHOLDER_VALUES = ['无', '暂无', '无要求', '/', '—', '-', '空', '未填写', '未提供', '未设置', '未配置', '待补充', '待填写', '待完善', '略', '省略', 'N/A', 'n/a', 'NA', 'none', 'None', 'NULL', 'null', '不适用', '无此项', '无内容', '空白', '未指定', '未确定', '未知', '不详', '无限制', '不需要', '无规定', '无特殊要求', '无特别要求', '无具体要求', '无相关要求', '暂不适用', '暂无规定', '暂无要求', '无相关内容', '无相关说明', '无具体内容', '无具体说明', '没有', '无说明', '无描述', '无数据', '暂无说明', '暂无数据', '暂无内容', '无特别规定', '无特殊规定', '无具体规定', '无相关规定', '无特殊条件', '无特别条件', '无具体条件', '无相关条件', '无特殊限制', '无特别限制', '无具体限制', '无相关限制', '无特别限定', '无特殊限定', '无具体限定', '无相关限定', '无特别说明', '无特殊说明', '无相关描述', '无具体描述', '暂无描述', '暂无说明', '不要求', '不规定', '无约定', '无约定要求']

function isMissing(val: unknown): boolean {
  return val === undefined || val === null ||
    (typeof val === 'string' && val.trim() === '') ||
    (Array.isArray(val) && val.length === 0) ||
    (typeof val === 'string' && PLACEHOLDER_VALUES.includes(val.trim()))
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

const FIELD_CLASSIFICATION: Record<string, 'required' | 'optional'> = {
  '事项名称': 'required',
  '实施主体': 'required',
  '办理条件': 'required',
  '申请材料': 'required',
  '办理流程': 'required',
  '办理时限': 'required',
  '收费标准': 'required',
  '办理地点': 'required',
  '咨询电话': 'required',
  '监督电话': 'required',
  '办理时间': 'required',
  '网上办理深度': 'required',
  '结果送达方式': 'required',
  '表格下载': 'required',
  '结果样本': 'optional',
  '通办范围': 'optional',
  '预约办理': 'optional',
  '网上支付': 'optional',
  '物流快递': 'optional',
  '中介机构': 'optional',
}

function isInvalidContent(val: unknown): string | null {
  if (typeof val !== 'string') return null
  const trimmed = val.trim()
  if (trimmed.length === 0) return null
  if (trimmed.length < 2) return '内容过于简略，无法指导办事'
  if (trimmed.replace(/[^\p{L}\p{N}]/gu, '').length === 0) return '内容仅含标点符号，无有效信息'
  if (INVALID_CONTENT_TEMPLATES.has(trimmed)) return '内容为无效模板语，无实质信息'
  if (trimmed.length < 4 && !SUBSTANTIVE_WORDS.some((w) => trimmed.includes(w))) {
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
  ): ErrorDetail[] {
    if (!requiredElements || requiredElements.length === 0) {
      throw new Error('GOV_DATA_RULES_MISSING: guideRequiredElements配置缺失，无法执行漏项检测')
    }
    const basisText = policyBasisText ?? '办事指南应包含完整核心要素'
    const details: ErrorDetail[] = []
    for (const elem of requiredElements) {
      const val = guide[elem]
      if (isMissing(val)) {
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

  detectGraded(
    guide: Record<string, unknown>,
    guideId: string,
    coreRequiredFields: string[],
    extendedRequiredFields: string[],
    severityMapping?: Record<string, string>,
    policyBasisText?: string,
    standardClause?: string,
  ): { coreDetails: ErrorDetail[]; extendedDetails: ErrorDetail[] } {
    if (!coreRequiredFields || coreRequiredFields.length === 0) {
      throw new Error('GOV_DATA_RULES_MISSING: coreRequiredFields配置缺失，无法执行分级漏项检测')
    }
    const basisText = policyBasisText ?? '办事指南应包含完整核心要素'
    const stdClause = standardClause ?? ''
    const coreDetails: ErrorDetail[] = []
    const extendedDetails: ErrorDetail[] = []

    const processRequiredField = (elem: string) => {
      const val = guide[elem]
      if (isMissing(val)) {
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
              },
              severityMapping,
            ),
          )
        }
      }
    }

    const processOptionalField = (elem: string) => {
      const val = guide[elem]
      if (isMissing(val)) {
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
      const classification = FIELD_CLASSIFICATION[elem] ?? 'required'
      if (classification === 'required') {
        processRequiredField(elem)
      } else {
        processOptionalField(elem)
      }
    }

    if (!extendedRequiredFields || extendedRequiredFields.length === 0) {
      return { coreDetails, extendedDetails }
    }
    const overlap = this.checkFieldOverlap(coreRequiredFields, extendedRequiredFields)
    const effectiveExtended = overlap.length > 0
      ? extendedRequiredFields.filter((f) => !new Set(overlap).has(f))
      : extendedRequiredFields
    for (const elem of effectiveExtended) {
      const classification = FIELD_CLASSIFICATION[elem] ?? 'optional'
      if (classification === 'required') {
        processRequiredField(elem)
      } else {
        processOptionalField(elem)
      }
    }
    return { coreDetails, extendedDetails }
  },
}
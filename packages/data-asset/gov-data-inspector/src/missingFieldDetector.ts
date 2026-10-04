import type { ErrorDetail } from './types.js'
import { ErrorDetailBuilder } from './errorDetailBuilder.js'

const PLACEHOLDER_VALUES = ['无', '暂无', '无要求', '/', '—', '-', '空', '未填写', '未提供', '未设置', '未配置', '待补充', '待填写', '待完善', '略', '省略', 'N/A', 'n/a', 'NA', 'none', 'None', 'NULL', 'null', '不适用', '无此项', '无内容', '空白', '未指定', '未确定', '未知', '不详', '无限制', '不需要', '无规定', '无特殊要求', '无特别要求', '无具体要求', '无相关要求', '暂不适用', '暂无规定', '暂无要求', '无相关内容', '无相关说明', '无具体内容', '无具体说明', '没有', '无说明', '无描述', '无数据', '暂无说明', '暂无数据', '暂无内容', '无特别规定', '无特殊规定', '无具体规定', '无相关规定', '无特殊条件', '无特别条件', '无具体条件', '无相关条件', '无特殊限制', '无特别限制', '无具体限制', '无相关限制', '无特别限定', '无特殊限定', '无具体限定', '无相关限定', '无特别说明', '无特殊说明', '无相关描述', '无具体描述', '暂无描述', '暂无说明', '不要求', '不规定', '无约定', '无约定要求']

function isMissing(val: unknown): boolean {
  return val === undefined || val === null ||
    (typeof val === 'string' && val.trim() === '') ||
    (Array.isArray(val) && val.length === 0) ||
    (typeof val === 'string' && PLACEHOLDER_VALUES.includes(val.trim()))
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
    for (const elem of coreRequiredFields) {
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
      }
    }
    const extendedDetails: ErrorDetail[] = []
    if (!extendedRequiredFields || extendedRequiredFields.length === 0) {
      return { coreDetails, extendedDetails }
    }
    const overlap = this.checkFieldOverlap(coreRequiredFields, extendedRequiredFields)
    const effectiveExtended = overlap.length > 0
      ? extendedRequiredFields.filter((f) => !new Set(overlap).has(f))
      : extendedRequiredFields
    for (const elem of effectiveExtended) {
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
    return { coreDetails, extendedDetails }
  },
}
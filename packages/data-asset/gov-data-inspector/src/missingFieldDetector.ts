import type { ErrorDetail } from './types.js'
import { ErrorDetailBuilder } from './errorDetailBuilder.js'

const PLACEHOLDER_VALUES = ['无', '暂无', '无要求', '/', '—', '-', '空', '未填写', '未提供', '未设置', '未配置', '待补充', '待填写', '待完善', '略', '省略', 'N/A', 'n/a', 'NA', 'none', 'None', 'NULL', 'null']

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
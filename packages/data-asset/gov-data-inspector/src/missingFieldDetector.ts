import type { ErrorDetail } from './types.js'
import { ErrorDetailBuilder } from './errorDetailBuilder.js'

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
      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0) || (typeof val === 'string' && ['无', '暂无', '无要求', '/', '—', '-'].includes(val.trim()))) {
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
}
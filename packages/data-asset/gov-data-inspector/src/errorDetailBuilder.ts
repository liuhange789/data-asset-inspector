import type { ErrorDetail, ErrorType, Severity, DataSource } from './types.js'

const VALID_ERROR_TYPES: ErrorType[] = ['missing', 'semantic', 'logical']
const VALID_SEVERITIES: Severity[] = ['critical', 'major', 'minor']

export interface ErrorDetailBuilderInput {
  guideId: string
  field: string
  errorType: ErrorType
  severity?: Severity
  description: string
  suggestion: string
  dataSource?: DataSource | undefined
  standardClause?: string | undefined
  policyBasis?: string | undefined
}

function resolveSeverity(
  errorType: ErrorType,
  severity: Severity | undefined,
  severityMapping: Record<string, string> | undefined,
): Severity {
  if (severity && VALID_SEVERITIES.includes(severity)) return severity
  const mapped = severityMapping?.[errorType] as Severity | undefined
  if (mapped && VALID_SEVERITIES.includes(mapped)) return mapped
  return errorType === 'missing' ? 'major' : 'critical'
}

export const ErrorDetailBuilder = {
  build(
    input: ErrorDetailBuilderInput,
    severityMapping?: Record<string, string>,
  ): ErrorDetail {
    const { guideId, field, errorType, description, suggestion } = input
    if (!guideId || !field || !description || !suggestion) {
      throw new Error(
        `ErrorDetail字段校验失败: guideId/field/description/suggestion均不可为空`,
      )
    }
    if (!VALID_ERROR_TYPES.includes(errorType)) {
      throw new Error(`errorType必须为missing/semantic/logical之一，当前值: ${errorType}`)
    }
    const result: ErrorDetail = {
      guideId,
      field,
      errorType,
      severity: resolveSeverity(errorType, input.severity, severityMapping),
      description,
      suggestion,
    }
    if (input.dataSource) result.dataSource = input.dataSource
    if (input.standardClause) result.standardClause = input.standardClause
    if (input.policyBasis) result.policyBasis = input.policyBasis
    return result
  },

  countByType(details: ErrorDetail[]): { missing: number; semantic: number; logical: number } {
    const counts = { missing: 0, semantic: 0, logical: 0 }
    for (const d of details) {
      if (d.errorType === 'missing') counts.missing++
      else if (d.errorType === 'semantic') counts.semantic++
      else if (d.errorType === 'logical') counts.logical++
    }
    return counts
  },
}
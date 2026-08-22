export type SensitivityLevel = 'Public' | 'Internal' | 'Confidential' | 'Secret'
export type RecommendedStrategy = 'none' | 'partial' | 'full' | 'encrypt'

export interface ClassifySensitivityParams {
  filePath: string
  outputPathDir?: string
  sampleSize?: number
}

export interface MatchResult {
  matched: boolean
  name?: string
  pattern?: string
  level?: string
}

export interface InvalidRule {
  ruleName: string
  reason: string
}

export interface FieldClassification {
  fieldName: string
  sensitivityLevel: SensitivityLevel
  identifiedBy: { ruleName: string; matchType: string }
  recommendedStrategy: RecommendedStrategy
}

export interface ClassificationReportJson {
  fields: FieldClassification[]
  configStatus: string
  classifiedAt: string
}

export interface ClassifySensitivityResult {
  jsonReportPath: string
  markdownReportPath: string
  report: ClassificationReportJson
  fields: FieldClassification[]
  status: 'SUCCESS' | 'FAILED'
  configStatus: string
}
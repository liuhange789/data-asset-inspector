export type QualityDimension = 'completeness' | 'accuracy' | 'consistency' | 'timeliness'

export type IssueSeverity = 'low' | 'medium' | 'high'

export interface ScoreDataQualityParams {
  filePath: string
  outputPathDir?: string
}

export interface QualityIssue {
  dimension: QualityDimension
  description: string
  location: string
  severity: IssueSeverity
}

export interface DimensionScore {
  score: number
  weight: number
  weightNormalized: number
  subScores?: Record<string, number>
  issues: QualityIssue[]
  suggestion?: string
}

export interface QualityDimensions {
  completeness: DimensionScore
  accuracy: DimensionScore
  consistency: DimensionScore
  timeliness: DimensionScore
}

export interface QualityScoringResult {
  totalScore: number
  dimensions: QualityDimensions
  issues: QualityIssue[]
  suggestions: string[]
  weightsNormalized: boolean
  scoredAt: string
}

export interface ScoreDataQualityResult {
  jsonReportPath: string
  markdownReportPath: string
  report: QualityScoringResult
  totalScore: number
  dimensions: QualityDimensions
  status: 'SUCCESS' | 'FAILED'
  configStatus: string
}

export interface ScoringContext {
  records: Record<string, unknown>[]
  fieldNames: string[]
  config: unknown
}

export interface DimensionScoringResult {
  score: number
  issues: QualityIssue[]
  subScores?: Record<string, number>
}
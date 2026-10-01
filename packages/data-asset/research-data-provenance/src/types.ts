import type { ErrorCode } from './invariant.js'
export type { ErrorCode }

export interface DatasetMetadata {
  datasetId: string
  datasetName: string
  creatingOrganization: string
  createdAt: string
  description?: string
}

export interface ProcessingStep {
  stepOrder: number
  operationType: string
  processingTime: string
  operatorId: string
}

export interface LineageRecord {
  lineageId: string
  sourceSystem: string
  collectionTime: string
  collectionMethod: string
  steps: ProcessingStep[]
}

export interface Attachment {
  fileName: string
  exists: boolean
  fileSize: number
  nonEmpty: boolean
}

export interface AttachmentList {
  analysisCode: Attachment
  environmentDeclaration: Attachment
  parameterConfig: Attachment
}

export type JudgmentStatus = '自动判定' | '人工确认'

export type ConfigLoadStatus =
  | 'CONFIG_LOADED'
  | 'DEFAULT_MISSING'
  | 'DEFAULT_PARSE'
  | 'DEFAULT_VERSION'
  | 'DEFAULT_PARTIAL'

export interface QualityDimensionRule {
  ruleId: string
  description: string
  judgmentLogic: string
  weight: number
  enabled: boolean
}

export interface QualityDimensionWeights {
  accuracy: number
  completeness: number
  consistency: number
  timeliness: number
  normality: number
  security: number
}

export interface QualityDimensionConfig {
  version: string
  lastUpdated: string
  weights: QualityDimensionWeights
  accuracy: { rules: QualityDimensionRule[] }
  completeness: { rules: QualityDimensionRule[] }
  consistency: { rules: QualityDimensionRule[] }
  timeliness: { rules: QualityDimensionRule[] }
  normality: { rules: QualityDimensionRule[] }
  security: { rules: QualityDimensionRule[] }
}

export interface RemediationSuggestionEntry {
  missingItemType: string
  suggestion: string
  policyBasis: string
}

export interface RemediationSuggestionConfig {
  version: string
  lastUpdated: string
  suggestions: Record<string, RemediationSuggestionEntry>
}

export interface LineageDetectionResult {
  completenessScore: number
  missingItems: string[]
  brokenPoints: string[]
  policyBasis: string
  judgmentStatus: JudgmentStatus
}

export interface ReproducibilityResult {
  reproducibilityScore: number | null
  missingItems: string[]
  policyBasis: string
  judgmentStatus: JudgmentStatus
  skipped: boolean
}

export interface QualityDimensionScore {
  dimension: string
  score: number | null
  issues: string[]
  policyBasis: string
  judgmentStatus: JudgmentStatus
}

export interface RemediationSuggestion {
  missingItemType: string
  suggestion: string
  policyBasis: string
}

export interface ReviewOverrideRecord {
  datasetId: string
  detectionItem: string
  originalConclusion: string
  newConclusion: string
  overrideReason: string
  operator: string
  overrideTime: string
}

export interface ConfigVersionSet {
  qualityDimensionConfigVersion: string
  remediationSuggestionConfigVersion: string
}

export interface ValidationError {
  code: ErrorCode
  message: string
  field?: string
}

export interface ProvenanceAuditReport {
  reportId: string
  auditTime: string
  datasetId: string
  lineageResult: LineageDetectionResult
  reproducibilityResult: ReproducibilityResult
  qualityScores: QualityDimensionScore[]
  overrideList: ReviewOverrideRecord[]
  remediationSuggestions: RemediationSuggestion[]
  errorList: ValidationError[]
  policyBasisSummary: string[]
  configVersions: ConfigVersionSet
  legalDisclaimer: string
}

export interface ConfigLoadResult {
  qualityDimensionConfig: QualityDimensionConfig
  remediationSuggestionConfig: RemediationSuggestionConfig
  loadStatus: {
    qualityDimension: ConfigLoadStatus
    remediationSuggestion: ConfigLoadStatus
  }
}

export interface InputValidationResult {
  isValid: boolean
  errors: ValidationError[]
}
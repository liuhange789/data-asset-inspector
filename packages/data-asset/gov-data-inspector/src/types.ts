export type ErrorType = 'missing' | 'semantic' | 'logical'

export type Severity = 'critical' | 'major' | 'minor'

export type DataSource = 'national' | 'provincial' | 'standard'

export interface DataSourceStatusEntry {
  status: 'success' | 'failed' | 'degraded'
  fetchedAt: string
  recordCount: number
}

export interface DataSourceStatus {
  national: DataSourceStatusEntry
  provincial: DataSourceStatusEntry
  standard: DataSourceStatusEntry
}

export interface ErrorDetail {
  guideId: string
  field: string
  errorType: ErrorType
  severity: Severity
  description: string
  suggestion: string
  dataSource?: DataSource
  standardClause?: string
}

export interface FormatIssue {
  guideId: string
  field: string
  issue: string
  suggestion: string
  semanticHint?: string
}

export interface DetectionRates {
  semanticDetectionRate: number | '未度量'
  logicalDetectionRate: number | '未度量'
  falsePositiveRate: number
  completenessScore: number
  accuracyScore: number
  traceabilityScore: number
  overallScore: number
}

export interface GuideInspectionResult {
  completeness: number
  missingFields: number
  semanticErrors: number
  logicalErrors: number
  errorDetails: ErrorDetail[]
  formatIssues: FormatIssue[]
  serviceConvenience: number
  totalGuidesChecked: number
  detectionRates: DetectionRates
}

export interface UnmatchedWarning {
  type: 'UNMATCHED_ITEM_TYPE'
  guideId: string
  message: string
}

export type MatchSource = 'manual' | 'name' | 'code' | 'flow' | null

export interface ItemTypeMatchResult {
  itemType: string | null
  matchSource: MatchSource
}

export interface InspectionReport {
  dataSource: string
  inspectionMode: string
  timestamp: string
  policyBasis: string[]
  guideInspection?: GuideInspectionResult
  classification?: GovDataClassification
  dataSourceStatus?: DataSourceStatus
  degradedMode?: boolean
  degradedReason?: string
  warnings?: UnmatchedWarning[]
}

export interface GovDataClassification {
  dataAssetCode: string
  categoryLevel: string
  specificType: string
}

export interface StandardTimeLimit {
  itemType: string
  legalUpperLimit: number
  legalLowerLimit: number
  basisClause: string
  dataSource: DataSource
  standardClause: string
}

export interface StandardMaterial {
  itemType: string
  standardName: string
  isRequired: boolean
  basisClause: string
  dataSource: DataSource
  standardClause: string
}

export interface StandardCondition {
  itemType: string
  elementName: string
  standardValue: string
  basisClause: string
  dataSource: DataSource
  standardClause: string
}

export interface OfficialStandardData {
  dataSource: DataSource
  itemType: string
  legalUpperLimit: number | undefined
  legalLowerLimit: number | undefined
  standardName: string | undefined
  isRequired: boolean | undefined
  elementName: string | undefined
  standardValue: string | undefined
  standardClause: string
}

export interface StandardRule {
  ruleId: string
  standardClause: string
  triggerFields: string[]
  condition: string
  threshold: number | undefined
  suggestionTemplate: string
  triggerKeywords: string[]
}

export interface LogicRule {
  ruleId: string
  triggerFields: string[]
  condition: string
  threshold?: number
  suggestionTemplate: string
  standardClause?: string
  triggerKeywords?: string[]
}

export interface FormatRule {
  field: string
  pattern?: string
  requiredKeywords?: string[]
  suggestionTemplate: string
}

export interface SemanticRule {
  ruleId: string
  targetField: string
  kbType: string
  suggestionTemplate: string
}

export interface KnowledgeBase {
  timeLimits: StandardTimeLimit[]
  materials: StandardMaterial[]
  conditions: StandardCondition[]
  dataSourceStatus: DataSourceStatus
}

export type ErrorCode =
  | 'GOV_DATA_INPUT_INVALID'
  | 'GOV_DATA_RULES_MISSING'
  | 'GOV_DATA_KB_MISSING'
  | 'GOV_DATA_LOGIC_RULES_MISSING'
  | 'GOV_DATA_POLICY_MISSING'
  | 'GOV_DATA_ENCODING_ERROR'
  | 'GOV_DATA_SCALE_EXCEEDED'
  | 'GOV_DATA_URL_UNREACHABLE'
  | 'GOV_DATA_NO_DATA'
  | 'GOV_DATA_INPUT_TOO_LARGE'
  | 'UNKNOWN_ERROR'
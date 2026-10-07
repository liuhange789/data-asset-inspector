export type ErrorType = 'missing' | 'semantic' | 'logical' | 'warning'

export type Severity = 'critical' | 'major' | 'minor' | 'warning'

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
  policyBasis?: string
  sourceDocument?: string
  sourceClause?: string
}

export interface GovOrderElement {
  elementName: string
  sourceDoc: string
  docNumber: string
  clause: string
}

export interface StandardElement {
  elementName: string
  clause: string
}

export interface NationalStandard {
  standardNumber: string
  standardName: string
  elements: StandardElement[]
  requiredElements?: string[]
  serviceGuideElements?: string[]
  qualityDimensions?: QualityDimension[]
}

export interface ProvincialElement {
  elementName: string
  nationalElementMapping: string
}

export interface EvaluationIndicator {
  level: 'L1' | 'L2' | 'L3'
  indicatorCode: string
  description: string
}

export interface EvaluationIndicators {
  E1: EvaluationIndicator[]
  E2: EvaluationIndicator[]
  E3: EvaluationIndicator[]
  E4: EvaluationIndicator[]
}

export interface ReferenceSystem {
  configVersion: string
  layer1_govOrders: GovOrderElement[]
  layer2_nationalStandards: NationalStandard[]
  layer3_provincialStandards: ProvincialElement[]
  layer4_evaluationIndicators: EvaluationIndicators
}

export interface FormatIssue {
  guideId: string
  field: string
  issue: string
  suggestion: string
  semanticHint?: string
  policyBasis?: string
  sourceDocument?: string
  sourceClause?: string
}

export interface DetectionRates {
  semanticDetectionRate: number | 'N/A'
  logicalDetectionRate: number | 'N/A'
  missingFieldDetectionRate: number | 'N/A'
  formatDetectionRate: number | 'N/A'
  falsePositiveRate: number | 'N/A'
  completenessScore: number
  accuracyScore: number
  traceabilityScore: number
  overallScore: number
}

export interface GroundTruth {
  realMissingFieldCount?: number
  realSemanticErrorCount?: number
  realLogicalErrorCount?: number
  realFormatIssueCount?: number
}

export interface GuideInspectionResult {
  completeness: number
  missingFields: number
  semanticErrors: number
  logicalErrors: number
  errorDetails: ErrorDetail[]
  suspectedErrors: ErrorDetail[]
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

export type LoadSource = 'file' | 'npm' | 'default'

export interface ConfigPackProvenance {
  configPackId: string
  region: string
  configPackVersion: string
  loadSource: LoadSource
}

export interface ConfigPackWarning {
  type: 'CONFIG_PACK_WARNING'
  code: string
  message: string
}

export type Warning = UnmatchedWarning | ConfigPackWarning

export interface InspectionReport {
  dataSource: string
  inspectionMode: string
  timestamp: string
  policyBasis: string[]
  configPackId?: string
  region?: string
  configPackVersion?: string
  guideInspection?: GuideInspectionResult
  classification?: GovDataClassification
  dataSourceStatus?: DataSourceStatus
  degradedMode?: boolean
  degradedReason?: string
  warnings?: Warning[]
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
  scanMode?: 'anyField'
  anyFieldKeywords?: string[]
}

export interface LogicRule {
  ruleId: string
  triggerFields: string[]
  condition: string
  threshold?: number
  suggestionTemplate: string
  standardClause?: string
  triggerKeywords?: string[]
  scanMode?: 'anyField'
  anyFieldKeywords?: string[]
}

export interface FormatRule {
  field: string
  pattern?: string
  requiredKeywords?: string[]
  matchMode?: 'all' | 'any'
  suggestionTemplate: string
  fuzzyDescriptors?: string[] | undefined
  addressSpecificKeywords?: string[] | undefined
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
  | 'GOV_CONFIG_PACK_INVALID'
  | 'GOV_CONFIG_PACK_SCHEMA_INVALID'
  | 'GOV_CONFIG_PACK_UNAVAILABLE'
  | 'GOV_CONFIG_PACK_DUPLICATE'
  | 'GOV_CONFIG_PACK_NOT_FOUND'
  | 'GOV_CONFIG_PACK_ENCODING_ERROR'
  | 'GOV_CONFIG_PACK_PARSE_ERROR'
  | 'GOV_CONFIG_PACK_FALLBACK'
  | 'GOV_CONFIG_RULE_EXEC_ERROR'
  | 'GOV_LOCAL_TERMS_EMPTY'
  | 'REFERENCE_SYSTEM_MISSING'
  | 'REFERENCE_SYSTEM_INVALID'
  | 'REFERENCE_ELEMENT_COUNT_MISMATCH'
  | 'UNKNOWN_ERROR'
export interface SemanticConflictRules {
  ageKeywords: string[]
  proxyKeywords: string[]
  proofKeywords: string[]
  siteInspectionThreshold: number
  instantHandleThreshold: number
}
export type RuleType = 'format' | 'logic' | 'missing' | 'quality'

export interface QualityIndicator {
  indicatorCode: string
  indicatorName: string
  level: string
}

export interface QualityDimension {
  dimensionName: string
  dimensionCode: string
  indicators: QualityIndicator[]
}

export interface ExtractedRule {
  ruleId: string
  ruleType: RuleType
  pattern?: string
  keywords?: string[]
  fieldList?: string[]
  dimensions?: QualityDimension[]
  policyBasis: string
  sourceDocument: string
  sourceClause: string
}

export interface RegulationClause {
  clauseId: string
  clauseText: string
  extractedRules: ExtractedRule[]
  isCore: boolean
}

export interface NationalLaw {
  lawName: string
  documentNumber: string
  effectiveDate: string
  relevantClauses: RegulationClause[]
}

export interface NationalPolicy {
  policyName: string
  documentNumber: string
  effectiveDate: string
  relevantClauses: RegulationClause[]
}

export interface RegulationNationalStandard {
  standardName: string
  standardNumber: string
  effectiveDate: string
  relevantClauses: RegulationClause[]
  requiredElements?: string[]
  serviceGuideElements?: string[]
  qualityDimensions?: QualityDimension[]
}

export interface ProvincialStandard {
  province: string
  standardName: string
  standardNumber: string
  effectiveDate: string
  relevantClauses: RegulationClause[]
}

export interface HotlineWhitelistEntry {
  hotline: string
  policyBasis: string
  source: string
}

export interface RegulationKnowledgeBase {
  nationalLaws: NationalLaw[]
  nationalPolicies: NationalPolicy[]
  nationalStandards: RegulationNationalStandard[]
  provincialStandards: ProvincialStandard[]
  hotlineWhitelist: HotlineWhitelistEntry[]
}
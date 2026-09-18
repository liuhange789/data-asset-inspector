export type SensitiveFieldType = 'idCard' | 'phone' | 'bankCard' | 'email'

export type MaskingStrategy = 'FULL' | 'PARTIAL' | 'GENERALIZE'

export type DataFormat = 'csv' | 'json' | 'txt' | 'xlsx' | 'unknown'

export type ProcessingStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED'

export type ConfigStatus =
  | 'CONFIG_LOADED'
  | 'DEFAULT_MISSING'
  | 'DEFAULT_PARSE'
  | 'DEFAULT_VERSION'
  | 'DEFAULT_PARTIAL'

export interface ValueRule {
  keywords: string[]
  score: number
  label: string
  recommendation: string
}

export interface DefaultValueRule {
  score: number
  label: string
  recommendation: string
}

export interface ValueAssessmentRules {
  highValue: ValueRule
  mediumValue: ValueRule
  lowValue: ValueRule
  defaultValue: DefaultValueRule
}

export interface SensitivePattern {
  pattern: string
  level: MaskingStrategy
}

export interface SensitivePatterns {
  idCard: SensitivePattern
  phone: SensitivePattern
  bankCard: SensitivePattern
  email: SensitivePattern
}

export interface MaskingLevelConfig {
  description: string
  applyTo: SensitiveFieldType[]
}

export interface MaskingLevels {
  FULL: MaskingLevelConfig
  PARTIAL: MaskingLevelConfig
  GENERALIZE: MaskingLevelConfig
}

export interface CleaningRules {
  missingValueStrategy: Record<string, string>
  qualityThreshold: Record<string, QualityThreshold>
}

export interface QualityThreshold {
  missingRate: number
  errorRate: number
  label: string
  action?: string
}

export interface CompliancePolicy {
  name: string
  doc: string
  check: string
}

export interface ComplianceConfig {
  policies: CompliancePolicy[]
}

export interface PricingRule {
  valueLevel: string
  suggestion: string
}

export interface PackagingRules {
  complianceStatements: string[]
  pricingRules: PricingRule[]
  defaultDescription: string
  version: string
}

export interface BusinessRulesConfig {
  version: string
  lastUpdated: string
  valueAssessment: ValueAssessmentRules
  sensitivePatterns: SensitivePatterns
  maskingLevels: MaskingLevels
  cleaningRules: CleaningRules
  compliance: ComplianceConfig
  packaging: PackagingRules
  qualityScoring?: QualityScoringConfig
  lineage?: LineageConfig
  advancedMasking?: AdvancedMaskingConfig
  visualization?: VisualizationConfig
  sensitivityClassification?: SensitivityClassificationConfig
  incrementalScheduling?: IncrementalSchedulingConfig
  registration?: RegistrationConfig
  policyReferences?: PolicyReference[]
}

export interface SensitiveField {
  type: SensitiveFieldType
  value: string
  line: number
  column: number
}

export interface DataFile {
  fileName: string
  fullPath: string
  size: number
  format: DataFormat
}

export interface ProcessingResult {
  status: ProcessingStatus
  inputPath: string
  outputPath: string
  report: string
  error?: string
}

export interface AssetItem {
  fileName: string
  size: string
  type: string
  valueAssessment: string
  description: string
}

export interface DataOverview {
  sourceFile: string
  recordCount: number
  fileSizeKb: number
  format: string
}

export interface ProductManual {
  productName: string
  version: string
  generatedDate: string
  dataOverview: DataOverview
  sampleLines: string[]
  usageScenario: string
  complianceStatements: string[]
  pricingSuggestion: string
}

export interface OrchestrationResult {
  maskingReport: string
  cleaningReport: string
  inventoryReport: string
  packagingManual: string
  completedStages: number
  failedStage?: string
  error?: string
}

export interface BusinessRulesLoadResult {
  config: BusinessRulesConfig
  status: ConfigStatus
}

export interface QualityScoringWeights {
  completeness: number
  accuracy: number
  consistency: number
  timeliness: number
}

export interface QualityScoringThresholds {
  completeness: number
  accuracy: number
  consistency: number
  timeliness: number
}

export interface CompletenessConfig {
  missingMarkers: string[]
}

export interface FormatRule {
  fieldName: string
  pattern: string
  weight: number
}

export interface DomainRule {
  fieldName: string
  min?: number
  max?: number
  allowedValues?: unknown[]
  weight: number
}

export interface AccuracyConfig {
  formatRules: FormatRule[]
  domainRules: DomainRule[]
}

export interface CrossFieldRule {
  name: string
  fields: string[]
  constraint: string
  value?: unknown
}

export interface ConsistencyConfig {
  crossFieldRules: CrossFieldRule[]
}

export interface TimelinessConfig {
  timestampField: string
  freshnessThresholdHours: number
}

export interface QualityScoringConfig {
  weights: QualityScoringWeights
  thresholds: QualityScoringThresholds
  completeness: CompletenessConfig
  accuracy: AccuracyConfig
  consistency: ConsistencyConfig
  timeliness: TimelinessConfig
}

export interface LineageConfig {
  enabled: boolean
  storagePath: string
  hashAlgorithm: string
}

export interface FpeConfig {
  key: string
  radix: number
}

export interface KAnonymityConfig {
  kValue: number
  quasiIdentifiers: string[]
}

export interface DifferentialPrivacyConfig {
  epsilon: number
  totalBudget: number
  sensitivity: number
}

export interface HashMaskingConfig {
  algorithm: string
  salt: string
}

export interface AdvancedMaskingConfig {
  defaultAlgorithm: string
  fieldAlgorithms: Record<string, { algorithm: string }>
  fpe: FpeConfig
  kAnonymity: KAnonymityConfig
  differentialPrivacy: DifferentialPrivacyConfig
  hash: HashMaskingConfig
}

export interface ChartConfig {
  enabled: boolean
  title: string
}

export interface VisualizationLayoutConfig {
  columns: number
  responsive: boolean
}

export interface ColorSchemeConfig {
  primary: string
  secondary: string
  success: string
  warning: string
  danger: string
  background: string
  text: string
}

export interface InteractionsConfig {
  expandCollapse: boolean
  chartSwitch: boolean
  tooltip: boolean
}

export interface VisualizationConfig {
  charts: Record<string, ChartConfig>
  layout: VisualizationLayoutConfig
  colorScheme: ColorSchemeConfig
  interactions: InteractionsConfig
  templateVersion: string
}

export interface FieldNameRule {
  name: string
  pattern: string
  level: string
}

export interface FieldValueRule {
  name: string
  pattern: string
  level: string
}

export interface SensitivityClassificationConfig {
  fieldNameRules: FieldNameRule[]
  fieldValueRules: FieldValueRule[]
  levelMapping: Record<string, string>
  defaultLevel: string
}

export interface IncrementalSchedulingConfig {
  incrementalMode: boolean
  cronExpression: string
  hashAlgorithm: string
  watchDirectory: string
  stateFilePath: string
  lockTimeout: number
}
export type PolicyStage =
  | 'INVENTORY'
  | 'CLEANING'
  | 'MASKING'
  | 'PACKAGING'
  | 'PRECHECK'
  | 'DOC_GENERATION'
  | 'AGENCY_MATCHING'

export interface PolicyDocument {
  name: string
  docNumber: string
  coreRequirement: string
}

export interface PolicyReference {
  stage: PolicyStage
  stageLabel: string
  documents: PolicyDocument[]
}

export interface AgencyConfig {
  id: string
  name: string
  location: string
  specialties: string[]
  contact: string
  basis: string
}

export interface RegistrationConfig {
  ruleVersion: string
  agencies: AgencyConfig[]
  dataTypeMapping: Record<string, string>
  defaultRecommendation: {
    agency: string | null
    basis: string
    message: string
  }
  registrationFee: number
  registrationSteps: string[]
}

export interface NavigationField {
  registrationNavigation: string
  policyReferences: PolicyDocument[]
}

export type CheckName = 'NATIONAL_SECURITY' | 'SOURCE_COMPLIANCE' | 'OWNERSHIP_DISPUTE' | 'MATERIAL_AUTHENTICITY'
export type CheckResult = 'PASS' | 'FAIL' | 'PENDING' | 'UNDETERMINED'
export type PrecheckConclusion = 'CAN_REGISTER' | 'CANNOT_REGISTER' | 'PENDING_CONFIRMATION'

export interface PrecheckCheckItem {
  name: CheckName
  label: string
  result: CheckResult
  detail: string
}

export interface PrecheckReport {
  conclusion: PrecheckConclusion
  checks: PrecheckCheckItem[]
  failedItems: string[]
  policyReferences: PolicyDocument[]
  timestamp: string
}

export type RegistrationDocName = 'DATA_DESCRIPTION' | 'SOURCE_LEGALITY_STATEMENT' | 'OWNERSHIP_EXPLANATION'
export type DocStatus = 'GENERATED' | 'FAILED' | 'PENDING_FIELDS'

export interface RegistrationDoc {
  name: RegistrationDocName
  label: string
  content: string
  status: DocStatus
  missingFields?: string[]
}

export interface RegistrationDocPackage {
  docs: RegistrationDoc[]
  packagePath: string
  policyReferences: PolicyDocument[]
  timestamp: string
}

export interface AgencyMatchResult {
  agency: string | null
  agencyName: string
  basis: string
  dataType: string
  ruleVersion: string
}

export type StepStatus = 'COMPLETED' | 'CURRENT' | 'PENDING'

export interface RegistrationStep {
  name: string
  status: StepStatus
  description: string
}

export interface RegistrationProgress {
  steps: RegistrationStep[]
  currentStep: number
  registrationId: string
  agency: string
  timestamp: string
}

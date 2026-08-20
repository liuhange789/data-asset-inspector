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

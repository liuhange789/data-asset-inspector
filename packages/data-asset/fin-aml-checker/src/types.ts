export type AccountType = '自然人' | '非自然人'
export type TransferDirection = '境内' | '跨境'
export type JudgmentStatus = '自动判定' | '人工确认'

export interface Transaction {
  transactionId: string
  amount: number
  currency: string
  accountType: AccountType
  transactionType: string
  transactionDate: string
  transferDirection?: TransferDirection
  counterpartyType?: string
}

export interface TransactionFile {
  transactions: Transaction[]
}

export interface SubmittedReport {
  transactionId: string
  submittedDate: string
}

export interface SubmittedReportFile {
  reports: SubmittedReport[]
}

export interface ThresholdConfig {
  version: string
  lastUpdated: string
  cashThresholdCny: number
  cashThresholdFcy: number
  nonNaturalPersonTransferCny: number
  nonNaturalPersonTransferFcy: number
  naturalPersonDomesticCny: number
  naturalPersonDomesticFcy: number
  naturalPersonCrossBorderCny: number
  naturalPersonCrossBorderFcy: number
  cashTransactionTypes: string[]
  transferTransactionTypes: string[]
}

export interface ExemptionMatchCondition {
  transactionType?: string[]
  transactionTypes?: string[]
  counterpartyType?: string[]
}

export interface ExemptionRule {
  ruleId: string
  ruleName: string
  matchConditions: ExemptionMatchCondition
  policyBasisClause: string
  enabled: boolean
}

export interface ExemptionConfig {
  version: string
  lastUpdated: string
  rules: ExemptionRule[]
}

export interface ExchangeRateConfig {
  version: string
  lastUpdated: string
  rateMap: Record<string, number>
}

export interface HolidayConfig {
  version: string
  lastUpdated: string
  holidays: string[]
}

export interface ReportableTransaction {
  transactionId: string
  triggeredThresholdType: string
  policyBasis: string
  judgmentStatus: JudgmentStatus
}

export interface ExemptedTransaction {
  transactionId: string
  exemptionReason: string
  policyBasis: string
  judgmentStatus: JudgmentStatus
}

export interface OverdueTransaction {
  transactionId: string
  overdueDays: number
  policyBasis: string
}

export interface ReviewOverrideRecord {
  transactionId: string
  originalConclusion: string
  newConclusion: string
  overrideReason: string
  operator: string
  overrideTime: string
}

export interface ConfigVersionSet {
  thresholdConfigVersion: string
  exemptionConfigVersion: string
  exchangeRateConfigVersion: string
  holidayConfigVersion: string
}

export interface ValidationError {
  transactionId: string
  missingFields: string[]
  errorMessage: string
}

export interface InspectionReport {
  reportId: string
  inspectionTime: string
  inspectionScope: string
  reportableList: ReportableTransaction[]
  exemptedList: ExemptedTransaction[]
  overdueList: OverdueTransaction[]
  overrideList: ReviewOverrideRecord[]
  errorList: ValidationError[]
  policyBasisSummary: string[]
  configVersions: ConfigVersionSet
  legalDisclaimer: string
  warnings: string[]
}

export type ConfigLoadStatus =
  | 'CONFIG_LOADED'
  | 'DEFAULT_MISSING'
  | 'DEFAULT_PARSE'
  | 'DEFAULT_VERSION'
  | 'DEFAULT_PARTIAL'

export interface ConfigLoadResult {
  thresholdConfig: ThresholdConfig
  exemptionConfig: ExemptionConfig
  exchangeRateConfig: ExchangeRateConfig
  holidayConfig: HolidayConfig
  loadStatus: ConfigLoadStatus
  warnings: string[]
}

export interface CurrencyConvertResult {
  cnyAmount: number | null
  fcyAmount: number
  currencyConfigured: boolean
}

export interface ThresholdEvaluationResult {
  transactionId: string
  triggeredThresholdType: string
  policyBasisClause: string
}
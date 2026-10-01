import type { ConfigLoadStatus, ErrorCode } from './invariant.js'

export type JudgmentStatus = '自动判定' | '人工确认'

export type ReviewItem = 'classification' | 'encoding' | 'changeTraceability'

export interface UnifiedAssetItem {
  assetId: string
  sourceSystemId: string
  dataType: string
  projectId: string
  collectionTime: string
  classificationCode: string
  assetCode: string
  judgmentStatus: JudgmentStatus
  originalAssetCode?: string
  policyBasis?: string
}

export interface SourceConfigEntry {
  type: string
  systemId: string
  path: string
  version?: string
}

export interface SourceConfig {
  projectId: string
  sources: SourceConfigEntry[]
}

export interface ApprovalChain {
  initiator: string
  approver: string
  approvalTime: string
  approvalConclusion: string
}

export interface ChangeRecord {
  changeId: string
  relatedAssetId: string
  changeReason: string
  approvalChain: ApprovalChain
  impactScope: string[]
  changeDate: string
}

export interface ClassificationNode {
  classificationCode: string
  classificationName: string
  parentCode: string
  level: number
  mappedDataTypes: string[]
}

export interface ClassificationConfig {
  version: string
  lastUpdated: string
  nodes: ClassificationNode[]
}

export interface EncodingRuleConfig {
  version: string
  lastUpdated: string
  classificationCodeLength: number
  sequentialCodeLength: number
  sequentialCodeStart: number
  sequentialCodeMax: number
  checksumAlgorithm: string
}

export interface SourceAdapterConfigEntry {
  type: string
  adapterClassName: string
  supportedVersions: string[]
}

export interface SourceAdapterConfig {
  version: string
  lastUpdated: string
  adapters: SourceAdapterConfigEntry[]
}

export interface ClassificationEncodingEntry {
  assetId: string
  classificationCode: string
  assetCode: string
  policyBasis: string
  judgmentStatus: JudgmentStatus
}

export interface ChangeTraceabilityResult {
  changeId: string
  assetLinked: boolean
  recordComplete: boolean
  approvalChainComplete: boolean
  impactScopeLinked: boolean
  missingItems: string[]
  policyBasis: string
}

export interface ReviewOverrideRecord {
  assetId: string
  reviewItem: ReviewItem
  originalConclusion: string
  newConclusion: string
  overrideReason: string
  operator: string
  overrideTime: string
  originalAssetCode: string
}

export interface AssetLedgerEntry {
  assetCode: string
  classificationCode: string
  sourceSystemId: string
  inventoryTime: string
  judgmentStatus: JudgmentStatus
}

export interface ConfigVersionSet {
  classificationConfigVersion: string
  encodingRuleConfigVersion: string
  sourceAdapterConfigVersion: string
}

export interface ValidationError {
  assetId: string
  errorMessage: string
}

export interface InventoryReport {
  reportId: string
  inventoryTime: string
  projectId: string
  assetList: UnifiedAssetItem[]
  classificationEncodingList: ClassificationEncodingEntry[]
  changeTraceabilityReport: ChangeTraceabilityResult[]
  overrideList: ReviewOverrideRecord[]
  errorList: ValidationError[]
  policyBasisSummary: string[]
  configVersions: ConfigVersionSet
  legalDisclaimer: string
}

export interface ConfigLoadResult {
  classificationConfig: ClassificationConfig
  encodingRuleConfig: EncodingRuleConfig
  sourceAdapterConfig: SourceAdapterConfig
  loadStatus: ConfigLoadStatus
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

export interface IfcEntityRecord {
  lineId: number
  entityType: string
  guid: string
  attributes: string[]
}

export interface IfcParseResult {
  entities: IfcEntityRecord[]
  warnings: string[]
  errors: string[]
  version: string
}

export interface AssetCodeGenerateResult {
  assetCode: string
  policyBasis: string
  error?: ErrorCode
}

export interface ToolError {
  error: ErrorCode
  message: string
}
declare module '@liuhange/dsh-data-asset-shared' {
  export interface PolicyStageExtension {
    INVENTORY_SCAN: 'INVENTORY_SCAN'
    QUALITY_SCORE: 'QUALITY_SCORE'
    VALUATION: 'VALUATION'
    COMPLIANCE_CHECK: 'COMPLIANCE_CHECK'
  }
}

export type ExtendedPolicyStage =
  | 'INVENTORY'
  | 'CLEANING'
  | 'MASKING'
  | 'PACKAGING'
  | 'PRECHECK'
  | 'DOC_GENERATION'
  | 'AGENCY_MATCHING'
  | 'INVENTORY_SCAN'
  | 'QUALITY_SCORE'
  | 'VALUATION'
  | 'COMPLIANCE_CHECK'

export interface AssetItem {
  id: string
  name: string
  sourceType: 'directory' | 'database'
  metadata: Record<string, unknown>
  initialScreening: '初筛通过' | '初筛不通过'
  missingConditions?: string[]
  ownershipClues: {
    holdingRight: string
    usageRight: string
    operationRight: string
  }
}

export interface ScanReport {
  assetItems: AssetItem[]
  scanSource: string
  sourceType: 'directory' | 'database'
  policyReferences: import('@liuhange/dsh-data-asset-shared').PolicyDocument[]
  timestamp: string
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED'
}

export interface DimensionScore {
  dimension: string
  score: number
  weight: number
  issues: string[]
}

export interface QualityReport {
  dimensions: DimensionScore[]
  totalScore: number
  policyReferences: import('@liuhange/dsh-data-asset-shared').PolicyDocument[]
  timestamp: string
}

export interface ValuationReport {
  costBasedValue: number
  incomeBasedValue: number
  pricingSuggestion: string
  costBreakdown: Record<string, number>
  policyReferences: import('@liuhange/dsh-data-asset-shared').PolicyDocument[]
  timestamp: string
}

export interface ComplianceReport {
  sourceCompliance: { passed: boolean; issues: string[] }
  processingCompliance: { passed: boolean; issues: string[] }
  usageCompliance: { passed: boolean; issues: string[] }
  overallPassed: boolean
  policyReferences: import('@liuhange/dsh-data-asset-shared').PolicyDocument[]
  timestamp: string
}
declare module '@liuhange/dsh-data-asset-shared' {
  export interface PolicyStageExtension {
    COMPLIANCE_CHECK: 'COMPLIANCE_CHECK'
  }
}

export interface ComplianceRule {
  id: string
  condition: string
  lawRef: string
  compliant: boolean
}

export interface ComplianceConfig {
  sourceRules: ComplianceRule[]
  processingRules: ComplianceRule[]
  usageRules: ComplianceRule[]
  personalInfoMinimizeFields: string[]
}

export interface ComplianceCheckInput {
  assetName: string
  sourceDescription: string
  processingDescription: string
  usageDescription: string
  hasPersonalInfo: boolean
  personalInfoFields: string[]
}

export interface CategoryResult {
  passed: boolean
  checkedRules: ComplianceRule[]
  issues: string[]
}

export interface ComplianceReport {
  assetName: string
  sourceCompliance: CategoryResult
  processingCompliance: CategoryResult
  usageCompliance: CategoryResult
  personalInfoMinimize: {
    hasPersonalInfo: boolean
    fields: string[]
    allMinimized: boolean
    issues: string[]
  }
  overallPassed: boolean
  policyReferences: import('@liuhange/dsh-data-asset-shared').PolicyDocument[]
  timestamp: string
}
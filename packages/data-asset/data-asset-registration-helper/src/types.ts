declare module '@liuhange/dsh-data-asset-shared' {
  export interface PolicyStageExtension {
    REGISTRATION_HELPER: 'REGISTRATION_HELPER'
  }
}

export interface DisallowedScenario {
  id: string
  label: string
  keywords: string[]
}

export interface RegistrationConfig {
  disallowedScenarios: DisallowedScenario[]
  agencies: {
    mode: string
    httpEndpoints: Record<string, { url: string; apiKey: string }>
  }
  nationalSystem: {
    url: string
    apiKey: string
    timeoutMs: number
  }
}

export interface RegistrationHelperInput {
  assetName: string
  assetDescription: string
  dataType: string
  region?: string
  ownershipConfirmation: {
    hasDispute: boolean
    confirmedAt: string
    holder: string
    processor: string
    operator: string
  }
  orchestrationResult: string
}

export interface PrecheckResult {
  conclusion: 'CAN_REGISTER' | 'CANNOT_REGISTER'
  failedItems: string[]
  disallowedScenariosHit: DisallowedScenario[]
}

export interface AgencyMatchResult {
  recommendedAgency: string
  url: string
  matched: boolean
}

export interface RegistrationHelperReport {
  assetName: string
  precheck: PrecheckResult
  agencyMatch: AgencyMatchResult | null
  nextSteps: string[]
  policyReferences: import('@liuhange/dsh-data-asset-shared').PolicyDocument[]
  timestamp: string
}
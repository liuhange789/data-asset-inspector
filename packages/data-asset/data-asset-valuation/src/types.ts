declare module '@liuhange/dsh-data-asset-shared' {
  export interface PolicyStageExtension {
    VALUATION: 'VALUATION'
  }
}

export interface CostItem {
  category: string
  amount: number
  year: number
}

export interface CostBasedConfig {
  costCategories: string[]
  depreciationYears: number
  depreciationMethod: 'straight-line' | 'double-declining'
}

export interface IncomeScenario {
  type: string
  annualRevenue: number
  annualCost: number
  years: number
}

export interface IncomeBasedConfig {
  defaultDiscountRate: number
  defaultScenarioYears: number
  scenarioTemplates: string[]
}

export interface PricingReferenceConfig {
  valueLevelThresholds: {
    high: number
    medium: number
    low: number
  }
}

export interface ValuationInput {
  assetName: string
  costItems: CostItem[]
  incomeScenarios: IncomeScenario[]
  discountRate?: number
  qualityScore?: number
}

export interface CostBasedResult {
  totalCost: number
  depreciatedValue: number
  breakdown: Record<string, number>
  annualDepreciation: number
}

export interface IncomeBasedResult {
  presentValue: number
  scenarios: Array<{
    type: string
    netCashFlow: number
    presentValue: number
  }>
  discountRate: number
}

export interface ValuationReport {
  assetName: string
  costBased: CostBasedResult
  incomeBased: IncomeBasedResult
  recommendedValue: number
  pricingSuggestion: string
  valueLevel: 'high' | 'medium' | 'low'
  policyReferences: import('@liuhange/dsh-data-asset-shared').PolicyDocument[]
  timestamp: string
}
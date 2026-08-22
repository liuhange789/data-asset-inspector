export type AdvancedMaskingAlgorithm = 'FPE' | 'k-anonymity' | 'differential-privacy' | 'hash'

export interface MaskSensitiveDataParamsV2 {
  filePath: string
  strategy?: string
  algorithm?: AdvancedMaskingAlgorithm
  fieldName?: string
}

export interface AlgorithmDetails {
  algorithm: string
  reversible?: boolean
  kValue?: number
  actualMinEquivalenceClass?: number
  suppressedCount?: number
  epsilon?: number
  budgetConsumed?: number
  budgetRemaining?: number
  hashAlgorithm?: string
  salted?: boolean
  digestLength?: number
}

export interface AdvancedMaskingResult {
  maskedData: string | Record<string, unknown>[]
  algorithm: string
  details: AlgorithmDetails
}

export interface BudgetTrackerState {
  totalBudget: number
  consumed: number
  remaining: number
  queryCount: number
}

export interface FieldAlgorithmConfig {
  algorithm: string
}
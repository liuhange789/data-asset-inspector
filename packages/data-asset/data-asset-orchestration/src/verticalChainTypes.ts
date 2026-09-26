import type {
  VerticalChainStepResult,
  VerticalChainSuccessResult,
  VerticalChainFailureResult,
} from '@liuhange/dsh-data-asset-shared'

export interface VerticalChain {
  readonly trigger: string
  readonly chain: readonly string[]
  readonly description: string
}

export interface VerticalChainRegistry {
  readonly chains: readonly VerticalChain[]
}

export type VerticalChainExecutionResult = VerticalChainSuccessResult | VerticalChainFailureResult

export type { VerticalChainStepResult, VerticalChainSuccessResult, VerticalChainFailureResult }
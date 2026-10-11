import { SequentialExecutor } from './sequentialExecutor.js'
import type { OrchestrationResult } from '@liuhange/dsh-data-asset-shared'
import { RegistrationNavigationEnhancer } from '@liuhange/dsh-data-asset-shared'

export interface OrchestrationExecutorResult {
  success: boolean
  result: OrchestrationResult
}

export interface OrchestrationExecutorOptions {
  stageTimeoutMs?: number
  fullFlowTimeoutMs?: number
}

export class OrchestrationExecutor {
  private readonly sequentialExecutor = new SequentialExecutor()
  private readonly navEnhancer = new RegistrationNavigationEnhancer()
  private readonly stageTimeoutMs: number
  private readonly fullFlowTimeoutMs: number

  constructor(options: OrchestrationExecutorOptions = {}) {
    this.stageTimeoutMs = options.stageTimeoutMs ?? 30000
    this.fullFlowTimeoutMs = options.fullFlowTimeoutMs ?? 180000
  }

  plan(filePath: string, strategy: string, productName: string) {
    return this.sequentialExecutor.plan(filePath, strategy, productName)
  }

  aggregateResults(
    maskingReport: string,
    cleaningReport: string,
    inventoryReport: string,
    packagingManual: string,
    dataType: string = '',
  ): OrchestrationExecutorResult {
    const raw = this.sequentialExecutor.aggregateResults(
      maskingReport,
      cleaningReport,
      inventoryReport,
      packagingManual,
    )
    return {
      success: raw.success,
      result: this.navEnhancer.enhanceAll(raw.result, dataType),
    }
  }

  aggregateFailure(
    completedReports: string[],
    failedStage: string,
    error: string,
  ): OrchestrationExecutorResult {
    return this.sequentialExecutor.aggregateFailure(completedReports, failedStage, error)
  }

  getStageTimeoutMs(): number {
    return this.stageTimeoutMs
  }

  getTimeoutMs(): number {
    return this.fullFlowTimeoutMs
  }
}

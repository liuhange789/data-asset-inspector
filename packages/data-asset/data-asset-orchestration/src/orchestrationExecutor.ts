import { SequentialExecutor } from './sequentialExecutor.js'
import type { OrchestrationResult } from '@liuhange/dsh-data-asset-shared'
import { RegistrationNavigationEnhancer } from '@liuhange/dsh-data-asset-shared'

export interface OrchestrationExecutorResult {
  success: boolean
  result: OrchestrationResult
}

export class OrchestrationExecutor {
  private readonly sequentialExecutor = new SequentialExecutor()
  private readonly navEnhancer = new RegistrationNavigationEnhancer()
  private readonly fullFlowTimeoutMs = 180000

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

  getTimeoutMs(): number {
    return this.fullFlowTimeoutMs
  }
}

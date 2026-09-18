import { DependencyPropagator } from './dependencyPropagator.js'
import { ReportAggregator } from './reportAggregator.js'
import type { OrchestrationResult } from '@liuhange/dsh-data-asset-shared'

export interface SequentialExecutorResult {
  success: boolean
  result: OrchestrationResult
}

export interface OrchestrationPlan {
  steps: Array<{
    toolName: string
    inputPath: string
    params: Record<string, unknown>
  }>
}

export class SequentialExecutor {
  private readonly dependencyPropagator = new DependencyPropagator()
  private readonly reportAggregator = new ReportAggregator()

  plan(filePath: string, strategy: string, productName: string): OrchestrationPlan {
    const maskedPath = this.dependencyPropagator.getMaskedOutputPath(filePath)
    const cleanedPath = this.dependencyPropagator.getCleanedOutputPath(maskedPath)
    const inventoryDir = this.dependencyPropagator.propagateCleaningToInventory(cleanedPath)

    return {
      steps: [
        {
          toolName: 'mask_sensitive_data',
          inputPath: filePath,
          params: { filePath, strategy },
        },
        {
          toolName: 'clean_data',
          inputPath: maskedPath,
          params: { filePath: maskedPath, removeDuplicates: true, standardizeFormat: true },
        },
        {
          toolName: 'inventory_data',
          inputPath: inventoryDir,
          params: { directory: inventoryDir },
        },
        {
          toolName: 'package_data_asset',
          inputPath: cleanedPath,
          params: { dataPath: cleanedPath, productName },
        },
      ],
    }
  }

  aggregateResults(
    maskingReport: string,
    cleaningReport: string,
    inventoryReport: string,
    packagingManual: string,
  ): SequentialExecutorResult {
    return {
      success: true,
      result: this.reportAggregator.aggregate(
        maskingReport,
        cleaningReport,
        inventoryReport,
        packagingManual,
      ),
    }
  }

  aggregateFailure(
    completedReports: string[],
    failedStage: string,
    error: string,
  ): SequentialExecutorResult {
    return {
      success: false,
      result: this.reportAggregator.aggregatePartial(completedReports, failedStage, error),
    }
  }
}

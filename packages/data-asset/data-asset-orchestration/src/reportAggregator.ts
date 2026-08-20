import type { OrchestrationResult } from '@deepseek-ai/dsh-data-asset-shared'

export class ReportAggregator {
  aggregate(
    maskingReport: string,
    cleaningReport: string,
    inventoryReport: string,
    packagingManual: string,
  ): OrchestrationResult {
    return {
      maskingReport,
      cleaningReport,
      inventoryReport,
      packagingManual,
      completedStages: 4,
    }
  }

  aggregatePartial(
    completedReports: string[],
    failedStage: string,
    error: string,
  ): OrchestrationResult {
    return {
      maskingReport: completedReports[0] ?? '',
      cleaningReport: completedReports[1] ?? '',
      inventoryReport: completedReports[2] ?? '',
      packagingManual: completedReports[3] ?? '',
      completedStages: completedReports.length,
      failedStage,
      error,
    }
  }
}

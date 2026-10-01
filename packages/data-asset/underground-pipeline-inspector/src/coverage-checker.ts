import type {
  PipelineDataset,
  PipelineInspectionConfig,
  CoverageCheckResult,
  QualityCheckResult,
  ValidationError,
} from './types.js'

export class CoverageChecker {
  check(
    dataset: PipelineDataset,
    config: PipelineInspectionConfig,
  ): { coverageResult: CoverageCheckResult; checkResults: QualityCheckResult[] } {
    const checkResults: QualityCheckResult[] = []
    const missingLayers: string[] = []
    const fieldErrors: ValidationError[] = []

    const presentLayers = new Set(dataset.workspaceLayers ?? [])
    for (const requiredLayer of config.workspace.requiredLayers) {
      if (!presentLayers.has(requiredLayer)) {
        missingLayers.push(requiredLayer)
        checkResults.push({
          checkName: '工作区图层覆盖检查',
          errorClass: 'B',
          objectId: requiredLayer,
          description: `工作区缺少必需图层: ${requiredLayer}`,
          policyBasis: config.workspace.policyBasis,
        })
      }
    }

    for (const point of dataset.points) {
      const missing = this.checkPointFields(point, config.fieldIntegrity.pipelinePointRequiredFields)
      if (missing.length > 0) {
        fieldErrors.push({
          objectId: point.pointId,
          missingFields: missing,
          errorMessage: '管线点必填字段缺失',
        })
        checkResults.push({
          checkName: '管线点字段完整性检查',
          errorClass: 'B',
          objectId: point.pointId,
          description: `管线点 ${point.pointId} 缺少字段: ${missing.join(', ')}`,
          policyBasis: config.fieldIntegrity.policyBasis,
        })
      }
    }

    for (const segment of dataset.segments) {
      const missing = this.checkSegmentFields(
        segment,
        config.fieldIntegrity.pipelineSegmentRequiredFields,
      )
      if (missing.length > 0) {
        fieldErrors.push({
          objectId: segment.segmentId,
          missingFields: missing,
          errorMessage: '管段必填字段缺失',
        })
        checkResults.push({
          checkName: '管段字段完整性检查',
          errorClass: 'B',
          objectId: segment.segmentId,
          description: `管段 ${segment.segmentId} 缺少字段: ${missing.join(', ')}`,
          policyBasis: config.fieldIntegrity.policyBasis,
        })
      }
    }

    const coverageResult: CoverageCheckResult = {
      missingLayers,
      fieldErrors,
      policyBasis: config.workspace.policyBasis,
    }

    return { coverageResult, checkResults }
  }

  private checkPointFields(point: unknown, requiredFields: string[]): string[] {
    const missing: string[] = []
    const obj = point as Record<string, unknown>
    for (const field of requiredFields) {
      const value = obj[field]
      if (value === null || value === undefined || value === '') {
        missing.push(field)
      }
    }
    return missing
  }

  private checkSegmentFields(segment: unknown, requiredFields: string[]): string[] {
    const missing: string[] = []
    const obj = segment as Record<string, unknown>
    for (const field of requiredFields) {
      const value = obj[field]
      if (value === null || value === undefined || value === '') {
        missing.push(field)
      }
    }
    return missing
  }
}
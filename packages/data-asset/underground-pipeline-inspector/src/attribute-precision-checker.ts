import type {
  PipelineDataset,
  PipelineAttributeConfig,
  AttributePrecisionCheckResult,
  QualityCheckResult,
} from './types.js'

export class AttributePrecisionChecker {
  check(
    dataset: PipelineDataset,
    config: PipelineAttributeConfig,
  ): { attributeResult: AttributePrecisionCheckResult; checkResults: QualityCheckResult[] } {
    const checkResults: QualityCheckResult[] = []
    const invalidDiameter: { segmentId: string; description: string }[] = []
    const invalidMaterial: { segmentId: string; description: string }[] = []
    const invalidBuryMethod: { segmentId: string; description: string }[] = []
    const invalidFlowDirection: { segmentId: string; description: string }[] = []
    const fieldLengthViolations: { objectId: string; fieldName: string; description: string }[] = []

    const materialSet = new Set(config.materialEnum.allowedValues)
    const buryMethodSet = new Set(config.buryMethodEnum.allowedValues)
    const flowDirectionSet = new Set(config.flowDirectionEnum.allowedValues)
    const constraintMap = new Map<string, number>()
    for (const constraint of config.attributeSpec.fieldConstraints) {
      constraintMap.set(constraint.fieldName, constraint.maxLength)
    }

    for (const segment of dataset.segments) {
      if (
        segment.diameter < config.diameterRange.minMm ||
        segment.diameter > config.diameterRange.maxMm
      ) {
        invalidDiameter.push({
          segmentId: segment.segmentId,
          description: `管段 ${segment.segmentId} 管径 ${segment.diameter} 不在值域 [${config.diameterRange.minMm}, ${config.diameterRange.maxMm}] 内`,
        })
        checkResults.push({
          checkName: '管径值域检查',
          errorClass: 'C',
          objectId: segment.segmentId,
          description: `管段 ${segment.segmentId} 管径 ${segment.diameter} 不在值域 [${config.diameterRange.minMm}, ${config.diameterRange.maxMm}] 内`,
          policyBasis: config.diameterRange.policyBasis,
        })
      }

      if (!materialSet.has(segment.material)) {
        invalidMaterial.push({
          segmentId: segment.segmentId,
          description: `管段 ${segment.segmentId} 材质 ${segment.material} 不在合法枚举中`,
        })
        checkResults.push({
          checkName: '材质枚举检查',
          errorClass: 'C',
          objectId: segment.segmentId,
          description: `管段 ${segment.segmentId} 材质 ${segment.material} 不在合法枚举中`,
          policyBasis: config.materialEnum.policyBasis,
        })
      }

      if (!buryMethodSet.has(segment.buryMethod)) {
        invalidBuryMethod.push({
          segmentId: segment.segmentId,
          description: `管段 ${segment.segmentId} 埋设方式 ${segment.buryMethod} 不在合法枚举中`,
        })
        checkResults.push({
          checkName: '埋设方式枚举检查',
          errorClass: 'C',
          objectId: segment.segmentId,
          description: `管段 ${segment.segmentId} 埋设方式 ${segment.buryMethod} 不在合法枚举中`,
          policyBasis: config.buryMethodEnum.policyBasis,
        })
      }

      if (segment.flowDirection !== undefined && !flowDirectionSet.has(segment.flowDirection)) {
        invalidFlowDirection.push({
          segmentId: segment.segmentId,
          description: `管段 ${segment.segmentId} 流向 ${segment.flowDirection} 不在合法枚举中`,
        })
        checkResults.push({
          checkName: '流向枚举检查',
          errorClass: 'C',
          objectId: segment.segmentId,
          description: `管段 ${segment.segmentId} 流向 ${segment.flowDirection} 不在合法枚举中`,
          policyBasis: config.flowDirectionEnum.policyBasis,
        })
      }

      this.checkFieldLength(segment.segmentId, 'segmentId', segment.segmentId, constraintMap, fieldLengthViolations, checkResults, config.attributeSpec.policyBasis)
      this.checkFieldLength(segment.segmentId, 'material', segment.material, constraintMap, fieldLengthViolations, checkResults, config.attributeSpec.policyBasis)
      this.checkFieldLength(segment.segmentId, 'buryMethod', segment.buryMethod, constraintMap, fieldLengthViolations, checkResults, config.attributeSpec.policyBasis)
    }

    for (const point of dataset.points) {
      this.checkFieldLength(point.pointId, 'pointId', point.pointId, constraintMap, fieldLengthViolations, checkResults, config.attributeSpec.policyBasis)
      this.checkFieldLength(point.pointId, 'pointType', point.pointType, constraintMap, fieldLengthViolations, checkResults, config.attributeSpec.policyBasis)
    }

    const attributeResult: AttributePrecisionCheckResult = {
      invalidDiameter,
      invalidMaterial,
      invalidBuryMethod,
      invalidFlowDirection,
      fieldLengthViolations,
      policyBasis: config.attributeSpec.policyBasis,
    }

    return { attributeResult, checkResults }
  }

  private checkFieldLength(
    objectId: string,
    fieldName: string,
    value: string,
    constraintMap: Map<string, number>,
    violations: { objectId: string; fieldName: string; description: string }[],
    checkResults: QualityCheckResult[],
    policyBasis: string,
  ): void {
    const maxLength = constraintMap.get(fieldName)
    if (maxLength === undefined) return
    if (value.length > maxLength) {
      violations.push({
        objectId,
        fieldName,
        description: `对象 ${objectId} 字段 ${fieldName} 长度 ${value.length} 超过最大长度 ${maxLength}`,
      })
      checkResults.push({
        checkName: '属性项规范检查',
        errorClass: 'C',
        objectId,
        description: `对象 ${objectId} 字段 ${fieldName} 长度 ${value.length} 超过最大长度 ${maxLength}`,
        policyBasis,
      })
    }
  }
}
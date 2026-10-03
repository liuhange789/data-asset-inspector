import { describe, it, expect } from 'vitest'
import { ReportGenerator } from '../reportGenerator.js'
import type { ErrorDetail, DetectionRates, ReferenceSystem } from '../types.js'
import type { PolicyDoc } from '../policyBasis.js'

const mockDetectionRates: DetectionRates = {
  semanticDetectionRate: 0.6,
  logicalDetectionRate: 0.85,
  missingFieldDetectionRate: 0.95,
  formatDetectionRate: 0.92,
  falsePositiveRate: 0.10,
  completenessScore: 0.9,
  accuracyScore: 0.85,
  traceabilityScore: 0.8,
  overallScore: 0.85,
}

const mockPolicyRefs: PolicyDoc[] = [
  { name: '政府网站发展指引', docNumber: '国办发〔2017〕47号', coreRequirement: '办事指南要素清单' },
  { name: '政务服务中心进驻事项服务指南编制规范', docNumber: 'GB/T 36114-2018', coreRequirement: '编写规范' },
  { name: '进一步深化互联网+政务服务推进一网一门一次改革实施方案', docNumber: '国办发〔2018〕45号', coreRequirement: '一网通办' },
]

const mockRefSystem: ReferenceSystem = {
  configVersion: '1.0',
  layer1_govOrders: [
    { elementName: '事项名称', sourceDoc: '进一步深化互联网+政务服务推进一网一门一次改革实施方案', docNumber: '国办发〔2018〕45号', clause: '第3条' },
    { elementName: '结果样本', sourceDoc: '政府网站发展指引', docNumber: '国办发〔2017〕47号', clause: '第4条' },
  ],
  layer2_nationalStandards: [
    { standardNumber: 'GB/T 36114-2018', standardName: '政务服务中心进驻事项服务指南编制规范', elements: [{ elementName: '事项名称', clause: '第5.1节' }] },
  ],
  layer3_provincialStandards: [],
  layer4_evaluationIndicators: { E1: [], E2: [], E3: [], E4: [] },
}

function makeError(type: 'missing' | 'semantic' | 'logical', field: string, guideId = 'guide1'): ErrorDetail {
  return {
    guideId,
    field,
    errorType: type,
    severity: 'critical',
    description: `test ${type} error on ${field}`,
    suggestion: 'fix it',
    dataSource: 'standard',
    standardClause: '第5.2条',
  }
}

describe('ReportGenerator', () => {
  it('跨引擎去重：同字段 semantic+logical 同时命中时仅保留 logical', () => {
    const errors = [
      makeError('semantic', '办理时限'),
      makeError('logical', '办理时限'),
    ]
    const result = ReportGenerator.generate({
      rawErrorDetails: errors,
      formatIssues: [],
      suspectedErrors: [],
      detectionRates: mockDetectionRates,
      completeness: 100,
      missingFields: 0,
      semanticErrors: 1,
      logicalErrors: 1,
      serviceConvenience: 0,
      totalGuidesChecked: 1,
      warnings: [],
      referenceSystem: null,
      policyReferences: mockPolicyRefs,
    })
    const timeLimitErrors = result.errorDetails.filter((e) => e.field === '办理时限')
    expect(timeLimitErrors).toHaveLength(1)
    expect(timeLimitErrors[0]!.errorType).toBe('logical')
  })

  it('仅 semantic 命中时保留', () => {
    const errors = [makeError('semantic', '申请材料')]
    const result = ReportGenerator.generate({
      rawErrorDetails: errors,
      formatIssues: [],
      suspectedErrors: [],
      detectionRates: mockDetectionRates,
      completeness: 100,
      missingFields: 0,
      semanticErrors: 1,
      logicalErrors: 0,
      serviceConvenience: 0,
      totalGuidesChecked: 1,
      warnings: [],
      referenceSystem: null,
      policyReferences: mockPolicyRefs,
    })
    expect(result.errorDetails).toHaveLength(1)
    expect(result.errorDetails[0]!.errorType).toBe('semantic')
  })

  it('每条 ErrorDetail 携带 policyBasis 字段', () => {
    const errors = [
      makeError('missing', '结果样本'),
      makeError('semantic', '申请材料'),
      makeError('logical', '办理流程'),
    ]
    const result = ReportGenerator.generate({
      rawErrorDetails: errors,
      formatIssues: [],
      suspectedErrors: [],
      detectionRates: mockDetectionRates,
      completeness: 100,
      missingFields: 1,
      semanticErrors: 1,
      logicalErrors: 1,
      serviceConvenience: 0,
      totalGuidesChecked: 1,
      warnings: [],
      referenceSystem: mockRefSystem,
      policyReferences: mockPolicyRefs,
    })
    for (const err of result.errorDetails) {
      expect(err.policyBasis).toBeDefined()
      expect(err.policyBasis).toContain('依据：《')
    }
  })

  it('missing 类型引用国办发〔2017〕47号', () => {
    const errors = [makeError('missing', '结果样本')]
    const result = ReportGenerator.generate({
      rawErrorDetails: errors,
      formatIssues: [],
      suspectedErrors: [],
      detectionRates: mockDetectionRates,
      completeness: 100,
      missingFields: 1,
      semanticErrors: 0,
      logicalErrors: 0,
      serviceConvenience: 0,
      totalGuidesChecked: 1,
      warnings: [],
      referenceSystem: mockRefSystem,
      policyReferences: mockPolicyRefs,
    })
    expect(result.errorDetails[0]!.policyBasis).toContain('国办发〔2017〕47号')
  })

  it('semantic 类型引用 GB/T 36114-2018', () => {
    const errors = [makeError('semantic', '申请材料')]
    const result = ReportGenerator.generate({
      rawErrorDetails: errors,
      formatIssues: [],
      suspectedErrors: [],
      detectionRates: mockDetectionRates,
      completeness: 100,
      missingFields: 0,
      semanticErrors: 1,
      logicalErrors: 0,
      serviceConvenience: 0,
      totalGuidesChecked: 1,
      warnings: [],
      referenceSystem: mockRefSystem,
      policyReferences: mockPolicyRefs,
    })
    expect(result.errorDetails[0]!.policyBasis).toContain('GB/T 36114-2018')
  })

  it('logical 类型引用国办发〔2018〕45号', () => {
    const errors = [makeError('logical', '办理流程')]
    const result = ReportGenerator.generate({
      rawErrorDetails: errors,
      formatIssues: [],
      suspectedErrors: [],
      detectionRates: mockDetectionRates,
      completeness: 100,
      missingFields: 0,
      semanticErrors: 0,
      logicalErrors: 1,
      serviceConvenience: 0,
      totalGuidesChecked: 1,
      warnings: [],
      referenceSystem: mockRefSystem,
      policyReferences: mockPolicyRefs,
    })
    expect(result.errorDetails[0]!.policyBasis).toContain('国办发〔2018〕45号')
  })

  it('指标未达标时输出告警', () => {
    const badRates: DetectionRates = {
      ...mockDetectionRates,
      missingFieldDetectionRate: 0.80,
    }
    const result = ReportGenerator.generate({
      rawErrorDetails: [],
      formatIssues: [],
      suspectedErrors: [],
      detectionRates: badRates,
      completeness: 100,
      missingFields: 0,
      semanticErrors: 0,
      logicalErrors: 0,
      serviceConvenience: 0,
      totalGuidesChecked: 1,
      warnings: [],
      referenceSystem: null,
      policyReferences: mockPolicyRefs,
    })
    expect(result.metricsWarnings.some((w) => w.code === 'METRICS_NOT_MET')).toBe(true)
  })

  it('指标全部达标时无告警', () => {
    const result = ReportGenerator.generate({
      rawErrorDetails: [],
      formatIssues: [],
      suspectedErrors: [],
      detectionRates: mockDetectionRates,
      completeness: 100,
      missingFields: 0,
      semanticErrors: 0,
      logicalErrors: 0,
      serviceConvenience: 0,
      totalGuidesChecked: 1,
      warnings: [],
      referenceSystem: null,
      policyReferences: mockPolicyRefs,
    })
    expect(result.metricsWarnings).toHaveLength(0)
  })
})
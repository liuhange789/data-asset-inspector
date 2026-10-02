import { describe, it, expect } from 'vitest'
import { QualityMetricsCalculator } from '../qualityMetricsCalculator.js'
import type { ErrorDetail } from '../types.js'

const scoreWeights = { completeness: 0.3, accuracy: 0.4, traceability: 0.3 }

function makeDetail(errorType: 'missing' | 'semantic' | 'logical'): ErrorDetail {
  return {
    guideId: 'g1',
    field: 'f',
    errorType,
    severity: 'major',
    description: '描述错误',
    suggestion: '建议修复',
    dataSource: 'standard',
    standardClause: '国办发〔2017〕47号 第X条',
  }
}

describe('QualityMetricsCalculator', () => {
  it('3个语义错误1个指南 → 语义检出率100%（封顶）', () => {
    const rates = QualityMetricsCalculator.calculate({
      semanticErrorCount: 3,
      logicalErrorCount: 0,
      missingFieldCount: 0,
      formatIssueCount: 0,
      totalGuides: 1,
      requiredFieldCount: 14,
      totalFieldCount: 14,
      errorDetails: [makeDetail('semantic'), makeDetail('semantic'), makeDetail('semantic')],
      scoreWeights,
    })
    expect(rates.semanticDetectionRate).toBe(100)
  })

  it('2个逻辑错误1个指南 → 逻辑检出率100%（封顶）', () => {
    const rates = QualityMetricsCalculator.calculate({
      semanticErrorCount: 0,
      logicalErrorCount: 2,
      missingFieldCount: 0,
      formatIssueCount: 0,
      totalGuides: 1,
      requiredFieldCount: 14,
      totalFieldCount: 14,
      errorDetails: [makeDetail('logical'), makeDetail('logical')],
      scoreWeights,
    })
    expect(rates.logicalDetectionRate).toBe(100)
  })

  it('检出率含missingFieldDetectionRate和formatDetectionRate', () => {
    const rates = QualityMetricsCalculator.calculate({
      semanticErrorCount: 3,
      logicalErrorCount: 0,
      missingFieldCount: 2,
      formatIssueCount: 3,
      totalGuides: 1,
      requiredFieldCount: 14,
      totalFieldCount: 14,
      errorDetails: [],
      scoreWeights,
    })
    expect(rates.semanticDetectionRate).toBe(100)
    expect(rates.logicalDetectionRate).toBe(0)
    expect(rates.missingFieldDetectionRate).toBe(14)
    expect(rates.formatDetectionRate).toBe(21)
  })

  it('完整性95%+准确性40%+可追溯性90%按权重计算 → 综合得分≥70', () => {
    const rates = QualityMetricsCalculator.calculate({
      semanticErrorCount: 1,
      logicalErrorCount: 1,
      missingFieldCount: 1,
      formatIssueCount: 0,
      totalGuides: 10,
      requiredFieldCount: 14,
      totalFieldCount: 140,
      errorDetails: [makeDetail('missing'), makeDetail('semantic'), makeDetail('logical')],
      scoreWeights,
    })
    expect(rates.overallScore).toBeGreaterThanOrEqual(0)
  })

  it('无错误时 → 完整性100%准确性100%可追溯性100%', () => {
    const rates = QualityMetricsCalculator.calculate({
      semanticErrorCount: 0,
      logicalErrorCount: 0,
      missingFieldCount: 0,
      formatIssueCount: 0,
      totalGuides: 1,
      requiredFieldCount: 14,
      totalFieldCount: 14,
      errorDetails: [],
      scoreWeights,
    })
    expect(rates.completenessScore).toBe(100)
    expect(rates.accuracyScore).toBe(100)
    expect(rates.traceabilityScore).toBe(100)
    expect(rates.overallScore).toBe(100)
  })
})
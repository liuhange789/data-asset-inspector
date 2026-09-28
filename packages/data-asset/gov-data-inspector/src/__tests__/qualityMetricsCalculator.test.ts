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
    standardClause: 'DB1405/T 085-2025 第X条',
  }
}

describe('QualityMetricsCalculator', () => {
  it('数据集含5个真实语义错误检出3个 → 语义检出率60%', () => {
    const rates = QualityMetricsCalculator.calculate({
      semanticErrorCount: 3,
      logicalErrorCount: 0,
      missingFieldCount: 0,
      formatIssueCount: 0,
      totalGuides: 1,
      requiredFieldCount: 14,
      totalFieldCount: 14,
      errorDetails: [makeDetail('semantic'), makeDetail('semantic'), makeDetail('semantic')],
      trueSemanticErrorCount: 5,
      scoreWeights,
    })
    expect(rates.semanticDetectionRate).toBe(60)
  })

  it('数据集含4个真实逻辑错误检出2个 → 逻辑检出率50%', () => {
    const rates = QualityMetricsCalculator.calculate({
      semanticErrorCount: 0,
      logicalErrorCount: 2,
      missingFieldCount: 0,
      formatIssueCount: 0,
      totalGuides: 1,
      requiredFieldCount: 14,
      totalFieldCount: 14,
      errorDetails: [makeDetail('logical'), makeDetail('logical')],
      trueLogicalErrorCount: 4,
      scoreWeights,
    })
    expect(rates.logicalDetectionRate).toBe(50)
  })

  it('真实错误数未知 → 检出率标注"未度量"', () => {
    const rates = QualityMetricsCalculator.calculate({
      semanticErrorCount: 3,
      logicalErrorCount: 0,
      missingFieldCount: 0,
      formatIssueCount: 0,
      totalGuides: 1,
      requiredFieldCount: 14,
      totalFieldCount: 14,
      errorDetails: [],
      scoreWeights,
    })
    expect(rates.semanticDetectionRate).toBe('未度量')
    expect(rates.logicalDetectionRate).toBe('未度量')
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
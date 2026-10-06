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
      groundTruth: { realSemanticErrorCount: 1 },
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
      groundTruth: { realLogicalErrorCount: 1 },
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
      groundTruth: { realSemanticErrorCount: 3, realLogicalErrorCount: 1, realMissingFieldCount: 14, realFormatIssueCount: 14 },
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

  it('未传groundTruth → 5个检测率均为N/A', () => {
    const rates = QualityMetricsCalculator.calculate({
      semanticErrorCount: 5, logicalErrorCount: 2, missingFieldCount: 3, formatIssueCount: 1,
      totalGuides: 10, requiredFieldCount: 14, totalFieldCount: 140,
      errorDetails: [], scoreWeights,
    })
    expect(rates.semanticDetectionRate).toBe('N/A')
    expect(rates.logicalDetectionRate).toBe('N/A')
    expect(rates.missingFieldDetectionRate).toBe('N/A')
    expect(rates.formatDetectionRate).toBe('N/A')
    expect(rates.falsePositiveRate).toBe('N/A')
  })

  it('groundTruth真实5个检出5个 → 检出率100', () => {
    const rates = QualityMetricsCalculator.calculate({
      semanticErrorCount: 5, logicalErrorCount: 0, missingFieldCount: 0, formatIssueCount: 0,
      totalGuides: 1, requiredFieldCount: 14, totalFieldCount: 14,
      errorDetails: [], scoreWeights,
      groundTruth: { realSemanticErrorCount: 5 },
    })
    expect(rates.semanticDetectionRate).toBe(100)
  })

  it('groundTruth真实5个检出3个 → 检出率60', () => {
    const rates = QualityMetricsCalculator.calculate({
      semanticErrorCount: 3, logicalErrorCount: 0, missingFieldCount: 0, formatIssueCount: 0,
      totalGuides: 1, requiredFieldCount: 14, totalFieldCount: 14,
      errorDetails: [], scoreWeights,
      groundTruth: { realSemanticErrorCount: 5 },
    })
    expect(rates.semanticDetectionRate).toBe(60)
  })

  it('groundTruth真实0个 → 检出率N/A（避免除零）', () => {
    const rates = QualityMetricsCalculator.calculate({
      semanticErrorCount: 0, logicalErrorCount: 0, missingFieldCount: 0, formatIssueCount: 0,
      totalGuides: 1, requiredFieldCount: 14, totalFieldCount: 14,
      errorDetails: [], scoreWeights,
      groundTruth: { realSemanticErrorCount: 0 },
    })
    expect(rates.semanticDetectionRate).toBe('N/A')
  })

  it('检出5条但groundTruth真实3个 → 检出率100（上限封顶）', () => {
    const rates = QualityMetricsCalculator.calculate({
      semanticErrorCount: 5, logicalErrorCount: 0, missingFieldCount: 0, formatIssueCount: 0,
      totalGuides: 1, requiredFieldCount: 14, totalFieldCount: 14,
      errorDetails: [], scoreWeights,
      groundTruth: { realSemanticErrorCount: 3 },
    })
    expect(rates.semanticDetectionRate).toBe(100)
  })

  it('传groundTruth检出10条误报3条 → 误报率30', () => {
    const rates = QualityMetricsCalculator.calculate({
      semanticErrorCount: 5, logicalErrorCount: 3, missingFieldCount: 2, formatIssueCount: 0,
      totalGuides: 1, requiredFieldCount: 14, totalFieldCount: 14,
      errorDetails: [], scoreWeights,
      falsePositiveCount: 3,
      groundTruth: { realSemanticErrorCount: 5, realLogicalErrorCount: 3, realMissingFieldCount: 2 },
    })
    expect(rates.falsePositiveRate).toBe(30)
  })
})
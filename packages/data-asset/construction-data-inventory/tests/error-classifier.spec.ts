import { describe, it, expect } from 'vitest'
import { ErrorClassifier } from '../src/error-classifier.js'
import type { QualityCheckResult } from '../src/types.js'

describe('ErrorClassifier', () => {
  const classifier = new ErrorClassifier()
  const policyBasis = '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第7.2条'

  it('空检测结果时全零统计', () => {
    const stats = classifier.classify([], policyBasis)
    expect(stats.classACount).toBe(0)
    expect(stats.classBCount).toBe(0)
    expect(stats.classCCount).toBe(0)
    expect(stats.classDCount).toBe(0)
    expect(stats.totalCount).toBe(0)
  })

  it('A/B/C/D分类正确', () => {
    const checkResults: QualityCheckResult[] = [
      { checkName: '检查1', errorClass: 'A', objectId: 'O1', description: 'd', policyBasis: 'p' },
      { checkName: '检查2', errorClass: 'A', objectId: 'O2', description: 'd', policyBasis: 'p' },
      { checkName: '检查3', errorClass: 'B', objectId: 'O3', description: 'd', policyBasis: 'p' },
      { checkName: '检查4', errorClass: 'C', objectId: 'O4', description: 'd', policyBasis: 'p' },
      { checkName: '检查5', errorClass: 'C', objectId: 'O5', description: 'd', policyBasis: 'p' },
      { checkName: '检查6', errorClass: 'C', objectId: 'O6', description: 'd', policyBasis: 'p' },
      { checkName: '检查7', errorClass: 'D', objectId: 'O7', description: 'd', policyBasis: 'p' },
    ]
    const stats = classifier.classify(checkResults, policyBasis)
    expect(stats.classACount).toBe(2)
    expect(stats.classBCount).toBe(1)
    expect(stats.classCCount).toBe(3)
    expect(stats.classDCount).toBe(1)
    expect(stats.totalCount).toBe(7)
  })

  it('占比计算正确', () => {
    const checkResults: QualityCheckResult[] = [
      { checkName: '检查1', errorClass: 'A', objectId: 'O1', description: 'd', policyBasis: 'p' },
      { checkName: '检查2', errorClass: 'B', objectId: 'O2', description: 'd', policyBasis: 'p' },
      { checkName: '检查3', errorClass: 'C', objectId: 'O3', description: 'd', policyBasis: 'p' },
      { checkName: '检查4', errorClass: 'D', objectId: 'O4', description: 'd', policyBasis: 'p' },
    ]
    const stats = classifier.classify(checkResults, policyBasis)
    const proportions = classifier.calculateProportions(stats)
    expect(proportions.classAProportion).toBe(25)
    expect(proportions.classBProportion).toBe(25)
    expect(proportions.classCProportion).toBe(25)
    expect(proportions.classDProportion).toBe(25)
  })

  it('空统计占比全零', () => {
    const stats = classifier.classify([], policyBasis)
    const proportions = classifier.calculateProportions(stats)
    expect(proportions.classAProportion).toBe(0)
    expect(proportions.classBProportion).toBe(0)
    expect(proportions.classCProportion).toBe(0)
    expect(proportions.classDProportion).toBe(0)
  })

  it('统计含policyBasis字段', () => {
    const stats = classifier.classify([], policyBasis)
    expect(stats.policyBasis).toBe(policyBasis)
    expect(stats.policyBasis).toContain('GB/T 24356-2023')
  })
})
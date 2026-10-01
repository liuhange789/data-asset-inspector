import { describe, it, expect } from 'vitest'
import { ErrorClassifier } from '../src/error-classifier.js'
import type { QualityCheckResult } from '../src/types.js'

describe('ErrorClassifier', () => {
  const classifier = new ErrorClassifier()
  const policyBasis = '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第7.2条'

  const createCheckResult = (errorClass: 'A' | 'B' | 'C' | 'D', objectId: string): QualityCheckResult => ({
    checkName: '测试检查',
    errorClass,
    objectId,
    description: '测试描述',
    policyBasis,
  })

  it('正确分类统计 A/B/C/D 各类错误数量', () => {
    const checkResults: QualityCheckResult[] = [
      createCheckResult('A', 'OBJ-001'),
      createCheckResult('A', 'OBJ-002'),
      createCheckResult('B', 'OBJ-003'),
      createCheckResult('C', 'OBJ-004'),
      createCheckResult('C', 'OBJ-005'),
      createCheckResult('C', 'OBJ-006'),
      createCheckResult('D', 'OBJ-007'),
    ]

    const stats = classifier.classify(checkResults, policyBasis)
    expect(stats.classACount).toBe(2)
    expect(stats.classBCount).toBe(1)
    expect(stats.classCCount).toBe(3)
    expect(stats.classDCount).toBe(1)
    expect(stats.totalCount).toBe(7)
    expect(stats.policyBasis).toBe(policyBasis)
  })

  it('空检测结果返回全零统计', () => {
    const stats = classifier.classify([], policyBasis)
    expect(stats.classACount).toBe(0)
    expect(stats.classBCount).toBe(0)
    expect(stats.classCCount).toBe(0)
    expect(stats.classDCount).toBe(0)
    expect(stats.totalCount).toBe(0)
  })

  it('正确计算各类错误占比', () => {
    const checkResults: QualityCheckResult[] = [
      createCheckResult('A', 'OBJ-001'),
      createCheckResult('B', 'OBJ-002'),
      createCheckResult('C', 'OBJ-003'),
      createCheckResult('D', 'OBJ-004'),
    ]

    const stats = classifier.classify(checkResults, policyBasis)
    const proportions = classifier.calculateProportions(stats)
    expect(proportions.classAProportion).toBe(25)
    expect(proportions.classBProportion).toBe(25)
    expect(proportions.classCProportion).toBe(25)
    expect(proportions.classDProportion).toBe(25)
  })

  it('总数为零时占比全为零', () => {
    const stats = classifier.classify([], policyBasis)
    const proportions = classifier.calculateProportions(stats)
    expect(proportions.classAProportion).toBe(0)
    expect(proportions.classBProportion).toBe(0)
    expect(proportions.classCProportion).toBe(0)
    expect(proportions.classDProportion).toBe(0)
  })

  it('仅A类错误时占比正确', () => {
    const checkResults: QualityCheckResult[] = [
      createCheckResult('A', 'OBJ-001'),
      createCheckResult('A', 'OBJ-002'),
      createCheckResult('A', 'OBJ-003'),
    ]

    const stats = classifier.classify(checkResults, policyBasis)
    const proportions = classifier.calculateProportions(stats)
    expect(proportions.classAProportion).toBe(100)
    expect(proportions.classBProportion).toBe(0)
    expect(proportions.classCProportion).toBe(0)
    expect(proportions.classDProportion).toBe(0)
  })
})
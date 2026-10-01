import { describe, it, expect } from 'vitest'
import { QualityElementScorer } from '../src/quality-element-scorer.js'
import { createQualityElementConfig } from './test-config-helper.js'
import type { QualityCheckResult, UnifiedAssetItem } from '../src/types.js'

describe('QualityElementScorer', () => {
  const scorer = new QualityElementScorer()
  const config = createQualityElementConfig()

  it('无错误时所有质量元素满分', () => {
    const { scores, totalScore } = scorer.score([], config)
    expect(scores.length).toBe(6)
    for (const score of scores) {
      expect(score.score).toBe(100)
    }
    expect(totalScore).toBe(100)
  })

  it('六类质量元素评分正确', () => {
    const checkResults: QualityCheckResult[] = [
      { checkName: '坐标系检查', errorClass: 'A', objectId: 'B-001', description: '非法坐标系', policyBasis: '依据：测试' },
      { checkName: '接边检查', errorClass: 'B', objectId: 'B-002', description: '接边不一致', policyBasis: '依据：测试' },
      { checkName: '重复构件检查', errorClass: 'A', objectId: 'B-003', description: '重复构件', policyBasis: '依据：测试' },
    ]
    const { scores } = scorer.score(checkResults, config)
    const spatialRefScore = scores.find((s) => s.elementName === '空间参考系')
    const positionScore = scores.find((s) => s.elementName === '位置精度')
    const logicScore = scores.find((s) => s.elementName === '逻辑一致性')
    const timeScore = scores.find((s) => s.elementName === '时间精度')
    expect(spatialRefScore!.score).toBe(99)
    expect(positionScore!.score).toBe(99.4)
    expect(logicScore!.score).toBe(99)
    expect(timeScore!.score).toBe(100)
  })

  it('权重配置驱动总得分', () => {
    const checkResults: QualityCheckResult[] = [
      { checkName: '坐标系检查', errorClass: 'A', objectId: 'B-001', description: '非法坐标系', policyBasis: '依据：测试' },
    ]
    const { scores, totalScore } = scorer.score(checkResults, config)
    let expectedTotal = 0
    for (const score of scores) {
      expectedTotal += score.weight * score.score
    }
    expectedTotal = Math.round(expectedTotal * 100) / 100
    expect(totalScore).toBe(expectedTotal)
  })

  it('每个质量元素含policyBasis字段', () => {
    const { scores } = scorer.score([], config)
    for (const score of scores) {
      expect(score.policyBasis).toBeTruthy()
      expect(score.policyBasis).toContain('GB/T 24356-2023')
    }
  })

  it('多个同类错误累计扣分', () => {
    const checkResults: QualityCheckResult[] = [
      { checkName: '坐标系检查', errorClass: 'A', objectId: 'B-001', description: '错误1', policyBasis: '依据：测试' },
      { checkName: '坐标系检查', errorClass: 'A', objectId: 'B-002', description: '错误2', policyBasis: '依据：测试' },
      { checkName: '高程基准检查', errorClass: 'A', objectId: 'B-003', description: '错误3', policyBasis: '依据：测试' },
    ]
    const { scores } = scorer.score(checkResults, config)
    const spatialRefScore = scores.find((s) => s.elementName === '空间参考系')
    expect(spatialRefScore!.score).toBe(97)
  })

  it('得分不低于0分', () => {
    const checkResults: QualityCheckResult[] = []
    for (let i = 0; i < 200; i++) {
      checkResults.push({
        checkName: '坐标系检查',
        errorClass: 'A',
        objectId: `B-${i}`,
        description: '错误',
        policyBasis: '依据：测试',
      })
    }
    const { scores } = scorer.score(checkResults, config)
    const spatialRefScore = scores.find((s) => s.elementName === '空间参考系')
    expect(spatialRefScore!.score).toBe(0)
  })

  it('评分结果可融入资产台账', () => {
    const { scores } = scorer.score([], config)
    const asset: UnifiedAssetItem = {
      assetId: 'B-001',
      sourceSystemId: 'sys-1',
      dataType: 'BIM构件-元素',
      projectId: 'proj-1',
      collectionTime: '2024-01-01',
      classificationCode: '14',
      assetCode: '000140001X',
      judgmentStatus: '自动判定',
      qualityScore: scores,
    }
    expect(asset.qualityScore).toBe(scores)
    expect(asset.qualityScore!.length).toBe(6)
  })
})
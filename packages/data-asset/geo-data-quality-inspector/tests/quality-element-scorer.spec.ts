import { describe, it, expect } from 'vitest'
import { QualityElementScorer } from '../src/quality-element-scorer.js'
import type { QualityCheckResult, QualityElementConfig } from '../src/types.js'

describe('QualityElementScorer', () => {
  const scorer = new QualityElementScorer()

  const createConfig = (weights: { math: number; geo: number; decoration: number; attachment: number }): QualityElementConfig => ({
    version: '1.0.0',
    lastUpdated: '2026-10-01',
    qualityElements: {
      description: '四类质量元素及权重',
      elements: [
        { elementName: '数学精度', weight: weights.math, policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.2条' },
        { elementName: '地理精度', weight: weights.geo, policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.3条' },
        { elementName: '整饰质量', weight: weights.decoration, policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.4条' },
        { elementName: '附件质量', weight: weights.attachment, policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.5条' },
      ],
      policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6章',
    },
    errorClassThresholds: {
      description: 'A/B/C/D错误分类扣分阈值',
      classAScoreDeduction: 1.0,
      classBScoreDeduction: 0.6,
      classCScoreDeduction: 0.3,
      classDScoreDeduction: 0.1,
      policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第7.2条',
    },
    qualityGradeThresholds: {
      description: '质量等级划分阈值',
      excellentMinScore: 90,
      goodMinScore: 80,
      qualifiedMinScore: 70,
      policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第8.1条',
    },
  })

  const defaultConfig = createConfig({ math: 0.25, geo: 0.38, decoration: 0.25, attachment: 0.12 })

  it('无错误时各质量元素满分100', () => {
    const { scores, totalScore } = scorer.score([], defaultConfig)
    expect(scores.length).toBe(4)
    for (const s of scores) {
      expect(s.score).toBe(100)
    }
    expect(totalScore).toBe(100)
  })

  it('数学精度错误影响数学精度得分', () => {
    const checkResults: QualityCheckResult[] = [
      { checkName: '高程中误差检查', errorClass: 'B', objectId: 'dataset', description: '高程超限', policyBasis: 'p' },
    ]
    const { scores, totalScore } = scorer.score(checkResults, defaultConfig)
    const mathScore = scores.find((s) => s.elementName === '数学精度')
    expect(mathScore?.score).toBe(99.4)
    expect(totalScore).toBeLessThan(100)
  })

  it('地理精度错误影响地理精度得分', () => {
    const checkResults: QualityCheckResult[] = [
      { checkName: '面重叠检查', errorClass: 'A', objectId: 'F1-F2', description: '面重叠', policyBasis: 'p' },
    ]
    const { scores } = scorer.score(checkResults, defaultConfig)
    const geoScore = scores.find((s) => s.elementName === '地理精度')
    expect(geoScore?.score).toBe(99)
  })

  it('整饰质量错误影响整饰质量得分', () => {
    const checkResults: QualityCheckResult[] = [
      { checkName: 'RFC 7946合规检查', errorClass: 'C', objectId: 'F1', description: '格式不合规', policyBasis: 'p' },
    ]
    const { scores } = scorer.score(checkResults, defaultConfig)
    const decoScore = scores.find((s) => s.elementName === '整饰质量')
    expect(decoScore?.score).toBe(99.7)
  })

  it('权重配置驱动 - 自定义权重正确计算', () => {
    const customConfig = createConfig({ math: 0.3, geo: 0.3, decoration: 0.2, attachment: 0.2 })
    const { scores, totalScore } = scorer.score([], customConfig)
    expect(scores[0]?.weight).toBe(0.3)
    expect(scores[1]?.weight).toBe(0.3)
    expect(scores[2]?.weight).toBe(0.2)
    expect(scores[3]?.weight).toBe(0.2)
    expect(totalScore).toBe(100)
  })

  it('A类错误扣分1.0 B类0.6 C类0.3 D类0.1', () => {
    const checkResults: QualityCheckResult[] = [
      { checkName: '高程中误差检查', errorClass: 'A', objectId: 'd1', description: 'A', policyBasis: 'p' },
      { checkName: '平面位置中误差检查', errorClass: 'B', objectId: 'd2', description: 'B', policyBasis: 'p' },
      { checkName: '接边精度检查', errorClass: 'C', objectId: 'd3', description: 'C', policyBasis: 'p' },
      { checkName: '同名格网高程值检查', errorClass: 'D', objectId: 'd4', description: 'D', policyBasis: 'p' },
    ]
    const { scores } = scorer.score(checkResults, defaultConfig)
    const mathScore = scores.find((s) => s.elementName === '数学精度')
    expect(mathScore?.score).toBeCloseTo(100 - 1.0 - 0.6 - 0.3 - 0.1, 10)
  })

  it('得分不低于0', () => {
    const checkResults: QualityCheckResult[] = []
    for (let i = 0; i < 200; i++) {
      checkResults.push({ checkName: '高程中误差检查', errorClass: 'A', objectId: `d${i}`, description: 'A', policyBasis: 'p' })
    }
    const { scores } = scorer.score(checkResults, defaultConfig)
    const mathScore = scores.find((s) => s.elementName === '数学精度')
    expect(mathScore?.score).toBe(0)
  })
})
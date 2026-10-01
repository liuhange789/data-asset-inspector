import { describe, it, expect } from 'vitest'
import { NormalityScorer, evaluateQualityRule } from '../src/normality-scorer.js'
import { defaultQualityDimensionConfig } from '../src/default-quality-dimension-config.js'
import type { QualityDimensionConfig } from '../src/types.js'

describe('NormalityScorer', () => {
  it('通过全部规范性规则评分100.00', () => {
    const records = { namingPattern: 'userName', formatValid: true, metadataComplete: true }
    const result = new NormalityScorer().score(records, defaultQualityDimensionConfig)
    expect(result.dimension).toBe('规范性')
    expect(result.score).toBe(100)
    expect(result.policyBasis).toContain('规范性维度')
    expect(result.policyBasis).toContain('TC609-5-2025-01')
  })

  it('命名不规范评分低于100.00并附带问题清单', () => {
    const records = { namingPattern: 'User-Name', formatValid: true, metadataComplete: true }
    const result = new NormalityScorer().score(records, defaultQualityDimensionConfig)
    expect(result.score).toBeLessThan(100)
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.judgmentStatus).toBe('自动判定')
  })

  it('禁用规则不参与评分', () => {
    const config: QualityDimensionConfig = {
      ...defaultQualityDimensionConfig,
      normality: {
        rules: defaultQualityDimensionConfig.normality.rules.map((r) => ({ ...r, enabled: false })),
      },
    }
    const records = { namingPattern: 'BAD', formatValid: false, metadataComplete: false }
    const result = new NormalityScorer().score(records, config)
    expect(result.score).toBe(100)
  })

  it('规则执行异常记为失败', () => {
    const config: QualityDimensionConfig = {
      ...defaultQualityDimensionConfig,
      normality: {
        rules: [
          { ruleId: 'bad', description: '异常规则', judgmentLogic: '!!!invalid', weight: 1, enabled: true },
        ],
      },
    }
    const result = new NormalityScorer().score({}, config)
    expect(result.score).toBe(0)
    expect(result.issues.some((i) => i.includes('规则执行异常'))).toBe(true)
  })

  it('无启用规则评分100.00', () => {
    const config: QualityDimensionConfig = {
      ...defaultQualityDimensionConfig,
      normality: { rules: [] },
    }
    const result = new NormalityScorer().score({}, config)
    expect(result.score).toBe(100)
  })
})

describe('evaluateQualityRule', () => {
  it('支持 === 与 !==', () => {
    expect(evaluateQualityRule({ a: true }, 'a === true')).toBe(true)
    expect(evaluateQualityRule({ a: false }, 'a === true')).toBe(false)
    expect(evaluateQualityRule({ a: 'x' }, 'a !== y')).toBe(true)
  })

  it('支持 =~ 与 !~', () => {
    expect(evaluateQualityRule({ a: 'userName' }, 'a =~ ^[a-z][a-zA-Z0-9]*$')).toBe(true)
    expect(evaluateQualityRule({ a: 'Bad-Name' }, 'a =~ ^[a-z][a-zA-Z0-9]*$')).toBe(false)
    expect(evaluateQualityRule({ a: 'Bad' }, 'a !~ ^[a-z]')).toBe(true)
  })

  it('支持 exists 与 !exists', () => {
    expect(evaluateQualityRule({ a: 'x' }, 'a exists')).toBe(true)
    expect(evaluateQualityRule({}, 'a exists')).toBe(false)
    expect(evaluateQualityRule({}, 'a !exists')).toBe(true)
  })

  it('无法解析抛出异常', () => {
    expect(() => evaluateQualityRule({}, 'badformat')).toThrow()
  })
})
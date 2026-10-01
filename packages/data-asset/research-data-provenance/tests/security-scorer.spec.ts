import { describe, it, expect } from 'vitest'
import { SecurityScorer } from '../src/security-scorer.js'
import { defaultQualityDimensionConfig } from '../src/default-quality-dimension-config.js'
import type { QualityDimensionConfig } from '../src/types.js'

describe('SecurityScorer', () => {
  it('通过全部安全性规则评分100.00', () => {
    const records = { accessControlEnabled: true, sensitiveFieldLabeled: true, encrypted: true }
    const result = new SecurityScorer().score(records, defaultQualityDimensionConfig)
    expect(result.dimension).toBe('安全性')
    expect(result.score).toBe(100)
    expect(result.policyBasis).toContain('安全性维度')
    expect(result.policyBasis).toContain('TC609-5-2025-01')
  })

  it('敏感字段未标识评分低于100.00', () => {
    const records = { accessControlEnabled: true, sensitiveFieldLabeled: false, encrypted: true }
    const result = new SecurityScorer().score(records, defaultQualityDimensionConfig)
    expect(result.score).toBeLessThan(100)
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('禁用规则不参与评分', () => {
    const config: QualityDimensionConfig = {
      ...defaultQualityDimensionConfig,
      security: {
        rules: defaultQualityDimensionConfig.security.rules.map((r) => ({ ...r, enabled: false })),
      },
    }
    const result = new SecurityScorer().score({}, config)
    expect(result.score).toBe(100)
  })

  it('规则执行异常记为失败', () => {
    const config: QualityDimensionConfig = {
      ...defaultQualityDimensionConfig,
      security: {
        rules: [
          { ruleId: 'bad', description: '异常规则', judgmentLogic: '!!!bad', weight: 1, enabled: true },
        ],
      },
    }
    const result = new SecurityScorer().score({}, config)
    expect(result.score).toBe(0)
    expect(result.issues.some((i) => i.includes('规则执行异常'))).toBe(true)
  })

  it('全部规则不通过评分0.00', () => {
    const records = { accessControlEnabled: false, sensitiveFieldLabeled: false, encrypted: false }
    const result = new SecurityScorer().score(records, defaultQualityDimensionConfig)
    expect(result.score).toBe(0)
  })
})
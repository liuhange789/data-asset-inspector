import { describe, it, expect } from 'vitest'
import { checkCapitalizationTrace, annotateCostReliability } from '../capitalizationTraceGuard.js'

describe('CapitalizationTraceGuard', () => {
  const config = {
    enabled: true,
    policyRef: '财会〔2025〕33号',
    rule: '不得将以评估等方式得出的金额直接作为入账和调账的依据',
    warningMessage: '评估值仅供参考，不得直接作为入账依据',
  }

  it('enabled时返回警告信息', () => {
    const result = checkCapitalizationTrace(100000, config)
    expect(result.passed).toBe(true)
    expect(result.warning).toBe(config.warningMessage)
    expect(result.policyRef).toBe('财会〔2025〕33号')
  })

  it('disabled时跳过但不报错', () => {
    const result = checkCapitalizationTrace(100000, { ...config, enabled: false })
    expect(result.passed).toBe(true)
    expect(result.warning).toBeNull()
  })
})

describe('CostReliabilityMeasurer', () => {
  const config = {
    enabled: true,
    policyRef: '财会〔2023〕11号',
    reliabilityLevels: ['high', 'medium', 'low'],
    criteria: {
      high: '有完整凭证链，成本可直接追溯至原始发票/合同',
      medium: '有部分凭证，成本经合理分摊计算',
      low: '成本为估算值，缺乏完整凭证',
    },
  }

  it('完整凭证→high', () => {
    const result = annotateCostReliability(true, false, config)
    expect(result.level).toBe('high')
    expect(result.criteria).toContain('完整凭证')
  })

  it('部分凭证→medium', () => {
    const result = annotateCostReliability(false, true, config)
    expect(result.level).toBe('medium')
  })

  it('无凭证→low', () => {
    const result = annotateCostReliability(false, false, config)
    expect(result.level).toBe('low')
  })

  it('disabled时默认medium', () => {
    const result = annotateCostReliability(true, false, { ...config, enabled: false })
    expect(result.level).toBe('medium')
  })
})
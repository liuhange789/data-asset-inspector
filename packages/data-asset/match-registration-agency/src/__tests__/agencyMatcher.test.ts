import { describe, it, expect } from 'vitest'
import { AgencyMatcher } from '../agencyMatcher.js'

describe('AgencyMatcher', () => {
  const matcher = new AgencyMatcher()

  it('金融 → 上海数据交易所', () => {
    const result = matcher.match('金融')
    expect(result.agency).toBe('shanghai')
    expect(result.agencyName).toBe('上海数据交易所')
  })

  it('医疗 → 北京国际大数据交易所', () => {
    const result = matcher.match('医疗')
    expect(result.agency).toBe('beijing')
    expect(result.agencyName).toBe('北京国际大数据交易所')
  })

  it('交通 → 深圳数据交易所', () => {
    const result = matcher.match('交通')
    expect(result.agency).toBe('shenzhen')
    expect(result.agencyName).toBe('深圳数据交易所')
  })

  it('未知类型 → 建议咨询', () => {
    const result = matcher.match('未知类型')
    expect(result.agency).toBeNull()
    expect(result.agencyName).toContain('建议咨询')
  })

  it('匹配结果含 agency/basis/dataType/ruleVersion 四字段', () => {
    const result = matcher.match('金融')
    expect(result).toHaveProperty('agency')
    expect(result).toHaveProperty('basis')
    expect(result).toHaveProperty('dataType')
    expect(result).toHaveProperty('ruleVersion')
  })
})
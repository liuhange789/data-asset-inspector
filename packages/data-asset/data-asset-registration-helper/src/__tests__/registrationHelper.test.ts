import { describe, it, expect } from 'vitest'
import { checkDisallowedScenarios } from '../disallowedScenarioChecker.js'
import { matchAgency } from '../agencyMatcher.js'

const disallowedScenarios = [
  { id: 'DIS_001', label: '危害国家安全', keywords: ['国家安全', '机密', '涉密'] },
  { id: 'DIS_002', label: '来源违反法律法规', keywords: ['非法', '窃取', '违规采集'] },
  { id: 'DIS_003', label: '权属纠纷未解决', keywords: ['纠纷', '争议', '诉讼'] },
  { id: 'DIS_004', label: '隐瞒真实情况', keywords: ['隐瞒', '虚假', '欺诈'] },
]

describe('disallowedScenarioChecker', () => {
  it('正常描述→CAN_REGISTER', () => {
    const result = checkDisallowedScenarios('企业内部经营数据', disallowedScenarios, false)
    expect(result.conclusion).toBe('CAN_REGISTER')
    expect(result.failedItems).toHaveLength(0)
  })

  it('含涉密关键词→CANNOT_REGISTER', () => {
    const result = checkDisallowedScenarios('涉及国家机密数据', disallowedScenarios, false)
    expect(result.conclusion).toBe('CANNOT_REGISTER')
    expect(result.disallowedScenariosHit[0]!.id).toBe('DIS_001')
  })

  it('权属纠纷→CANNOT_REGISTER', () => {
    const result = checkDisallowedScenarios('正常数据', disallowedScenarios, true)
    expect(result.conclusion).toBe('CANNOT_REGISTER')
    expect(result.failedItems.some(f => f.includes('权属纠纷'))).toBe(true)
  })

  it('多个禁止场景同时命中', () => {
    const result = checkDisallowedScenarios('非法窃取且虚假隐瞒', disallowedScenarios, false)
    expect(result.conclusion).toBe('CANNOT_REGISTER')
    expect(result.disallowedScenariosHit.length).toBeGreaterThanOrEqual(2)
  })
})

describe('agencyMatcher', () => {
  const agencyConfig = {
    mode: 'local',
    httpEndpoints: {
      beijing: { url: 'https://example.com/bj', apiKey: '${KEY_BJ}' },
      shanghai: { url: 'https://example.com/sh', apiKey: '${KEY_SH}' },
      shenzhen: { url: 'https://example.com/sz', apiKey: '${KEY_SZ}' },
    },
  }

  it('指定region精确匹配', () => {
    const result = matchAgency('金融', 'shanghai', agencyConfig)
    expect(result.matched).toBe(true)
    expect(result.recommendedAgency).toBe('shanghai')
    expect(result.url).toBe('https://example.com/sh')
  })

  it('未指定region时从dataType推断', () => {
    const result = matchAgency('金融', undefined, agencyConfig)
    expect(result.recommendedAgency).toBe('shanghai')
  })

  it('科技数据推断为深圳', () => {
    const result = matchAgency('科技数据', undefined, agencyConfig)
    expect(result.recommendedAgency).toBe('shenzhen')
  })

  it('未知region回退到第一个endpoint', () => {
    const result = matchAgency('未知', 'mars', agencyConfig)
    expect(result.matched).toBe(false)
    expect(result.recommendedAgency).toBe('beijing')
  })
})
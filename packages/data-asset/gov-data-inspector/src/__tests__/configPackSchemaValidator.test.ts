import { describe, it, expect } from 'vitest'
import { ConfigPackSchemaValidator } from '../configPackSchemaValidator.js'
import defaultPack from '../default-config-pack.json' with { type: 'json' }

describe('Schema 校验器', () => {
  it('缺省配置包校验通过', () => {
    const result = ConfigPackSchemaValidator.validate(defaultPack)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('非对象输入校验失败', () => {
    const result = ConfigPackSchemaValidator.validate('not an object')
    expect(result.valid).toBe(false)
  })

  it('缺少必填字段校验失败', () => {
    const pack = { ...defaultPack }
    delete (pack as Record<string, unknown>).configPackId
    const result = ConfigPackSchemaValidator.validate(pack)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.path === 'configPackId')).toBe(true)
  })

  it('configPackVersion 格式错误校验失败', () => {
    const pack = { ...defaultPack, configPackVersion: 'invalid' }
    const result = ConfigPackSchemaValidator.validate(pack)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.path === 'configPackVersion')).toBe(true)
  })

  it('scoringWeights 三权重之和≠1校验失败', () => {
    const pack = { ...defaultPack, scoringWeights: { completeness: 0.1, accuracy: 0.1, traceability: 0.1 } }
    const result = ConfigPackSchemaValidator.validate(pack)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.path === 'scoringWeights')).toBe(true)
  })

  it('scoringWeights 三权重之和=1校验通过', () => {
    const pack = { ...defaultPack, scoringWeights: { completeness: 0.3, accuracy: 0.4, traceability: 0.3 } }
    const result = ConfigPackSchemaValidator.validate(pack)
    expect(result.errors.some((e) => e.path === 'scoringWeights')).toBe(false)
  })

  it('policyBasis 为空数组校验失败', () => {
    const pack = { ...defaultPack, policyBasis: [] }
    const result = ConfigPackSchemaValidator.validate(pack)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.path === 'policyBasis')).toBe(true)
  })

  it('requiredFields 为空数组校验失败', () => {
    const pack = { ...defaultPack, requiredFields: [] }
    const result = ConfigPackSchemaValidator.validate(pack)
    expect(result.valid).toBe(false)
  })

  it('severityMapping 值非枚举校验失败', () => {
    const pack = { ...defaultPack, severityMapping: { missing: 'invalid', semantic: 'critical', logical: 'critical' } }
    const result = ConfigPackSchemaValidator.validate(pack)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.path === 'severityMapping.missing')).toBe(true)
  })

  it('dataSourcePriority 含非法值校验失败', () => {
    const pack = { ...defaultPack, dataSourcePriority: ['invalid'] }
    const result = ConfigPackSchemaValidator.validate(pack)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.path === 'dataSourcePriority[0]')).toBe(true)
  })

  it('8.8 coreRequiredFields为空数组 → 校验失败', () => {
    const pack = { ...defaultPack, coreRequiredFields: [] }
    const result = ConfigPackSchemaValidator.validate(pack)
    expect(result.errors.some((e) => e.path === 'coreRequiredFields')).toBe(true)
  })

  it('8.8 core与extended含交集 → 产出告警但valid仍为true', () => {
    const pack = { ...defaultPack, coreRequiredFields: ['A', 'B'], extendedRequiredFields: ['B', 'C'] }
    const result = ConfigPackSchemaValidator.validate(pack)
    expect(result.errors.some((e) => e.path === 'coreRequiredFields/extendedRequiredFields')).toBe(true)
    expect(result.valid).toBe(true)
  })

  it('8.8 requiredFields与coreRequiredFields均缺失 → 校验失败', () => {
    const pack = { ...defaultPack }
    delete (pack as Record<string, unknown>).requiredFields
    delete (pack as Record<string, unknown>).coreRequiredFields
    const result = ConfigPackSchemaValidator.validate(pack)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.path === 'requiredFields/coreRequiredFields')).toBe(true)
  })
})

describe('正则 ReDoS 安全预检', () => {
  it('安全正则通过', () => {
    expect(ConfigPackSchemaValidator.checkRegexSafety('^\\d+个工作日$')).toBe(true)
    expect(ConfigPackSchemaValidator.checkRegexSafety('1[3-9]\\d{9}')).toBe(true)
  })

  it('嵌套量词正则被拒绝', () => {
    expect(ConfigPackSchemaValidator.checkRegexSafety('(a+)+')).toBe(false)
    expect(ConfigPackSchemaValidator.checkRegexSafety('(a*)*')).toBe(false)
  })

  it('无效正则被拒绝', () => {
    expect(ConfigPackSchemaValidator.checkRegexSafety('[')).toBe(false)
  })
})
import { describe, it, expect } from 'vitest'
import { ConfigPackSchemaValidator } from '../configPackSchemaValidator.js'
import defaultPack from '../default-config-pack.json' with { type: 'json' }

describe('缺省配置包完整性', () => {
  it('通过 Schema 校验', () => {
    const result = ConfigPackSchemaValidator.validate(defaultPack)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('configPackId 为 default', () => {
    expect(defaultPack.configPackId).toBe('default')
  })

  it('region 为 通用', () => {
    expect(defaultPack.region).toBe('通用')
  })

  it('policyBasis 含 5 条且包含广东省政务服务事项管理系统', () => {
    expect(defaultPack.policyBasis.length).toBe(5)
    expect(defaultPack.policyBasis.some((d: { name: string }) => d.name.includes('广东省政务服务事项管理系统'))).toBe(true)
  })

  it('14 个必填字段完整', () => {
    const required = ['configPackId', 'region', 'configPackVersion', 'policyBasis', 'requiredFields', 'formatRules', 'localStandardTerms', 'logicErrorRules', 'scoringWeights', 'itemTypeMatching', 'severityMapping', 'gbtMapping', 'dataSourceCredentials', 'dataSourcePriority']
    for (const field of required) {
      expect((defaultPack as Record<string, unknown>)[field]).toBeDefined()
    }
  })
})
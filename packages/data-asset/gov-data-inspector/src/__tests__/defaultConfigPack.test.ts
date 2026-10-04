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

  it('9.4 coreRequiredFields长度为14且内容与spec 6.1一致', () => {
    const expected = [
      '事项名称', '实施主体', '办理条件', '申请材料', '办理流程', '办理时限',
      '收费标准', '办理地点', '咨询电话', '监督电话', '网上办理深度', '办理时间',
      '结果送达方式', '表格下载',
    ]
    expect(defaultPack.coreRequiredFields).toEqual(expected)
  })

  it('9.4 extendedRequiredFields长度为6且内容与spec 6.2一致', () => {
    const expected = ['结果样本', '通办范围', '预约办理', '网上支付', '物流快递', '中介机构']
    expect(defaultPack.extendedRequiredFields).toEqual(expected)
  })

  it('9.4 core与extended集合交集为空', () => {
    const core = new Set(defaultPack.coreRequiredFields as string[])
    const extended = defaultPack.extendedRequiredFields as string[]
    const intersection = extended.filter((f) => core.has(f))
    expect(intersection).toEqual([])
  })

  it('9.4 missingFieldStandardClause为国办发〔2015〕46号 第4.1条', () => {
    expect(defaultPack.missingFieldStandardClause).toBe('国办发〔2015〕46号 第4.1条')
  })
})
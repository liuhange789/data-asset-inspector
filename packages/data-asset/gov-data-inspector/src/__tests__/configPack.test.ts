import { describe, it, expect } from 'vitest'
import { normalizeConfigPack } from '../configPack.js'

describe('ConfigPack 类型与字段名映射', () => {
  const basePack = {
    configPackId: 'gd-gov-2026',
    region: '广东省',
    configPackVersion: '2026.1.0',
    policyBasis: [{ name: '测试标准', docNumber: '测试文号', coreRequirement: '测试要求' }],
    requiredFields: ['事项名称', '办理条件'],
    formatRules: [{ field: '办理时限', pattern: '^\\d+个工作日$', suggestionTemplate: '提示' }],
    localStandardTerms: { materials: ['身份证'], conditions: ['年满18周岁'] },
    logicErrorRules: [{ ruleId: 'LOG_001', standardClause: '测试条款', triggerFields: ['办理流程'], triggerKeywords: ['现场勘查'], condition: '测试', suggestionTemplate: '测试' }],
    scoringWeights: { completeness: 0.3, accuracy: 0.4, traceability: 0.3 },
    itemTypeMatching: { 行政许可: { keywords: ['许可'], codePrefix: 'XK' } },
    severityMapping: { missing: 'major', semantic: 'critical', logical: 'critical' },
    gbtMapping: { structured: 'A01', semiStructured: 'A02', unstructured: 'A03' },
    dataSourceCredentials: {
      national: { apiKey: 'NATIONAL_KEY', endpoint: 'NATIONAL_ENDPOINT' },
      provincial: { apiKey: 'PROVINCIAL_KEY', endpoint: 'PROVINCIAL_ENDPOINT' },
      standard: { docPath: 'DOC_PATH', endpoint: 'RULES_ENDPOINT' },
    },
    dataSourcePriority: ['provincial', 'national'],
  }

  it('仅含新名时返回原值', () => {
    const result = normalizeConfigPack({ ...basePack })
    expect(result.requiredFields).toEqual(['事项名称', '办理条件'])
    expect(result.scoringWeights).toEqual({ completeness: 0.3, accuracy: 0.4, traceability: 0.3 })
    expect(result.gbtMapping).toEqual({ structured: 'A01', semiStructured: 'A02', unstructured: 'A03' })
  })

  it('仅含旧名时映射为新名', () => {
    const oldPack = { ...basePack }
    delete (oldPack as Record<string, unknown>).requiredFields
    delete (oldPack as Record<string, unknown>).scoringWeights
    delete (oldPack as Record<string, unknown>).gbtMapping
    ;(oldPack as Record<string, unknown>).guideRequiredElements = ['事项名称', '办理条件']
    ;(oldPack as Record<string, unknown>).scoreWeights = { completeness: 0.3, accuracy: 0.4, traceability: 0.3 }
    ;(oldPack as Record<string, unknown>).gbt47949Mapping = { structured: 'A01', semiStructured: 'A02', unstructured: 'A03' }

    const result = normalizeConfigPack(oldPack)
    expect(result.requiredFields).toEqual(['事项名称', '办理条件'])
    expect(result.scoringWeights).toEqual({ completeness: 0.3, accuracy: 0.4, traceability: 0.3 })
    expect(result.gbtMapping).toEqual({ structured: 'A01', semiStructured: 'A02', unstructured: 'A03' })
  })

  it('新名与旧名同时存在时新名优先', () => {
    const mixedPack = { ...basePack }
    ;(mixedPack as Record<string, unknown>).guideRequiredElements = ['旧字段']
    ;(mixedPack as Record<string, unknown>).scoreWeights = { completeness: 0.1, accuracy: 0.1, traceability: 0.1 }
    ;(mixedPack as Record<string, unknown>).gbt47949Mapping = { structured: 'OLD' }

    const result = normalizeConfigPack(mixedPack)
    expect(result.requiredFields).toEqual(['事项名称', '办理条件'])
    expect(result.scoringWeights).toEqual({ completeness: 0.3, accuracy: 0.4, traceability: 0.3 })
    expect(result.gbtMapping).toEqual({ structured: 'A01', semiStructured: 'A02', unstructured: 'A03' })
  })

  it('必填字段双名均缺失时抛错', () => {
    const missingPack = { ...basePack }
    delete (missingPack as Record<string, unknown>).requiredFields
    delete (missingPack as Record<string, unknown>).guideRequiredElements

    expect(() => normalizeConfigPack(missingPack)).toThrow('GOV_CONFIG_PACK_INVALID')
  })

  it('configPackId 缺失时抛错', () => {
    const missingPack = { ...basePack }
    delete (missingPack as Record<string, unknown>).configPackId

    expect(() => normalizeConfigPack(missingPack)).toThrow('GOV_CONFIG_PACK_INVALID')
  })

  it('可选字段保留', () => {
    const packWithOptional = { ...basePack, convenienceWeights: { timeLimit: 0.3 }, materialConciseThreshold: 5 }
    const result = normalizeConfigPack(packWithOptional)
    expect(result.convenienceWeights).toEqual({ timeLimit: 0.3 })
    expect(result.materialConciseThreshold).toBe(5)
  })

  it('default configPackId 被接受', () => {
    const defaultPack = { ...basePack, configPackId: 'default' }
    const result = normalizeConfigPack(defaultPack)
    expect(result.configPackId).toBe('default')
  })
})
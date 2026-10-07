import { describe, it, expect, afterEach } from 'vitest'
import { ConfigPackLoader } from '../configPackLoader.js'
import { writeFileSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'

describe('配置包加载器', () => {
  const tmpFile = resolve(tmpdir(), 'test-config-pack.json')

  afterEach(() => {
    try { unlinkSync(tmpFile) } catch { /* ignore */ }
  })

  it('未设置环境变量时使用缺省配置包', () => {
    const result = ConfigPackLoader.load()
    expect(result.loadSource).toBe('default')
    expect(result.configPack.configPackId).toBe('default')
    expect(result.configPack.region).toBe('通用')
  })

  it('设置 GOV_CONFIG_PACK_PATH 指向合法文件时 loadSource 为 file', () => {
    const pack = {
      configPackId: 'gd-gov-2026',
      region: '广东省',
      configPackVersion: '2026.1.0',
      policyBasis: [{ name: '测试', docNumber: '粤府办〔2024〕1号', coreRequirement: '测试' }],
      requiredFields: ['事项名称'],
      formatRules: [],
      localStandardTerms: { materials: [], conditions: [] },
      logicErrorRules: [{ ruleId: 'LOG_001', standardClause: '测试', triggerFields: ['办理流程'], triggerKeywords: ['测试'], condition: '测试', suggestionTemplate: '测试' }],
      scoringWeights: { completeness: 0.3, accuracy: 0.4, traceability: 0.3 },
      itemTypeMatching: { 行政许可: { keywords: ['许可'], codePrefix: 'XK' } },
      severityMapping: { missing: 'major', semantic: 'critical', logical: 'critical' },
      gbtMapping: { structured: 'A01', semiStructured: 'A02', unstructured: 'A03' },
      dataSourceCredentials: {
        national: { apiKey: 'KEY', endpoint: 'EP' },
        provincial: { apiKey: 'KEY', endpoint: 'EP' },
        standard: { docPath: 'PATH', endpoint: 'EP' },
      },
      dataSourcePriority: ['provincial', 'national'],
    }
    writeFileSync(tmpFile, JSON.stringify(pack), 'utf-8')
    process.env.GOV_CONFIG_PACK_PATH = tmpFile

    const result = ConfigPackLoader.load()
    expect(result.loadSource).toBe('file')
    expect(result.configPack.configPackId).toBe('gd-gov-2026')
    expect(result.configPack.region).toBe('广东省')

    delete process.env.GOV_CONFIG_PACK_PATH
  })

  it('设置 GOV_CONFIG_PACK_PATH 指向不存在文件时回退到缺省', () => {
    process.env.GOV_CONFIG_PACK_PATH = '/nonexistent/path/pack.json'
    const result = ConfigPackLoader.load()
    expect(result.loadSource).toBe('default')
    expect(result.warnings.length).toBeGreaterThan(0)
    delete process.env.GOV_CONFIG_PACK_PATH
  })

  it('设置 GOV_CONFIG_PACK_PATH 指向非法 JSON 时回退到缺省', () => {
    writeFileSync(tmpFile, 'not json', 'utf-8')
    process.env.GOV_CONFIG_PACK_PATH = tmpFile
    const result = ConfigPackLoader.load()
    expect(result.loadSource).toBe('default')
    expect(result.warnings.length).toBeGreaterThan(0)
    delete process.env.GOV_CONFIG_PACK_PATH
  })

  it('设置 GOV_CONFIG_PACK_PACKAGE 指向未安装包时回退到缺省', () => {
    process.env.GOV_CONFIG_PACK_PACKAGE = '@nonexistent/config-pack'
    const result = ConfigPackLoader.load()
    expect(result.loadSource).toBe('default')
    expect(result.warnings.length).toBeGreaterThan(0)
    delete process.env.GOV_CONFIG_PACK_PACKAGE
  })

  it('缺省配置包含 14 个必填字段', () => {
    const result = ConfigPackLoader.load()
    const pack = result.configPack
    expect(pack.configPackId).toBeDefined()
    expect(pack.region).toBeDefined()
    expect(pack.configPackVersion).toBeDefined()
    expect(pack.policyBasis).toBeDefined()
    expect(pack.requiredFields).toBeDefined()
    expect(pack.formatRules).toBeDefined()
    expect(pack.localStandardTerms).toBeDefined()
    expect(pack.logicErrorRules).toBeDefined()
    expect(pack.scoringWeights).toBeDefined()
    expect(pack.itemTypeMatching).toBeDefined()
    expect(pack.severityMapping).toBeDefined()
    expect(pack.gbtMapping).toBeDefined()
    expect(pack.dataSourceCredentials).toBeDefined()
    expect(pack.dataSourcePriority).toBeDefined()
  })

  it('缺省包词表装载: validShortValues 为数组且长度≥11', () => {
    const result = ConfigPackLoader.load()
    const values = result.configPack.validShortValues
    expect(Array.isArray(values)).toBe(true)
    expect(values!.length).toBeGreaterThanOrEqual(11)
    expect(values).toContain('无')
    expect(values).toContain('不收费')
    expect(values).toContain('免提交')
  })

  it('文件路径包词表挂载: 外部配置包含 validShortValues 时按外部包内容挂载', () => {
    const pack = {
      configPackId: 'gd-gov-2026',
      region: '广东省',
      configPackVersion: '2026.1.0',
      policyBasis: [{ name: '测试', docNumber: '粤府办〔2024〕1号', coreRequirement: '测试' }],
      requiredFields: ['事项名称'],
      formatRules: [],
      localStandardTerms: { materials: [], conditions: [] },
      logicErrorRules: [{ ruleId: 'LOG_001', standardClause: '测试', triggerFields: ['办理流程'], triggerKeywords: ['测试'], condition: '测试', suggestionTemplate: '测试' }],
      scoringWeights: { completeness: 0.3, accuracy: 0.4, traceability: 0.3 },
      itemTypeMatching: { 行政许可: { keywords: ['许可'], codePrefix: 'XK' } },
      severityMapping: { missing: 'major', semantic: 'critical', logical: 'critical' },
      gbtMapping: { structured: 'A01', semiStructured: 'A02', unstructured: 'A03' },
      dataSourceCredentials: {
        national: { apiKey: 'KEY', endpoint: 'EP' },
        provincial: { apiKey: 'KEY', endpoint: 'EP' },
        standard: { docPath: 'PATH', endpoint: 'EP' },
      },
      dataSourcePriority: ['provincial', 'national'],
      validShortValues: ['无', '不需要', '不适用'],
    }
    writeFileSync(tmpFile, JSON.stringify(pack), 'utf-8')
    process.env.GOV_CONFIG_PACK_PATH = tmpFile

    const result = ConfigPackLoader.load()
    expect(result.loadSource).toBe('file')
    expect(result.configPack.validShortValues).toEqual(['无', '不需要', '不适用'])

    delete process.env.GOV_CONFIG_PACK_PATH
  })

  it('无词表包向后兼容: 外部配置包不含 validShortValues 时无该字段且不报错', () => {
    const pack = {
      configPackId: 'gd-gov-2026',
      region: '广东省',
      configPackVersion: '2026.1.0',
      policyBasis: [{ name: '测试', docNumber: '粤府办〔2024〕1号', coreRequirement: '测试' }],
      requiredFields: ['事项名称'],
      formatRules: [],
      localStandardTerms: { materials: [], conditions: [] },
      logicErrorRules: [{ ruleId: 'LOG_001', standardClause: '测试', triggerFields: ['办理流程'], triggerKeywords: ['测试'], condition: '测试', suggestionTemplate: '测试' }],
      scoringWeights: { completeness: 0.3, accuracy: 0.4, traceability: 0.3 },
      itemTypeMatching: { 行政许可: { keywords: ['许可'], codePrefix: 'XK' } },
      severityMapping: { missing: 'major', semantic: 'critical', logical: 'critical' },
      gbtMapping: { structured: 'A01', semiStructured: 'A02', unstructured: 'A03' },
      dataSourceCredentials: {
        national: { apiKey: 'KEY', endpoint: 'EP' },
        provincial: { apiKey: 'KEY', endpoint: 'EP' },
        standard: { docPath: 'PATH', endpoint: 'EP' },
      },
      dataSourcePriority: ['provincial', 'national'],
    }
    writeFileSync(tmpFile, JSON.stringify(pack), 'utf-8')
    process.env.GOV_CONFIG_PACK_PATH = tmpFile

    const result = ConfigPackLoader.load()
    expect(result.loadSource).toBe('file')
    expect(result.configPack.validShortValues).toBeUndefined()

    delete process.env.GOV_CONFIG_PACK_PATH
  })
})
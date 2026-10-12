import { describe, it, expect } from 'vitest'
import { FormatValidator } from '../formatValidator.js'
import { LogicRuleEngine } from '../logicRuleEngine.js'
import { MissingFieldDetector } from '../missingFieldDetector.js'
import { SemanticRuleEngine } from '../semanticRuleEngine.js'
import type { FormatRule, StandardRule, KnowledgeBase } from '../types.js'
import defaultConfigPack from '../default-config-pack.json' with { type: 'json' }
import coreRules from '../core-rules.json' with { type: 'json' }

const formatRules = defaultConfigPack.formatRules as FormatRule[]

const severityMapping = defaultConfigPack.severityMapping as Record<string, string>

const processStandardRule: StandardRule = {
  ruleId: 'LOG_PROCESS_COMPLETENESS_001',
  standardClause: 'GB/T 36114-2018 附录A',
  triggerFields: ['办理流程'],
  condition: '办理流程缺少核心环节',
  suggestionTemplate: '补充环节',
  threshold: 0,
  triggerKeywords: [],
}

const emptyKb: KnowledgeBase = {
  timeLimits: [], materials: [], conditions: [],
  dataSourceStatus: { national: { status: 'success', fetchedAt: '2026-10-08T00:00:00Z', recordCount: 0 }, provincial: { status: 'success', fetchedAt: '2026-10-08T00:00:00Z', recordCount: 0 }, standard: { status: 'success', fetchedAt: '2026-10-08T00:00:00Z', recordCount: 0 } },
}

interface RuntimeAssertion {
  id:
    | 'RTA-01' | 'RTA-02' | 'RTA-03' | 'RTA-04' | 'RTA-05'
    | 'RTA-06' | 'RTA-07' | 'RTA-08' | 'RTA-09' | 'RTA-10'
    | 'RTA-11' | 'RTA-12' | 'RTA-13' | 'RTA-14' | 'RTA-15'
  desc: string
  input: Record<string, unknown>
  field: string
  expect: 'no-error'
}

const RUNTIME_ASSERTIONS: RuntimeAssertion[] = [
  { id: 'RTA-01', desc: '热线白名单: 成都12367出入境（带区号）', input: { 咨询电话: '028-12367' }, field: '咨询电话', expect: 'no-error' },
  { id: 'RTA-02', desc: '热线白名单: 12367纯短号', input: { 咨询电话: '12367' }, field: '咨询电话', expect: 'no-error' },
  { id: 'RTA-03', desc: '热线白名单: 存量12345', input: { 咨询电话: '028-12345' }, field: '咨询电话', expect: 'no-error' },
  { id: 'RTA-04', desc: '热线白名单: 监督电话12333', input: { 监督电话: '028-12333' }, field: '监督电话', expect: 'no-error' },
  { id: 'RTA-05', desc: '热线白名单: 存量12123', input: { 咨询电话: '12123' }, field: '咨询电话', expect: 'no-error' },
  { id: 'RTA-06', desc: '即时办结: 办理时限=即时办结', input: { 办理时限: '即时办结' }, field: '办理时限', expect: 'no-error' },
  { id: 'RTA-07', desc: '按标准收取: 收费标准=按标准收取', input: { 收费标准: '按标准收取' }, field: '收费标准', expect: 'no-error' },
  { id: 'RTA-08', desc: '具体金额: 收费标准=10元/本', input: { 收费标准: '10元/本' }, field: '收费标准', expect: 'no-error' },
  { id: 'RTA-09', desc: '流程组合: 审查→登记 不报critical', input: { 办理流程: '审查→登记' }, field: '办理流程', expect: 'no-error' },
  { id: 'RTA-10', desc: '简式流程: 受理→审核→备案 不报critical', input: { 办理流程: '受理→审核→备案' }, field: '办理流程', expect: 'no-error' },
  { id: 'RTA-11', desc: '图片流程: 点击查看办理流程图 不报critical', input: { 办理流程: '点击查看办理流程图' }, field: '办理流程', expect: 'no-error' },
  { id: 'RTA-12', desc: '表格下载"无": 不报missing', input: { 表格下载: '无' }, field: '表格下载', expect: 'no-error' },
  { id: 'RTA-13', desc: '表格下载"空白表格": 不报missing', input: { 表格下载: '空白表格' }, field: '表格下载', expect: 'no-error' },
  { id: 'RTA-14', desc: '网办深度国标三段: 互联网咨询、互联网收件、互联网预审', input: { 网上办理深度: '互联网咨询、互联网收件、互联网预审' }, field: '网上办理深度', expect: 'no-error' },
  { id: 'RTA-15', desc: '网办深度组合: 窗口办理,网上办理,快递申请', input: { 网上办理深度: '窗口办理,网上办理,快递申请' }, field: '网上办理深度', expect: 'no-error' },
]

describe('运行时断言 RTA-01~15（15项核心门禁）', () => {
  it('断言计数保护：RUNTIME_ASSERTIONS 必须恒为 15 项', () => {
    expect(RUNTIME_ASSERTIONS.length).toBe(15)
  })

  it('RTA-01~05: 热线白名单', () => {
    const rtaIds = new Set(['RTA-01', 'RTA-02', 'RTA-03', 'RTA-04', 'RTA-05'])
    const cases = RUNTIME_ASSERTIONS.filter((a) => rtaIds.has(a.id))
    expect(cases.length).toBe(5)
    for (const c of cases) {
      const issues = FormatValidator.validate(c.input, 'g1', formatRules)
      const fieldErrors = issues.filter((i) => i.field === c.field)
      expect(fieldErrors, `${c.id} ${c.desc} 输入=${JSON.stringify(c.input)}`).toHaveLength(0)
    }
  })

  it('RTA-06~08: 时限与收费', () => {
    const rtaIds = new Set(['RTA-06', 'RTA-07', 'RTA-08'])
    const cases = RUNTIME_ASSERTIONS.filter((a) => rtaIds.has(a.id))
    expect(cases.length).toBe(3)
    for (const c of cases) {
      const issues = FormatValidator.validate(c.input, 'g1', formatRules)
      const fieldErrors = issues.filter((i) => i.field === c.field)
      expect(fieldErrors, `${c.id} ${c.desc} 输入=${JSON.stringify(c.input)}`).toHaveLength(0)
    }
  })

  it('RTA-09~11: 流程组合（LogicRuleEngine critical=0）', () => {
    const rtaIds = new Set(['RTA-09', 'RTA-10', 'RTA-11'])
    const cases = RUNTIME_ASSERTIONS.filter((a) => rtaIds.has(a.id))
    expect(cases.length).toBe(3)
    for (const c of cases) {
      const details = LogicRuleEngine.detect(
        c.input,
        'g1',
        [processStandardRule],
        severityMapping,
        {
          processCoreStepKeywords: coreRules.processCoreStepKeywords,
          processSimplifiedStepAliases: coreRules.processSimplifiedStepAliases,
          processCoreStepCombinations: coreRules.processCoreStepCombinations,
        },
      )
      const criticalErrors = details.filter((d) => d.errorType === 'logical')
      const ruleErrors = details.filter((d) => d.ruleId === 'LOG_PROCESS_COMPLETENESS_001')
      expect(criticalErrors, `${c.id} ${c.desc} 输入=${JSON.stringify(c.input)} critical=${JSON.stringify(criticalErrors.map((d) => d.description))}`).toHaveLength(0)
      expect(ruleErrors).toHaveLength(0)
    }
  })

  it('RTA-12~13: 表格下载豁免（MissingFieldDetector）', () => {
    const rtaIds = new Set(['RTA-12', 'RTA-13'])
    const cases = RUNTIME_ASSERTIONS.filter((a) => rtaIds.has(a.id))
    expect(cases.length).toBe(2)
    for (const c of cases) {
      const details = MissingFieldDetector.detect(
        c.input,
        'g1',
        ['表格下载'],
        severityMapping,
        undefined,
        undefined,
        { fieldResidueValues: coreRules.fieldResidueValues },
      )
      const missingErrors = details.filter((d) => d.ruleId === 'MISSING-表格下载')
      expect(missingErrors, `${c.id} ${c.desc} 输入=${JSON.stringify(c.input)}`).toHaveLength(0)
    }
  })

  it('RTA-14~15: 网办深度（SemanticRuleEngine）', () => {
    const rtaIds = new Set(['RTA-14', 'RTA-15'])
    const cases = RUNTIME_ASSERTIONS.filter((a) => rtaIds.has(a.id))
    expect(cases.length).toBe(2)
    for (const c of cases) {
      const result = SemanticRuleEngine.detect(
        c.input,
        'g1',
        emptyKb,
        defaultConfigPack.itemTypeMatching as Record<string, { keywords: string[]; codePrefix: string }>,
        severityMapping,
        { degradedMode: true },
      )
      const depthErrors = result.details.filter((d) => d.ruleId === 'SEMANTIC-网办深度不规范')
      expect(depthErrors, `${c.id} ${c.desc} 输入=${JSON.stringify(c.input)}`).toHaveLength(0)
    }
  })

  it('反向验证: 非白名单号码仍报错', () => {
    const issues = FormatValidator.validate(
      { 咨询电话: '0512-88888' },
      'g1',
      formatRules,
    )
    expect(issues.length).toBeGreaterThan(0)
  })

  it('反向验证: 表格下载=undefined 仍报missing', () => {
    const details = MissingFieldDetector.detect(
      { '事项名称': '测试' },
      'g1',
      ['表格下载'],
      severityMapping,
      undefined,
      undefined,
      { fieldResidueValues: coreRules.fieldResidueValues },
    )
    expect(details.filter((d) => d.ruleId === 'MISSING-表格下载').length).toBeGreaterThan(0)
  })
})
import { describe, it, expect } from 'vitest'
import { InspectionOrchestrator } from '../inspectionOrchestrator.js'
import type { KnowledgeBase, StandardRule, RegulationKnowledgeBase } from '../types.js'
import defaultConfigPack from '../default-config-pack.json' with { type: 'json' }
import coreRules from '../core-rules.json' with { type: 'json' }
import regulationKb from '../regulation-knowledge-base.json' with { type: 'json' }

const kb = regulationKb as RegulationKnowledgeBase

const knowledgeBase: KnowledgeBase = {
  timeLimits: [
    { itemType: '行政许可', legalUpperLimit: 20, legalLowerLimit: 1, basisClause: '行政许可法第四十二条', dataSource: 'national', standardClause: '行政许可法第四十二条' },
    { itemType: '公共服务', legalUpperLimit: 30, legalLowerLimit: 1, basisClause: '行政许可法第四十二条', dataSource: 'national', standardClause: '行政许可法第四十二条' },
  ],
  materials: [], conditions: [],
  dataSourceStatus: { national: { status: 'success', fetchedAt: '2026-10-08T00:00:00Z', recordCount: 10 }, provincial: { status: 'success', fetchedAt: '2026-10-08T00:00:00Z', recordCount: 5 }, standard: { status: 'success', fetchedAt: '2026-10-08T00:00:00Z', recordCount: 4 } },
}

const standardRules: StandardRule[] = [
  { ruleId: 'LOG_PROCESS_COMPLETENESS_001', standardClause: 'GB/T 36114-2018 第6.4条', triggerFields: ['办理流程'], condition: '办理流程应包含完整环节', scanMode: 'anyField', threshold: undefined, suggestionTemplate: '请补充完整流程环节', triggerKeywords: ['受理', '审核', '审批', '办结', '送达'] },
]

const configDefault = { ...defaultConfigPack, ...coreRules, regulationKnowledgeBase: kb } as unknown as Parameters<typeof InspectionOrchestrator.orchestrate>[1]

function makeBaseSample(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    '事项名称': '机动车注册登记',
    '实施主体': '市公安局交通警察支队',
    '办理条件': '1.机动车所有人应当填写申请表',
    '申请材料': '1.机动车注册登记申请表；2.机动车来历证明',
    '办理流程': '受理→查验→登记→发证',
    '办理时限': '2个工作日',
    '收费标准': '不收费',
    '办理地点': '市公安局交通警察支队车辆管理所',
    '咨询电话': '0512-65123456',
    '监督电话': '0512-65123457',
    '网上办理深度': '网上办理',
    '办理时间': '工作日9:00-17:00',
    '结果送达方式': '现场领取',
    '表格下载': '可下载',
    ...overrides,
  }
}

describe('核心规则回归测试（7项）', () => {
  it('1. 热线白名单: 12345/12315/12123 不报格式错误', () => {
    const hotlines = ['020-12345', '0371-12315', '12123', '12345', '12333', '12385']
    let failCount = 0
    for (const hotline of hotlines) {
      const sample = makeBaseSample({ '咨询电话': hotline })
      const r = InspectionOrchestrator.orchestrate([sample], configDefault, knowledgeBase, standardRules)
      const fmtErrors = r.formatIssues.filter(f => f.field === '咨询电话')
      if (fmtErrors.length > 0) {
        failCount++
        console.log(`  [FAIL] ${hotline}: ${fmtErrors.map(e => e.issue).join('; ')}`)
      }
    }
    expect(failCount).toBe(0)
  })

  it('2. 即时办结: 办理时限="即时办结" 不报格式错误', () => {
    const sample = makeBaseSample({ '办理时限': '即时办结' })
    const r = InspectionOrchestrator.orchestrate([sample], configDefault, knowledgeBase, standardRules)
    const fmtErrors = r.formatIssues.filter(f => f.field === '办理时限')
    expect(fmtErrors.length).toBe(0)
  })

  it('3. 按标准收取: 收费标准="按标准收取" 不报缺关键词', () => {
    const sample = makeBaseSample({ '收费标准': '按标准收取' })
    const r = InspectionOrchestrator.orchestrate([sample], configDefault, knowledgeBase, standardRules)
    const core = r.errorDetails.filter(e => e.errorType !== 'warning' && e.errorType !== 'info')
    const chargeErrors = core.filter(e => e.field === '收费标准')
    expect(chargeErrors.length).toBe(0)
  })

  it('4. 具体金额: 收费标准="10元/本" 不报缺关键词', () => {
    const sample = makeBaseSample({ '收费标准': '10元/本' })
    const r = InspectionOrchestrator.orchestrate([sample], configDefault, knowledgeBase, standardRules)
    const core = r.errorDetails.filter(e => e.errorType !== 'warning' && e.errorType !== 'info')
    const chargeErrors = core.filter(e => e.field === '收费标准')
    expect(chargeErrors.length).toBe(0)
  })

  it('5. 流程组合: 办理流程="审查→登记" 不报流程缺失环节', () => {
    const sample = makeBaseSample({ '办理流程': '审查→登记' })
    const r = InspectionOrchestrator.orchestrate([sample], configDefault, knowledgeBase, standardRules)
    const core = r.errorDetails.filter(e => e.errorType !== 'warning' && e.errorType !== 'info')
    const processErrors = core.filter(e => e.field === '办理流程' && e.ruleId === 'LOG_PROCESS_COMPLETENESS_001')
    expect(processErrors.length).toBe(0)
  })

  it('6. 表格下载"无": 表格下载="无" 不报 missing', () => {
    const sample = makeBaseSample({ '表格下载': '无' })
    const r = InspectionOrchestrator.orchestrate([sample], configDefault, knowledgeBase, standardRules)
    const missingErrors = r.errorDetails.filter(e => e.errorType === 'missing' && e.field === '表格下载')
    expect(missingErrors.length).toBe(0)
  })

  it('7. 简式流程: 办理流程="受理→审核→备案" 不报流程缺失环节', () => {
    const sample = makeBaseSample({ '办理流程': '受理→审核→备案' })
    const r = InspectionOrchestrator.orchestrate([sample], configDefault, knowledgeBase, standardRules)
    const core = r.errorDetails.filter(e => e.errorType !== 'warning' && e.errorType !== 'info')
    const processErrors = core.filter(e => e.field === '办理流程' && e.ruleId === 'LOG_PROCESS_COMPLETENESS_001')
    expect(processErrors.length).toBe(0)
  })
})

describe('core-rules.json 完整性校验', () => {
  it('7个核心字段全部存在且非空', () => {
    const fields = [
      'govServiceHotlineWhitelist',
      'timeLimitValidExpressions',
      'chargeValidPatterns',
      'processCoreStepKeywords',
      'processSimplifiedStepAliases',
      'processCoreStepCombinations',
      'fieldResidueValues',
    ]
    for (const f of fields) {
      const val = (coreRules as Record<string, unknown>)[f]
      expect(val).toBeDefined()
      if (Array.isArray(val)) {
        expect(val.length).toBeGreaterThan(0)
      } else if (typeof val === 'object' && val !== null) {
        expect(Object.keys(val).length).toBeGreaterThan(0)
      }
    }
  })

  it('热线白名单含12345/12123/12315', () => {
    const whitelist = coreRules.govServiceHotlineWhitelist as string[]
    expect(whitelist).toContain('12345')
    expect(whitelist).toContain('12123')
    expect(whitelist).toContain('12315')
  })

  it('残值含"无"', () => {
    const residue = coreRules.fieldResidueValues as string[]
    expect(residue).toContain('无')
  })
})
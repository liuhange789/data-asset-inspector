import { describe, it, expect } from 'vitest'
import { InspectionOrchestrator } from '../inspectionOrchestrator.js'
import type { KnowledgeBase, StandardRule, FormatRule } from '../types.js'

const kb: KnowledgeBase = {
  timeLimits: [
    { itemType: '行政许可', legalUpperLimit: 20, legalLowerLimit: 1, basisClause: '行政许可法第四十二条', dataSource: 'national', standardClause: '行政许可法第四十二条' },
    { itemType: '现场勘查类', legalUpperLimit: 45, legalLowerLimit: 5, basisClause: '依据DB1405/T 085-2025', dataSource: 'national', standardClause: 'DB1405/T 085-2025 第5.2条' },
  ],
  materials: [
    { itemType: '行政许可', standardName: '营业执照复印件', isRequired: true, basisClause: '依据DB1405/T 085-2025', dataSource: 'national', standardClause: 'DB1405/T 085-2025 第6.1条' },
    { itemType: '行政许可', standardName: '行政许可申请表', isRequired: true, basisClause: '依据DB1405/T 085-2025', dataSource: 'national', standardClause: 'DB1405/T 085-2025 第6.2条' },
  ],
  conditions: [
    { itemType: '行政许可', elementName: '申请主体资格', standardValue: '符合法定条件', basisClause: '行政许可法第十二条', dataSource: 'national', standardClause: '行政许可法第十二条' },
  ],
  dataSourceStatus: {
    national: { status: 'success', fetchedAt: '2026-09-26T00:00:00Z', recordCount: 5 },
    provincial: { status: 'success', fetchedAt: '2026-09-26T00:00:00Z', recordCount: 3 },
    standard: { status: 'success', fetchedAt: '2026-09-26T00:00:00Z', recordCount: 4 },
  },
}

const standardRules: StandardRule[] = [
  { ruleId: 'LOG_SITE_INSPECTION_001', standardClause: 'DB1405/T 085-2025 第5.2条', triggerFields: ['办理流程', '办理时限'], condition: '现场勘查且时限<5', threshold: 5, suggestionTemplate: '建议调整', triggerKeywords: ['现场勘查'] },
  { ruleId: 'LOG_INSTANT_HANDLE_001', standardClause: 'DB1405/T 085-2025 第5.3条', triggerFields: ['办理流程', '办理时限'], condition: '当场办理且时限>1', threshold: 1, suggestionTemplate: '建议调整', triggerKeywords: ['当场办理'] },
  { ruleId: 'LOG_CONDITION_PROXY_001', standardClause: 'DB1405/T 085-2025 第5.4条', triggerFields: ['办理条件', '办理流程'], condition: '本人到场但允许代办', suggestionTemplate: '建议统一', threshold: undefined, triggerKeywords: ['本人到场', '本人办理', '代办', '委托办理'] },
  { ruleId: 'LOG_MATERIAL_CONDITION_001', standardClause: 'DB1405/T 085-2025 第5.5条', triggerFields: ['申请材料', '办理条件'], condition: '材料与条件不匹配', suggestionTemplate: '建议补充', threshold: undefined, triggerKeywords: ['收入证明', '产权证明', '资质证明', '无犯罪记录证明', '健康证明', '社保证明', '纳税证明'] },
]

const formatRules: FormatRule[] = [
  { field: '办理时限', pattern: '^\\d+个工作日$', suggestionTemplate: '应使用X个工作日格式' },
  { field: '咨询电话', pattern: '^(\\d{3,4}-)?\\d{7,8}$', suggestionTemplate: '应使用区号-号码格式' },
  { field: '收费标准', requiredKeywords: ['不收费', '收费依据'], suggestionTemplate: '应注明不收费或收费依据' },
  { field: '办理地点', requiredKeywords: ['街道', '路', '号', '室', '楼', '层', '栋'], suggestionTemplate: '应含具体地址' },
]

const config = {
  guideRequiredElements: [
    '事项名称', '实施主体', '办理条件', '申请材料', '办理流程', '办理时限',
    '收费标准', '办理地点', '咨询电话', '监督电话', '办理时间', '网上办理深度',
    '表格下载', '结果送达方式',
  ],
  formatRules,
  severityMapping: { missing: 'major', semantic: 'critical', logical: 'critical' },
  scoreWeights: { completeness: 0.3, accuracy: 0.4, traceability: 0.3 },
  convenienceWeights: { timeLimit: 0.3, onlineCapable: 0.4, materialConcise: 0.3 },
  itemTypeMatching: {
    行政许可: { keywords: ['许可', '审批', '核准'], codePrefix: 'XK' },
    现场勘查类: { keywords: ['现场勘查', '实地核查'], codePrefix: 'XC' },
  },
  materialConciseThreshold: 5,
  missingFieldStandardClause: 'DB1405/T 085-2025 第4.1条',
}

function makeCompleteGuide(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    事项名称: '食品经营许可',
    实施主体: '市场监管局',
    办理条件: '符合法定条件的公民、法人或其他组织',
    申请材料: '营业执照复印件、行政许可申请表',
    办理流程: '受理→审查→决定',
    办理时限: '20个工作日',
    收费标准: '不收费',
    办理地点: '某市某区某路1号',
    咨询电话: '010-12345678',
    监督电话: '010-87654321',
    办理时间: '工作日上午9-12点',
    网上办理深度: '全流程网办',
    表格下载: '可下载',
    结果送达方式: '邮寄',
    ...overrides,
  }
}

describe('InspectionOrchestrator 集成测试', () => {
  it('传入完整办事指南 → 五步编排返回完整五维报告', () => {
    const data = [makeCompleteGuide()]
    const result = InspectionOrchestrator.orchestrate(data, config, kb, standardRules)
    expect(result.totalGuidesChecked).toBe(1)
    expect(result.completeness).toBe(100)
    expect(result.missingFields).toBe(0)
    expect(result.errorDetails).toBeDefined()
    expect(result.formatIssues).toBeDefined()
    expect(result.detectionRates).toBeDefined()
    expect(result.detectionRates.overallScore).toBeGreaterThanOrEqual(0)
  })

  it('传入含漏项/语义错误/逻辑错误的指南 → 三类计数独立且与明细一致', () => {
    const data = [
      makeCompleteGuide({
        咨询电话: undefined,
        办理时限: '90个工作日',
        办理流程: '当场办理',
      }),
    ]
    const result = InspectionOrchestrator.orchestrate(data, config, kb, standardRules)
    expect(result.missingFields).toBeGreaterThan(0)
    expect(result.semanticErrors).toBeGreaterThan(0)
    expect(result.logicalErrors).toBeGreaterThan(0)
    const missingCount = result.errorDetails.filter((d) => d.errorType === 'missing').length
    const semanticCount = result.errorDetails.filter((d) => d.errorType === 'semantic').length
    const logicalCount = result.errorDetails.filter((d) => d.errorType === 'logical').length
    expect(missingCount).toBe(result.missingFields)
    expect(semanticCount).toBe(result.semanticErrors)
    expect(logicalCount).toBe(result.logicalErrors)
  })

  it('data.length===0 → completeness为0', () => {
    const result = InspectionOrchestrator.orchestrate([], config, kb, standardRules)
    expect(result.completeness).toBe(0)
    expect(result.totalGuidesChecked).toBe(0)
  })

  it('错误明细表中每条errorType属于missing/semantic/logical之一', () => {
    const data = [
      makeCompleteGuide({ 咨询电话: undefined, 办理时限: '90个工作日', 办理流程: '当场办理' }),
    ]
    const result = InspectionOrchestrator.orchestrate(data, config, kb, standardRules)
    for (const d of result.errorDetails) {
      expect(['missing', 'semantic', 'logical']).toContain(d.errorType)
    }
  })

  it('错误明细六字段均非空', () => {
    const data = [makeCompleteGuide({ 咨询电话: undefined })]
    const result = InspectionOrchestrator.orchestrate(data, config, kb, standardRules)
    for (const d of result.errorDetails) {
      expect(d.guideId).toBeTruthy()
      expect(d.field).toBeTruthy()
      expect(d.description).toBeTruthy()
      expect(d.suggestion).toBeTruthy()
    }
  })

  const fieldMapping = {
    '申报条件': '办理条件',
    '审批条件': '办理条件',
    '不见面审批': '网上办理深度',
    '办事流程': '办理流程',
    '申报材料': '申请材料',
    '承诺时限': '办理时限',
    '经办机构': '实施主体',
    '咨询电话号码': '咨询电话',
    '投诉电话': '监督电话',
    '办公地址': '办理地点',
    '办公时间': '办理时间',
  }

  const configWithMapping = {
    ...config,
    requiredFields: [
      '事项名称', '实施主体', '办理条件', '申请材料', '办理流程', '办理时限',
      '收费标准', '办理地点', '咨询电话', '监督电话', '办理时间', '网上办理深度',
      '表格下载', '结果送达方式',
    ],
    fieldMapping,
  }

  it('ORCH-MAP-01: 非标字段名经映射后 → 漏项检测使用标准字段名 → 无误报漏项', () => {
    const data = [{
      事项名称: '食品经营许可',
      经办机构: '市场监管局',
      申报条件: '符合法定条件',
      申报材料: '营业执照复印件、行政许可申请表',
      办事流程: '受理→审查→决定',
      承诺时限: '20个工作日',
      收费标准: '不收费',
      办公地址: '某市某区某路1号',
      咨询电话号码: '010-12345678',
      投诉电话: '010-87654321',
      办公时间: '工作日上午9-12点',
      不见面审批: '全流程网办',
      表格下载: '可下载',
      结果送达方式: '邮寄',
    }]
    const result = InspectionOrchestrator.orchestrate(data, configWithMapping, kb, standardRules)
    expect(result.missingFields).toBe(0)
    expect(result.completeness).toBe(100)
  })

  it('ORCH-MAP-02: 非标字段名经映射后 → 逻辑检测使用标准字段名 → 正确检出逻辑错误', () => {
    const data = [{
      事项名称: '食品经营许可',
      经办机构: '市场监管局',
      申报条件: '符合法定条件',
      申报材料: '营业执照复印件、行政许可申请表',
      办事流程: '受理→现场勘查→决定',
      承诺时限: '3个工作日',
      收费标准: '不收费',
      办公地址: '某市某区某路1号',
      咨询电话号码: '010-12345678',
      投诉电话: '010-87654321',
      办公时间: '工作日上午9-12点',
      不见面审批: '全流程网办',
      表格下载: '可下载',
      结果送达方式: '邮寄',
    }]
    const result = InspectionOrchestrator.orchestrate(data, configWithMapping, kb, standardRules)
    expect(result.logicalErrors).toBeGreaterThan(0)
    expect(result.errorDetails.some((d) => d.errorType === 'logical' && d.description.includes('现场勘查'))).toBe(true)
  })
})
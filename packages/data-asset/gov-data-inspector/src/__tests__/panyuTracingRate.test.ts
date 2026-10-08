import { describe, it, expect } from 'vitest'
import { InspectionOrchestrator } from '../inspectionOrchestrator.js'
import { enrichWithPolicyBasis, annotateFormatIssuePolicyBasis } from '../reportGenerator.js'
import { findRuleById } from '../ruleExtractor.js'
import type { KnowledgeBase, StandardRule, RegulationKnowledgeBase } from '../types.js'
import defaultConfigPack from '../default-config-pack.json' with { type: 'json' }
import regulationKb from '../regulation-knowledge-base.json' with { type: 'json' }

const kb = regulationKb as RegulationKnowledgeBase

const knowledgeBase: KnowledgeBase = {
  timeLimits: [
    { itemType: '行政许可', legalUpperLimit: 20, legalLowerLimit: 1, basisClause: '行政许可法第四十二条', dataSource: 'national', standardClause: '行政许可法第四十二条' },
    { itemType: '行政确认', legalUpperLimit: 15, legalLowerLimit: 1, basisClause: '行政许可法第四十二条', dataSource: 'national', standardClause: '行政许可法第四十二条' },
    { itemType: '行政给付', legalUpperLimit: 30, legalLowerLimit: 1, basisClause: '行政许可法第四十二条', dataSource: 'national', standardClause: '行政许可法第四十二条' },
  ],
  materials: [],
  conditions: [],
  dataSourceStatus: {
    national: { status: 'success', fetchedAt: '2026-10-08T00:00:00Z', recordCount: 10 },
    provincial: { status: 'success', fetchedAt: '2026-10-08T00:00:00Z', recordCount: 5 },
    standard: { status: 'success', fetchedAt: '2026-10-08T00:00:00Z', recordCount: 4 },
  },
}

const standardRules: StandardRule[] = [
  { ruleId: 'LOG_SITE_INSPECTION_001', standardClause: 'DB1405/T 085-2025 第5.2条', triggerFields: ['办理流程', '办理时限'], condition: '现场勘查且时限<5', threshold: 5, suggestionTemplate: '建议调整', triggerKeywords: ['现场勘查'] },
  { ruleId: 'LOG_INSTANT_HANDLE_001', standardClause: 'DB1405/T 085-2025 第5.3条', triggerFields: ['办理流程', '办理时限'], condition: '当场办理且时限>1', threshold: 1, suggestionTemplate: '建议调整', triggerKeywords: ['当场办理'] },
  { ruleId: 'LOG_MATERIAL_CONDITION_001', standardClause: '国办发〔2017〕47号 第5.5条', triggerFields: ['申请材料', '办理条件'], condition: '条件要求的证明材料未列入材料清单', suggestionTemplate: '补充材料', threshold: 0, triggerKeywords: ['身份证明', '营业执照', '产权证明', '居住证明', '收入证明', '资质证明', '无犯罪记录证明', '健康证明', '学历证明', '学位证书'] },
  { ruleId: 'LOG_CONDITION_FIELD_MISPLACED_001', standardClause: 'GB/T 36114-2018 附录A', triggerFields: ['办理条件'], condition: '办理条件字段填写了材料清单内容', suggestionTemplate: '修正字段', threshold: 0, triggerKeywords: ['身份证复印件', '申请表原件', '营业执照副本'] },
  { ruleId: 'LOG_INSTANT_TIME_LIMIT_CONTRADICTION_001', standardClause: 'GB/T 36114-2018 附录A', triggerFields: ['办理流程', '办理时限'], condition: '即办件承诺时限与流程矛盾', threshold: 1, suggestionTemplate: '修正时限', triggerKeywords: ['即办', '当场办结', '即时办结'] },
  { ruleId: 'LOG_PROCESS_COMPLETENESS_001', standardClause: 'GB/T 36114-2018 附录A', triggerFields: ['办理流程'], condition: '办理流程缺少核心环节', suggestionTemplate: '补充环节', threshold: 0, triggerKeywords: [] },
  { ruleId: 'LOG_PROCESS_TIME_LIMIT_INCONSISTENT_001', standardClause: 'GB/T 36114-2018 附录A', triggerFields: ['办理时限'], condition: '办理时限超出法定上限', threshold: 20, suggestionTemplate: '修正时限', triggerKeywords: [] },
]

const config = {
  ...defaultConfigPack,
  regulationKnowledgeBase: kb,
} as unknown as Parameters<typeof InspectionOrchestrator.orchestrate>[1]

const panyuSamples: Record<string, unknown>[] = [
  {
    '事项名称': '番禺区食品经营许可证核发',
    '事项编码': 'PY00001001',
    '实施主体': '番禺区市场监督管理局',
    '办理条件': '1.申请人具有与经营食品品种相适应的条件；2.具有与经营的食品品种、数量相适应的食品原料处理和食品加工、包装、贮存等场所；3.保持该场所环境整洁，与有毒、有害场所以及其他污染源保持规定的距离',
    '申请材料': '1.食品经营许可证申请表；2.营业执照复印件；3.法定代表人身份证明；4.经营场所平面图',
    '办理流程': '受理→审查→决定→发证',
    '办理时限': '20个工作日',
    '收费标准': '不收费',
    '办理地点': '番禺区市桥街清河东路3号番禺区政务服务中心',
    '咨询电话': '020-84612345',
    '监督电话': '020-84612346',
    '网上办理深度': '全流程网办',
    '办理时间': '工作日9:00-12:00 14:00-17:00',
    '结果送达方式': '邮寄',
    '表格下载': '可下载',
  },
  {
    '事项名称': '番禺区公共场所卫生许可新证',
    '事项编码': 'PY00001002',
    '实施主体': '番禺区卫生健康局',
    '办理条件': '1.经营场所符合国家卫生标准；2.从业人员持有健康证明；3.卫生管理制度健全',
    '申请材料': '1.卫生许可证申请表；2.营业执照复印件；3.经营场所平面图',
    '办理流程': '受理→现场审查→决定→发证',
    '办理时限': '15个工作日',
    '收费标准': '不收费',
    '办理地点': '番禺区市桥街清河东路3号番禺区政务服务中心二楼',
    '咨询电话': '020-84822345',
    '监督电话': '020-84822346',
    '网上办理深度': '一级',
    '办理时间': '工作日9:00-17:00',
    '结果送达方式': '现场领取',
    '表格下载': '可下载',
  },
  {
    '事项名称': '番禺区即办件出生医学证明补发',
    '事项编码': 'PY00001003',
    '实施主体': '番禺区卫生健康局',
    '办理条件': '1.原出生医学证明遗失或损毁；2.申请人为本人或法定监护人',
    '申请材料': '1.补发申请表；2.申请人身份证明；3.原出生医学证明存根或相关证明',
    '办理流程': '即办→当场办结',
    '办理时限': '20个工作日',
    '收费标准': '不收费',
    '办理地点': '番禺区政务服务中心三楼卫健窗口',
    '咨询电话': '020-84833345',
    '监督电话': '020-84833346',
    '网上办理深度': '二级',
    '办理时间': '工作日9:00-12:00',
    '结果送达方式': '现场领取',
    '表格下载': '可下载',
  },
  {
    '事项名称': '番禺区条件字段错位样本',
    '事项编码': 'PY00001004',
    '实施主体': '番禺区民政局',
    '办理条件': '1.身份证复印件3份；2.申请表原件2份；3.营业执照副本1份',
    '申请材料': '1.申请表；2.身份证明',
    '办理流程': '受理→审查→决定',
    '办理时限': '10个工作日',
    '收费标准': '不收费',
    '办理地点': '番禺区市桥街清河东路3号',
    '咨询电话': '020-84844345',
    '监督电话': '020-84844346',
    '网上办理深度': '三级',
    '办理时间': '工作日全天',
    '结果送达方式': '邮寄',
    '表格下载': '可下载',
  },
]

describe('番禺样本 policyBasis 追溯率验证', () => {
  it('番禺样本核心错误 policyBasis 追溯率 ≥ 90%', () => {
    const result = InspectionOrchestrator.orchestrate(panyuSamples, config, knowledgeBase, standardRules)

    const coreErrors = result.errorDetails.filter((e) => e.errorType !== 'warning')
    expect(coreErrors.length).toBeGreaterThan(0)

    let traced = 0
    let total = 0
    const untraced: string[] = []

    for (const err of coreErrors) {
      total++
      const enriched = enrichWithPolicyBasis(err, kb)
      if (enriched.policyBasis && enriched.policyBasis !== '依据：待补充法规依据') {
        traced++
      } else {
        untraced.push(`${err.ruleId ?? 'no-ruleId'} (${err.field}/${err.errorType})`)
      }
    }

    for (const issue of result.formatIssues) {
      total++
      const enriched = annotateFormatIssuePolicyBasis(issue, kb)
      if (enriched.policyBasis && enriched.policyBasis !== '依据：待补充法规依据') {
        traced++
      } else {
        untraced.push(`${issue.ruleId ?? 'no-ruleId'} (${issue.field}/format)`)
      }
    }

    const tracingRate = total > 0 ? traced / total : 1
    const tracingPercent = (tracingRate * 100).toFixed(1)

    console.log(`[番禺核心追溯率] 核心错误=${total}, 已追溯=${traced}, 追溯率=${tracingPercent}%`)
    if (untraced.length > 0) {
      console.log(`[未追溯] ${untraced.join(', ')}`)
    }

    expect(tracingRate).toBeGreaterThanOrEqual(0.9)
  })

  it('番禺样本 logical 错误全部可追溯', () => {
    const result = InspectionOrchestrator.orchestrate(panyuSamples, config, knowledgeBase, standardRules)
    const logicalErrors = result.errorDetails.filter((e) => e.errorType === 'logical')

    if (logicalErrors.length === 0) return

    for (const err of logicalErrors) {
      const enriched = enrichWithPolicyBasis(err, kb)
      expect(enriched.policyBasis).not.toBe('依据：待补充法规依据')
      expect(enriched.sourceDocument).toBeTruthy()
      expect(enriched.sourceClause).toBeTruthy()
    }
  })

  it('3条新注册logical规则的ruleId在知识库中可反查', () => {
    const ruleIds = [
      'LOG_INSTANT_TIME_LIMIT_CONTRADICTION_001',
      'LOG_MATERIAL_CONDITION_001',
      'LOG_CONDITION_FIELD_MISPLACED_001',
    ]
    for (const ruleId of ruleIds) {
      const rule = findRuleById(kb, ruleId)
      expect(rule).not.toBeNull()
      expect(rule!.policyBasis).not.toContain('待补充')
      expect(rule!.policyBasis).toMatch(/^依据：/)
      expect(rule!.sourceDocument).toBeTruthy()
      expect(rule!.sourceClause).toBeTruthy()
    }
  })
})
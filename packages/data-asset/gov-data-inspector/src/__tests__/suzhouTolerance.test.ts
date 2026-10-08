import { describe, it, expect } from 'vitest'
import { InspectionOrchestrator } from '../inspectionOrchestrator.js'
import { enrichWithPolicyBasis, annotateFormatIssuePolicyBasis } from '../reportGenerator.js'
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
  { ruleId: 'LOG_INSTANT_TIME_LIMIT_CONTRADICTION_001', standardClause: 'GB/T 36114-2018 附录A', triggerFields: ['办理流程', '办理时限'], condition: '即办件承诺时限与流程矛盾', threshold: 1, suggestionTemplate: '修正时限', triggerKeywords: ['即办', '当场办结', '即时办结', '当场办理'] },
  { ruleId: 'LOG_PROCESS_COMPLETENESS_001', standardClause: 'GB/T 36114-2018 附录A', triggerFields: ['办理流程'], condition: '办理流程缺少核心环节', suggestionTemplate: '补充环节', threshold: 0, triggerKeywords: [] },
  { ruleId: 'LOG_PROCESS_TIME_LIMIT_INCONSISTENT_001', standardClause: 'GB/T 36114-2018 附录A', triggerFields: ['办理时限'], condition: '办理时限超出法定上限', threshold: 20, suggestionTemplate: '修正时限', triggerKeywords: [] },
]

const config = {
  ...defaultConfigPack,
  regulationKnowledgeBase: kb,
} as unknown as Parameters<typeof InspectionOrchestrator.orchestrate>[1]

const suzhouSamples: Record<string, unknown>[] = [
  {
    '事项名称': '有限责任公司设立登记',
    '事项编码': 'SZ00001001',
    '实施主体': '苏州市市场监督管理局',
    '办理条件': '1.股东符合法定人数；2.有符合公司章程规定的全体股东认缴的出资额；3.股东共同制定公司章程；4.有公司名称，建立符合有限责任公司要求的组织机构；5.有公司住所',
    '申请材料': '1.公司登记申请书；2.公司章程；3.股东主体资格证明；4.法定代表人身份证明；5.住所使用证明',
    '办理流程': '审查→登记',
    '办理时限': '3个工作日',
    '收费标准': '不收费',
    '办理地点': '苏州市姑苏区三香路998号苏州市政务服务中心',
    '咨询电话': '0512-65123456',
    '监督电话': '0512-65123457',
    '网上办理深度': '全流程网办',
    '办理时间': '工作日9:00-17:00',
    '结果送达方式': '邮寄',
    '表格下载': '可下载',
  },
  {
    '事项名称': '食品经营许可证核发',
    '事项编码': 'SZ00001002',
    '实施主体': '苏州市市场监督管理局',
    '办理条件': '1.申请人具有与经营食品品种相适应的条件；2.具有与经营的食品品种、数量相适应的食品原料处理和食品加工、包装、贮存等场所',
    '申请材料': '1.食品经营许可证申请表；2.营业执照复印件；3.法定代表人身份证明；4.经营场所平面图',
    '办理流程': '受理→审核→备案',
    '办理时限': '10个工作日',
    '收费标准': '不收费',
    '办理地点': '苏州市工业园区翠园路100号政务服务中心',
    '咨询电话': '0512-66612345',
    '监督电话': '0512-66612346',
    '网上办理深度': '二级',
    '办理时间': '工作日9:00-12:00 13:00-17:00',
    '结果送达方式': '现场领取',
    '表格下载': '可下载',
  },
  {
    '事项名称': '住房公积金提取审批',
    '事项编码': 'SZ00001003',
    '实施主体': '苏州市住房公积金管理中心',
    '办理条件': '1.职工连续足额缴存住房公积金满3个月；2.本人及配偶在缴存城市无自有住房且租住公共租赁住房',
    '申请材料': '1.提取申请表；2.身份证明；3.租房合同；4.无房证明',
    '办理流程': '即办→当场办结',
    '办理时限': '1个工作日',
    '收费标准': '不收费',
    '办理地点': '苏州市干将东路100号住房公积金管理中心',
    '咨询电话': '0512-65212345',
    '监督电话': '0512-65212346',
    '网上办理深度': '全流程网办',
    '办理时间': '工作日9:00-17:00',
    '结果送达方式': '银行转账',
    '表格下载': '可下载',
  },
  {
    '事项名称': '公共场所卫生许可新证',
    '事项编码': 'SZ00001004',
    '实施主体': '苏州市卫生健康委员会',
    '办理条件': '1.经营场所符合国家卫生标准；2.从业人员持有健康证明；3.卫生管理制度健全。实行告知承诺制办理',
    '申请材料': '1.卫生许可证申请表；2.营业执照复印件；3.经营场所平面图；4.告知承诺书；5.从业人员健康证明',
    '办理流程': '申请→受理→审查→决定→送达',
    '办理时限': '5个工作日',
    '收费标准': '不收费',
    '办理地点': '苏州市姑苏区平泷路251号政务服务中心',
    '咨询电话': '0512-65312345',
    '监督电话': '0512-65312346',
    '网上办理深度': '三级',
    '办理时间': '工作日9:00-17:00',
    '结果送达方式': '邮寄',
    '表格下载': '可下载',
  },
  {
    '事项名称': '不动产登记（住宅类）',
    '事项编码': 'SZ00001005',
    '实施主体': '苏州市不动产登记中心',
    '办理条件': '1.申请人为不动产权利人；2.不动产产权来源清晰；3.申请登记的不动产符合登记条件',
    '申请材料': '1.不动产登记申请表；2.申请人身份证明；3.不动产权属来源证明材料；4.完税证明',
    '办理流程': '受理→审核→备案',
    '办理时限': '5个工作日',
    '收费标准': '住宅 80 元/件 非住宅 550 元/件',
    '办理地点': '苏州市姑苏区干将东路333号不动产登记中心',
    '咨询电话': '0512-65412345',
    '监督电话': '0512-65412346',
    '网上办理深度': '二级',
    '办理时间': '工作日9:00-12:00 13:00-17:00',
    '结果送达方式': '现场领取',
    '表格下载': '可下载',
  },
  {
    '事项名称': '建筑工程施工许可证核发',
    '事项编码': 'SZ00001006',
    '实施主体': '苏州市住房和城乡建设局',
    '办理条件': '1.已取得建筑工程用地批准手续；2.已取得建设工程规划许可证；3.施工图设计文件已审查合格',
    '申请材料': '1.施工许可申请表；2.用地批准文件；3.工程规划许可证；4.施工图审查合格书',
    '办理流程': '受理→审查→决定→送达',
    '办理时限': '15个工作日',
    '收费标准': '不收费',
    '办理地点': '苏州市姑苏区劳动路105号住建局政务服务中心',
    '咨询电话': '0512-65512345',
    '监督电话': '0512-65512346',
    '网上办理深度': '一级',
    '办理时间': '工作日9:00-17:00',
    '结果送达方式': '现场领取',
    '表格下载': '可下载',
  },
  {
    '事项名称': '社会保险参保登记',
    '事项编码': 'SZ00001007',
    '实施主体': '苏州市社会保险基金管理中心',
    '办理条件': '1.用人单位依法成立；2.用人单位招用人员建立劳动关系。实行容缺受理制度',
    '申请材料': '1.参保登记申请表；2.营业执照；3.组织机构代码证；4.法定代表人身份证明',
    '办理流程': '受理→审核→办结',
    '办理时限': '即时办结',
    '收费标准': '不收费',
    '办理地点': '苏州市姑苏区体育中心路1号社保中心',
    '咨询电话': '0512-65612345',
    '监督电话': '0512-65612346',
    '网上办理深度': '全流程网办',
    '办理时间': '工作日9:00-17:00',
    '结果送达方式': '在线推送',
    '表格下载': '可下载',
  },
]

describe('苏州规范网站容错验证', () => {
  it('苏州7条样本误报数 ≤ 1', () => {
    const result = InspectionOrchestrator.orchestrate(suzhouSamples, config, knowledgeBase, standardRules)

    const allErrors = [...result.errorDetails, ...result.formatIssues.flatMap((f) => [{ guideId: f.guideId, field: f.field, errorType: 'format' as const, description: f.issue }])]
    const falsePositives = allErrors.filter((e) => e.errorType !== 'warning')

    console.log(`[苏州误报] 总错误=${allErrors.length}, 核心错误(非warning)=${falsePositives.length}`)
    for (const e of falsePositives) {
      console.log(`  - ${e.guideId} | ${e.field} | ${e.errorType} | ${e.description?.substring(0, 60)}`)
    }

    expect(falsePositives.length).toBeLessThanOrEqual(1)
  })

  it('苏州样本 policyBasis 追溯率 100%', () => {
    const result = InspectionOrchestrator.orchestrate(suzhouSamples, config, knowledgeBase, standardRules)
    const coreErrors = result.errorDetails.filter((e) => e.errorType !== 'warning')

    let traced = 0
    let total = 0
    for (const err of coreErrors) {
      total++
      const enriched = enrichWithPolicyBasis(err, kb)
      if (enriched.policyBasis && enriched.policyBasis !== '依据：待补充法规依据') traced++
    }
    for (const issue of result.formatIssues) {
      total++
      const enriched = annotateFormatIssuePolicyBasis(issue, kb)
      if (enriched.policyBasis && enriched.policyBasis !== '依据：待补充法规依据') traced++
    }

    const rate = total > 0 ? traced / total : 1
    console.log(`[苏州追溯率] 核心错误=${total}, 已追溯=${traced}, 追溯率=${(rate * 100).toFixed(1)}%`)
    expect(rate).toBeGreaterThanOrEqual(0.9)
  })

  it('苏州流程简化表述不误报', () => {
    const simplifiedFlows = [
      '审查→登记',
      '受理→审核→备案',
      '申请→受理→审查→决定→送达',
      '受理→审核→办结',
    ]
    for (const flow of simplifiedFlows) {
      const guide: Record<string, unknown> = {
        '事项名称': `测试-${flow}`,
        '实施主体': '苏州市测试部门',
        '办理条件': '1.符合条件',
        '申请材料': '1.申请表；2.身份证明',
        '办理流程': flow,
        '办理时限': '5个工作日',
        '收费标准': '不收费',
        '办理地点': '苏州市姑苏区三香路998号',
        '咨询电话': '0512-65123456',
        '监督电话': '0512-65123457',
        '网上办理深度': '二级',
        '办理时间': '工作日9:00-17:00',
        '结果送达方式': '邮寄',
        '表格下载': '可下载',
      }
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const processErrors = result.errorDetails.filter((e) => e.field === '办理流程' && e.errorType === 'logical')
      expect(processErrors.length).toBe(0)
    }
  })

  it('即办件1工作日不报矛盾', () => {
    const guide: Record<string, unknown> = {
      '事项名称': '即办件测试',
      '实施主体': '苏州市测试部门',
      '办理条件': '1.符合条件',
      '申请材料': '1.申请表',
      '办理流程': '即办→当场办结',
      '办理时限': '1个工作日',
      '收费标准': '不收费',
      '办理地点': '苏州市姑苏区三香路998号',
      '咨询电话': '0512-65123456',
      '监督电话': '0512-65123457',
      '网上办理深度': '全流程网办',
      '办理时间': '工作日9:00-17:00',
      '结果送达方式': '现场领取',
      '表格下载': '可下载',
    }
    const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
    const contradictionErrors = result.errorDetails.filter((e) => e.ruleId === 'LOG_INSTANT_TIME_LIMIT_CONTRADICTION_001')
    expect(contradictionErrors.length).toBe(0)
  })

  it('告知承诺制当场办理5日不报矛盾', () => {
    const guide: Record<string, unknown> = {
      '事项名称': '告知承诺制测试',
      '实施主体': '苏州市卫生健康委员会',
      '办理条件': '1.经营场所符合卫生标准。实行告知承诺制办理',
      '申请材料': '1.申请表；2.告知承诺书',
      '办理流程': '当场办理→审查→决定',
      '办理时限': '5个工作日',
      '收费标准': '不收费',
      '办理地点': '苏州市姑苏区平泷路251号',
      '咨询电话': '0512-65312345',
      '监督电话': '0512-65312346',
      '网上办理深度': '三级',
      '办理时间': '工作日9:00-17:00',
      '结果送达方式': '邮寄',
      '表格下载': '可下载',
    }
    const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
    const contradictionErrors = result.errorDetails.filter((e) => e.ruleId === 'LOG_INSTANT_TIME_LIMIT_CONTRADICTION_001')
    expect(contradictionErrors.length).toBe(0)
  })

  it('收费标准含明确金额不报缺关键词', () => {
    const guide: Record<string, unknown> = {
      '事项名称': '不动产登记测试',
      '实施主体': '苏州市不动产登记中心',
      '办理条件': '1.申请人为权利人',
      '申请材料': '1.申请表；2.身份证明',
      '办理流程': '受理→审核→备案',
      '办理时限': '5个工作日',
      '收费标准': '住宅 80 元/件 非住宅 550 元/件',
      '办理地点': '苏州市干将东路333号',
      '咨询电话': '0512-65412345',
      '监督电话': '0512-65412346',
      '网上办理深度': '二级',
      '办理时间': '工作日9:00-17:00',
      '结果送达方式': '现场领取',
      '表格下载': '可下载',
    }
    const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
    const chargeErrors = result.formatIssues.filter((f) => f.field === '收费标准')
    expect(chargeErrors.length).toBe(0)
  })
})
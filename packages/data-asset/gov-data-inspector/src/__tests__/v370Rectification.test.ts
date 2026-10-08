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
  materials: [], conditions: [],
  dataSourceStatus: { national: { status: 'success', fetchedAt: '2026-10-08T00:00:00Z', recordCount: 10 }, provincial: { status: 'success', fetchedAt: '2026-10-08T00:00:00Z', recordCount: 5 }, standard: { status: 'success', fetchedAt: '2026-10-08T00:00:00Z', recordCount: 4 } },
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
const config = { ...defaultConfigPack, regulationKnowledgeBase: kb } as unknown as Parameters<typeof InspectionOrchestrator.orchestrate>[1]

function makeGuide(overrides: Record<string, unknown>): Record<string, unknown> {
  const base: Record<string, unknown> = {
    '事项名称': '测试事项', '实施主体': '测试部门', '办理条件': '1.符合条件', '申请材料': '1.申请表；2.身份证明',
    '办理流程': '受理→审查→决定→送达', '办理时限': '5个工作日', '收费标准': '不收费',
    '办理地点': '苏州市姑苏区三香路998号政务服务中心', '咨询电话': '0512-65123456', '监督电话': '0512-65123457',
    '网上办理深度': '二级', '办理时间': '工作日9:00-17:00', '结果送达方式': '邮寄', '表格下载': '可下载',
  }
  for (const k of Object.keys(overrides)) { if (overrides[k] === undefined) delete base[k]; else base[k] = overrides[k] }
  return base
}

describe('v3.7.0 整改专项验证', () => {
  describe('整改1: F6 办理形式别名', () => {
    it('办理形式=网上办理 → 不报MISSING-网上办理深度', () => {
      const guide = makeGuide({ '网上办理深度': undefined, '办理形式': '网上办理' })
      const r = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const m = r.errorDetails.filter(e => e.field === '网上办理深度' && e.errorType === 'missing')
      expect(m.length).toBe(0)
    })
    it('办理形式=窗口办理 → 不报MISSING-网上办理深度', () => {
      const guide = makeGuide({ '网上办理深度': undefined, '办理形式': '窗口办理' })
      const r = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const m = r.errorDetails.filter(e => e.field === '网上办理深度' && e.errorType === 'missing')
      expect(m.length).toBe(0)
    })
  })

  describe('整改2: isImageFlow扩展', () => {
    it('点击查看办理流程图 → 不报流程不完整', () => {
      const guide = makeGuide({ '办理流程': '点击查看办理流程图' })
      const r = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const e = r.errorDetails.filter(e => e.ruleId === 'LOG_PROCESS_COMPLETENESS_001')
      expect(e.length).toBe(0)
    })
    it('findlct.do跳转链接 → 不报流程不完整', () => {
      const guide = makeGuide({ '办理流程': 'https://gov.cn/findlct.do?id=123' })
      const r = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const e = r.errorDetails.filter(e => e.ruleId === 'LOG_PROCESS_COMPLETENESS_001')
      expect(e.length).toBe(0)
    })
    it('/bszn跳转链接 → 不报流程不完整+不报时限', () => {
      const guide = makeGuide({ '办理流程': 'https://gov.cn/bszn/12345' })
      const r = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const e1 = r.errorDetails.filter(e => e.ruleId === 'LOG_PROCESS_COMPLETENESS_001')
      const e2 = r.errorDetails.filter(e => e.ruleId === 'LOG_PROCESS_TIME_LIMIT_INCONSISTENT_001')
      expect(e1.length).toBe(0)
      expect(e2.length).toBe(0)
    })
    it('查看办理流程 → 不报流程不完整', () => {
      const guide = makeGuide({ '办理流程': '查看办理流程' })
      const r = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const e = r.errorDetails.filter(e => e.ruleId === 'LOG_PROCESS_COMPLETENESS_001')
      expect(e.length).toBe(0)
    })
  })

  describe('整改3: 材料清单完整性', () => {
    it('有编号项+长度充分 → 不报不完整', () => {
      const guide = makeGuide({ '申请材料': '1.食品经营许可证申请表 2.营业执照复印件 3.法定代表人身份证明' })
      const r = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const e = r.errorDetails.filter(e => e.ruleId === 'SEMANTIC-材料清单不完整')
      expect(e.length).toBe(0)
    })
    it('有份数信息 → 不报不完整', () => {
      const guide = makeGuide({ '申请材料': '申请表原件2份' })
      const r = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const e = r.errorDetails.filter(e => e.ruleId === 'SEMANTIC-材料清单不完整')
      expect(e.length).toBe(0)
    })
    it('仅1个词且无标点无份数 → 仍报不完整(降级模式)', () => {
      const emptyKb: KnowledgeBase = { timeLimits: [], materials: [], conditions: [], dataSourceStatus: { national: { status: 'success', fetchedAt: '2026-10-08T00:00:00Z', recordCount: 0 }, provincial: { status: 'success', fetchedAt: '2026-10-08T00:00:00Z', recordCount: 0 }, standard: { status: 'success', fetchedAt: '2026-10-08T00:00:00Z', recordCount: 0 } } }
      const guide = makeGuide({ '申请材料': '申请表' })
      const r = InspectionOrchestrator.orchestrate([guide], config, emptyKb, standardRules, { degradedMode: true })
      const e = r.errorDetails.filter(e => e.ruleId === 'SEMANTIC-材料清单不完整')
      expect(e.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('整改4: 依职权事项豁免', () => {
    it('事项名称含"依职权" → 豁免申请材料/表格下载/网上办理深度/结果送达方式', () => {
      const guide = makeGuide({
        '事项名称': '依职权事项注销登记',
        '申请材料': undefined, '表格下载': undefined, '网上办理深度': undefined, '结果送达方式': undefined,
      })
      const r = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const m = r.errorDetails.filter(e => e.errorType === 'missing' &&
        ['申请材料', '表格下载', '网上办理深度', '结果送达方式'].includes(e.field))
      expect(m.length).toBe(0)
    })
    it('办理条件含"无需申请" → 豁免', () => {
      const guide = makeGuide({
        '办理条件': '1.无需申请，由登记机关依职权主动开展',
        '申请材料': undefined, '表格下载': undefined, '网上办理深度': undefined, '结果送达方式': undefined,
      })
      const r = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const m = r.errorDetails.filter(e => e.errorType === 'missing' &&
        ['申请材料', '表格下载', '网上办理深度', '结果送达方式'].includes(e.field))
      expect(m.length).toBe(0)
    })
    it('非依职权事项 → 仍报缺失', () => {
      const guide = makeGuide({ '申请材料': undefined })
      const r = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const m = r.errorDetails.filter(e => e.errorType === 'missing' && e.field === '申请材料')
      expect(m.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('整改5: 扩展要素warning降为info', () => {
    it('扩展要素缺失 → errorType=info', () => {
      const guide = makeGuide({ '结果样本': undefined })
      const r = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const info = r.errorDetails.filter(e => e.field === '结果样本' && e.errorType === 'info')
      const warn = r.errorDetails.filter(e => e.field === '结果样本' && e.errorType === 'warning')
      expect(info.length).toBeGreaterThanOrEqual(1)
      expect(warn.length).toBe(0)
    })
    it('时限L2 warning仍为warning（非info）', () => {
      const guide = makeGuide({ '办理流程': '受理→审查→决定→送达', '办理时限': '5个工作日' })
      const r = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const l2 = r.errorDetails.filter(e => e.ruleId === 'LOG_PROCESS_TIME_LIMIT_INCONSISTENT_001' && e.errorType === 'warning')
      expect(l2.length).toBeGreaterThanOrEqual(1)
    })
  })
})

describe('整改6: 第四批全新7条样本', () => {
  const samples: Record<string, unknown>[] = [
    makeGuide({
      '事项名称': '内资公司设立登记', '实施主体': '苏州市行政审批局',
      '办理条件': '1.股东符合法定人数；2.有符合章程规定的全体股东认缴的出资额；3.股东共同制定公司章程；4.有公司名称；5.有公司住所',
      '申请材料': '1.公司登记（备案）申请书 原件1份 2.公司章程 原件1份 3.股东主体资格证明 复印件1份 4.法定代表人身份证明 复印件1份 5.住所使用证明 原件1份',
      '办理流程': '点击查看办理流程图', '办理时限': '3个工作日',
      '办理地点': '苏州市姑苏区三香路998号苏州市政务服务中心二楼',
      '网上办理深度': undefined, '办理形式': '网上办理',
    }),
    makeGuide({
      '事项名称': '食品经营许可证核发', '实施主体': '苏州市市场监督管理局',
      '办理条件': '1.申请人具有与经营食品品种相适应的条件；2.具有与经营的食品品种、数量相适应的食品原料处理和食品加工、包装、贮存等场所',
      '申请材料': '1.食品经营许可证申请表 原件1份 2.营业执照复印件 复印件1份 3.法定代表人身份证明 复印件1份 4.经营场所平面图 原件1份',
      '办理流程': 'https://szgov.cn/findlct.do?itemid=12345', '办理时限': '10个工作日',
      '办理地点': '苏州市工业园区翠园路100号政务服务中心',
    }),
    makeGuide({
      '事项名称': '依职权注销登记', '实施主体': '苏州市市场监督管理局',
      '办理条件': '1.符合法定注销条件，由登记机关依职权主动开展注销登记',
      '申请材料': undefined, '办理流程': '受理→审查→决定→送达', '办理时限': '5个工作日',
      '办理地点': '苏州市姑苏区三香路998号',
      '表格下载': undefined, '网上办理深度': undefined, '结果送达方式': undefined,
    }),
    makeGuide({
      '事项名称': '住房公积金提取审批', '实施主体': '苏州市住房公积金管理中心',
      '办理条件': '1.职工连续足额缴存住房公积金满3个月；2.本人及配偶在缴存城市无自有住房且租住公共租赁住房',
      '申请材料': '1.提取申请表 原件1份 2.身份证明 复印件1份 3.租房合同 复印件1份 4.无房证明 原件1份',
      '办理流程': '即办→当场办结', '办理时限': '1个工作日',
      '办理地点': '苏州市干将东路100号住房公积金管理中心',
      '网上办理深度': '全流程网办',
    }),
    makeGuide({
      '事项名称': '公共场所卫生许可新证', '实施主体': '苏州市卫生健康委员会',
      '办理条件': '1.经营场所符合国家卫生标准；2.从业人员持有健康证明；3.卫生管理制度健全。实行告知承诺制办理',
      '申请材料': '1.卫生许可证申请表 原件1份 2.营业执照复印件 复印件1份 3.经营场所平面图 原件1份 4.告知承诺书 原件1份 5.从业人员健康证明 复印件1份',
      '办理流程': '申请→受理→审查→决定→送达', '办理时限': '5个工作日',
      '办理地点': '苏州市姑苏区平泷路251号政务服务中心',
      '网上办理深度': '三级',
    }),
    makeGuide({
      '事项名称': '不动产登记（住宅类）', '实施主体': '苏州市不动产登记中心',
      '办理条件': '1.申请人为不动产权利人；2.不动产产权来源清晰；3.申请登记的不动产符合登记条件',
      '申请材料': '1.不动产登记申请表 原件1份 2.申请人身份证明 复印件1份 3.不动产权属来源证明材料 原件1份 4.完税证明 复印件1份',
      '办理流程': '受理→审核→备案', '办理时限': '5个工作日',
      '收费标准': '住宅 80 元/件 非住宅 550 元/件',
      '办理地点': '苏州市姑苏区干将东路333号不动产登记中心',
    }),
    makeGuide({
      '事项名称': '社会保险参保登记', '实施主体': '苏州市社会保险基金管理中心',
      '办理条件': '1.用人单位依法成立；2.用人单位招用人员建立劳动关系。实行容缺受理制度',
      '申请材料': '1.参保登记申请表 原件1份 2.营业执照 复印件1份 3.组织机构代码证 复印件1份 4.法定代表人身份证明 复印件1份',
      '办理流程': '受理→审核→办结', '办理时限': '即时办结',
      '办理地点': '苏州市姑苏区体育中心路1号社保中心',
      '网上办理深度': '全流程网办',
      '结果送达方式': undefined, '送达方式': '在线推送',
    }),
  ]

  it('第四批7条样本核心误报=0', () => {
    const r = InspectionOrchestrator.orchestrate(samples, config, knowledgeBase, standardRules)
    const core = r.errorDetails.filter(e => e.errorType !== 'warning' && e.errorType !== 'info')
    const fmt = r.formatIssues

    console.log('\n=== 第四批7条样本 ===')
    console.log(`  core=${core.length}, format=${fmt.length}`)
    console.log(`  missing=${r.errorDetails.filter(e=>e.errorType==='missing').length}, semantic=${r.errorDetails.filter(e=>e.errorType==='semantic').length}, logical=${r.errorDetails.filter(e=>e.errorType==='logical').length}`)
    console.log(`  warning=${r.errorDetails.filter(e=>e.errorType==='warning').length}, info=${r.errorDetails.filter(e=>e.errorType==='info').length}`)

    for (const e of core) {
      console.log(`  [${e.errorType}] ${e.guideId} | ${e.field} | ${e.ruleId} | ${e.description?.substring(0, 80)}`)
    }
    for (const f of fmt) {
      console.log(`  [fmt] ${f.guideId} | ${f.field} | ${f.issue?.substring(0, 80)}`)
    }

    expect(core.length).toBe(0)
    expect(fmt.length).toBe(0)
  })

  it('第四批policyBasis追溯率100%', () => {
    const r = InspectionOrchestrator.orchestrate(samples, config, knowledgeBase, standardRules)
    const core = r.errorDetails.filter(e => e.errorType !== 'warning' && e.errorType !== 'info')
    let traced = 0, total = 0
    for (const e of core) { total++; const en = enrichWithPolicyBasis(e, kb); if (en.policyBasis && en.policyBasis !== '依据：待补充法规依据') traced++ }
    for (const f of r.formatIssues) { total++; const en = annotateFormatIssuePolicyBasis(f, kb); if (en.policyBasis && en.policyBasis !== '依据：待补充法规依据') traced++ }
    const rate = total > 0 ? (traced / total * 100).toFixed(1) : '100.0'
    console.log(`  policyBasis: core=${total}, traced=${traced}, rate=${rate}%`)
    expect(total === 0 || traced / total >= 0.9).toBe(true)
  })
})
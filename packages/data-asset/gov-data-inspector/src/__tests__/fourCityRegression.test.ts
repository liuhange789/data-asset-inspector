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

const configDefault = { ...defaultConfigPack, ...coreRules, regulationKnowledgeBase: kb } as unknown as Parameters<typeof InspectionOrchestrator.orchestrate>[1]
delete (configDefault as unknown as Record<string, unknown>).fieldAliases
delete (configDefault as unknown as Record<string, unknown>).fieldResidueValues
delete (configDefault as unknown as Record<string, unknown>).semanticContextExemptions
delete (configDefault as unknown as Record<string, unknown>).onlineDepthValidExpressions

function makeGuide(overrides: Record<string, unknown>): Record<string, unknown> {
  const base: Record<string, unknown> = {
    '事项名称': '测试事项', '实施主体': '测试部门', '办理条件': '1.符合条件', '申请材料': '1.申请表；2.身份证明',
    '办理流程': '受理→审查→决定→送达', '办理时限': '5个工作日', '收费标准': '不收费',
    '办理地点': '广州市番禺区市桥街清河东路3号', '咨询电话': '020-84866345', '监督电话': '020-84866346',
    '网上办理深度': '二级', '办理时间': '工作日9:00-17:00', '结果送达方式': '邮寄', '表格下载': '可下载',
  }
  for (const k of Object.keys(overrides)) { if (overrides[k] === undefined) delete base[k]; else base[k] = overrides[k] }
  return base
}

const PANYU_MISS = 5 as const
const PANYU_FMT = 2 as const

const panyuSamples: Record<string, unknown>[] = [
  makeGuide({
    '事项名称': '番禺区食品经营许可证核发', '实施主体': '番禺区市场监督管理局',
    '办理条件': '1.申请人具有与经营食品品种相适应的条件；2.具有与经营的食品品种、数量相适应的场所',
    '申请材料': '1.食品经营许可证申请表；2.营业执照复印件；3.法定代表人身份证明；4.经营场所平面图',
    '办理流程': '即办→当场办结', '办理时限': '5个工作日',
    '办理地点': '番禺区市桥街清河东路3号番禺区政务服务中心', '咨询电话': '020-84612345', '监督电话': '020-84612346',
    '网上办理深度': '全流程网办',
  }),
  makeGuide({
    '事项名称': '番禺区公共场所卫生许可新证', '实施主体': '番禺区卫生健康局',
    '办理条件': '1.经营场所符合国家卫生标准；2.从业人员持有健康证明；3.卫生管理制度健全',
    '申请材料': '1.卫生许可证申请表；2.营业执照复印件；3.经营场所平面图；4.从业人员健康证明',
    '办理流程': '即办→当场办结', '办理时限': '5个工作日',
    '办理地点': '番禺区市桥街清河东路3号番禺区政务服务中心二楼', '咨询电话': '020-84822345', '监督电话': '020-84822346',
    '网上办理深度': '一级',
  }),
  makeGuide({
    '事项名称': '番禺区即办件出生医学证明补发', '实施主体': '番禺区卫生健康局',
    '办理条件': '1.原出生医学证明遗失或损毁；2.申请人为本人或法定监护人',
    '申请材料': '1.补发申请表；2.申请人身份证明；3.原出生医学证明存根或相关证明',
    '办理流程': '即办→当场办结', '办理时限': '3个工作日',
    '办理地点': '番禺区政务服务中心三楼卫健窗口', '咨询电话': '020-84833345', '监督电话': '020-84833346',
    '网上办理深度': '二级',
  }),
  makeGuide({
    '事项名称': '番禺区气象证明出具', '实施主体': '番禺区气象局',
    '办理条件': '1.申请人提供需要气象证明的事项说明',
    '申请材料': '1.气象证明出具申请表；2.申请人身份证明',
    '办理流程': '即办→当场办结', '办理时限': '约5个工作日',
    '办理地点': '番禺区市桥街清河东路3号', '咨询电话': '020-34511300；020-12345', '监督电话': '020-84855346',
    '网上办理深度': '一级',
  }),
  makeGuide({
    '事项名称': '番禺区就业登记', '实施主体': '番禺区人力资源和社会保障局',
    '办理条件': '1.已就业人员；2.持有身份证明',
    '申请材料': '1.就业登记申请表；2.身份证明',
    '办理流程': '受理→审核→登记', '办理时限': '5个工作日以内',
    '咨询电话': '020-84866345', '网上办理深度': '二级',
    '监督电话': undefined, '收费标准': undefined, '办理时间': undefined,
    '结果送达方式': undefined, '表格下载': undefined, '办理地点': undefined,
    '送达方式': '邮寄',
  }),
]

const kaifengSamples: Record<string, unknown>[] = [
  makeGuide({
    '事项名称': '开封市食品经营许可', '实施主体': '开封市市场监督管理局',
    '办理条件': '1.符合食品经营条件；2.具有与经营规模相适应的场所',
    '申请材料': '1.食品经营许可证申请表；2.营业执照复印件；3.法定代表人身份证明',
    '办理流程': '受理→审查→决定→发证', '办理时限': '20个工作日',
    '办理地点': undefined, '咨询电话': '0371-12315', '监督电话': '0371-12345',
    '网上办理深度': undefined, '结果送达方式': undefined, '表格下载': undefined,
  }),
  makeGuide({
    '事项名称': '开封市住房公积金提取', '实施主体': '开封市住房公积金管理中心',
    '办理条件': '1.连续缴存满6个月；2.符合提取条件',
    '申请材料': '1.提取申请表；2.身份证明',
    '办理流程': '受理→审核→提取', '办理时限': '3个工作日',
    '办理地点': '开封市金明大道123号', '咨询电话': '0371-12329', '监督电话': '0371-12366',
    '网上办理深度': undefined, '结果送达方式': undefined,
  }),
]

const suzhouSamples: Record<string, unknown>[] = [
  makeGuide({
    '事项名称': '内资公司设立登记', '实施主体': '苏州市行政审批局',
    '办理条件': '1.股东符合法定人数；2.有符合章程规定的全体股东认缴的出资额；3.股东共同制定公司章程',
    '申请材料': '1.公司登记申请书 原件1份 2.公司章程 原件1份 3.股东主体资格证明 复印件1份 4.法定代表人身份证明 复印件1份',
    '办理流程': '点击查看办理流程图', '办理时限': '3个工作日',
    '办理地点': '苏州市姑苏区三香路998号苏州市政务服务中心二楼',
    '网上办理深度': undefined, '办理形式': '网上办理',
  }),
  makeGuide({
    '事项名称': '食品经营许可证核发', '实施主体': '苏州市市场监督管理局',
    '办理条件': '1.申请人具有与经营食品品种相适应的条件',
    '申请材料': '1.食品经营许可证申请表 原件1份 2.营业执照复印件 复印件1份 3.法定代表人身份证明 复印件1份',
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
    '办理条件': '1.职工连续足额缴存住房公积金满3个月；2.本人及配偶在缴存城市无自有住房',
    '申请材料': '1.提取申请表 原件1份 2.身份证明 复印件1份 3.租房合同 复印件1份',
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
    '办理条件': '1.申请人为不动产权利人；2.不动产产权来源清晰',
    '申请材料': '1.不动产登记申请表 原件1份 2.申请人身份证明 复印件1份 3.不动产权属来源证明材料 原件1份',
    '办理流程': '受理→审核→备案', '办理时限': '5个工作日',
    '收费标准': '住宅 80 元/件 非住宅 550 元/件',
    '办理地点': '苏州市姑苏区干将东路333号不动产登记中心',
  }),
  makeGuide({
    '事项名称': '社会保险参保登记', '实施主体': '苏州市社会保险基金管理中心',
    '办理条件': '1.用人单位依法成立；2.用人单位招用人员建立劳动关系。实行容缺受理制度',
    '申请材料': '1.参保登记申请表 原件1份 2.营业执照 复印件1份 3.组织机构代码证 复印件1份',
    '办理流程': '受理→审核→办结', '办理时限': '即时办结',
    '办理地点': '苏州市姑苏区体育中心路1号社保中心',
    '网上办理深度': '全流程网办',
    '结果送达方式': undefined, '送达方式': '在线推送',
  }),
]

const chengduWuhanSamples: Record<string, unknown>[] = [
  makeGuide({
    '事项名称': '成都护照签发', '实施主体': '成都市公安局出入境管理局',
    '办理条件': '1.具有中国国籍；2.本人到场申请',
    '申请材料': '1.护照申请表；2.有效身份证件原件',
    '办理流程': '受理→审查→决定→缴费→取证', '办理时限': '10个工作日',
    '办理地点': '成都市青羊区人民中路一段8号市公安局出入境办证大厅',
    '咨询电话': '028-12367', '监督电话': '028-12345',
    '网上办理深度': '互联网咨询、互联网收件、互联网预审',
    '表格下载': '空白表格', '结果送达方式': '邮寄',
  }),
  makeGuide({
    '事项名称': '成都居民身份证申领', '实施主体': '成都市公安局',
    '办理条件': '1.本市户籍居民；2.本人到场办理',
    '申请材料': '1.居民户口簿；2.本人到户籍派出所现场采集人像',
    '办理流程': '现场办理', '办理时限': '即时办结',
    '办理地点': '成都市成华区双林路168号区公安办证中心',
    '咨询电话': '12367', '监督电话': '028-12333',
    '网上办理深度': '窗口办理,网上办理,快递申请',
    '表格下载': '样表', '结果送达方式': '现场领取',
  }),
  makeGuide({
    '事项名称': '武汉食品生产许可', '实施主体': '武汉市市场监督管理局',
    '办理条件': '1.具有与生产食品相适应的场所；2.具有质量安全管理体系并运行正常',
    '申请材料': '1.食品生产许可证申请书；2.营业执照复印件；3.生产工艺流程图',
    '办理流程': '受理→审查→决定→发证', '办理时限': '15个工作日',
    '办理地点': '武汉市江汉区新华路247号市市场监管局政务服务大厅',
    '咨询电话': '027-12367', '监督电话': '027-12315',
    '网上办理深度': '互联网办理',
    '表格下载': '下载链接', '结果送达方式': '邮寄',
  }),
  makeGuide({
    '事项名称': '武汉失业登记', '实施主体': '武汉市人力资源和社会保障局',
    '办理条件': '1.有就业意愿；2.已与用人单位解除劳动关系',
    '申请材料': '1.身份证；2.解除劳动关系证明',
    '办理流程': '受理→审核→登记', '办理时限': '5个工作日',
    '办理地点': '武汉市武昌区临江大道481号市人社局就业服务中心',
    '咨询电话': '027-12333', '监督电话': '027-12366',
    '网上办理深度': '互联网收件、互联网预审',
  }),
  makeGuide({
    '事项名称': '成都旅行社设立许可（真实问题样本）', '实施主体': '成都市文化广电旅游局',
    '办理条件': '1.有固定的经营场所；2.有必要的营业设施',
    '申请材料': '1.旅行社设立申请书；2.经营场所证明；3.营业设施设备清单',
    '办理流程': '受理→审查→决定', '办理时限': '30个工作日',
    '办理地点': '成都市锦江区红星路二段88号市文广旅局政务窗口',
    '咨询电话': '028-12345', '监督电话': '028-12318',
    '网上办理深度': '现场办理', '表格下载': undefined, '结果送达方式': '现场领取',
  }),
]

describe('四城回归（fourCityRegression）', () => {
  describe('番禺: miss=5, fmt=2（spec口径，含别名兜底）', () => {
    it('番禺 miss/fmt 计数达标', () => {
      const r = InspectionOrchestrator.orchestrate(panyuSamples, configDefault, knowledgeBase, standardRules)
      const miss = r.errorDetails.filter(e => e.errorType === 'missing').length
      const fmt = r.formatIssues.length
      console.log(`\n=== 番禺 (${panyuSamples.length}样本) miss=${miss} fmt=${fmt} ===`)
      for (const e of r.errorDetails.filter(e => e.errorType === 'missing')) {
        console.log(`  [missing] ${e.guideId} | ${e.field} | ${e.ruleId}`)
      }
      for (const f of r.formatIssues) {
        console.log(`  [fmt] ${f.guideId} | ${f.field} | ${f.issue?.substring(0, 80)}`)
      }
      expect(miss).toBe(PANYU_MISS)
      expect(fmt).toBe(PANYU_FMT)
    })
  })

  describe('开封: miss=6, log=0, fmt=0', () => {
    it('开封 miss/log/fmt 计数达标', () => {
      const r = InspectionOrchestrator.orchestrate(kaifengSamples, configDefault, knowledgeBase, standardRules)
      const miss = r.errorDetails.filter(e => e.errorType === 'missing').length
      const log = r.errorDetails.filter(e => e.errorType === 'logical').length
      const fmt = r.formatIssues.length
      console.log(`\n=== 开封 (${kaifengSamples.length}样本) miss=${miss} log=${log} fmt=${fmt} ===`)
      for (const e of r.errorDetails.filter(e => e.errorType === 'missing')) {
        console.log(`  [missing] ${e.guideId} | ${e.field} | ${e.ruleId}`)
      }
      for (const f of r.formatIssues) {
        console.log(`  [fmt] ${f.guideId} | ${f.field} | ${f.issue?.substring(0, 80)}`)
      }
      expect(miss).toBe(6)
      expect(log).toBe(0)
      expect(fmt).toBe(0)
    })
  })

  describe('苏州: core=0, fmt=0', () => {
    it('苏州核心告警=0, 格式=0', () => {
      const r = InspectionOrchestrator.orchestrate(suzhouSamples, configDefault, knowledgeBase, standardRules)
      const core = r.errorDetails.filter(e => e.errorType !== 'warning' && e.errorType !== 'info')
      const fmt = r.formatIssues.length
      console.log(`\n=== 苏州 (${suzhouSamples.length}样本) core=${core.length} fmt=${fmt} ===`)
      for (const e of core) {
        console.log(`  [${e.errorType}] ${e.guideId} | ${e.field} | ${e.ruleId} | ${e.description?.substring(0, 80)}`)
      }
      for (const f of r.formatIssues) {
        console.log(`  [fmt] ${f.guideId} | ${f.field} | ${f.issue?.substring(0, 80)}`)
      }
      expect(core.length).toBe(0)
      expect(fmt).toBe(0)
    })
  })

  describe('成都/武汉: 白名单格式误报=0, 误报率≤20%', () => {
    it('误报率≤20% 且 白名单热线零格式误报', () => {
      const r = InspectionOrchestrator.orchestrate(chengduWuhanSamples, configDefault, knowledgeBase, standardRules)
      const hotlineFmtErrors = r.formatIssues.filter(f => (f.field === '咨询电话' || f.field === '监督电话'))
      const allIssues: Array<{ field: string; errorType: string }> = [
        ...r.errorDetails.filter(e => e.errorType !== 'warning' && e.errorType !== 'info').map(e => ({ field: e.field, errorType: e.errorType })),
        ...r.formatIssues.map(f => ({ field: f.field, errorType: 'format' })),
      ]
      const allHits = r.errorDetails.filter(e => e.errorType !== 'warning' && e.errorType !== 'info').length + r.formatIssues.length

      console.log(`\n=== 成都/武汉 (${chengduWuhanSamples.length}样本) ===`)
      console.log(`  白名单热线格式误报=${hotlineFmtErrors.length}`)
      console.log(`  全部问题明细数=${allHits}`)
      for (const f of hotlineFmtErrors) {
        console.log(`  [hotline-fmt-FP] ${f.guideId} | ${f.field} | ${f.issue?.substring(0, 100)}`)
      }
      for (const e of allIssues) {
        console.log(`  [issue] ${JSON.stringify(e)}`)
      }

      expect(hotlineFmtErrors.length).toBe(0)

      const realProblemCount = 2
      const fpCount = Math.max(allHits - realProblemCount, 0)
      const misreportRate = allHits > 0 ? fpCount / allHits : 0
      console.log(`  误报率=${(misreportRate * 100).toFixed(1)}% (FP=${fpCount}, hits=${allHits})`)
      expect(misreportRate).toBeLessThanOrEqual(0.2)
    })
  })
})
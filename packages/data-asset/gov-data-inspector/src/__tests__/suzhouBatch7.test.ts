import { describe, it, expect } from 'vitest'
import { InspectionOrchestrator } from '../inspectionOrchestrator.js'
import { SemanticRuleEngine } from '../semanticRuleEngine.js'
import type { KnowledgeBase, StandardRule, RegulationKnowledgeBase } from '../types.js'
import defaultConfigPack from '../default-config-pack.json' with { type: 'json' }
import regulationKb from '../regulation-knowledge-base.json' with { type: 'json' }

const kb = regulationKb as RegulationKnowledgeBase

const knowledgeBase: KnowledgeBase = {
  timeLimits: [
    { itemType: '行政许可', legalUpperLimit: 20, legalLowerLimit: 1, basisClause: '行政许可法第四十二条', dataSource: 'national', standardClause: '行政许可法第四十二条' },
    { itemType: '行政确认', legalUpperLimit: 15, legalLowerLimit: 1, basisClause: '行政许可法第四十二条', dataSource: 'national', standardClause: '行政许可法第四十二条' },
    { itemType: '公共服务', legalUpperLimit: 30, legalLowerLimit: 1, basisClause: '行政许可法第四十二条', dataSource: 'national', standardClause: '行政许可法第四十二条' },
  ],
  materials: [], conditions: [],
  dataSourceStatus: { national: { status: 'success', fetchedAt: '2026-10-08T00:00:00Z', recordCount: 10 }, provincial: { status: 'success', fetchedAt: '2026-10-08T00:00:00Z', recordCount: 5 }, standard: { status: 'success', fetchedAt: '2026-10-08T00:00:00Z', recordCount: 4 } },
}
const standardRules: StandardRule[] = [
  { ruleId: 'LOG_CONDITION_FIELD_MISPLACED_001', standardClause: 'GB/T 36114-2018 第6.3条', triggerFields: ['办理条件', '受理条件'], condition: '受理条件字段包含材料名称', scanMode: 'anyField', threshold: undefined, suggestionTemplate: '受理条件字段不应包含材料名称，请核对字段内容归属', triggerKeywords: ['申请表', '身份证明', '身体条件证明', '身份证复印件', '营业执照复印件', '居民身份证', '身份证原件', '营业执照', '产权证', '户口本', '户口簿'] },
]

const configDefault = { ...defaultConfigPack, regulationKnowledgeBase: kb } as unknown as Parameters<typeof InspectionOrchestrator.orchestrate>[1]

const batch7Samples: Record<string, unknown>[] = [
  {
    '事项名称': '普通护照签发',
    '实施主体': '苏州市公安局出入境管理支队',
    '办理条件': '1.申请人属于刑事案件被告人或者犯罪嫌疑人的，不得签发护照；2.有法定不准出境情形的，不得签发护照',
    '申请材料': '1.中国公民出入境证件申请表；2.居民身份证原件；3.符合要求的出入境证件照片',
    '办理流程': '受理→审批→发证', '办理时限': '10个工作日',
    '收费标准': '不收费', '办理地点': '苏州市姑苏区三香路998号',
    '咨询电话': '0512-65123456', '监督电话': '0512-65123457',
    '网上办理深度': '网上预审', '办理时间': '工作日9:00-17:00',
    '结果送达方式': '现场领取', '表格下载': '可下载',
  },
  {
    '事项名称': '往来港澳通行证签发',
    '实施主体': '苏州市公安局出入境管理支队',
    '办理条件': '1.申请人不属于法定不准出境情形；2.已持有有效往来港澳通行证或首次申请',
    '申请材料': '1.中国公民出入境证件申请表；2.居民身份证原件；3.符合要求的出入境证件照片',
    '办理流程': '受理→审批→发证', '办理时限': '10个工作日',
    '收费标准': '不收费', '办理地点': '苏州市姑苏区三香路998号',
    '咨询电话': '0512-65123456', '监督电话': '0512-65123457',
    '网上办理深度': '网上预审', '办理时间': '工作日9:00-17:00',
    '结果送达方式': '现场领取', '表格下载': '可下载',
  },
  {
    '事项名称': '非机动车变更登记',
    '实施主体': '苏州市公安局交通警察支队',
    '办理条件': '依申请办理',
    '申请材料': '身份证明',
    '办理流程': '受理→审核→变更', '办理时限': '1个工作日',
    '收费标准': '不收费', '办理地点': '苏州市姑苏区三香路998号',
    '咨询电话': '0512-65123456', '监督电话': '0512-65123457',
    '网上办理深度': '窗口办理,网上办理,快递申请', '办理时间': '工作日9:00-17:00',
    '结果送达方式': '现场领取', '表格下载': '可下载',
  },
  {
    '事项名称': '出生公证',
    '实施主体': '苏州市公证处',
    '办理条件': '1.申请人需提供出生相关证明材料；2.申请人为本人或其法定代理人',
    '申请材料': '1.公证申请表；2.申请人身份证明；3.出生医学证明',
    '办理流程': '受理→审查→出证', '办理时限': '5个工作日',
    '收费标准': '不收费', '办理地点': '苏州市姑苏区三香路998号',
    '咨询电话': '0512-65123456', '监督电话': '0512-65123457',
    '网上办理深度': '窗口办理,网上办理', '办理时间': '工作日9:00-17:00',
    '结果送达方式': '现场领取', '表格下载': '可下载',
  },
  {
    '事项名称': '机动车注册登记',
    '实施主体': '苏州市公安局交通警察支队',
    '办理条件': '1.机动车所有人应当填写申请表，交验机动车；2.提交机动车来历证明、整车出厂合格证明或进口凭证',
    '申请材料': '1.机动车注册登记申请表；2.机动车来历证明；3.机动车整车出厂合格证明；4.机动车交通事故责任强制保险凭证',
    '办理流程': '受理→查验→登记→发证', '办理时限': '2个工作日',
    '收费标准': '不收费', '办理地点': '苏州市姑苏区三香路998号车辆管理所',
    '咨询电话': '0512-65123456', '监督电话': '0512-65123457',
    '网上办理深度': '网上办理', '办理时间': '工作日9:00-17:00',
    '结果送达方式': '现场领取', '表格下载': '可下载',
  },
  {
    '事项名称': '最低生活保障标准查询',
    '实施主体': '苏州市民政局',
    '办理条件': '1.申请人需了解当地最低生活保障标准',
    '申请材料': '本事项为政策查询服务，无需提交申请材料',
    '办理流程': '查询→告知', '办理时限': '即时办结',
    '收费标准': '不收费', '办理地点': '苏州市姑苏区三香路998号民政窗口',
    '咨询电话': '0512-65123456', '监督电话': '0512-65123457',
    '网上办理深度': '全流程网办', '办理时间': '工作日9:00-17:00',
    '结果送达方式': '在线告知', '表格下载': '无需下载',
  },
  {
    '事项名称': '孤儿基本生活保障政策咨询',
    '实施主体': '苏州市民政局',
    '办理条件': '1.咨询孤儿基本生活保障相关政策',
    '申请材料': '本事项为政策咨询服务，无需提交申请材料',
    '办理流程': '咨询→解答', '办理时限': '即时办结',
    '收费标准': '不收费', '办理地点': '苏州市姑苏区三香路998号民政窗口',
    '咨询电话': '0512-65123456', '监督电话': '0512-65123457',
    '网上办理深度': '全流程网办', '办理时间': '工作日9:00-17:00',
    '结果送达方式': '在线告知', '表格下载': '无需下载',
  },
  {
    '事项名称': '初次申请机动车驾驶证',
    '实施主体': '苏州市公安局交通警察支队车辆管理所',
    '办理条件': '1.申请人已满18周岁；2.具有本市户籍或持本市居住证；3.身体条件符合驾驶许可条件',
    '申请材料': '1.机动车驾驶证申请表；2.申请人身份证明；3.身体条件证明；4.机动车驾驶人考试成绩单',
    '办理流程': '受理→考试→发证', '办理时限': '5个工作日',
    '收费标准': '不收费', '办理地点': '苏州市姑苏区三香路998号车辆管理所',
    '咨询电话': '0512-65123456', '监督电话': '0512-65123457',
    '网上办理深度': '网上预审', '办理时间': '工作日9:00-17:00',
    '结果送达方式': '现场领取', '表格下载': '可下载',
  },
  {
    '事项名称': '持军队、武装警察部队驾驶证申请机动车驾驶证',
    '实施主体': '苏州市公安局交通警察支队车辆管理所',
    '办理条件': '1.持有效军队或武装警察部队驾驶证；2.退役后1年内申请；3.身体条件符合驾驶许可条件',
    '申请材料': '1.机动车驾驶证申请表；2.申请人身份证明；3.军队或武装警察部队驾驶证原件及复印件；4.身体条件证明',
    '办理流程': '受理→审核→换证', '办理时限': '3个工作日',
    '收费标准': '不收费', '办理地点': '苏州市姑苏区三香路998号车辆管理所',
    '咨询电话': '0512-65123456', '监督电话': '0512-65123457',
    '网上办理深度': '窗口办理', '办理时间': '工作日9:00-17:00',
    '结果送达方式': '现场领取', '表格下载': '可下载',
  },
]

describe('苏州第七批第三方验收', () => {
  it('FP1-FP5: 5条误报全消除', () => {
    const r = InspectionOrchestrator.orchestrate(batch7Samples, configDefault, knowledgeBase, standardRules)
    const core = r.errorDetails.filter(e => e.errorType !== 'warning' && e.errorType !== 'info')

    console.log(`\n=== 苏州第七批 (${batch7Samples.length}样本) ===`)
    console.log(`  core=${core.length}, missing=${r.errorDetails.filter(e=>e.errorType==='missing').length}, semantic=${r.errorDetails.filter(e=>e.errorType==='semantic').length}, logical=${r.errorDetails.filter(e=>e.errorType==='logical').length}`)
    console.log(`  warning=${r.errorDetails.filter(e=>e.errorType==='warning').length}, info=${r.errorDetails.filter(e=>e.errorType==='info').length}, format=${r.formatIssues.length}`)
    for (const e of core) {
      console.log(`  [${e.errorType}] ${e.guideId} | ${e.field} | ${e.ruleId} | ${e.description?.substring(0, 80)}`)
    }

    expect(core.length).toBe(0)
  })

  it('itemType: 9条全识别，无UNMATCHED', () => {
    const itemTypeMatching = (defaultConfigPack as unknown as Record<string, unknown>).itemTypeMatching as Record<string, { keywords: string[]; codePrefix: string }>
    const expectedTypes: Record<string, string> = {
      '普通护照签发': '行政许可',
      '往来港澳通行证签发': '行政许可',
      '非机动车变更登记': '行政许可',
      '出生公证': '公共服务',
      '机动车注册登记': '行政许可',
      '最低生活保障标准查询': '公共服务',
      '孤儿基本生活保障政策咨询': '公共服务',
      '初次申请机动车驾驶证': '行政许可',
      '持军队、武装警察部队驾驶证申请机动车驾驶证': '行政许可',
    }

    console.log(`\n=== itemType识别验证 ===`)
    let allMatched = true
    for (const sample of batch7Samples) {
      const name = String(sample['事项名称'])
      const result = SemanticRuleEngine.matchItemType(sample, itemTypeMatching)
      const expected = expectedTypes[name]
      const matched = result.itemType !== null
      const correct = result.itemType === expected
      if (!matched || !correct) allMatched = false
      console.log(`  ${name}: itemType=${result.itemType}, matchSource=${result.matchSource}, expected=${expected}, ${matched && correct ? '✓' : '✗'}`)
    }

    expect(allMatched).toBe(true)
  })

  it('误报率≤20%', () => {
    const r = InspectionOrchestrator.orchestrate(batch7Samples, configDefault, knowledgeBase, standardRules)
    const total = r.errorDetails.length + r.formatIssues.length
    const core = r.errorDetails.filter(e => e.errorType !== 'warning' && e.errorType !== 'info').length
    const fpRate = total > 0 ? core / total : 0

    console.log(`\n=== 误报率 ===`)
    console.log(`  core=${core}, total=${total}, fpRate=${(fpRate * 100).toFixed(1)}%`)

    expect(fpRate).toBeLessThanOrEqual(0.2)
  })
})
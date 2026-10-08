import { describe, it, expect } from 'vitest'
import { InspectionOrchestrator } from '../inspectionOrchestrator.js'
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

function makeBaseGuide(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    '事项名称': 'v366测试事项',
    '实施主体': '测试部门',
    '办理条件': '1.符合条件',
    '申请材料': '1.申请表；2.身份证明',
    '办理流程': '受理→审查→决定→送达',
    '办理时限': '5个工作日',
    '收费标准': '不收费',
    '办理地点': '苏州市姑苏区三香路998号',
    '咨询电话': '0512-65123456',
    '监督电话': '0512-65123457',
    '网上办理深度': '二级',
    '办理时间': '工作日9:00-17:00',
    '结果送达方式': '邮寄',
    '表格下载': '可下载',
    ...overrides,
  }
}

describe('v3.6.6 六项能力升级', () => {
  describe('F1: ruleProcessCompleteness 图片流程识别', () => {
    it('办理流程为图片URL时不报流程缺失', () => {
      const guide = makeBaseGuide({ '办理流程': 'https://example.com/flowchart.png' })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const processErrors = result.errorDetails.filter(
        (e) => e.field === '办理流程' && e.ruleId === 'LOG_PROCESS_COMPLETENESS_001',
      )
      expect(processErrors.length).toBe(0)
    })

    it('办理流程为流程图提示语时不报流程缺失', () => {
      const phrases = ['详见流程图', '见下图', '流程图', '见附图', '详见附图', '见图', '见流程图']
      for (const phrase of phrases) {
        const guide = makeBaseGuide({ '办理流程': phrase })
        const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
        const processErrors = result.errorDetails.filter(
          (e) => e.field === '办理流程' && e.ruleId === 'LOG_PROCESS_COMPLETENESS_001',
        )
        expect(processErrors.length).toBe(0)
      }
    })

    it('办理流程为jpg图片URL时不报流程缺失', () => {
      const guide = makeBaseGuide({ '办理流程': 'http://gov.cn/process.jpg' })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const processErrors = result.errorDetails.filter(
        (e) => e.field === '办理流程' && e.ruleId === 'LOG_PROCESS_COMPLETENESS_001',
      )
      expect(processErrors.length).toBe(0)
    })
  })

  describe('F2: extractTimeLimitDays 即时/当场=0', () => {
    it('办理时限为"即时办结"且即办件流程不报矛盾', () => {
      const guide = makeBaseGuide({
        '办理流程': '即办→当场办结',
        '办理时限': '即时办结',
      })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const contradictionErrors = result.errorDetails.filter(
        (e) => e.ruleId === 'LOG_INSTANT_TIME_LIMIT_CONTRADICTION_001' || e.ruleId === 'LOG_INSTANT_HANDLE_001',
      )
      expect(contradictionErrors.length).toBe(0)
    })

    it('办理时限为"当场办结"且即办件流程不报矛盾', () => {
      const guide = makeBaseGuide({
        '办理流程': '即办→当场办结',
        '办理时限': '当场办结',
      })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const contradictionErrors = result.errorDetails.filter(
        (e) => e.ruleId === 'LOG_INSTANT_TIME_LIMIT_CONTRADICTION_001' || e.ruleId === 'LOG_INSTANT_HANDLE_001',
      )
      expect(contradictionErrors.length).toBe(0)
    })

    it('办理时限含"即时"前缀（如"即时完成"）也解析为0', () => {
      const guide = makeBaseGuide({
        '办理流程': '即办→当场办结',
        '办理时限': '即时完成',
      })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const contradictionErrors = result.errorDetails.filter(
        (e) => e.ruleId === 'LOG_INSTANT_TIME_LIMIT_CONTRADICTION_001' || e.ruleId === 'LOG_INSTANT_HANDLE_001',
      )
      expect(contradictionErrors.length).toBe(0)
    })
  })

  describe('F3: ruleMaterialCondition 上下文豁免', () => {
    it('办理条件含"暂由各地区自行规定"不报材料条件矛盾', () => {
      const guide = makeBaseGuide({
        '办理条件': '1.具体条件由各地自行确定。暂由各地区自行规定',
        '申请材料': '1.申请表；2.身份证明；3.收入证明',
      })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const materialConditionErrors = result.errorDetails.filter(
        (e) => e.ruleId === 'LOG_MATERIAL_CONDITION_001',
      )
      expect(materialConditionErrors.length).toBe(0)
    })

    it('办理条件含"按有关规定"不报材料条件矛盾', () => {
      const guide = makeBaseGuide({
        '办理条件': '1.申请人符合条件。按有关规定执行',
        '申请材料': '1.申请表；2.身份证明；3.居住证明',
      })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const materialConditionErrors = result.errorDetails.filter(
        (e) => e.ruleId === 'LOG_MATERIAL_CONDITION_001',
      )
      expect(materialConditionErrors.length).toBe(0)
    })

    it('办理条件含"按相关标准"不报材料条件矛盾', () => {
      const guide = makeBaseGuide({
        '办理条件': '1.符合要求。按相关标准执行',
        '申请材料': '1.申请表；2.身份证明；3.资质证明',
      })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const materialConditionErrors = result.errorDetails.filter(
        (e) => e.ruleId === 'LOG_MATERIAL_CONDITION_001',
      )
      expect(materialConditionErrors.length).toBe(0)
    })
  })

  describe('F4: semanticRuleEngine 阈值≥0.75 + 上下文豁免 + 降级模式', () => {
    it('降级模式下不产生语义相似度误报', () => {
      const guide = makeBaseGuide({
        '办理条件': '1.申请人具备相应资质条件',
        '申请材料': '1.申请表；2.资质证明文件',
      })
      const result = InspectionOrchestrator.orchestrate(
        [guide],
        config,
        knowledgeBase,
        standardRules,
        { degradedMode: true },
      )
      const semanticSuspected = result.suspectedErrors ?? []
      expect(semanticSuspected.length).toBe(0)
    })

    it('含上下文豁免词的办理条件不报语义错误', () => {
      const guide = makeBaseGuide({
        '办理条件': '1.符合告知承诺制相关要求。实行告知承诺',
        '申请材料': '1.申请表；2.告知承诺书',
      })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const semanticErrors = result.errorDetails.filter(
        (e) => e.errorType === 'semantic' && e.field === '办理条件',
      )
      expect(semanticErrors.length).toBe(0)
    })

    it('含"容缺受理"豁免词的办理条件不报语义错误', () => {
      const guide = makeBaseGuide({
        '办理条件': '1.符合基本条件。实行容缺受理制度',
        '申请材料': '1.申请表',
      })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const semanticErrors = result.errorDetails.filter(
        (e) => e.errorType === 'semantic' && e.field === '办理条件',
      )
      expect(semanticErrors.length).toBe(0)
    })
  })

  describe('F5: formatValidator 多号码电话校验', () => {
    it('咨询电话含多个合法号码不报格式错误', () => {
      const guide = makeBaseGuide({
        '咨询电话': '0512-65123456,0512-65123457',
      })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const phoneIssues = result.formatIssues.filter((f) => f.field === '咨询电话')
      expect(phoneIssues.length).toBe(0)
    })

    it('咨询电话用分号分隔多个合法号码不报格式错误', () => {
      const guide = makeBaseGuide({
        '咨询电话': '0512-65123456;0512-65123457',
      })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const phoneIssues = result.formatIssues.filter((f) => f.field === '咨询电话')
      expect(phoneIssues.length).toBe(0)
    })

    it('咨询电话含一个非法号码时报格式错误', () => {
      const guide = makeBaseGuide({
        '咨询电话': '0512-65123456,abc12345',
      })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const phoneIssues = result.formatIssues.filter((f) => f.field === '咨询电话')
      expect(phoneIssues.length).toBeGreaterThan(0)
    })

    it('咨询电话用顿号分隔多个合法号码不报格式错误', () => {
      const guide = makeBaseGuide({
        '咨询电话': '0512-65123456、0512-65123457',
      })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const phoneIssues = result.formatIssues.filter((f) => f.field === '咨询电话')
      expect(phoneIssues.length).toBe(0)
    })
  })

  describe('F6: fieldAliases 字段别名映射', () => {
    it('缺少"网上办理深度"但有别名"办理方式"不报缺失', () => {
      const guide = makeBaseGuide({
        '网上办理深度': undefined,
        '办理方式': '全程网办',
      })
      delete (guide as Record<string, unknown>)['网上办理深度']
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const missingErrors = result.errorDetails.filter(
        (e) => e.field === '网上办理深度' && e.errorType === 'missing',
      )
      expect(missingErrors.length).toBe(0)
    })

    it('缺少"结果送达方式"但有别名"送达方式"不报缺失', () => {
      const guide = makeBaseGuide({
        '结果送达方式': undefined,
        '送达方式': '快递邮寄',
      })
      delete (guide as Record<string, unknown>)['结果送达方式']
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const missingErrors = result.errorDetails.filter(
        (e) => e.field === '结果送达方式' && e.errorType === 'missing',
      )
      expect(missingErrors.length).toBe(0)
    })

    it('缺少"表格下载"但有别名"材料下载"不报缺失', () => {
      const guide = makeBaseGuide({
        '表格下载': undefined,
        '材料下载': '可下载',
      })
      delete (guide as Record<string, unknown>)['表格下载']
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const missingErrors = result.errorDetails.filter(
        (e) => e.field === '表格下载' && e.errorType === 'missing',
      )
      expect(missingErrors.length).toBe(0)
    })

    it('缺少"网上办理深度"且无别名时仍报缺失', () => {
      const guide = makeBaseGuide({
        '网上办理深度': undefined,
      })
      delete (guide as Record<string, unknown>)['网上办理深度']
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const missingErrors = result.errorDetails.filter(
        (e) => e.field === '网上办理深度' && e.errorType === 'missing',
      )
      expect(missingErrors.length).toBeGreaterThan(0)
    })
  })
})
describe('v3.6.7 整修复测', () => {
  describe('P0-1: F1 isImageFlow 命名函数自证', () => {
    it('svg图片URL不报流程缺失', () => {
      const guide = makeBaseGuide({ '办理流程': 'https://gov.cn/process.svg' })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const processErrors = result.errorDetails.filter(
        (e) => e.field === '办理流程' && e.ruleId === 'LOG_PROCESS_COMPLETENESS_001',
      )
      expect(processErrors.length).toBe(0)
    })

    it('图片URL带查询参数不报流程缺失', () => {
      const guide = makeBaseGuide({ '办理流程': 'https://gov.cn/flow.png?v=2' })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const processErrors = result.errorDetails.filter(
        (e) => e.field === '办理流程' && e.ruleId === 'LOG_PROCESS_COMPLETENESS_001',
      )
      expect(processErrors.length).toBe(0)
    })

    it('点击查看流程图提示语不报流程缺失', () => {
      const guide = makeBaseGuide({ '办理流程': '点击查看流程图' })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const processErrors = result.errorDetails.filter(
        (e) => e.field === '办理流程' && e.ruleId === 'LOG_PROCESS_COMPLETENESS_001',
      )
      expect(processErrors.length).toBe(0)
    })

    it('扫描二维码查看提示语不报流程缺失', () => {
      const guide = makeBaseGuide({ '办理流程': '扫描二维码查看' })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const processErrors = result.errorDetails.filter(
        (e) => e.field === '办理流程' && e.ruleId === 'LOG_PROCESS_COMPLETENESS_001',
      )
      expect(processErrors.length).toBe(0)
    })
  })

  describe('P0-3: F4 阈值=0.75 自证', () => {
    it('config中degradedSimilarityThreshold为0.75', () => {
      expect(defaultConfigPack.degradedSimilarityThreshold).toBe(0.75)
    })
  })

  describe('P0-4: F5 多号码+短号混合应报格式错误', () => {
    it('多号码含白名单短号仍报格式错误', () => {
      const guide = makeBaseGuide({
        '监督电话': '020-34511300；020-12345',
      })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const phoneIssues = result.formatIssues.filter((f) => f.field === '监督电话')
      expect(phoneIssues.length).toBeGreaterThan(0)
    })

    it('单独白名单短号不报格式错误', () => {
      const guide = makeBaseGuide({
        '咨询电话': '12345',
      })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const phoneIssues = result.formatIssues.filter((f) => f.field === '咨询电话')
      expect(phoneIssues.length).toBe(0)
    })

    it('单独白名单短号带区号不报格式错误', () => {
      const guide = makeBaseGuide({
        '咨询电话': '020-12345',
      })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const phoneIssues = result.formatIssues.filter((f) => f.field === '咨询电话')
      expect(phoneIssues.length).toBe(0)
    })

    it('多号码全合法不报格式错误', () => {
      const guide = makeBaseGuide({
        '咨询电话': '020-84612345,020-84612346',
      })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const phoneIssues = result.formatIssues.filter((f) => f.field === '咨询电话')
      expect(phoneIssues.length).toBe(0)
    })
  })

  describe('P1-5: 时限无分步描述不报warning', () => {
    it('流程无分步时限不产生warning', () => {
      const guide = makeBaseGuide({
        '办理流程': '受理→审查→决定→送达',
        '办理时限': '5个工作日',
      })
      const result = InspectionOrchestrator.orchestrate([guide], config, knowledgeBase, standardRules)
      const timeLimitWarnings = result.errorDetails.filter(
        (e) => e.ruleId === 'LOG_PROCESS_TIME_LIMIT_INCONSISTENT_001' && e.errorType === 'warning',
      )
      expect(timeLimitWarnings.length).toBe(0)
    })
  })
})
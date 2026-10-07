import { describe, it, expect } from 'vitest'
import { LogicRuleEngine } from '../logicRuleEngine.js'
import type { StandardRule } from '../types.js'

const rules: StandardRule[] = [
  { ruleId: 'LOG_SITE_INSPECTION_001', standardClause: 'DB1405/T 085-2025 第5.2条', triggerFields: ['办理流程', '办理时限'], condition: '流程含现场勘查且时限<5', threshold: 5, suggestionTemplate: '建议调整', triggerKeywords: ['现场勘查'] },
  { ruleId: 'LOG_INSTANT_HANDLE_001', standardClause: 'DB1405/T 085-2025 第5.3条', triggerFields: ['办理流程', '办理时限'], condition: '流程含当场办理且时限>1', threshold: 1, suggestionTemplate: '建议调整', triggerKeywords: ['当场办理'] },
  { ruleId: 'LOG_CONDITION_PROXY_001', standardClause: 'DB1405/T 085-2025 第5.4条', triggerFields: ['办理条件', '办理流程'], condition: '条件要求本人到场但流程允许代办', suggestionTemplate: '建议统一', threshold: undefined, triggerKeywords: ['本人到场', '本人办理', '代办', '委托办理'] },
  { ruleId: 'LOG_MATERIAL_CONDITION_001', standardClause: 'DB1405/T 085-2025 第5.5条', triggerFields: ['申请材料', '办理条件'], condition: '条件要求的证明材料未列入材料清单', suggestionTemplate: '建议补充', threshold: undefined, triggerKeywords: ['收入证明', '产权证明', '资质证明', '无犯罪记录证明', '健康证明', '社保证明', '纳税证明', '营业执照', '产权证', '组织机构代码证', '税务登记证', '校车驾驶资格申请表', '申请表', '身份证明', '身体条件证明', '身份证', '居民身份证', '身份证原件', '身份证复印件', '户口本', '户口簿', '居住证明', '产权证明', '食品经营许可申请表', '气象证明出具申请表'] },
  { ruleId: 'LOG_CONDITION_AGE_PROXY_001', standardClause: '国办发〔2018〕45号 第5.6条', triggerFields: ['办理条件', '办理流程'], condition: '办理条件含年龄限制且办理流程含代办', suggestionTemplate: '建议明确：未成年人由监护人代办，或删除年龄限制', threshold: undefined, triggerKeywords: ['年满18周岁', '年满十八周岁', '须为成年人', '监护人代办', '未成年人代办', '法定代理人代办'], scanMode: 'anyField', anyFieldKeywords: ['监护人代办', '未成年人代办', '法定代理人代办'] },
  { ruleId: 'LOG_CONDITION_FIELD_MISPLACED_001', standardClause: 'GB/T 36114-2018 第6.3条 字段内容归属要求', triggerFields: ['办理条件', '受理条件'], condition: '受理条件字段包含材料名称', scanMode: 'anyField', threshold: undefined, suggestionTemplate: '受理条件字段不应包含材料名称，请核对字段内容归属', triggerKeywords: ['申请表', '身份证明', '身体条件证明', '身份证复印件', '营业执照复印件', '居民身份证', '身份证原件', '营业执照', '产权证', '户口本', '户口簿'] },
  { ruleId: 'LOG_PROCESS_TIME_LIMIT_INCONSISTENT_001', standardClause: 'DB1405/T 085-2025 第5.7条', triggerFields: ['办理流程', '办理时限'], condition: '流程步骤时限合计≠承诺办结时限', suggestionTemplate: '建议核对流程步骤时限与承诺办结时限是否一致', threshold: undefined, triggerKeywords: ['工作日'] },
  { ruleId: 'LOG_PROCESS_COMPLETENESS_001', standardClause: '国办发〔2018〕45号 流程环节完备性要求', triggerFields: ['办理流程'], condition: '办理流程应包含受理/审核/审批/办结/送达五个环节', suggestionTemplate: '办理流程应包含受理/审核/审批/办结/送达五个环节', threshold: undefined, triggerKeywords: ['受理', '审核', '审批', '办结', '送达'] },
]

describe('LogicRuleEngine', () => {
  it('流程含"现场勘查"且时限为"3个工作日" → 输出logical错误', () => {
    const guide = { 办理流程: '受理→现场勘查→审批', 办理时限: '3个工作日' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.errorType === 'logical' && d.description.includes('现场勘查'))).toBe(true)
  })

  it('流程含"当场办理"且时限为"90个工作日" → 输出logical错误', () => {
    const guide = { 办理流程: '当场办理', 办理时限: '90个工作日' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.errorType === 'logical' && d.description.includes('当场办理'))).toBe(true)
  })

  it('条件要求"本人到场"但流程允许代办 → 输出logical错误', () => {
    const guide = { 办理条件: '需本人到场办理', 办理流程: '可代办' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.errorType === 'logical' && d.description.includes('本人到场'))).toBe(true)
  })

  it('条件要求"提供收入证明"但材料清单未含 → 输出logical错误', () => {
    const guide = { 办理条件: '需提供收入证明', 申请材料: '身份证、申请表' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.errorType === 'logical' && d.description.includes('收入证明'))).toBe(true)
  })

  it('logicErrorRules配置缺失 → 抛出错误', () => {
    expect(() => LogicRuleEngine.detect({}, 'g1', [])).toThrow()
  })

  it('字段缺失时跳过规则不报错', () => {
    const guide = { 事项名称: '测试' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.length).toBe(0)
  })

  it('LRE-01: 条件含"年满18周岁"+流程含"监护人代办" → 检出矛盾', () => {
    const guide = { 办理条件: '申请人须年满18周岁', 办理流程: '可由监护人代办' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.errorType === 'logical' && d.description.includes('年满18周岁'))).toBe(true)
  })

  it('LRE-02: 条件含"年满十八周岁"+流程含"法定代理人代办" → 检出矛盾', () => {
    const guide = { 办理条件: '申请人须年满十八周岁', 办理流程: '可由法定代理人代办' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.errorType === 'logical' && d.description.includes('年满18周岁'))).toBe(true)
  })

  it('LRE-03: 仅年龄无代办 → 不报告', () => {
    const guide = { 办理条件: '申请人须年满18周岁', 办理流程: '受理→审批→发证' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.description.includes('年满18周岁') && d.description.includes('代办'))).toBe(false)
  })

  it('LRE-04: 仅代办无年龄 → 不报告', () => {
    const guide = { 办理条件: '符合法定条件', 办理流程: '可由监护人代办' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.description.includes('年满18周岁'))).toBe(false)
  })

  it('LRE-05: 现有LOG_CONDITION_PROXY_001(本人到场+代办)不回归', () => {
    const guide = { 办理条件: '需本人到场办理', 办理流程: '可代办' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.description.includes('本人到场'))).toBe(true)
  })

  it('LRE-06: 新规则standardClause含"国办发〔2018〕45号 第5.6条"', () => {
    const guide = { 办理条件: '申请人须年满18周岁', 办理流程: '可由监护人代办' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.standardClause === '国办发〔2018〕45号 第5.6条')).toBe(true)
  })

  it('LRE-07: 新规则suggestion含"未成年人由监护人代办"', () => {
    const guide = { 办理条件: '申请人须年满18周岁', 办理流程: '可由监护人代办' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    const ageProxyDetail = details.find((d) => d.description.includes('年满18周岁'))
    expect(ageProxyDetail).toBeDefined()
    expect(ageProxyDetail?.suggestion).toContain('未成年人由监护人代办')
  })

  it('E26: 办理条件含"年满18周岁"+办理流程含"监护人代办" → 检出逻辑矛盾', () => {
    const guide = { 事项名称: '身份证补领', 办理条件: '申请人须年满18周岁', 办理流程: '受理→监护人代办→发证', 办理时限: '20个工作日' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    const ageProxyDetail = details.find((d) => d.description.includes('年满18周岁'))
    expect(ageProxyDetail).toBeDefined()
    expect(ageProxyDetail!.errorType).toBe('logical')
    expect(ageProxyDetail!.field).toBe('办理流程')
  })

  it('E35: 办理条件含"须为成年人"+办理流程含"未成年人代办" → 检出逻辑矛盾', () => {
    const guide = { 事项名称: '户口迁移', 办理条件: '须为成年人', 办理流程: '可由未成年人代办' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    const ageProxyDetail = details.find((d) => d.description.includes('年满18周岁'))
    expect(ageProxyDetail).toBeDefined()
    expect(ageProxyDetail!.errorType).toBe('logical')
  })

  it('LRE-08: 代办关键词在非办理流程字段(如备注)中 → 仍检出矛盾(anyField扫描)', () => {
    const guide = { 事项名称: '身份证补领', 办理条件: '申请人须年满18周岁', 备注: '可由监护人代办', 办理时限: '20个工作日' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.errorType === 'logical' && d.description.includes('年满18周岁'))).toBe(true)
  })

  it('LRE-09: scanMode=anyField跳过triggerFields校验 → 办理流程缺失仍触发', () => {
    const guide = { 事项名称: '身份证补领', 办理条件: '申请人须年满18周岁', 备注: '可由法定代理人代办' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.errorType === 'logical' && d.description.includes('年满18周岁'))).toBe(true)
  })

  it('LRE-10: 无代办关键词在任何字段中 → 不报告', () => {
    const guide = { 事项名称: '身份证补领', 办理条件: '申请人须年满18周岁', 办理流程: '受理→审批→发证', 备注: '无特殊说明' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.description.includes('年满18周岁') && d.description.includes('代办'))).toBe(false)
  })

  it('LRE-11: 办理条件含"居民身份证" → 报logical错误提示材料名称错位', () => {
    const guide = { 办理条件: '居民身份证原件及复印件' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.errorType === 'logical' && d.description.includes('材料名称'))).toBe(true)
  })

  it('LRE-12: 办理条件含"需提供营业执照"且申请材料未列"营业执照" → 报logical错误', () => {
    const guide = { 办理条件: '需提供营业执照', 申请材料: '身份证、申请表' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.errorType === 'logical' && d.description.includes('营业执照'))).toBe(true)
  })

  it('LRE-13: 流程步骤时限合计15工作日，承诺时限20工作日 → 报logical错误', () => {
    const guide = { 办理流程: '受理(5个工作日)→审核(5个工作日)→审批(5个工作日)', 办理时限: '20个工作日' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.errorType === 'logical' && d.description.includes('时限不一致'))).toBe(true)
  })

  it('LRE-14: 办理流程无步骤时限 → 不报时限不一致错误', () => {
    const guide = { 办理流程: '受理-审核-办结', 办理时限: '20个工作日' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.description.includes('时限不一致'))).toBe(false)
  })

  it('LRE-15: 办理时限="即办" → 不报时限不一致错误', () => {
    const guide = { 办理流程: '受理(5个工作日)→审核(5个工作日)→审批(5个工作日)', 办理时限: '即办' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.description.includes('时限不一致'))).toBe(false)
  })

  it('LRE-16: 条件要求"校车驾驶资格申请表"且材料未列 → 报logical', () => {
    const guide = { 办理条件: '需提供校车驾驶资格申请表', 申请材料: '身份证、申请表' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.errorType === 'logical' && d.description.includes('校车驾驶资格申请表'))).toBe(true)
  })

  it('LRE-17: 条件要求"身份证明"且材料含"身份证明" → 不报条件-材料不一致', () => {
    const guide = { 办理条件: '需提供身份证明', 申请材料: '身份证、身份证明、申请表' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.errorType === 'logical' && d.description.includes('身份证明') && d.description.includes('未列入'))).toBe(false)
  })

  it('LRE-18: 办理流程无分步时限+办理时限有值 → 报warning"缺少分步时限描述"', () => {
    const guide = { 办理流程: '受理-审核-办结', 办理时限: '20个工作日' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.errorType === 'warning' && d.description.includes('缺少分步时限描述'))).toBe(true)
  })

  it('LRE-19: 办理流程无分步时限+办理时限="即办" → 不报warning也不报logical', () => {
    const guide = { 办理流程: '受理-审核-办结', 办理时限: '即办' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.description.includes('缺少分步时限描述'))).toBe(false)
    expect(details.some((d) => d.description.includes('时限不一致'))).toBe(false)
  })

  it('LRE-20: 特困样本两规则互不排斥 → 同时检出warning(缺少分步时限)与logical(流程环节缺失)', () => {
    const guide = { 办理流程: '受理-审核-办结', 办理时限: '20个工作日' }
    const details = LogicRuleEngine.detect(guide, 'g1', rules)
    expect(details.some((d) => d.errorType === 'warning' && d.description.includes('缺少分步时限描述'))).toBe(true)
    expect(details.some((d) => d.errorType === 'logical' && d.description.includes('流程应包含受理'))).toBe(true)
    expect(details.length).toBeGreaterThanOrEqual(2)
  })
})
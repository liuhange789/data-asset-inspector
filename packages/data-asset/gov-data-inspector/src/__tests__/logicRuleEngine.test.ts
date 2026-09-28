import { describe, it, expect } from 'vitest'
import { LogicRuleEngine } from '../logicRuleEngine.js'
import type { StandardRule } from '../types.js'

const rules: StandardRule[] = [
  { ruleId: 'LOG_SITE_INSPECTION_001', standardClause: 'DB1405/T 085-2025 第5.2条', triggerFields: ['办理流程', '办理时限'], condition: '流程含现场勘查且时限<5', threshold: 5, suggestionTemplate: '建议调整', triggerKeywords: ['现场勘查'] },
  { ruleId: 'LOG_INSTANT_HANDLE_001', standardClause: 'DB1405/T 085-2025 第5.3条', triggerFields: ['办理流程', '办理时限'], condition: '流程含当场办理且时限>1', threshold: 1, suggestionTemplate: '建议调整', triggerKeywords: ['当场办理'] },
  { ruleId: 'LOG_CONDITION_PROXY_001', standardClause: 'DB1405/T 085-2025 第5.4条', triggerFields: ['办理条件', '办理流程'], condition: '条件要求本人到场但流程允许代办', suggestionTemplate: '建议统一', threshold: undefined, triggerKeywords: ['本人到场', '本人办理', '代办', '委托办理'] },
  { ruleId: 'LOG_MATERIAL_CONDITION_001', standardClause: 'DB1405/T 085-2025 第5.5条', triggerFields: ['申请材料', '办理条件'], condition: '条件要求的证明材料未列入材料清单', suggestionTemplate: '建议补充', threshold: undefined, triggerKeywords: ['收入证明', '产权证明', '资质证明', '无犯罪记录证明', '健康证明', '社保证明', '纳税证明'] },
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
})
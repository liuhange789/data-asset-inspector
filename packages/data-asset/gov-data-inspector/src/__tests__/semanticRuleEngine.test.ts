import { describe, it, expect } from 'vitest'
import { SemanticRuleEngine } from '../semanticRuleEngine.js'
import type { KnowledgeBase } from '../types.js'

const kb: KnowledgeBase = {
  timeLimits: [
    { itemType: '行政许可', legalUpperLimit: 20, legalLowerLimit: 1, basisClause: '行政许可法第四十二条', dataSource: 'national', standardClause: '行政许可法第四十二条' },
    { itemType: '当场办理类', legalUpperLimit: 1, legalLowerLimit: 0, basisClause: '行政许可法第三十四条', dataSource: 'national', standardClause: '行政许可法第三十四条' },
  ],
  materials: [
    { itemType: '行政许可', standardName: '营业执照复印件', isRequired: true, basisClause: '依据DB1405/T 085-2025', dataSource: 'national', standardClause: 'DB1405/T 085-2025 第6.1条' },
    { itemType: '行政许可', standardName: '行政许可申请表', isRequired: true, basisClause: '依据DB1405/T 085-2025', dataSource: 'national', standardClause: 'DB1405/T 085-2025 第6.2条' },
  ],
  conditions: [
    { itemType: '行政许可', elementName: '申请主体资格', standardValue: '符合法定条件的公民、法人或其他组织', basisClause: '行政许可法第十二条', dataSource: 'national', standardClause: '行政许可法第十二条' },
  ],
  dataSourceStatus: {
    national: { status: 'success', fetchedAt: '2026-09-26T00:00:00Z', recordCount: 5 },
    provincial: { status: 'success', fetchedAt: '2026-09-26T00:00:00Z', recordCount: 3 },
    standard: { status: 'failed', fetchedAt: '', recordCount: 0 },
  },
}

const itemTypeMatching = {
  行政许可: { keywords: ['许可', '审批', '核准'], codePrefix: 'XK' },
  当场办理类: { keywords: ['当场办理', '即办件'], codePrefix: 'DC' },
}

describe('SemanticRuleEngine', () => {
  it('时限为"90个工作日"且法定上限为20 → 输出semantic错误', () => {
    const guide = { 事项名称: '食品经营许可', 办理时限: '90个工作日' }
    const result = SemanticRuleEngine.detect(guide, 'g1', kb, itemTypeMatching)
    const timeError = result.details.find((d) => d.field === '办理时限')
    expect(timeError).toBeDefined()
    expect(timeError!.errorType).toBe('semantic')
    expect(timeError!.suggestion).toContain('20')
  })

  it('材料含"营业执照复映件"且标准为"营业执照复印件" → 输出semantic错误', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '营业执照复映件、行政许可申请表' }
    const result = SemanticRuleEngine.detect(guide, 'g1', kb, itemTypeMatching)
    const matError = result.details.find((d) => d.field === '申请材料')
    expect(matError).toBeDefined()
    expect(matError!.errorType).toBe('semantic')
    expect(matError!.suggestion).toContain('营业执照复印件')
  })

  it('事项名称在知识库无对应条目 → 返回unmatched警告', () => {
    const guide = { 事项名称: '未知事项类型', 办理时限: '90个工作日' }
    const result = SemanticRuleEngine.detect(guide, 'g1', kb, itemTypeMatching)
    expect(result.details.length).toBe(0)
    expect(result.unmatched).toBe(true)
    expect(result.warning).toBeDefined()
    expect(result.warning!.type).toBe('UNMATCHED_ITEM_TYPE')
  })

  it('标准知识库不可用且非降级 → 抛出GOV_DATA_KB_MISSING', () => {
    expect(() => SemanticRuleEngine.detect({ 事项名称: '食品经营许可' }, 'g1', {} as KnowledgeBase, itemTypeMatching)).toThrow()
  })

  it('标准知识库不可用且降级模式 → 返回空details不抛错', () => {
    const result = SemanticRuleEngine.detect({ 事项名称: '食品经营许可' }, 'g1', {} as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true })
    expect(result.details).toEqual([])
  })

  it('流程字段含关键词可匹配事项类型', () => {
    const guide = { 事项名称: '建设工程规划核实', 办理流程: '受理→现场勘查→核实→出证', 办理时限: '90个工作日' }
    const itemTypeMatchingWithFlow = {
      现场勘查类: { keywords: ['现场勘查', '实地核查'], codePrefix: 'XC' },
    }
    const result = SemanticRuleEngine.detect(guide, 'g1', kb, itemTypeMatchingWithFlow)
    expect(result.unmatched).toBeUndefined()
  })

  it('itemTypeOverride手动指定事项类型', () => {
    const guide = { 事项名称: '建设工程规划核实', 办理时限: '90个工作日' }
    const result = SemanticRuleEngine.detect(guide, 'g1', kb, itemTypeMatching, undefined, { itemTypeOverride: '行政许可' })
    expect(result.unmatched).toBeUndefined()
    const timeError = result.details.find((d) => d.field === '办理时限')
    expect(timeError).toBeDefined()
  })

  it('matchItemType返回matchSource', () => {
    const nameMatch = SemanticRuleEngine.matchItemType({ 事项名称: '食品经营许可' }, itemTypeMatching)
    expect(nameMatch.matchSource).toBe('name')

    const codeMatch = SemanticRuleEngine.matchItemType({ 事项编码: 'XK001' }, itemTypeMatching)
    expect(codeMatch.matchSource).toBe('code')

    const flowMatch = SemanticRuleEngine.matchItemType({ 事项名称: '测试', 办理流程: '现场勘查' }, { 现场勘查类: { keywords: ['现场勘查'], codePrefix: 'XC' } })
    expect(flowMatch.matchSource).toBe('flow')

    const manualMatch = SemanticRuleEngine.matchItemType({ 事项名称: '测试' }, itemTypeMatching, { itemTypeOverride: '行政许可' })
    expect(manualMatch.matchSource).toBe('manual')

    const noMatch = SemanticRuleEngine.matchItemType({ 事项名称: '测试' }, itemTypeMatching)
    expect(noMatch.matchSource).toBeNull()
    expect(noMatch.itemType).toBeNull()
  })

  it('时限数值提取', () => {
    expect(SemanticRuleEngine.extractTimeLimitDays('20个工作日')).toBe(20)
    expect(SemanticRuleEngine.extractTimeLimitDays('大约两周')).toBeNull()
  })
})
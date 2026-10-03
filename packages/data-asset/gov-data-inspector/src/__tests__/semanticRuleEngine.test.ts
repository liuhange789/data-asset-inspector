import { describe, it, expect } from 'vitest'
import { SemanticRuleEngine } from '../semanticRuleEngine.js'
import type { KnowledgeBase, SemanticConflictRules } from '../types.js'

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

  it('SRE-01: 降级+空KB+本地词表含"身份证复印件"+材料含"身份证复" → 检出笔误', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '身份证复、申请表' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true })
    expect(result.details.some((d) => d.errorType === 'semantic' && d.description.includes('笔误'))).toBe(true)
  })

  it('SRE-02: 降级+空KB+本地词表含"营业执照复印件"+材料含"营业执照复" → 检出笔误', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '营业执照复' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true })
    expect(result.details.some((d) => d.errorType === 'semantic' && d.description.includes('笔误'))).toBe(true)
  })

  it('SRE-03: 降级+空KB+本地词表为空 → 返回空details不抛错', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '身份证复件' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true, localTermsPath: '/nonexistent/path/terms.json' })
    expect(result.details).toEqual([])
  })

  it('SRE-04: 降级+空KB+材料与本地词表完全匹配 → 返回空details', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '身份证复印件' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true })
    expect(result.details).toEqual([])
  })

  it('SRE-05: 降级+空KB+材料相似度=0.8 → 不报告(严格小于)', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '身份证复印件' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true, degradedSimilarityThreshold: 0.8 })
    const hasPenalty = result.details.some((d) => d.description.includes('笔误'))
    expect(hasPenalty).toBe(false)
  })

  it('SRE-06: 降级保底错误明细standardClause含"降级模式·本地词表校验"', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '身份证复' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true })
    expect(result.details.some((d) => d.standardClause === '降级模式·本地词表校验')).toBe(true)
  })

  it('SRE-07: 降级+空KB+材料完全无匹配(maxSim===0) → 输出"疑似错误"含"与本地词表无任何匹配"', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '$$$###' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true })
    expect(result.details.some((d) => d.errorType === 'semantic' && d.description.includes('与本地词表无任何匹配') && d.description.includes('疑似错误'))).toBe(true)
  })

  it('SRE-08: 降级+空KB+办理条件含疑似笔误 → 输出semantic错误含"笔误"', () => {
    const guide = { 事项名称: '食品经营许可', 办理条件: '年满周岁' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true })
    expect(result.details.some((d) => d.field === '办理条件' && d.errorType === 'semantic' && d.description.includes('笔误'))).toBe(true)
  })

  it('SRE-09: 降级+空KB+办理条件完全无匹配 → 输出"疑似错误"含"与本地词表无任何匹配"', () => {
    const guide = { 事项名称: '食品经营许可', 办理条件: '$$$###' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true })
    expect(result.details.some((d) => d.field === '办理条件' && d.errorType === 'semantic' && d.description.includes('与本地词表无任何匹配'))).toBe(true)
  })

  it('SRE-10: 降级+空KB+localTerms加载失败 → 返回空不崩溃', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '身份证复印件', 办理条件: '年满18周岁' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true, localTermsPath: '/nonexistent/path/terms.json' })
    expect(result.details).toEqual([])
  })

  it('SRE-11: 降级+空KB+材料正确+条件正确 → 返回空details', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '身份证复印件', 办理条件: '年满18周岁' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true })
    expect(result.details).toEqual([])
  })

  const conflictRules: SemanticConflictRules = {
    ageKeywords: ['年满18周岁', '年满十八周岁', '须为成年人'],
    proxyKeywords: ['监护人代办', '未成年人代办', '法定代理人代办'],
    proofKeywords: ['收入证明', '产权证明', '资质证明', '无犯罪记录证明', '健康证明', '社保证明', '纳税证明'],
    siteInspectionThreshold: 5,
    instantHandleThreshold: 1,
  }

  it('SEM-01: 条件含年龄限制+代办表述 → 检出条件流程矛盾', () => {
    const guide = { 事项名称: '食品经营许可', 办理条件: '申请人须年满18周岁', 办理流程: '可由监护人代办' }
    const result = SemanticRuleEngine.detect(guide, 'g1', kb, itemTypeMatching, undefined, { semanticConflictRules: conflictRules })
    expect(result.details.some((d) => d.errorType === 'logical' && d.description.includes('矛盾'))).toBe(true)
  })

  it('SEM-02: 条件含年龄限制但无代办表述 → 不报告条件流程矛盾', () => {
    const guide = { 事项名称: '食品经营许可', 办理条件: '申请人须年满18周岁', 办理流程: '受理→审批→发证' }
    const result = SemanticRuleEngine.detect(guide, 'g1', kb, itemTypeMatching, undefined, { semanticConflictRules: conflictRules })
    expect(result.details.some((d) => d.standardClause === '语义矛盾检测·条件流程冲突')).toBe(false)
  })

  it('SEM-03: 条件要求收入证明+材料清单缺失 → 检出材料条件矛盾', () => {
    const guide = { 事项名称: '食品经营许可', 办理条件: '需提供收入证明', 申请材料: '身份证、申请表' }
    const result = SemanticRuleEngine.detect(guide, 'g1', kb, itemTypeMatching, undefined, { semanticConflictRules: conflictRules })
    expect(result.details.some((d) => d.errorType === 'semantic' && d.description.includes('收入证明'))).toBe(true)
  })

  it('SEM-04: 条件要求收入证明+材料清单包含 → 不报告材料条件矛盾', () => {
    const guide = { 事项名称: '食品经营许可', 办理条件: '需提供收入证明', 申请材料: '身份证、收入证明' }
    const result = SemanticRuleEngine.detect(guide, 'g1', kb, itemTypeMatching, undefined, { semanticConflictRules: conflictRules })
    expect(result.details.some((d) => d.standardClause === '语义矛盾检测·材料条件冲突')).toBe(false)
  })

  it('SEM-05: 流程含现场勘查+时限<5 → 检出时限流程矛盾', () => {
    const guide = { 事项名称: '食品经营许可', 办理流程: '受理→现场勘查→审批', 办理时限: '3个工作日' }
    const result = SemanticRuleEngine.detect(guide, 'g1', kb, itemTypeMatching, undefined, { semanticConflictRules: conflictRules })
    expect(result.details.some((d) => d.errorType === 'semantic' && d.description.includes('现场勘查'))).toBe(true)
  })

  it('SEM-06: 流程含当场办理+时限>1 → 检出时限流程矛盾', () => {
    const guide = { 事项名称: '食品经营许可', 办理流程: '当场办理', 办理时限: '5个工作日' }
    const result = SemanticRuleEngine.detect(guide, 'g1', kb, itemTypeMatching, undefined, { semanticConflictRules: conflictRules })
    expect(result.details.some((d) => d.errorType === 'semantic' && d.description.includes('当场办理'))).toBe(true)
  })

  it('SEM-07: 无semanticConflictRules → 不执行矛盾检测(向后兼容)', () => {
    const guide = { 事项名称: '食品经营许可', 办理条件: '申请人须年满18周岁', 办理流程: '可由监护人代办' }
    const result = SemanticRuleEngine.detect(guide, 'g1', kb, itemTypeMatching)
    expect(result.details.some((d) => d.standardClause?.includes('语义矛盾检测'))).toBe(false)
  })

  it('SEM-08: 降级模式+空KB+矛盾检测仍生效', () => {
    const guide = { 事项名称: '食品经营许可', 办理条件: '申请人须年满18周岁', 办理流程: '可由监护人代办' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true, semanticConflictRules: conflictRules })
    expect(result.details.some((d) => d.errorType === 'logical' && d.description.includes('矛盾'))).toBe(true)
  })
})
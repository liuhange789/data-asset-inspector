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

  it('SRE-01: 降级+空KB+办理条件过于简略(<10字) → 检出条件描述简略', () => {
    const guide = { 事项名称: '食品经营许可', 办理条件: '符合条件' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true })
    expect(result.details.some((d) => d.errorType === 'semantic' && d.description.includes('过于简略'))).toBe(true)
  })

  it('SRE-02: 降级+空KB+办理条件为"无" → 检出条件描述简略', () => {
    const guide = { 事项名称: '食品经营许可', 办理条件: '无' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true })
    expect(result.details.some((d) => d.errorType === 'semantic' && d.description.includes('过于简略'))).toBe(true)
  })

  it('SRE-03: 降级+空KB+申请材料无标点且简短 → 检出材料清单不完整', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '身份证' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true })
    expect(result.details.some((d) => d.errorType === 'semantic' && d.description.includes('不完整'))).toBe(true)
  })

  it('SRE-04: 降级+空KB+申请材料有标点 → 不报告材料不完整', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '身份证复印件、申请表' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true })
    expect(result.details.some((d) => d.standardClause === '结构完整性校验·材料清单不完整')).toBe(false)
  })

  it('SRE-05: 降级+空KB+网上办理深度不规范 → 检出网办深度不规范', () => {
    const guide = { 事项名称: '食品经营许可', 网上办理深度: '在线办理' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true })
    expect(result.details.some((d) => d.errorType === 'semantic' && d.description.includes('不规范'))).toBe(true)
  })

  it('SRE-06: 降级结构校验错误standardClause含"结构完整性校验"', () => {
    const guide = { 事项名称: '食品经营许可', 办理条件: '无' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true })
    expect(result.details.some((d) => d.standardClause?.includes('结构完整性校验'))).toBe(true)
  })

  it('SRE-07: 降级+空KB+办理条件描述充分(>10字) → 不报告条件简略', () => {
    const guide = { 事项名称: '食品经营许可', 办理条件: '申请人须年满18周岁且具有完全民事行为能力' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true })
    expect(result.details.some((d) => d.standardClause === '结构完整性校验·条件描述简略')).toBe(false)
  })

  it('SRE-08: 降级+空KB+申请材料有标点且长度充分 → 不报告材料不完整', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '身份证复印件、营业执照复印件、申请表' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true })
    expect(result.details.some((d) => d.standardClause === '结构完整性校验·材料清单不完整')).toBe(false)
  })

  it('SRE-09: 降级+空KB+网上办理深度为标准枚举值"全程网办" → 不报告', () => {
    const guide = { 事项名称: '食品经营许可', 网上办理深度: '全程网办' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true })
    expect(result.details.some((d) => d.standardClause === '结构完整性校验·网办深度不规范')).toBe(false)
  })

  it('SRE-10: 降级+空KB+所有字段结构完整 → 返回空details', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '身份证复印件、申请表', 办理条件: '申请人须年满18周岁且具有完全民事行为能力', 网上办理深度: '全程网办' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true })
    expect(result.details).toEqual([])
  })

  it('SRE-11: 降级+空KB+材料有标点+条件充分 → 返回空details', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '身份证复印件、申请表', 办理条件: '申请人须年满18周岁且具有完全民事行为能力' }
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

  it('LT-01: E43 条件笔误（短句）', () => {
    const guide = { 事项名称: '食品经营许可', 办理条件: '年满16周岁' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true, inlineLocalTerms: { materials: [], conditions: ['年满18周岁'] } })
    expect(result.details.some((d) => d.field === '办理条件' && d.errorType === 'semantic' && d.description.includes('笔误'))).toBe(true)
  })

  it('LT-02: E43 条件笔误（带前缀整句）', () => {
    const guide = { 事项名称: '食品经营许可', 办理条件: '申请人须年满16周岁' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true, inlineLocalTerms: { materials: [], conditions: ['年满18周岁'] } })
    expect(result.details.some((d) => d.field === '办理条件' && d.errorType === 'semantic')).toBe(true)
  })

  it('LT-03: E23 材料不匹配', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '办学场地证明' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true, inlineLocalTerms: { materials: ['学籍证明'], conditions: [] } })
    expect(result.details.some((d) => d.field === '申请材料' && d.errorType === 'semantic')).toBe(true)
  })

  it('LT-04: E44 材料笔误', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '健康证' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true, inlineLocalTerms: { materials: ['健康证明'], conditions: [] } })
    expect(result.details.some((d) => d.field === '申请材料' && d.errorType === 'semantic' && d.description.includes('笔误'))).toBe(true)
  })

  it('LT-05: 精确匹配不报告', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '身份证原件' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true, inlineLocalTerms: { materials: ['身份证原件'], conditions: [] } })
    expect(result.details.some((d) => d.field === '申请材料' && d.standardClause === '降级模式·本地词表校验')).toBe(false)
  })

  it('LT-06: 包含关系不报告', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '居民身份证原件' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true, inlineLocalTerms: { materials: ['身份证原件'], conditions: [] } })
    expect(result.details.some((d) => d.field === '申请材料' && d.standardClause === '降级模式·本地词表校验')).toBe(false)
  })

  it('LT-07: 高相似度不报告', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '身份证复印件' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true, inlineLocalTerms: { materials: ['身份证复印件'], conditions: [] } })
    expect(result.details.some((d) => d.field === '申请材料' && d.standardClause === '降级模式·本地词表校验')).toBe(false)
  })

  it('LT-08: 空词表守卫', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '身份证复印件、申请表', 办理条件: '申请人须年满18周岁且具有完全民事行为能力' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true, localTermsPath: 'nonexistent-path.json', inlineLocalTerms: { materials: [], conditions: [] } })
    expect(result.details.some((d) => d.standardClause === '降级模式·本地词表校验')).toBe(false)
  })

  it('LT-09: 去重规则', () => {
    const lt09Rules: SemanticConflictRules = { ageKeywords: ['年满18周岁'], proxyKeywords: ['监护人代办'], proofKeywords: [], siteInspectionThreshold: 5, instantHandleThreshold: 1 }
    const guide = { 事项名称: '食品经营许可', 办理条件: '年满18周岁', 办理流程: '可由监护人代办' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true, semanticConflictRules: lt09Rules, inlineLocalTerms: { materials: [], conditions: ['年满十六周岁'] } })
    expect(result.details.some((d) => d.field === '办理条件' && d.errorType === 'logical')).toBe(true)
    expect(result.details.some((d) => d.field === '办理条件' && d.errorType === 'semantic' && d.standardClause === '降级模式·本地词表校验')).toBe(false)
  })

  it('LT-10: 无新增误报', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '身份证复印件、申请表', 办理条件: '申请人须年满18周岁且具有完全民事行为能力', 网上办理深度: '全程网办' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true })
    expect(result.details.some((d) => d.standardClause === '降级模式·本地词表校验')).toBe(false)
  })

  it('S1: 样本s1降级检测检出E43/E44/E45', () => {
    const s1Rules: SemanticConflictRules = { ageKeywords: [], proxyKeywords: [], proofKeywords: ['健康证明'], siteInspectionThreshold: 5, instantHandleThreshold: 1 }
    const guide = { 事项名称: '食品经营许可', 申请材料: '健康证、身份证复印件、申请表', 办理条件: '年满16周岁，需提供健康证明' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true, semanticConflictRules: s1Rules, inlineLocalTerms: { materials: ['健康证明'], conditions: ['年满18周岁'] } })
    expect(result.details.some((d) => d.field === '办理条件' && d.errorType === 'semantic')).toBe(true)
    expect(result.details.some((d) => d.field === '申请材料' && d.errorType === 'semantic' && d.description.includes('健康证'))).toBe(true)
    expect(result.details.some((d) => d.field === '申请材料' && d.errorType === 'semantic' && d.standardClause === '语义矛盾检测·材料条件冲突')).toBe(true)
  })

  it('S4: 样本s4降级检测检出E23', () => {
    const guide = { 事项名称: '食品经营许可', 申请材料: '办学场地证明' }
    const result = SemanticRuleEngine.detect(guide, 'g1', { timeLimits: [], materials: [], conditions: [] } as unknown as KnowledgeBase, itemTypeMatching, undefined, { degradedMode: true, inlineLocalTerms: { materials: ['学籍证明'], conditions: [] } })
    expect(result.details.some((d) => d.field === '申请材料' && d.errorType === 'semantic')).toBe(true)
  })
})
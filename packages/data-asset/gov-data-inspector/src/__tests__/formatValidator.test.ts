import { describe, it, expect } from 'vitest'
import { FormatValidator } from '../formatValidator.js'
import type { FormatRule } from '../types.js'

const formatRules: FormatRule[] = [
  { field: '办理时限', pattern: '^\\d+个工作日$', suggestionTemplate: '应使用"X个工作日"格式' },
  { field: '咨询电话', pattern: '^(\\d{3,4}-)?\\d{7,8}$', suggestionTemplate: '应使用"区号-号码"格式' },
  { field: '收费标准', requiredKeywords: ['不收费', '收费依据'], suggestionTemplate: '应注明"不收费"或"金额+收费依据"' },
  { field: '办理地点', requiredKeywords: ['街道', '路', '号', '室', '楼', '层', '栋'], suggestionTemplate: '应包含具体地址信息' },
]

describe('FormatValidator', () => {
  it('时限为"大约两周" → 输出格式不规范提示', () => {
    const issues = FormatValidator.validate({ 办理时限: '大约两周' }, 'g1', formatRules)
    expect(issues.some((i) => i.field === '办理时限')).toBe(true)
  })

  it('咨询电话为"请联系前台" → 输出格式不规范提示', () => {
    const issues = FormatValidator.validate({ 咨询电话: '请联系前台' }, 'g1', formatRules)
    expect(issues.some((i) => i.field === '咨询电话')).toBe(true)
  })

  it('收费标准为"按实际情况收取" → 输出格式不规范提示', () => {
    const issues = FormatValidator.validate({ 收费标准: '按实际情况收取' }, 'g1', formatRules)
    expect(issues.some((i) => i.field === '收费标准')).toBe(true)
  })

  it('办理地点为"政务大厅" → 输出格式不规范提示', () => {
    const issues = FormatValidator.validate({ 办理地点: '政务大厅' }, 'g1', formatRules)
    expect(issues.some((i) => i.field === '办理地点')).toBe(true)
  })

  it('时限格式正确 → 无格式问题', () => {
    const issues = FormatValidator.validate({ 办理时限: '20个工作日' }, 'g1', formatRules)
    expect(issues.some((i) => i.field === '办理时限')).toBe(false)
  })

  it('formatRules配置缺失 → 返回空数组', () => {
    const issues = FormatValidator.validate({ 办理时限: 'abc' }, 'g1', undefined)
    expect(issues.length).toBe(0)
  })

  it('FV-01: 时限值"7个自然日" formatIssues含semanticHint含"自然日而非工作日"', () => {
    const issues = FormatValidator.validate({ 办理时限: '7个自然日' }, 'g1', formatRules)
    const timeLimitIssue = issues.find((i) => i.field === '办理时限')
    expect(timeLimitIssue).toBeDefined()
    expect(timeLimitIssue?.semanticHint).toContain("自然日")
    expect(timeLimitIssue?.semanticHint).toContain("工作日")
  })

  it('FV-02: 时限值"大约两周" semanticHint为undefined', () => {
    const issues = FormatValidator.validate({ 办理时限: '大约两周' }, 'g1', formatRules)
    const timeLimitIssue = issues.find((i) => i.field === '办理时限')
    expect(timeLimitIssue).toBeDefined()
    expect(timeLimitIssue?.semanticHint).toBeUndefined()
  })

  it('FV-03: 咨询电话"请联系前台" semanticHint为undefined', () => {
    const issues = FormatValidator.validate({ 咨询电话: '请联系前台' }, 'g1', formatRules)
    const phoneIssue = issues.find((i) => i.field === '咨询电话')
    expect(phoneIssue).toBeDefined()
    expect(phoneIssue?.semanticHint).toBeUndefined()
  })

  it('FV-04: 双标注主归类仍归属formatIssues不计入semanticErrors', () => {
    const issues = FormatValidator.validate({ 办理时限: '7个自然日' }, 'g1', formatRules)
    expect(issues.some((i) => i.field === '办理时限' && i.semanticHint !== undefined)).toBe(true)
  })

  it('FV-05: 双标注policyBasis保留原有格式校验政策依据', () => {
    const issues = FormatValidator.validate({ 办理时限: '7个自然日' }, 'g1', formatRules)
    const timeLimitIssue = issues.find((i) => i.field === '办理时限')
    expect(timeLimitIssue).toBeDefined()
    expect(timeLimitIssue?.issue).toContain('格式要求')
  })

  it('FV-06: 监督电话格式不正确 → 输出格式问题', () => {
    const rules: FormatRule[] = [...formatRules, { field: '监督电话', pattern: '^(\\d{3,4}-)?\\d{7,8}$', suggestionTemplate: '监督电话应使用"区号-号码"格式' }]
    const issues = FormatValidator.validate({ 监督电话: '请联系前台' }, 'g1', rules)
    expect(issues.some((i) => i.field === '监督电话')).toBe(true)
  })

  it('FV-07: 监督电话格式正确 → 无格式问题', () => {
    const rules: FormatRule[] = [...formatRules, { field: '监督电话', pattern: '^(\\d{3,4}-)?\\d{7,8}$', suggestionTemplate: '监督电话应使用"区号-号码"格式' }]
    const issues = FormatValidator.validate({ 监督电话: '010-12345678' }, 'g1', rules)
    expect(issues.some((i) => i.field === '监督电话')).toBe(false)
  })

  it('FV-08: 办理时间缺少必要关键词 → 输出格式问题', () => {
    const rules: FormatRule[] = [...formatRules, { field: '办理时间', requiredKeywords: ['工作日', '上午', '下午', '周一至周五'], suggestionTemplate: '办理时间应注明工作日及上下午时段' }]
    const issues = FormatValidator.validate({ 办理时间: '随时可办理' }, 'g1', rules)
    expect(issues.some((i) => i.field === '办理时间')).toBe(true)
  })

  it('FV-09: 办理时间含正确关键词 → 无格式问题', () => {
    const rules: FormatRule[] = [...formatRules, { field: '办理时间', requiredKeywords: ['工作日', '上午', '下午', '周一至周五'], suggestionTemplate: '办理时间应注明工作日及上下午时段' }]
    const issues = FormatValidator.validate({ 办理时间: '周一至周五 上午9:00-12:00 下午13:30-17:00' }, 'g1', rules)
    expect(issues.some((i) => i.field === '办理时间')).toBe(false)
  })

  it('FV-10: 必填字段缺失 → 格式校验静默跳过（由漏项检测器负责）', () => {
    const issues = FormatValidator.validate({}, 'g1', formatRules, ['办理时限', '咨询电话', '收费标准', '办理地点'])
    expect(issues.length).toBe(0)
  })

  it('FV-11: 必填字段值为空字符串 → 格式校验静默跳过（由漏项检测器负责）', () => {
    const issues = FormatValidator.validate({ 办理时限: '  ' }, 'g1', formatRules, ['办理时限'])
    expect(issues.length).toBe(0)
  })

  it('FV-12: 必填字段缺失时格式校验静默跳过（不因多规则重复报）', () => {
    const rules: FormatRule[] = [
      { field: '办理时间', requiredKeywords: ['工作日', '上午', '下午', '周一至周五'], suggestionTemplate: '应含工作日时段', matchMode: 'any' },
      { field: '办理时间', pattern: '【星期[一二三四五六日天].*】', suggestionTemplate: '应含星期格式', matchMode: 'any' },
    ]
    const issues = FormatValidator.validate({}, 'g1', rules, ['办理时间'])
    const timeIssues = issues.filter((i) => i.field === '办理时间')
    expect(timeIssues.length).toBe(0)
  })

  it('FV-13: 非必填字段缺失 → 静默跳过（不报格式误报）', () => {
    const rules: FormatRule[] = [
      { field: '联系电话', pattern: '^\\d{3,4}-\\d{7,8}$', suggestionTemplate: '应使用区号-号码格式' },
      { field: '办理时限', pattern: '^\\d+个工作日$', suggestionTemplate: '应使用X个工作日格式' },
    ]
    const issues = FormatValidator.validate({ 办理时限: '20个工作日' }, 'g1', rules, ['办理时限'])
    expect(issues.some((i) => i.field === '联系电话')).toBe(false)
  })

  it('FV-14: 办理地点="线上" → 报格式错误（模糊描述）', () => {
    const rules: FormatRule[] = [
      { field: '办理地点', requiredKeywords: ['街道', '路', '号', '室', '楼', '层', '栋'], fuzzyDescriptors: ['线上', '线上办理', '网上办理', '区街镇机构'], suggestionTemplate: '应包含具体地址信息' },
    ]
    const issues = FormatValidator.validate({ 办理地点: '线上' }, 'g1', rules)
    expect(issues.some((i) => i.field === '办理地点' && i.issue.includes('模糊描述'))).toBe(true)
  })

  it('FV-15: 办理地点="区街镇机构" → 报格式错误（模糊描述）', () => {
    const rules: FormatRule[] = [
      { field: '办理地点', requiredKeywords: ['街道', '路', '号', '室', '楼', '层', '栋'], fuzzyDescriptors: ['线上', '区街镇机构'], suggestionTemplate: '应包含具体地址信息' },
    ]
    const issues = FormatValidator.validate({ 办理地点: '区街镇机构' }, 'g1', rules)
    expect(issues.some((i) => i.field === '办理地点' && i.issue.includes('模糊描述'))).toBe(true)
  })

  it('FV-16: 办理地点含具体地址 → 不报错', () => {
    const rules: FormatRule[] = [
      { field: '办理地点', requiredKeywords: ['街道', '路', '号', '室', '楼', '层', '栋'], fuzzyDescriptors: ['线上', '区街镇机构'], suggestionTemplate: '应包含具体地址信息' },
    ]
    const issues = FormatValidator.validate({ 办理地点: '番禺区市桥街清河东路3号' }, 'g1', rules)
    expect(issues.some((i) => i.field === '办理地点')).toBe(false)
  })

  it('FV-17: 办理地点="线上办理" → 报格式错误', () => {
    const rules: FormatRule[] = [
      { field: '办理地点', requiredKeywords: ['街道', '路', '号', '室', '楼', '层', '栋'], fuzzyDescriptors: ['线上', '线上办理'], suggestionTemplate: '应包含具体地址信息' },
    ]
    const issues = FormatValidator.validate({ 办理地点: '线上办理' }, 'g1', rules)
    expect(issues.some((i) => i.field === '办理地点' && i.issue.includes('模糊描述'))).toBe(true)
  })

  it('FV-18: 办理地点不含addressSpecificKeywords → 报"缺少具体地址信息"', () => {
    const rules: FormatRule[] = [
      { field: '办理地点', requiredKeywords: ['街道', '路', '号', '室', '楼', '层', '栋'], addressSpecificKeywords: ['街道', '路', '号', '室', '楼', '层', '栋', '巷', '大道', '广场'], suggestionTemplate: '应包含具体地址信息' },
    ]
    const issues = FormatValidator.validate({ 办理地点: '线上办理' }, 'g1', rules)
    expect(issues.some((i) => i.field === '办理地点' && i.issue === '办理地点缺少具体地址信息')).toBe(true)
  })

  it('FV-19: 办理地点仅含行政区划词"区" → 报"缺少具体地址信息"（区不算具体地址）', () => {
    const rules: FormatRule[] = [
      { field: '办理地点', requiredKeywords: ['街道', '路', '号', '室', '楼', '层', '栋'], addressSpecificKeywords: ['街道', '路', '号', '室', '楼', '层', '栋', '巷', '大道', '广场'], suggestionTemplate: '应包含具体地址信息' },
    ]
    const issues = FormatValidator.validate({ 办理地点: '番禺区就业服务中心' }, 'g1', rules)
    expect(issues.some((i) => i.field === '办理地点' && i.issue === '办理地点缺少具体地址信息')).toBe(true)
  })

  it('FV-20: 办理地点含"路""号"具体门牌要素 → 不报错', () => {
    const rules: FormatRule[] = [
      { field: '办理地点', requiredKeywords: ['街道', '路', '号', '室', '楼', '层', '栋'], addressSpecificKeywords: ['街道', '路', '号', '室', '楼', '层', '栋', '巷', '大道', '广场'], suggestionTemplate: '应包含具体地址信息' },
    ]
    const issues = FormatValidator.validate({ 办理地点: '番禺区市桥街清河东路3号' }, 'g1', rules)
    expect(issues.some((i) => i.field === '办理地点')).toBe(false)
  })

  it('FV-21: 办理地点命中模糊描述"任一区" → 直接报格式错误（就业样本F7）', () => {
    const rules: FormatRule[] = [
      { field: '办理地点', requiredKeywords: ['街道', '路', '号', '室', '楼', '层', '栋'], fuzzyDescriptors: ['线上', '线上办理', '网上办理', '区街镇机构', '任意网点', '任一区', '全市'], addressSpecificKeywords: ['街道', '路', '号', '室', '楼', '层', '栋', '巷', '大道', '广场'], suggestionTemplate: '应包含具体地址信息' },
    ]
    const issues = FormatValidator.validate({ 办理地点: '广州市任一区、街（镇）公共就业服务机构' }, 'g1', rules)
    expect(issues.some((i) => i.field === '办理地点' && i.issue === '办理地点缺少具体地址信息')).toBe(true)
  })

  it('FV-22: 办理地点含模糊描述但同时含具体地址要素 → 不报错（排水样本）', () => {
    const rules: FormatRule[] = [
      { field: '办理地点', requiredKeywords: ['街道', '路', '号', '室', '楼', '层', '栋'], fuzzyDescriptors: ['线上', '线上办理', '网上办理', '区街镇机构', '任意网点', '任一区', '全市', '综合服务大厅'], addressSpecificKeywords: ['街道', '路', '号', '室', '楼', '层', '栋', '巷', '大道', '广场'], suggestionTemplate: '应包含具体地址信息' },
    ]
    const issues = FormatValidator.validate({ 办理地点: '亚运大道550号综合服务大厅X楼X窗口' }, 'g1', rules)
    expect(issues.some((i) => i.field === '办理地点')).toBe(false)
  })
})
describe('FormatValidator 前置豁免（v3.5.7）', () => {
  const hotlineRules: FormatRule[] = [
    { field: '咨询电话', pattern: '^(\\d{3,4}-)?\\d{7,8}$', suggestionTemplate: '应使用"区号-号码"格式' },
    { field: '监督电话', pattern: '^(\\d{3,4}-)?\\d{7,8}$', suggestionTemplate: '监督电话应使用"区号-号码"格式' },
  ]
  const hotlineOptions = { govServiceHotlineWhitelist: ['12315', '12333', '12329', '12336', '12345', '12366', '12385', '12328', '12316', '12320', '12369'] }

  it('咨询电话="0371-12315" 命中白名单区号+短号 → 不报格式问题', () => {
    const issues = FormatValidator.validate({ 咨询电话: '0371-12315' }, 'g1', hotlineRules, undefined, hotlineOptions)
    expect(issues.some((i) => i.field === '咨询电话')).toBe(false)
  })

  it('监督电话纯短号12329/12333/12336/12366/12385 命中白名单 → 不报格式问题', () => {
    for (const code of ['12329', '12333', '12336', '12366', '12385']) {
      const issues = FormatValidator.validate({ 监督电话: code }, 'g1', hotlineRules, undefined, hotlineOptions)
      expect(issues.some((i) => i.field === '监督电话')).toBe(false)
    }
  })

  it('咨询电话="12345678"（8位非白名单）回退正则合法 → 不报格式问题', () => {
    const issues = FormatValidator.validate({ 咨询电话: '12345678' }, 'g1', hotlineRules, undefined, hotlineOptions)
    expect(issues.some((i) => i.field === '咨询电话')).toBe(false)
  })

  it('咨询电话="abc12345" 非白名单回退正则非法 → 报格式问题', () => {
    const issues = FormatValidator.validate({ 咨询电话: 'abc12345' }, 'g1', hotlineRules, undefined, hotlineOptions)
    expect(issues.some((i) => i.field === '咨询电话')).toBe(true)
  })

  it('options缺省时电话回退既有正则（向后兼容）', () => {
    const issues = FormatValidator.validate({ 咨询电话: '12329' }, 'g1', hotlineRules)
    expect(issues.some((i) => i.field === '咨询电话')).toBe(true)
  })

  const timeLimitRules: FormatRule[] = [
    { field: '办理时限', pattern: '^(\\d+个工作日|\\d+个自然日|\\d+个工作日内)$', suggestionTemplate: '应使用"X个工作日"格式' },
  ]
  const timeLimitOptions = { timeLimitValidExpressions: ['即时办结', '当场办结', '即办件'] }

  it('办理时限="即时办结"/"当场办结"/"即办件" 命中词表 → 不报格式问题', () => {
    for (const expr of ['即时办结', '当场办结', '即办件']) {
      const issues = FormatValidator.validate({ 办理时限: expr }, 'g1', timeLimitRules, undefined, timeLimitOptions)
      expect(issues.some((i) => i.field === '办理时限')).toBe(false)
    }
  })

  it('办理时限="15个自然日"/"20个工作日内" 命中扩展pattern → 不报格式问题', () => {
    for (const val of ['15个自然日', '20个工作日内']) {
      const issues = FormatValidator.validate({ 办理时限: val }, 'g1', timeLimitRules, undefined, timeLimitOptions)
      expect(issues.some((i) => i.field === '办理时限')).toBe(false)
    }
  })

  it('办理时限="约20天" 未命中词表+未匹配扩展正则 → 报格式问题', () => {
    const issues = FormatValidator.validate({ 办理时限: '约20天' }, 'g1', timeLimitRules, undefined, timeLimitOptions)
    expect(issues.some((i) => i.field === '办理时限')).toBe(true)
  })

  it('办理时限="约15个自然日" 报格式问题且含semanticHint', () => {
    const issues = FormatValidator.validate({ 办理时限: '约15个自然日' }, 'g1', timeLimitRules, undefined, timeLimitOptions)
    const issue = issues.find((i) => i.field === '办理时限')
    expect(issue).toBeDefined()
    expect(issue?.semanticHint).toContain('自然日')
  })

  const chargeRules: FormatRule[] = [
    { field: '收费标准', requiredKeywords: ['不收费', '收费依据'], suggestionTemplate: '应注明"不收费"或"金额+收费依据"' },
  ]
  const chargeOptions = { chargeValidPatterns: ['按.*标准收取', '按.*规定收取', '^\\d+元/(件|本)$', '收费依据[:：]'] }

  it('收费标准命中合规模式 → 不报缺少必要关键词', () => {
    const validValues = ['按不动产登记费标准收取', '按国家规定收取', '10元/件', '收费依据：发改价格〔2017〕20号']
    for (const val of validValues) {
      const issues = FormatValidator.validate({ 收费标准: val }, 'g1', chargeRules, undefined, chargeOptions)
      expect(issues.some((i) => i.field === '收费标准')).toBe(false)
    }
  })

  it('收费标准="见公告"/"另行通知" 未命中模式+未命中requiredKeywords → 报缺少必要关键词', () => {
    for (const val of ['见公告', '另行通知']) {
      const issues = FormatValidator.validate({ 收费标准: val }, 'g1', chargeRules, undefined, chargeOptions)
      expect(issues.some((i) => i.field === '收费标准')).toBe(true)
    }
  })

  it('chargeValidPatterns含非法正则时跳过该模式不抛异常', () => {
    const badOptions = { chargeValidPatterns: ['[invalid', '按.*标准收取'] }
    const issues = FormatValidator.validate({ 收费标准: '按不动产登记费标准收取' }, 'g1', chargeRules, undefined, badOptions)
    expect(issues.some((i) => i.field === '收费标准')).toBe(false)
  })
})
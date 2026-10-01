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
})
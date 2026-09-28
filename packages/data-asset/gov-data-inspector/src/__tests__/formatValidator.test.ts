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
})
import { describe, it, expect } from 'vitest'
import { FormatValidator } from '../formatValidator.js'
import type { FormatRule } from '../types.js'
import defaultConfigPack from '../default-config-pack.json' with { type: 'json' }

const formatRules = defaultConfigPack.formatRules as FormatRule[]

describe('运行时断言：FormatValidator 无 options 时 coreRules 兜底', () => {
  describe('热线白名单兜底（不传 options）', () => {
    const hotlines = [
      { input: '0512-12333', desc: '苏州12333（人社）' },
      { input: '020-12345', desc: '广州12345（政务）' },
      { input: '0371-12315', desc: '开封12315（市监）' },
      { input: '12123', desc: '住建部12123' },
      { input: '12329', desc: '公积金12329' },
      { input: '12348', desc: '司法12348' },
    ]

    for (const { input, desc } of hotlines) {
      it(`${desc}: 咨询电话="${input}" 不报格式错误`, () => {
        const issues = FormatValidator.validate(
          { 咨询电话: input },
          'g1',
          formatRules,
        )
        const fmtErrors = issues.filter(i => i.field === '咨询电话')
        expect(fmtErrors).toHaveLength(0)
      })
    }

    it('监督电话="010-12345" 不报格式错误', () => {
      const issues = FormatValidator.validate(
        { 监督电话: '010-12345' },
        'g1',
        formatRules,
      )
      expect(issues).toHaveLength(0)
    })
  })

  describe('即时办结兜底（不传 options）', () => {
    it('办理时限="即时办结" 不报格式错误', () => {
      const issues = FormatValidator.validate(
        { 办理时限: '即时办结' },
        'g1',
        formatRules,
      )
      expect(issues).toHaveLength(0)
    })

    it('办理时限="当场办结" 不报格式错误', () => {
      const issues = FormatValidator.validate(
        { 办理时限: '当场办结' },
        'g1',
        formatRules,
      )
      expect(issues).toHaveLength(0)
    })

    it('办理时限="即办件" 不报格式错误', () => {
      const issues = FormatValidator.validate(
        { 办理时限: '即办件' },
        'g1',
        formatRules,
      )
      expect(issues).toHaveLength(0)
    })
  })

  describe('收费模式兜底（不传 options）', () => {
    it('收费标准="按标准收取" 不报缺关键词', () => {
      const issues = FormatValidator.validate(
        { 收费标准: '按标准收取' },
        'g1',
        formatRules,
      )
      expect(issues).toHaveLength(0)
    })

    it('收费标准="按规定收取" 不报缺关键词', () => {
      const issues = FormatValidator.validate(
        { 收费标准: '按规定收取' },
        'g1',
        formatRules,
      )
      expect(issues).toHaveLength(0)
    })

    it('收费标准="10元/本" 不报缺关键词', () => {
      const issues = FormatValidator.validate(
        { 收费标准: '10元/本' },
        'g1',
        formatRules,
      )
      expect(issues).toHaveLength(0)
    })

    it('收费标准="收费依据：发改价格〔2024〕1号" 不报缺关键词', () => {
      const issues = FormatValidator.validate(
        { 收费标准: '收费依据：发改价格〔2024〕1号' },
        'g1',
        formatRules,
      )
      expect(issues).toHaveLength(0)
    })
  })

  describe('反向验证：非白名单号码仍报错', () => {
    it('咨询电话="0512-88888" 不在白名单且不匹配格式 → 报格式错误', () => {
      const issues = FormatValidator.validate(
        { 咨询电话: '0512-88888' },
        'g1',
        formatRules,
      )
      expect(issues.length).toBeGreaterThan(0)
    })

    it('办理时限="大约两周" 非有效表达式且不匹配格式 → 报格式错误', () => {
      const issues = FormatValidator.validate(
        { 办理时限: '大约两周' },
        'g1',
        formatRules,
      )
      expect(issues.length).toBeGreaterThan(0)
    })
  })
})
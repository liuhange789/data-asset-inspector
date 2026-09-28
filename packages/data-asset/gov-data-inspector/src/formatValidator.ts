import type { FormatIssue, FormatRule } from './types.js'

export const FormatValidator = {
  validate(
    guide: Record<string, unknown>,
    guideId: string,
    formatRules: FormatRule[] | undefined,
  ): FormatIssue[] {
    if (!formatRules || formatRules.length === 0) return []
    const issues: FormatIssue[] = []
    for (const rule of formatRules) {
      const val = guide[rule.field]
      if (val === undefined || val === null) continue
      const strVal = String(val).trim()
      if (!strVal) continue
      if (rule.pattern) {
        const regex = new RegExp(rule.pattern)
        if (!regex.test(strVal)) {
          issues.push({
            guideId,
            field: rule.field,
            issue: `字段"${rule.field}"值"${strVal}"不符合格式要求（正则: ${rule.pattern}）`,
            suggestion: rule.suggestionTemplate,
          })
        }
      }
      if (rule.requiredKeywords && rule.requiredKeywords.length > 0) {
        const hasAnyKeyword = rule.requiredKeywords.some((kw) => strVal.includes(kw))
        if (!hasAnyKeyword) {
          issues.push({
            guideId,
            field: rule.field,
            issue: `字段"${rule.field}"值"${strVal}"缺少必要关键词（需包含: ${rule.requiredKeywords.join('或')}）`,
            suggestion: rule.suggestionTemplate,
          })
        }
      }
    }
    return issues
  },
}
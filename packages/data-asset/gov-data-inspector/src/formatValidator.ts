import type { FormatIssue, FormatRule } from './types.js'

function evaluateRule(guide: Record<string, unknown>, guideId: string, rule: FormatRule): FormatIssue[] {
  const val = guide[rule.field]
  if (val === undefined || val === null) return []
  const strVal = String(val).trim()
  if (!strVal) return []
  const issues: FormatIssue[] = []
  if (rule.pattern) {
    const regex = new RegExp(rule.pattern)
    if (!regex.test(strVal)) {
      const issue: FormatIssue = {
        guideId,
        field: rule.field,
        issue: `字段"${rule.field}"值"${strVal}"不符合格式要求（正则: ${rule.pattern}）`,
        suggestion: rule.suggestionTemplate,
      }
      if (rule.field === '办理时限' && strVal.includes('自然日')) {
        issue.semanticHint = "时限使用'自然日'而非'工作日'，可能存在语义偏差"
      }
      issues.push(issue)
    }
  }
  if (rule.requiredKeywords && rule.requiredKeywords.length > 0) {
    const hasAnyKeyword = rule.requiredKeywords.some((kw) => strVal.includes(kw))
    if (!hasAnyKeyword) {
      const issue: FormatIssue = {
        guideId,
        field: rule.field,
        issue: `字段"${rule.field}"值"${strVal}"缺少必要关键词（需包含: ${rule.requiredKeywords.join('或')}）`,
        suggestion: rule.suggestionTemplate,
      }
      if (rule.field === '办理时限' && strVal.includes('自然日')) {
        issue.semanticHint = "时限使用'自然日'而非'工作日'，可能存在语义偏差"
      }
      issues.push(issue)
    }
  }
  return issues
}

export const FormatValidator = {
  validate(
    guide: Record<string, unknown>,
    guideId: string,
    formatRules: FormatRule[] | undefined,
    requiredFields?: string[],
  ): FormatIssue[] {
    if (!formatRules || formatRules.length === 0) return []
    const requiredSet = new Set(requiredFields ?? [])
    const fieldGroups = new Map<string, FormatRule[]>()
    for (const rule of formatRules) {
      if (!fieldGroups.has(rule.field)) fieldGroups.set(rule.field, [])
      fieldGroups.get(rule.field)!.push(rule)
    }
    const issues: FormatIssue[] = []
    for (const [field, rules] of fieldGroups) {
      const val = guide[field]
      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
        if (requiredSet.has(field)) {
          issues.push({
            guideId,
            field,
            issue: `字段"${field}"缺失或为空，无法执行格式校验`,
            suggestion: rules[0]!.suggestionTemplate,
          })
        }
        continue
      }
      const isAnyMode = rules.length > 1 && rules.some((r) => r.matchMode === 'any')
      const ruleResults: FormatIssue[][] = rules.map((rule) => evaluateRule(guide, guideId, rule))
      if (isAnyMode) {
        const anyPassed = ruleResults.some((r) => r.length === 0)
        if (!anyPassed) {
          const firstIssues = ruleResults.find((r) => r.length > 0)
          if (firstIssues) issues.push(...firstIssues)
        }
      } else {
        for (const r of ruleResults) issues.push(...r)
      }
    }
    return issues
  },
}
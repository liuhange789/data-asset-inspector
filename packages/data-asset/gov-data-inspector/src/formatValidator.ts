import type { FormatIssue, FormatRule } from './types.js'

function checkAddressFuzzy(
  strVal: string,
  requiredKeywords: string[] | undefined,
  fuzzyDescriptors: string[] | undefined,
  field: string,
  guideId: string,
  suggestionTemplate: string,
): FormatIssue | null {
  if (!fuzzyDescriptors || fuzzyDescriptors.length === 0 || !requiredKeywords || requiredKeywords.length === 0) {
    return null
  }
  const matchesFuzzy = fuzzyDescriptors.some((d) => strVal.includes(d))
  if (!matchesFuzzy) return null
  const hasSpecific = requiredKeywords.some((kw) => strVal.includes(kw))
  if (hasSpecific) return null
  return {
    guideId,
    field,
    issue: `字段"${field}"值"${strVal}"为模糊描述，缺少具体地址要素(街道/路/号等)`,
    suggestion: suggestionTemplate,
  }
}

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
  if (rule.addressSpecificKeywords && rule.addressSpecificKeywords.length > 0) {
    if (rule.fuzzyDescriptors && rule.fuzzyDescriptors.length > 0 && rule.fuzzyDescriptors.some((d) => strVal.includes(d)) && !rule.addressSpecificKeywords.some((kw) => strVal.includes(kw))) {
      issues.push({
        guideId,
        field: rule.field,
        issue: '办理地点缺少具体地址信息',
        suggestion: '办理地点应包含街道/路/号等具体地址信息',
      })
      return issues
    }
    const hasAnySpecific = rule.addressSpecificKeywords.some((kw) => strVal.includes(kw))
    if (!hasAnySpecific) {
      issues.push({
        guideId,
        field: rule.field,
        issue: '办理地点缺少具体地址信息',
        suggestion: '办理地点应包含街道/路/号等具体地址信息',
      })
      return issues
    }
    return issues
  }
  if (rule.requiredKeywords && rule.requiredKeywords.length > 0) {
    const fuzzyIssue = checkAddressFuzzy(strVal, rule.requiredKeywords, rule.fuzzyDescriptors, rule.field, guideId, rule.suggestionTemplate)
    if (fuzzyIssue) {
      issues.push(fuzzyIssue)
      return issues
    }
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
    void requiredFields
    const fieldGroups = new Map<string, FormatRule[]>()
    for (const rule of formatRules) {
      if (!fieldGroups.has(rule.field)) fieldGroups.set(rule.field, [])
      fieldGroups.get(rule.field)!.push(rule)
    }
    const issues: FormatIssue[] = []
    for (const [field, rules] of fieldGroups) {
      const val = guide[field]
      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {

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
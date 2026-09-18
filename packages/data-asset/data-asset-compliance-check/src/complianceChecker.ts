import type { ComplianceConfig, ComplianceCheckInput, CategoryResult, ComplianceReport } from './types.js'
import type { PolicyDocument } from '@liuhange/dsh-data-asset-shared'

export function checkCompliance(
  input: ComplianceCheckInput,
  config: ComplianceConfig,
  policyDocuments: PolicyDocument[],
): ComplianceReport {
  const sourceCompliance = checkCategory(input.sourceDescription, config.sourceRules)
  const processingCompliance = checkCategory(input.processingDescription, config.processingRules)
  const usageCompliance = checkCategory(input.usageDescription, config.usageRules)

  const personalInfoMinimize = checkPersonalInfoMinimize(
    input.hasPersonalInfo,
    input.personalInfoFields,
    config.personalInfoMinimizeFields,
  )

  const overallPassed =
    sourceCompliance.passed &&
    processingCompliance.passed &&
    usageCompliance.passed &&
    personalInfoMinimize.allMinimized

  return {
    assetName: input.assetName,
    sourceCompliance,
    processingCompliance,
    usageCompliance,
    personalInfoMinimize,
    overallPassed,
    policyReferences: policyDocuments,
    timestamp: new Date().toISOString(),
  }
}

function checkCategory(description: string, rules: ComplianceConfig['sourceRules']): CategoryResult {
  const issues: string[] = []
  const checkedRules = rules.map(rule => {
    const violated = detectViolation(description, rule)
    if (violated) {
      issues.push(`${rule.id}: ${rule.condition}（${rule.lawRef}）——检测到违规`)
      return { ...rule, compliant: false }
    }
    return rule
  })
  return {
    passed: issues.length === 0,
    checkedRules,
    issues,
  }
}

function detectViolation(description: string, rule: { condition: string }): boolean {
  const negativeIndicators = ['非法', '未授权', '未经同意', '隐瞒', '虚假', '欺诈', '窃取', '违规']
  const conditionLower = rule.condition.toLowerCase()
  const hasNegative = negativeIndicators.some(ind => description.includes(ind))
  const conditionMentionsNegative = negativeIndicators.some(ind => conditionLower.includes(ind))
  return hasNegative && conditionMentionsNegative
}

function checkPersonalInfoMinimize(
  hasPersonalInfo: boolean,
  fields: string[],
  minimizeFields: string[],
): { hasPersonalInfo: boolean; fields: string[]; allMinimized: boolean; issues: string[] } {
  const issues: string[] = []
  if (!hasPersonalInfo) {
    return { hasPersonalInfo, fields, allMinimized: true, issues }
  }
  const unminimized = fields.filter(f => !minimizeFields.includes(f))
  if (unminimized.length > 0) {
    issues.push(`以下个人信息字段未脱敏: ${unminimized.join(', ')}`)
  }
  return {
    hasPersonalInfo,
    fields,
    allMinimized: unminimized.length === 0,
    issues,
  }
}
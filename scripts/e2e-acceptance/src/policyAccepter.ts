import { readFileSync } from 'node:fs'
import { POLICY_REFS_PATH, POLICY_REFERENCE_LIST } from './config.js'
import type { PolicyAcceptanceResult, PolicyReferenceItem, ErrorRecord, ChainRunOutput } from './types.js'

interface PolicyRefConfig {
  policyReferences: { stage: string; documents: { name: string; docNumber: string; coreRequirement: string }[] }[]
}

export function loadPolicyReferencesFromConfig(): PolicyReferenceItem[] {
  const raw = readFileSync(POLICY_REFS_PATH, 'utf-8')
  const config = JSON.parse(raw) as PolicyRefConfig
  const items: PolicyReferenceItem[] = []
  let seq = 0
  for (const stage of config.policyReferences) {
    for (const doc of stage.documents) {
      seq++
      items.push({
        seq,
        fullName: doc.name,
        docNumber: doc.docNumber,
        coreRequirement: doc.coreRequirement,
        relatedChains: [],
      })
    }
  }
  return items
}

export function checkPolicyInReports(chainResults: readonly ChainRunOutput[]): {
  foundInReports: PolicyReferenceItem[]
  missing: PolicyReferenceItem[]
  formatIssues: string[]
} {
  const allReportText = chainResults
    .map(r => r.rawOutput)
    .join('\n')

  const foundInReports: PolicyReferenceItem[] = []
  const missing: PolicyReferenceItem[] = []
  const formatIssues: string[] = []

  for (const expected of POLICY_REFERENCE_LIST) {
    const nameFound = allReportText.includes(expected.fullName)
    const docNumberFound = allReportText.includes(expected.docNumber)
    const requirementFound = allReportText.includes(expected.coreRequirement)

    if (nameFound && docNumberFound) {
      foundInReports.push(expected)
    } else {
      missing.push(expected)
    }

    if (!nameFound && allReportText.includes(expected.fullName.replace(/关于|暂行/g, ''))) {
      formatIssues.push(`政策依据"${expected.fullName}"文件名称被简写，缺少"关于"或"暂行"`)
    }

    if (/\[.*?\]/.test(expected.docNumber) && !/〔.*?〕/.test(expected.docNumber)) {
      formatIssues.push(`政策依据"${expected.fullName}"文号使用方括号[]而非六角括号〔〕`)
    }

    if (!requirementFound && nameFound) {
      formatIssues.push(`政策依据"${expected.fullName}"有文件名但缺少核心条款摘要`)
    }
  }

  return { foundInReports, missing, formatIssues }
}

export function runPolicyAcceptance(chainResults: readonly ChainRunOutput[]): PolicyAcceptanceResult {
  const errors: ErrorRecord[] = []
  const { foundInReports, missing, formatIssues } = checkPolicyInReports(chainResults)

  for (const m of missing) {
    errors.push({
      severity: 'error',
      code: 'POLICY_REFERENCE_MISSING',
      message: `政策依据缺失: ${m.fullName} (${m.docNumber})`,
    })
  }

  for (const issue of formatIssues) {
    errors.push({
      severity: 'warning',
      code: 'POLICY_FORMAT_ISSUE',
      message: issue,
    })
  }

  const passed = missing.length === 0 && formatIssues.length === 0

  return {
    totalExpected: POLICY_REFERENCE_LIST.length,
    foundInReports,
    missing,
    formatIssues,
    passed,
    errors,
  }
}
import type { RegistrationHelperReport, PrecheckResult, AgencyMatchResult } from './types.js'
import type { PolicyDocument } from '@liuhange/dsh-data-asset-shared'

export function generateRegistrationReport(
  assetName: string,
  precheck: PrecheckResult,
  agencyMatch: AgencyMatchResult | null,
  policyDocuments: PolicyDocument[],
): RegistrationHelperReport {
  const nextSteps: string[] = []

  if (precheck.conclusion === 'CANNOT_REGISTER') {
    nextSteps.push('暂缓登记申请，需先解决以下问题:')
    for (const item of precheck.failedItems) {
      nextSteps.push(`  - ${item}`)
    }
  } else {
    nextSteps.push('预检通过，可进入登记申请流程')
    if (agencyMatch && agencyMatch.matched) {
      nextSteps.push(`向${agencyMatch.recommendedAgency}数据交易所提交申请: ${agencyMatch.url}`)
    } else if (agencyMatch) {
      nextSteps.push(`建议向${agencyMatch.recommendedAgency}数据交易所咨询: ${agencyMatch.url}`)
    }
    nextSteps.push('准备材料: 数据描述、来源合法性声明、产权归属说明')
    nextSteps.push('通过generate_registration_docs工具生成申请材料')
    nextSteps.push('提交至国家数据产权登记系统')
  }

  return {
    assetName,
    precheck,
    agencyMatch,
    nextSteps,
    policyReferences: policyDocuments,
    timestamp: new Date().toISOString(),
  }
}
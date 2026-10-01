import type { ChangeRecord, ChangeTraceabilityResult } from './types.js'
import { POLICY_STANDARD_NAME } from './invariant.js'

export interface ChangeTraceabilityCheckResult {
  results: ChangeTraceabilityResult[]
  warnings: string[]
  skipped: boolean
}

export class ChangeTraceabilityChecker {
  check(changeRecords: ChangeRecord[], assetIds: string[]): ChangeTraceabilityCheckResult {
    const results: ChangeTraceabilityResult[] = []
    const warnings: string[] = []
    const policyBasis = `依据：${POLICY_STANDARD_NAME}变更管理要求`
    const assetIdSet = new Set(assetIds)

    for (const change of changeRecords) {
      if (!change || typeof change !== 'object') {
        warnings.push('变更记录格式不兼容，已跳过')
        continue
      }

      const missingItems: string[] = []

      const assetLinked =
        typeof change.relatedAssetId === 'string' &&
        change.relatedAssetId.trim() !== '' &&
        assetIdSet.has(change.relatedAssetId)
      if (!assetLinked) {
        missingItems.push('变更未关联资产')
      }

      const recordComplete = typeof change.changeReason === 'string' && change.changeReason.trim() !== ''
      if (!recordComplete) {
        missingItems.push('缺少变更原因')
      }

      const approvalChain = change.approvalChain
      const approvalChainComplete =
        approvalChain !== null &&
        approvalChain !== undefined &&
        typeof approvalChain === 'object' &&
        typeof approvalChain.initiator === 'string' &&
        approvalChain.initiator.trim() !== '' &&
        typeof approvalChain.approver === 'string' &&
        approvalChain.approver.trim() !== '' &&
        typeof approvalChain.approvalTime === 'string' &&
        approvalChain.approvalTime.trim() !== '' &&
        typeof approvalChain.approvalConclusion === 'string' &&
        approvalChain.approvalConclusion.trim() !== ''
      if (!approvalChainComplete) {
        const missingFields: string[] = []
        if (!approvalChain || typeof approvalChain.initiator !== 'string' || approvalChain.initiator.trim() === '') {
          missingFields.push('发起人')
        }
        if (!approvalChain || typeof approvalChain.approver !== 'string' || approvalChain.approver.trim() === '') {
          missingFields.push('审批人')
        }
        if (!approvalChain || typeof approvalChain.approvalTime !== 'string' || approvalChain.approvalTime.trim() === '') {
          missingFields.push('审批时间')
        }
        if (!approvalChain || typeof approvalChain.approvalConclusion !== 'string' || approvalChain.approvalConclusion.trim() === '') {
          missingFields.push('审批结论')
        }
        missingItems.push(`审批链不完整：缺少${missingFields.join('、')}`)
      }

      const impactScopeLinked = Array.isArray(change.impactScope) && change.impactScope.length > 0
      if (!impactScopeLinked) {
        missingItems.push('影响范围未明确')
      }

      results.push({
        changeId: change.changeId,
        assetLinked,
        recordComplete,
        approvalChainComplete,
        impactScopeLinked,
        missingItems,
        policyBasis,
      })
    }

    return { results, warnings, skipped: false }
  }

  checkWithSkip(changeRecords: ChangeRecord[] | null, assetIds: string[]): ChangeTraceabilityCheckResult {
    if (changeRecords === null) {
      return {
        results: [],
        warnings: ['变更追溯因系统不可用而跳过'],
        skipped: true,
      }
    }
    return this.check(changeRecords, assetIds)
  }
}
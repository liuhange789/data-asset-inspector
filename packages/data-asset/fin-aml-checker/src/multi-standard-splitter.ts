import type { ThresholdEvaluationResult, ReportableTransaction } from './types.js'
import { POLICY_REGULATION_PREFIX } from './invariant.js'

export class MultiStandardSplitter {
  split(transactionId: string, evaluationResults: ThresholdEvaluationResult[]): ReportableTransaction[] {
    return evaluationResults.map((result) => ({
      transactionId,
      triggeredThresholdType: result.triggeredThresholdType,
      policyBasis: `${POLICY_REGULATION_PREFIX}${result.policyBasisClause}`,
      judgmentStatus: '自动判定' as const,
    }))
  }
}
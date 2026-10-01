import type {
  ReportableTransaction,
  ExemptedTransaction,
  ExemptionConfig,
  ExemptionRule,
  Transaction,
} from './types.js'
import { POLICY_REGULATION_PREFIX } from './invariant.js'

export interface ExemptionFilterResult {
  exempted: ExemptedTransaction[]
  remaining: ReportableTransaction[]
}

export class ExemptionFilter {
  filter(
    reportableCandidates: ReportableTransaction[],
    transactionMap: Map<string, Transaction>,
    exemptionConfig: ExemptionConfig | null | undefined,
  ): ExemptionFilterResult {
    const exempted: ExemptedTransaction[] = []
    const remaining: ReportableTransaction[] = []

    if (!exemptionConfig || !exemptionConfig.rules || exemptionConfig.rules.length === 0) {
      return { exempted, remaining: [...reportableCandidates] }
    }

    const groupedByTransaction = this.groupByTransactionId(reportableCandidates)
    const processedTransactionIds = new Set<string>()

    for (const [transactionId, candidates] of groupedByTransaction) {
      if (processedTransactionIds.has(transactionId)) continue
      processedTransactionIds.add(transactionId)

      const transaction = transactionMap.get(transactionId)
      const matchedRule = transaction ? this.findMatchingRule(transaction, exemptionConfig.rules) : null

      if (matchedRule) {
        exempted.push({
          transactionId,
          exemptionReason: matchedRule.ruleName,
          policyBasis: `${POLICY_REGULATION_PREFIX}${matchedRule.policyBasisClause}`,
          judgmentStatus: '自动判定',
        })
      } else {
        remaining.push(...candidates)
      }
    }

    return { exempted, remaining }
  }

  private groupByTransactionId(candidates: ReportableTransaction[]): Map<string, ReportableTransaction[]> {
    const grouped = new Map<string, ReportableTransaction[]>()
    for (const candidate of candidates) {
      const list = grouped.get(candidate.transactionId)
      if (list) {
        list.push(candidate)
      } else {
        grouped.set(candidate.transactionId, [candidate])
      }
    }
    return grouped
  }

  private findMatchingRule(transaction: Transaction, rules: ExemptionRule[]): ExemptionRule | null {
    for (const rule of rules) {
      if (!rule.enabled) continue
      if (this.matchConditions(transaction, rule.matchConditions)) {
        return rule
      }
    }
    return null
  }

  private matchConditions(
    transaction: Transaction,
    conditions: ExemptionRule['matchConditions'],
  ): boolean {
    if (conditions.transactionType && conditions.transactionType.length > 0) {
      if (!conditions.transactionType.includes(transaction.transactionType)) return false
    }

    if (conditions.transactionTypes && conditions.transactionTypes.length > 0) {
      if (!conditions.transactionTypes.includes(transaction.transactionType)) return false
    }

    if (conditions.counterpartyType && conditions.counterpartyType.length > 0) {
      if (!transaction.counterpartyType || !conditions.counterpartyType.includes(transaction.counterpartyType)) {
        return false
      }
    }

    return true
  }
}
import type { ValuationReport, CostBasedResult, IncomeBasedResult, PricingReferenceConfig } from './types.js'
import type { PolicyDocument } from '@liuhange/dsh-data-asset-shared'

export function generateValuationReport(
  assetName: string,
  costBased: CostBasedResult,
  incomeBased: IncomeBasedResult,
  pricingConfig: PricingReferenceConfig,
  qualityScore: number | undefined,
  policyDocuments: PolicyDocument[],
): ValuationReport {
  const recommendedValue = Math.round(
    (costBased.depreciatedValue * 0.4 + incomeBased.presentValue * 0.6) * 100,
  ) / 100

  const thresholds = pricingConfig.valueLevelThresholds
  let valueLevel: 'high' | 'medium' | 'low'
  const effectiveScore = qualityScore ?? 60
  if (effectiveScore >= thresholds.high) {
    valueLevel = 'high'
  } else if (effectiveScore >= thresholds.medium) {
    valueLevel = 'medium'
  } else {
    valueLevel = 'low'
  }

  const pricingSuggestion = buildPricingSuggestion(recommendedValue, valueLevel, costBased, incomeBased)

  return {
    assetName,
    costBased,
    incomeBased,
    recommendedValue,
    pricingSuggestion,
    valueLevel,
    policyReferences: policyDocuments,
    timestamp: new Date().toISOString(),
  }
}

function buildPricingSuggestion(
  recommended: number,
  level: 'high' | 'medium' | 'low',
  costBased: CostBasedResult,
  incomeBased: IncomeBasedResult,
): string {
  const levelLabel = level === 'high' ? '高价值' : level === 'medium' ? '中价值' : '低价值'
  const parts: string[] = []
  parts.push(`建议估值: ${recommended} 元（${levelLabel}）`)
  parts.push(`成本法估值: ${costBased.depreciatedValue} 元（折旧后）`)
  parts.push(`收益法估值: ${incomeBased.presentValue} 元（折现率${(incomeBased.discountRate * 100).toFixed(1)}%）`)
  if (recommended > 0) {
    parts.push(`定价区间: ${Math.round(recommended * 0.8)} ~ ${Math.round(recommended * 1.2)} 元`)
  }
  return parts.join('；')
}
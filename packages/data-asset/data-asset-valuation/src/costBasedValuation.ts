import type { CostBasedConfig, CostItem, CostBasedResult } from './types.js'

export function calculateCostBasedValue(
  costItems: CostItem[],
  config: CostBasedConfig,
): CostBasedResult {
  const breakdown: Record<string, number> = {}
  for (const category of config.costCategories) {
    breakdown[category] = 0
  }

  let totalCost = 0
  for (const item of costItems) {
    if (!config.costCategories.includes(item.category)) {
      continue
    }
    breakdown[item.category] = (breakdown[item.category] ?? 0) + item.amount
    totalCost += item.amount
  }

  const depreciationYears = config.depreciationYears
  let depreciatedValue: number
  let annualDepreciation: number

  if (config.depreciationMethod === 'straight-line') {
    annualDepreciation = totalCost / depreciationYears
    depreciatedValue = totalCost - annualDepreciation
  } else {
    annualDepreciation = (totalCost * 2) / depreciationYears
    depreciatedValue = totalCost - annualDepreciation
  }

  if (depreciatedValue < 0) depreciatedValue = 0

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    depreciatedValue: Math.round(depreciatedValue * 100) / 100,
    breakdown,
    annualDepreciation: Math.round(annualDepreciation * 100) / 100,
  }
}
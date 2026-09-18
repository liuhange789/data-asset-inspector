import type { IncomeBasedConfig, IncomeScenario, IncomeBasedResult } from './types.js'

export function calculateIncomeBasedValue(
  scenarios: IncomeScenario[],
  config: IncomeBasedConfig,
  customDiscountRate?: number,
): IncomeBasedResult {
  const discountRate = customDiscountRate ?? config.defaultDiscountRate
  const scenarioResults: IncomeBasedResult['scenarios'] = []
  let totalPresentValue = 0

  for (const scenario of scenarios) {
    const years = scenario.years > 0 ? scenario.years : config.defaultScenarioYears
    const netCashFlow = scenario.annualRevenue - scenario.annualCost
    let pv = 0
    for (let year = 1; year <= years; year++) {
      pv += netCashFlow / Math.pow(1 + discountRate, year)
    }
    scenarioResults.push({
      type: scenario.type,
      netCashFlow: Math.round(netCashFlow * 100) / 100,
      presentValue: Math.round(pv * 100) / 100,
    })
    totalPresentValue += pv
  }

  return {
    presentValue: Math.round(totalPresentValue * 100) / 100,
    scenarios: scenarioResults,
    discountRate,
  }
}
import { describe, it, expect } from 'vitest'
import { calculateCostBasedValue } from '../costBasedValuation.js'
import { calculateIncomeBasedValue } from '../incomeBasedValuation.js'

describe('costBasedValuation', () => {
  const config = {
    costCategories: ['acquisition', 'processing', 'storage', 'maintenance', 'labor', 'infrastructure'],
    depreciationYears: 5,
    depreciationMethod: 'straight-line' as const,
  }

  it('正确汇总各类成本', () => {
    const result = calculateCostBasedValue([
      { category: 'acquisition', amount: 100000, year: 2024 },
      { category: 'processing', amount: 50000, year: 2024 },
      { category: 'storage', amount: 20000, year: 2024 },
    ], config)
    expect(result.totalCost).toBe(170000)
    expect(result.breakdown.acquisition).toBe(100000)
    expect(result.breakdown.processing).toBe(50000)
    expect(result.breakdown.storage).toBe(20000)
  })

  it('直线折旧法正确计算折旧后价值', () => {
    const result = calculateCostBasedValue([
      { category: 'acquisition', amount: 100000, year: 2024 },
    ], config)
    expect(result.annualDepreciation).toBe(20000)
    expect(result.depreciatedValue).toBe(80000)
  })

  it('忽略不在costCategories中的类别', () => {
    const result = calculateCostBasedValue([
      { category: 'unknown', amount: 999999, year: 2024 },
    ], config)
    expect(result.totalCost).toBe(0)
  })
})

describe('incomeBasedValuation', () => {
  const config = {
    defaultDiscountRate: 0.08,
    defaultScenarioYears: 3,
    scenarioTemplates: ['direct_sale', 'subscription'],
  }

  it('DCF正确计算现值', () => {
    const result = calculateIncomeBasedValue([
      { type: 'subscription', annualRevenue: 100000, annualCost: 20000, years: 3 },
    ], config)
    expect(result.scenarios).toHaveLength(1)
    expect(result.scenarios[0]!.netCashFlow).toBe(80000)
    expect(result.presentValue).toBeGreaterThan(0)
    expect(result.discountRate).toBe(0.08)
  })

  it('多场景现值累加', () => {
    const result = calculateIncomeBasedValue([
      { type: 'direct_sale', annualRevenue: 50000, annualCost: 10000, years: 2 },
      { type: 'subscription', annualRevenue: 30000, annualCost: 5000, years: 3 },
    ], config)
    expect(result.scenarios).toHaveLength(2)
    expect(result.presentValue).toBeGreaterThan(0)
  })

  it('自定义折现率生效', () => {
    const result = calculateIncomeBasedValue([
      { type: 'direct_sale', annualRevenue: 100000, annualCost: 0, years: 1 },
    ], config, 0.1)
    expect(result.discountRate).toBe(0.1)
    expect(result.scenarios[0]!.presentValue).toBeCloseTo(90909.09, -1)
  })
})
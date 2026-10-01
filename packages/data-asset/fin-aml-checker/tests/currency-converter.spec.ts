import { describe, it, expect } from 'vitest'
import { CurrencyConverter } from '../src/currency-converter.js'
import { defaultExchangeRateConfig } from '../src/default-threshold-config.js'

describe('CurrencyConverter', () => {
  const converter = new CurrencyConverter()
  const rateConfig = defaultExchangeRateConfig

  it('CNY 交易折算返回原金额', () => {
    const result = converter.convertToCny(50000, 'CNY', rateConfig)
    expect(result.cnyAmount).toBe(50000)
    expect(result.fcyAmount).toBe(50000)
    expect(result.currencyConfigured).toBe(true)
  })

  it('USD 交易按汇率折算为人民币', () => {
    const result = converter.convertToCny(10000, 'USD', rateConfig)
    expect(result.cnyAmount).toBe(72000)
    expect(result.fcyAmount).toBe(10000)
    expect(result.currencyConfigured).toBe(true)
  })

  it('未配置币种返回 null 并标记未配置', () => {
    const result = converter.convertToCny(10000, 'XYZ', rateConfig)
    expect(result.cnyAmount).toBeNull()
    expect(result.fcyAmount).toBe(10000)
    expect(result.currencyConfigured).toBe(false)
  })

  it('CNY 交易阈值判定按人民币阈值', () => {
    const result = converter.checkThreshold(50001, 'CNY', 50000, 10000, rateConfig)
    expect(result.reached).toBe(true)
    expect(result.cnyJudgment).toBe(true)
    expect(result.consistent).toBe(true)
  })

  it('CNY 交易未达阈值', () => {
    const result = converter.checkThreshold(49999, 'CNY', 50000, 10000, rateConfig)
    expect(result.reached).toBe(false)
    expect(result.cnyJudgment).toBe(false)
  })

  it('USD 交易双判定一致性校验 - 一致', () => {
    const result = converter.checkThreshold(10001, 'USD', 72000, 10000, rateConfig)
    expect(result.cnyJudgment).toBe(true)
    expect(result.fcyJudgment).toBe(true)
    expect(result.consistent).toBe(true)
    expect(result.reached).toBe(true)
  })

  it('USD 交易双判定一致性校验 - 不一致时仍按 OR 逻辑判定', () => {
    const result = converter.checkThreshold(7000, 'USD', 50000, 10000, rateConfig)
    expect(result.cnyJudgment).toBe(true)
    expect(result.fcyJudgment).toBe(false)
    expect(result.consistent).toBe(false)
    expect(result.reached).toBe(true)
  })

  it('未配置币种阈值判定按外币阈值', () => {
    const result = converter.checkThreshold(15000, 'XYZ', 50000, 10000, rateConfig)
    expect(result.currencyConfigured).toBe(false)
    expect(result.fcyJudgment).toBe(true)
    expect(result.reached).toBe(true)
  })

  it('EUR 交易按汇率折算', () => {
    const result = converter.convertToCny(1000, 'EUR', rateConfig)
    expect(result.cnyAmount).toBe(7800)
    expect(result.currencyConfigured).toBe(true)
  })
})
import type { ExchangeRateConfig, CurrencyConvertResult } from './types.js'

export interface ThresholdCheckResult {
  reached: boolean
  cnyJudgment: boolean
  fcyJudgment: boolean
  consistent: boolean
  currencyConfigured: boolean
}

export class CurrencyConverter {
  convertToCny(amount: number, currency: string, exchangeRateConfig: ExchangeRateConfig): CurrencyConvertResult {
    if (currency === 'CNY') {
      return { cnyAmount: amount, fcyAmount: amount, currencyConfigured: true }
    }

    const rate = exchangeRateConfig.rateMap[currency]
    if (rate === undefined || rate === null || typeof rate !== 'number' || rate <= 0) {
      return { cnyAmount: null, fcyAmount: amount, currencyConfigured: false }
    }

    return { cnyAmount: amount * rate, fcyAmount: amount, currencyConfigured: true }
  }

  checkThreshold(
    amount: number,
    currency: string,
    thresholdCny: number,
    thresholdFcy: number,
    exchangeRateConfig: ExchangeRateConfig,
  ): ThresholdCheckResult {
    const convertResult = this.convertToCny(amount, currency, exchangeRateConfig)

    if (currency === 'CNY') {
      const cnyJudgment = amount >= thresholdCny
      return {
        reached: cnyJudgment,
        cnyJudgment,
        fcyJudgment: cnyJudgment,
        consistent: true,
        currencyConfigured: true,
      }
    }

    if (!convertResult.currencyConfigured || convertResult.cnyAmount === null) {
      const fcyJudgment = amount >= thresholdFcy
      return {
        reached: fcyJudgment,
        cnyJudgment: false,
        fcyJudgment,
        consistent: false,
        currencyConfigured: false,
      }
    }

    const cnyJudgment = convertResult.cnyAmount >= thresholdCny
    const fcyJudgment = amount >= thresholdFcy
    const consistent = cnyJudgment === fcyJudgment

    return {
      reached: cnyJudgment || fcyJudgment,
      cnyJudgment,
      fcyJudgment,
      consistent,
      currencyConfigured: true,
    }
  }
}
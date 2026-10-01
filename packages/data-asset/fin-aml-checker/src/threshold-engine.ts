import type {
  Transaction,
  ThresholdConfig,
  ExchangeRateConfig,
  ThresholdEvaluationResult,
  ReportableTransaction,
} from './types.js'
import { CurrencyConverter } from './currency-converter.js'
import { MultiStandardSplitter } from './multi-standard-splitter.js'

export interface ThresholdEngineResult {
  reportable: ReportableTransaction[]
  warnings: string[]
}

export class ThresholdEngine {
  private readonly currencyConverter: CurrencyConverter
  private readonly multiStandardSplitter: MultiStandardSplitter

  constructor() {
    this.currencyConverter = new CurrencyConverter()
    this.multiStandardSplitter = new MultiStandardSplitter()
  }

  evaluate(
    transaction: Transaction,
    thresholdConfig: ThresholdConfig,
    exchangeRateConfig: ExchangeRateConfig,
  ): ThresholdEngineResult {
    const results: ThresholdEvaluationResult[] = []
    const warnings: string[] = []

    const isCashType = thresholdConfig.cashTransactionTypes.includes(transaction.transactionType)
    const isTransferType = thresholdConfig.transferTransactionTypes.includes(transaction.transactionType)

    if (isCashType) {
      const check = this.currencyConverter.checkThreshold(
        transaction.amount,
        transaction.currency,
        thresholdConfig.cashThresholdCny,
        thresholdConfig.cashThresholdFcy,
        exchangeRateConfig,
      )
      if (!check.currencyConfigured) {
        warnings.push(`交易 ${transaction.transactionId} 币种 ${transaction.currency} 未在汇率配置中定义`)
      }
      if (!check.consistent && check.currencyConfigured) {
        warnings.push(`交易 ${transaction.transactionId} 外币折算双判定不一致`)
      }
      if (check.reached) {
        results.push({
          transactionId: transaction.transactionId,
          triggeredThresholdType: '现金类',
          policyBasisClause: '第五条第一款',
        })
      }
    }

    if (transaction.accountType === '非自然人' && isTransferType) {
      const check = this.currencyConverter.checkThreshold(
        transaction.amount,
        transaction.currency,
        thresholdConfig.nonNaturalPersonTransferCny,
        thresholdConfig.nonNaturalPersonTransferFcy,
        exchangeRateConfig,
      )
      if (!check.currencyConfigured && !isCashType) {
        warnings.push(`交易 ${transaction.transactionId} 币种 ${transaction.currency} 未在汇率配置中定义`)
      }
      if (check.reached) {
        results.push({
          transactionId: transaction.transactionId,
          triggeredThresholdType: '非自然人账户划转',
          policyBasisClause: '第五条第二款',
        })
      }
    }

    if (transaction.accountType === '自然人' && transaction.transferDirection === '境内' && isTransferType) {
      const check = this.currencyConverter.checkThreshold(
        transaction.amount,
        transaction.currency,
        thresholdConfig.naturalPersonDomesticCny,
        thresholdConfig.naturalPersonDomesticFcy,
        exchangeRateConfig,
      )
      if (!check.currencyConfigured && !isCashType) {
        warnings.push(`交易 ${transaction.transactionId} 币种 ${transaction.currency} 未在汇率配置中定义`)
      }
      if (check.reached) {
        results.push({
          transactionId: transaction.transactionId,
          triggeredThresholdType: '自然人境内划转',
          policyBasisClause: '第五条第三款',
        })
      }
    }

    if (transaction.accountType === '自然人' && transaction.transferDirection === '跨境' && isTransferType) {
      const check = this.currencyConverter.checkThreshold(
        transaction.amount,
        transaction.currency,
        thresholdConfig.naturalPersonCrossBorderCny,
        thresholdConfig.naturalPersonCrossBorderFcy,
        exchangeRateConfig,
      )
      if (!check.currencyConfigured && !isCashType) {
        warnings.push(`交易 ${transaction.transactionId} 币种 ${transaction.currency} 未在汇率配置中定义`)
      }
      if (check.reached) {
        results.push({
          transactionId: transaction.transactionId,
          triggeredThresholdType: '自然人跨境划转',
          policyBasisClause: '第五条第四款',
        })
      }
    }

    const reportable = this.multiStandardSplitter.split(transaction.transactionId, results)
    return { reportable, warnings }
  }

  evaluateBatch(
    transactions: Transaction[],
    thresholdConfig: ThresholdConfig,
    exchangeRateConfig: ExchangeRateConfig,
  ): ThresholdEngineResult {
    const allReportable: ReportableTransaction[] = []
    const allWarnings: string[] = []

    for (const transaction of transactions) {
      const { reportable, warnings } = this.evaluate(transaction, thresholdConfig, exchangeRateConfig)
      allReportable.push(...reportable)
      allWarnings.push(...warnings)
    }

    return { reportable: allReportable, warnings: allWarnings }
  }
}
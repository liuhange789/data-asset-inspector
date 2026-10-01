import { describe, it, expect } from 'vitest'
import { ThresholdEngine } from '../src/threshold-engine.js'
import {
  defaultThresholdConfig,
  defaultExchangeRateConfig,
} from '../src/default-threshold-config.js'
import type { Transaction, ThresholdConfig } from '../src/types.js'

describe('ThresholdEngine', () => {
  const engine = new ThresholdEngine()
  const thresholdConfig = defaultThresholdConfig
  const exchangeRateConfig = defaultExchangeRateConfig

  it('现金类交易 50001 元标记为应报（第五条第一款）', () => {
    const tx: Transaction = {
      transactionId: 'TX-CASH-001',
      amount: 50001,
      currency: 'CNY',
      accountType: '自然人',
      transactionType: '现金缴存',
      transactionDate: '2026-09-01',
    }
    const { reportable } = engine.evaluate(tx, thresholdConfig, exchangeRateConfig)
    expect(reportable.length).toBe(1)
    expect(reportable[0]?.triggeredThresholdType).toBe('现金类')
    expect(reportable[0]?.policyBasis).toContain('第五条第一款')
  })

  it('现金类交易 49999 元不标记为应报', () => {
    const tx: Transaction = {
      transactionId: 'TX-CASH-002',
      amount: 49999,
      currency: 'CNY',
      accountType: '自然人',
      transactionType: '现金缴存',
      transactionDate: '2026-09-01',
    }
    const { reportable } = engine.evaluate(tx, thresholdConfig, exchangeRateConfig)
    expect(reportable.length).toBe(0)
  })

  it('非自然人账户划转 200 万元标记为应报（第五条第二款）', () => {
    const tx: Transaction = {
      transactionId: 'TX-NNP-001',
      amount: 2000000,
      currency: 'CNY',
      accountType: '非自然人',
      transactionType: '账户划转',
      transactionDate: '2026-09-01',
    }
    const { reportable } = engine.evaluate(tx, thresholdConfig, exchangeRateConfig)
    expect(reportable.length).toBe(1)
    expect(reportable[0]?.triggeredThresholdType).toBe('非自然人账户划转')
    expect(reportable[0]?.policyBasis).toContain('第五条第二款')
  })

  it('自然人境内划转 50 万元标记为应报（第五条第三款）', () => {
    const tx: Transaction = {
      transactionId: 'TX-NPD-001',
      amount: 500000,
      currency: 'CNY',
      accountType: '自然人',
      transactionType: '账户划转',
      transactionDate: '2026-09-01',
      transferDirection: '境内',
    }
    const { reportable } = engine.evaluate(tx, thresholdConfig, exchangeRateConfig)
    expect(reportable.length).toBe(1)
    expect(reportable[0]?.triggeredThresholdType).toBe('自然人境内划转')
    expect(reportable[0]?.policyBasis).toContain('第五条第三款')
  })

  it('自然人跨境划转 20 万元标记为应报（第五条第四款）', () => {
    const tx: Transaction = {
      transactionId: 'TX-NPC-001',
      amount: 200000,
      currency: 'CNY',
      accountType: '自然人',
      transactionType: '账户划转',
      transactionDate: '2026-09-01',
      transferDirection: '跨境',
    }
    const { reportable } = engine.evaluate(tx, thresholdConfig, exchangeRateConfig)
    expect(reportable.length).toBe(1)
    expect(reportable[0]?.triggeredThresholdType).toBe('自然人跨境划转')
    expect(reportable[0]?.policyBasis).toContain('第五条第四款')
  })

  it('多标准同时触发生成两条独立记录', () => {
    const customConfig: ThresholdConfig = {
      ...defaultThresholdConfig,
      transferTransactionTypes: ['现金缴存', '账户划转', '银行转账', '款项划转'],
    }
    const tx: Transaction = {
      transactionId: 'TX-MULTI-001',
      amount: 3000000,
      currency: 'CNY',
      accountType: '非自然人',
      transactionType: '现金缴存',
      transactionDate: '2026-09-01',
    }
    const { reportable } = engine.evaluate(tx, customConfig, exchangeRateConfig)
    expect(reportable.length).toBe(2)
    const types = reportable.map((r) => r.triggeredThresholdType)
    expect(types).toContain('现金类')
    expect(types).toContain('非自然人账户划转')
    const clauses = reportable.map((r) => r.policyBasis)
    expect(clauses.some((c) => c.includes('第五条第一款'))).toBe(true)
    expect(clauses.some((c) => c.includes('第五条第二款'))).toBe(true)
  })

  it('外币交易按汇率折算达到阈值标记为应报', () => {
    const tx: Transaction = {
      transactionId: 'TX-FCY-001',
      amount: 10001,
      currency: 'USD',
      accountType: '自然人',
      transactionType: '现金缴存',
      transactionDate: '2026-09-01',
    }
    const { reportable } = engine.evaluate(tx, thresholdConfig, exchangeRateConfig)
    expect(reportable.length).toBe(1)
    expect(reportable[0]?.triggeredThresholdType).toBe('现金类')
  })

  it('配置化阈值验证 - 修改配置后按新阈值判定', () => {
    const customConfig: ThresholdConfig = {
      ...defaultThresholdConfig,
      cashThresholdCny: 60000,
    }
    const tx: Transaction = {
      transactionId: 'TX-CFG-001',
      amount: 55000,
      currency: 'CNY',
      accountType: '自然人',
      transactionType: '现金缴存',
      transactionDate: '2026-09-01',
    }
    const { reportable: reportableDefault } = engine.evaluate(tx, thresholdConfig, exchangeRateConfig)
    const { reportable: reportableCustom } = engine.evaluate(tx, customConfig, exchangeRateConfig)
    expect(reportableDefault.length).toBe(1)
    expect(reportableCustom.length).toBe(0)
  })

  it('未达任何阈值返回空数组', () => {
    const tx: Transaction = {
      transactionId: 'TX-NONE-001',
      amount: 100,
      currency: 'CNY',
      accountType: '自然人',
      transactionType: '其他',
      transactionDate: '2026-09-01',
    }
    const { reportable } = engine.evaluate(tx, thresholdConfig, exchangeRateConfig)
    expect(reportable.length).toBe(0)
  })

  it('policyBasis 格式包含法规全称', () => {
    const tx: Transaction = {
      transactionId: 'TX-PB-001',
      amount: 50001,
      currency: 'CNY',
      accountType: '自然人',
      transactionType: '现金缴存',
      transactionDate: '2026-09-01',
    }
    const { reportable } = engine.evaluate(tx, thresholdConfig, exchangeRateConfig)
    expect(reportable[0]?.policyBasis).toContain('《金融机构大额交易和可疑交易报告管理办法》')
    expect(reportable[0]?.policyBasis).toContain('中国人民银行令〔2016〕第3号')
  })

  it('判定状态默认为自动判定', () => {
    const tx: Transaction = {
      transactionId: 'TX-STATUS-001',
      amount: 50001,
      currency: 'CNY',
      accountType: '自然人',
      transactionType: '现金缴存',
      transactionDate: '2026-09-01',
    }
    const { reportable } = engine.evaluate(tx, thresholdConfig, exchangeRateConfig)
    expect(reportable[0]?.judgmentStatus).toBe('自动判定')
  })
})
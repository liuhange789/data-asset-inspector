import { describe, it, expect } from 'vitest'
import { ExemptionFilter } from '../src/exemption-filter.js'
import { defaultExemptionConfig } from '../src/default-threshold-config.js'
import type {
  ReportableTransaction,
  Transaction,
  ExemptionConfig,
} from '../src/types.js'

describe('ExemptionFilter', () => {
  const filter = new ExemptionFilter()
  const exemptionConfig = defaultExemptionConfig

  const createReportable = (transactionId: string): ReportableTransaction => ({
    transactionId,
    triggeredThresholdType: '现金类',
    policyBasis: '依据：《金融机构大额交易和可疑交易报告管理办法》（中国人民银行令〔2016〕第3号）第五条第一款',
    judgmentStatus: '自动判定',
  })

  it('定期存款续存豁免（第七条第一项）', () => {
    const tx: Transaction = {
      transactionId: 'TX-EXEMPT-001',
      amount: 60000,
      currency: 'CNY',
      accountType: '自然人',
      transactionType: '定期存款续存',
      transactionDate: '2026-09-01',
    }
    const transactionMap = new Map([['TX-EXEMPT-001', tx]])
    const candidates = [createReportable('TX-EXEMPT-001')]
    const { exempted, remaining } = filter.filter(candidates, transactionMap, exemptionConfig)
    expect(exempted.length).toBe(1)
    expect(exempted[0]?.exemptionReason).toBe('定期存款续存')
    expect(exempted[0]?.policyBasis).toContain('第七条第一项')
    expect(remaining.length).toBe(0)
  })

  it('同业拆借豁免', () => {
    const tx: Transaction = {
      transactionId: 'TX-EXEMPT-002',
      amount: 5000000,
      currency: 'CNY',
      accountType: '非自然人',
      transactionType: '同业拆借',
      transactionDate: '2026-09-01',
      counterpartyType: '金融机构',
    }
    const transactionMap = new Map([['TX-EXEMPT-002', tx]])
    const candidates = [createReportable('TX-EXEMPT-002')]
    const { exempted } = filter.filter(candidates, transactionMap, exemptionConfig)
    expect(exempted.length).toBe(1)
    expect(exempted[0]?.exemptionReason).toBe('同业拆借')
  })

  it('政府机关交易豁免', () => {
    const tx: Transaction = {
      transactionId: 'TX-EXEMPT-003',
      amount: 5000000,
      currency: 'CNY',
      accountType: '非自然人',
      transactionType: '账户划转',
      transactionDate: '2026-09-01',
      counterpartyType: '政府机关',
    }
    const transactionMap = new Map([['TX-EXEMPT-003', tx]])
    const candidates = [createReportable('TX-EXEMPT-003')]
    const { exempted } = filter.filter(candidates, transactionMap, exemptionConfig)
    expect(exempted.length).toBe(1)
    expect(exempted[0]?.exemptionReason).toBe('政府机关交易')
  })

  it('黄金交易所交易豁免', () => {
    const tx: Transaction = {
      transactionId: 'TX-EXEMPT-004',
      amount: 5000000,
      currency: 'CNY',
      accountType: '非自然人',
      transactionType: '黄金交易',
      transactionDate: '2026-09-01',
      counterpartyType: '上海黄金交易所',
    }
    const transactionMap = new Map([['TX-EXEMPT-004', tx]])
    const candidates = [createReportable('TX-EXEMPT-004')]
    const { exempted } = filter.filter(candidates, transactionMap, exemptionConfig)
    expect(exempted.length).toBe(1)
    expect(exempted[0]?.exemptionReason).toBe('黄金交易所交易')
  })

  it('豁免规则启停开关 - 禁用后不豁免', () => {
    const customConfig: ExemptionConfig = {
      ...exemptionConfig,
      rules: exemptionConfig.rules.map((r) =>
        r.ruleId === 'EXEMPT-001' ? { ...r, enabled: false } : r,
      ),
    }
    const tx: Transaction = {
      transactionId: 'TX-EXEMPT-005',
      amount: 60000,
      currency: 'CNY',
      accountType: '自然人',
      transactionType: '定期存款续存',
      transactionDate: '2026-09-01',
    }
    const transactionMap = new Map([['TX-EXEMPT-005', tx]])
    const candidates = [createReportable('TX-EXEMPT-005')]
    const { exempted, remaining } = filter.filter(candidates, transactionMap, customConfig)
    expect(exempted.length).toBe(0)
    expect(remaining.length).toBe(1)
  })

  it('配置缺失时所有候选不豁免', () => {
    const tx: Transaction = {
      transactionId: 'TX-EXEMPT-006',
      amount: 60000,
      currency: 'CNY',
      accountType: '自然人',
      transactionType: '定期存款续存',
      transactionDate: '2026-09-01',
    }
    const transactionMap = new Map([['TX-EXEMPT-006', tx]])
    const candidates = [createReportable('TX-EXEMPT-006')]
    const { exempted, remaining } = filter.filter(candidates, transactionMap, null)
    expect(exempted.length).toBe(0)
    expect(remaining.length).toBe(1)
  })

  it('AND 语义条件匹配 - counterpartyType 不匹配时不豁免', () => {
    const tx: Transaction = {
      transactionId: 'TX-EXEMPT-007',
      amount: 5000000,
      currency: 'CNY',
      accountType: '非自然人',
      transactionType: '同业拆借',
      transactionDate: '2026-09-01',
      counterpartyType: '企业',
    }
    const transactionMap = new Map([['TX-EXEMPT-007', tx]])
    const candidates = [createReportable('TX-EXEMPT-007')]
    const { exempted, remaining } = filter.filter(candidates, transactionMap, exemptionConfig)
    expect(exempted.length).toBe(0)
    expect(remaining.length).toBe(1)
  })

  it('未命中任何豁免规则的交易保留在应报清单', () => {
    const tx: Transaction = {
      transactionId: 'TX-EXEMPT-008',
      amount: 60000,
      currency: 'CNY',
      accountType: '自然人',
      transactionType: '现金缴存',
      transactionDate: '2026-09-01',
    }
    const transactionMap = new Map([['TX-EXEMPT-008', tx]])
    const candidates = [createReportable('TX-EXEMPT-008')]
    const { exempted, remaining } = filter.filter(candidates, transactionMap, exemptionConfig)
    expect(exempted.length).toBe(0)
    expect(remaining.length).toBe(1)
  })

  it('豁免判定状态为自动判定', () => {
    const tx: Transaction = {
      transactionId: 'TX-EXEMPT-009',
      amount: 60000,
      currency: 'CNY',
      accountType: '自然人',
      transactionType: '定期存款续存',
      transactionDate: '2026-09-01',
    }
    const transactionMap = new Map([['TX-EXEMPT-009', tx]])
    const candidates = [createReportable('TX-EXEMPT-009')]
    const { exempted } = filter.filter(candidates, transactionMap, exemptionConfig)
    expect(exempted[0]?.judgmentStatus).toBe('自动判定')
  })
})
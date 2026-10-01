import { describe, it, expect } from 'vitest'
import { InputValidator } from '../src/input-validator.js'
import type { Transaction } from '../src/types.js'

describe('InputValidator', () => {
  const validator = new InputValidator()

  it('校验有效交易数据通过', () => {
    const raw = {
      transactionId: 'TX-001',
      amount: 50000,
      currency: 'CNY',
      accountType: '自然人',
      transactionType: '现金缴存',
      transactionDate: '2026-09-01',
    }
    const { transaction, error } = validator.validate(raw)
    expect(error).toBeNull()
    expect(transaction).not.toBeNull()
    expect(transaction?.transactionId).toBe('TX-001')
  })

  it('必填字段缺失时返回错误', () => {
    const raw = {
      transactionId: 'TX-002',
      amount: 50000,
    }
    const { transaction, error } = validator.validate(raw)
    expect(transaction).toBeNull()
    expect(error).not.toBeNull()
    expect(error?.missingFields).toContain('currency')
    expect(error?.missingFields).toContain('accountType')
    expect(error?.missingFields).toContain('transactionType')
    expect(error?.missingFields).toContain('transactionDate')
  })

  it('amount 小于等于 0 时返回错误', () => {
    const raw = {
      transactionId: 'TX-003',
      amount: 0,
      currency: 'CNY',
      accountType: '自然人',
      transactionType: '现金缴存',
      transactionDate: '2026-09-01',
    }
    const { transaction, error } = validator.validate(raw)
    expect(transaction).toBeNull()
    expect(error?.missingFields).toContain('amount')
  })

  it('currency 不符合 ISO 4217 时返回错误', () => {
    const raw = {
      transactionId: 'TX-004',
      amount: 50000,
      currency: 'cny',
      accountType: '自然人',
      transactionType: '现金缴存',
      transactionDate: '2026-09-01',
    }
    const { transaction, error } = validator.validate(raw)
    expect(transaction).toBeNull()
    expect(error?.missingFields).toContain('currency')
  })

  it('accountType 取值不合法时返回错误', () => {
    const raw = {
      transactionId: 'TX-005',
      amount: 50000,
      currency: 'CNY',
      accountType: '其他',
      transactionType: '现金缴存',
      transactionDate: '2026-09-01',
    }
    const { transaction, error } = validator.validate(raw)
    expect(transaction).toBeNull()
    expect(error?.missingFields).toContain('accountType')
  })

  it('null 输入不崩溃并返回错误', () => {
    const { transaction, error } = validator.validate(null)
    expect(transaction).toBeNull()
    expect(error).not.toBeNull()
    expect(error?.transactionId).toBe('unknown')
  })

  it('undefined 输入不崩溃并返回错误', () => {
    const { transaction, error } = validator.validate(undefined)
    expect(transaction).toBeNull()
    expect(error).not.toBeNull()
  })

  it('validateBatch 批量校验分离有效与无效交易', () => {
    const rawBatch = [
      {
        transactionId: 'TX-VALID-1',
        amount: 50000,
        currency: 'CNY',
        accountType: '自然人',
        transactionType: '现金缴存',
        transactionDate: '2026-09-01',
      },
      {
        transactionId: 'TX-INVALID-1',
        amount: 50000,
      },
      null,
    ]
    const { validTransactions, errors } = validator.validateBatch(rawBatch)
    expect(validTransactions.length).toBe(1)
    expect(errors.length).toBe(2)
    expect(validTransactions[0]?.transactionId).toBe('TX-VALID-1')
  })

  it('validateBatch null 输入返回空数组', () => {
    const { validTransactions, errors } = validator.validateBatch(null)
    expect(validTransactions.length).toBe(0)
    expect(errors.length).toBe(0)
  })

  it('transferDirection 取值不合法时返回错误', () => {
    const raw = {
      transactionId: 'TX-006',
      amount: 50000,
      currency: 'CNY',
      accountType: '自然人',
      transactionType: '账户划转',
      transactionDate: '2026-09-01',
      transferDirection: '其他',
    }
    const { transaction, error } = validator.validate(raw)
    expect(transaction).toBeNull()
    expect(error).not.toBeNull()
  })

  it('可选字段正确时通过校验', () => {
    const raw = {
      transactionId: 'TX-007',
      amount: 500000,
      currency: 'CNY',
      accountType: '自然人',
      transactionType: '账户划转',
      transactionDate: '2026-09-01',
      transferDirection: '境内',
      counterpartyType: '金融机构',
    }
    const { transaction, error } = validator.validate(raw)
    expect(error).toBeNull()
    expect(transaction?.transferDirection).toBe('境内')
    expect(transaction?.counterpartyType).toBe('金融机构')
  })
})
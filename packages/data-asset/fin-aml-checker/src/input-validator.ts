import type { Transaction, ValidationError, AccountType, TransferDirection } from './types.js'

const ISO_4217_REGEX = /^[A-Z]{3}$/
const VALID_ACCOUNT_TYPES: AccountType[] = ['自然人', '非自然人']
const VALID_TRANSFER_DIRECTIONS: TransferDirection[] = ['境内', '跨境']
const REQUIRED_FIELDS = [
  'transactionId',
  'amount',
  'currency',
  'accountType',
  'transactionType',
  'transactionDate',
] as const

export class InputValidator {
  validate(raw: unknown): { transaction: Transaction | null; error: ValidationError | null } {
    if (raw === null || raw === undefined) {
      return {
        transaction: null,
        error: {
          transactionId: 'unknown',
          missingFields: [...REQUIRED_FIELDS],
          errorMessage: '交易数据为 null 或 undefined',
        },
      }
    }

    if (typeof raw !== 'object' || Array.isArray(raw)) {
      return {
        transaction: null,
        error: {
          transactionId: 'unknown',
          missingFields: [...REQUIRED_FIELDS],
          errorMessage: '交易数据不是有效对象',
        },
      }
    }

    const obj = raw as Record<string, unknown>
    const missingFields: string[] = []
    const errors: string[] = []

    for (const field of REQUIRED_FIELDS) {
      const value = obj[field]
      if (value === null || value === undefined || value === '') {
        missingFields.push(field)
      }
    }

    if (typeof obj.transactionId === 'string' && obj.transactionId !== '') {
      if (typeof obj.amount !== 'number' || (obj.amount as number) <= 0) {
        errors.push('amount 必须为大于 0 的数值')
        if (!missingFields.includes('amount')) missingFields.push('amount')
      }
      if (typeof obj.currency !== 'string' || !ISO_4217_REGEX.test(obj.currency as string)) {
        errors.push('currency 须符合 ISO 4217 三位大写字母代码')
        if (!missingFields.includes('currency')) missingFields.push('currency')
      }
      if (typeof obj.accountType !== 'string' || !VALID_ACCOUNT_TYPES.includes(obj.accountType as AccountType)) {
        errors.push('accountType 取值须为 自然人 或 非自然人')
        if (!missingFields.includes('accountType')) missingFields.push('accountType')
      }
      if (typeof obj.transactionDate !== 'string' || !this.isValidDateNotFuture(obj.transactionDate as string)) {
        errors.push('transactionDate 不得晚于当前日期')
        if (!missingFields.includes('transactionDate')) missingFields.push('transactionDate')
      }
      if (
        obj.transferDirection !== undefined &&
        obj.transferDirection !== null &&
        (typeof obj.transferDirection !== 'string' || !VALID_TRANSFER_DIRECTIONS.includes(obj.transferDirection as TransferDirection))
      ) {
        errors.push('transferDirection 取值须为 境内 或 跨境')
      }
    }

    if (missingFields.length > 0 || errors.length > 0) {
      return {
        transaction: null,
        error: {
          transactionId: typeof obj.transactionId === 'string' && obj.transactionId !== '' ? obj.transactionId : 'unknown',
          missingFields,
          errorMessage: errors.length > 0 ? errors.join('; ') : '必填字段缺失',
        },
      }
    }

    const transaction: Transaction = {
      transactionId: obj.transactionId as string,
      amount: obj.amount as number,
      currency: obj.currency as string,
      accountType: obj.accountType as AccountType,
      transactionType: obj.transactionType as string,
      transactionDate: obj.transactionDate as string,
    }

    if (obj.transferDirection !== undefined && obj.transferDirection !== null) {
      transaction.transferDirection = obj.transferDirection as TransferDirection
    }
    if (obj.counterpartyType !== undefined && obj.counterpartyType !== null) {
      transaction.counterpartyType = obj.counterpartyType as string
    }

    return { transaction, error: null }
  }

  validateBatch(rawTransactions: unknown): { validTransactions: Transaction[]; errors: ValidationError[] } {
    const validTransactions: Transaction[] = []
    const errors: ValidationError[] = []

    if (rawTransactions === null || rawTransactions === undefined) {
      return { validTransactions, errors }
    }

    if (!Array.isArray(rawTransactions)) {
      return { validTransactions, errors }
    }

    for (const raw of rawTransactions) {
      const { transaction, error } = this.validate(raw)
      if (transaction !== null) {
        validTransactions.push(transaction)
      } else if (error !== null) {
        errors.push(error)
      }
    }

    return { validTransactions, errors }
  }

  private isValidDateNotFuture(dateStr: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
    const date = new Date(dateStr + 'T00:00:00Z')
    if (Number.isNaN(date.getTime())) return false
    const today = new Date()
    const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
    return date.getTime() <= todayUtc.getTime()
  }
}
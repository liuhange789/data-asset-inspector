import { describe, it, expect } from 'vitest'
import { ReportDesensitizer } from '../src/report-desensitizer.js'

describe('ReportDesensitizer', () => {
  it('敏感字段脱敏为 ***', () => {
    const desensitizer = new ReportDesensitizer()
    const record = {
      transactionId: 'TX-001',
      accountHolderName: '张三',
      idCardNumber: '110101199001011234',
      amount: 50000,
    }
    const result = desensitizer.desensitize(record)
    expect(result.accountHolderName).toBe('***')
    expect(result.idCardNumber).toBe('***')
    expect(result.transactionId).toBe('TX-001')
    expect(result.amount).toBe(50000)
  })

  it('非敏感字段保持原值', () => {
    const desensitizer = new ReportDesensitizer()
    const record = {
      transactionId: 'TX-002',
      amount: 50000,
      currency: 'CNY',
    }
    const result = desensitizer.desensitize(record)
    expect(result.transactionId).toBe('TX-002')
    expect(result.amount).toBe(50000)
    expect(result.currency).toBe('CNY')
  })

  it('批量脱敏处理', () => {
    const desensitizer = new ReportDesensitizer()
    const records = [
      { transactionId: 'TX-003', accountHolderName: '李四' },
      { transactionId: 'TX-004', idCardNumber: '110101199001011235' },
    ]
    const results = desensitizer.desensitizeBatch(records)
    expect(results[0]?.accountHolderName).toBe('***')
    expect(results[1]?.idCardNumber).toBe('***')
  })

  it('自定义敏感字段配置', () => {
    const desensitizer = new ReportDesensitizer({
      sensitiveFields: ['customField'],
      replacement: '[REDACTED]',
    })
    const record = { transactionId: 'TX-005', customField: 'secret' }
    const result = desensitizer.desensitize(record)
    expect(result.customField).toBe('[REDACTED]')
  })

  it('报告级别脱敏处理', () => {
    const desensitizer = new ReportDesensitizer()
    const report = {
      reportId: 'RPT-001',
      reportableList: [
        { transactionId: 'TX-006', accountHolderName: '王五' },
      ],
      accountHolderName: '赵六',
    }
    const result = desensitizer.desensitizeReport(report)
    expect(result.accountHolderName).toBe('***')
    const list = result.reportableList as Array<Record<string, unknown>>
    expect(list[0]?.accountHolderName).toBe('***')
    expect(list[0]?.transactionId).toBe('TX-006')
  })

  it('中文字段名脱敏', () => {
    const desensitizer = new ReportDesensitizer()
    const record = {
      transactionId: 'TX-007',
      '账户持有人姓名': '钱七',
      '身份证号': '123456',
    }
    const result = desensitizer.desensitize(record)
    expect(result['账户持有人姓名']).toBe('***')
    expect(result['身份证号']).toBe('***')
  })

  it('null 配置使用默认脱敏规则', () => {
    const desensitizer = new ReportDesensitizer(null)
    const record = { transactionId: 'TX-008', accountHolderName: '孙八' }
    const result = desensitizer.desensitize(record)
    expect(result.accountHolderName).toBe('***')
  })
})
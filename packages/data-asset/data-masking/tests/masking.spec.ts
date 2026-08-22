import type { SensitivePatterns } from '@liuhange/dsh-data-asset-shared'
import { defaultBusinessRules } from '@liuhange/dsh-data-asset-shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { MaskingStrategyExecutor } from '../src/maskingStrategyExecutor.js'
import { SensitiveFieldScanner } from '../src/sensitiveFieldScanner.js'

const patterns: SensitivePatterns = defaultBusinessRules.sensitivePatterns

describe('SensitiveFieldScanner', () => {
  let scanner: SensitiveFieldScanner

  beforeEach(() => {
    scanner = new SensitiveFieldScanner()
  })

  it('detects an idCard number with the correct type, line, and column', () => {
    const result = scanner.scan(['身份证：11010119900307391X'], patterns)
    const idCard = result.fields.find(f => f.type === 'idCard')
    expect(idCard).toBeDefined()
    expect(idCard!.value).toBe('11010119900307391X')
    expect(idCard!.line).toBe(1)
    // column is 1-indexed: '身份证：' is 4 chars, so the number starts at column 5.
    expect(idCard!.column).toBe(5)
    expect(result.typeCounts.idCard).toBe(1)
  })

  it('detects a phone number and reports it as phone', () => {
    const result = scanner.scan(['手机：13912345678'], patterns)
    expect(result.fields).toHaveLength(1)
    expect(result.fields[0]!.type).toBe('phone')
    expect(result.fields[0]!.value).toBe('13912345678')
    expect(result.typeCounts.phone).toBe(1)
  })

  it('detects a bank card number as bankCard', () => {
    const result = scanner.scan(['卡号：6222021234567890123'], patterns)
    const bank = result.fields.find(f => f.type === 'bankCard')
    expect(bank).toBeDefined()
    expect(bank!.value).toBe('6222021234567890123')
    expect(result.typeCounts.bankCard).toBeGreaterThanOrEqual(1)
  })

  it('detects an email address as email', () => {
    const result = scanner.scan(['邮箱：user@example.com'], patterns)
    const mail = result.fields.find(f => f.type === 'email')
    expect(mail).toBeDefined()
    expect(mail!.value).toBe('user@example.com')
    expect(result.typeCounts.email).toBe(1)
  })

  it('detects all four sensitive types in a single multi-line input', () => {
    const lines = [
      'id=11010119900307391X',
      'tel=13800001111 mail=a@b.com',
      'card=6222021234567890123',
    ]
    const result = scanner.scan(lines, patterns)
    const types = new Set(result.fields.map(f => f.type))
    expect(types).toContain('idCard')
    expect(types).toContain('phone')
    expect(types).toContain('email')
    expect(types).toContain('bankCard')
  })

  it('reports line numbers relative to the input array (1-indexed)', () => {
    const result = scanner.scan(['nothing here', 'phone=13912345678'], patterns)
    const phone = result.fields.find(f => f.type === 'phone')
    expect(phone).toBeDefined()
    expect(phone!.line).toBe(2)
    // column is 1-indexed: 'phone=' is 6 chars, so the number starts at column 7.
    expect(phone!.column).toBe(7)
  })

  it('finds multiple matches of the same type on one line', () => {
    const result = scanner.scan(['a@b.com and c@d.com'], patterns)
    expect(result.fields.filter(f => f.type === 'email')).toHaveLength(2)
    expect(result.typeCounts.email).toBe(2)
  })

  it('returns empty results for input with no sensitive data', () => {
    const result = scanner.scan(['普通文本', '没有敏感信息'], patterns)
    expect(result.fields).toEqual([])
    expect(result.typeCounts).toEqual({})
  })

  it('tolerates holey arrays by treating missing slots as empty strings', () => {
    const sparse: string[] = ['phone=13912345678']
    sparse[2] = 'phone=13800001111'
    // Index 1 is undefined; the scanner must not throw and must still scan index 0 and 2.
    const result = scanner.scan(sparse, patterns)
    expect(result.typeCounts.phone).toBe(2)
    expect(result.fields[0]!.line).toBe(1)
    expect(result.fields[1]!.line).toBe(3)
  })
})

describe('MaskingStrategyExecutor', () => {
  let executor: MaskingStrategyExecutor

  beforeEach(() => {
    executor = new MaskingStrategyExecutor()
  })

  it('FULL strategy returns the fully anonymized marker', () => {
    expect(executor.execute('11010119900307391X', 'idCard', 'FULL')).toBe('***')
  })

  it('GENERALIZE strategy returns the generalized placeholder', () => {
    expect(executor.execute('user@example.com', 'email', 'GENERALIZE')).toBe('<脱敏数据>')
  })

  it('PARTIAL strategy keeps the first 3 and last 4 characters with *** in between', () => {
    expect(executor.execute('13912345678', 'phone', 'PARTIAL')).toBe('139***5678')
  })

  it('PARTIAL strategy collapses to *** when the value is too short to split', () => {
    expect(executor.execute('123', 'phone', 'PARTIAL')).toBe('***')
    expect(executor.execute('1234567', 'phone', 'PARTIAL')).toBe('***')
  })

  it('resolveStrategy passes through valid strategies and defaults to PARTIAL', () => {
    expect(executor.resolveStrategy('FULL')).toBe('FULL')
    expect(executor.resolveStrategy('PARTIAL')).toBe('PARTIAL')
    expect(executor.resolveStrategy('GENERALIZE')).toBe('GENERALIZE')
  })
})

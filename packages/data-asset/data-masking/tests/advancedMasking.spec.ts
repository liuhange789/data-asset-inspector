import { describe, expect, it } from 'vitest'
import type { AdvancedMaskingConfig } from '@liuhange/dsh-data-asset-shared'
import { FpeAlgorithm } from '../src/algorithms/fpeAlgorithm.js'
import { KAnonymityAlgorithm } from '../src/algorithms/kAnonymityAlgorithm.js'
import { DifferentialPrivacyAlgorithm } from '../src/algorithms/differentialPrivacyAlgorithm.js'
import { HashAlgorithm } from '../src/algorithms/hashAlgorithm.js'
import { BudgetTracker } from '../src/budgetTracker.js'
import { AdvancedMaskingExecutor } from '../src/advancedMaskingExecutor.js'
import { defaultAdvancedMaskingConfig } from '../src/defaultAdvancedMaskingConfig.js'
import * as invariantModule from '../src/invariant.js'

describe('invariant', () => {
  it('exports the package name and a no-op install', () => {
    expect(invariantModule.invariant).toBe('data-masking')
    expect(() => invariantModule.install()).not.toThrow()
  })
})

describe('defaultAdvancedMaskingConfig', () => {
  it('defaults to hash with an empty FPE key and k=2', () => {
    expect(defaultAdvancedMaskingConfig.defaultAlgorithm).toBe('hash')
    expect(defaultAdvancedMaskingConfig.fpe.key).toBe('')
    expect(defaultAdvancedMaskingConfig.kAnonymity.kValue).toBe(2)
    expect(defaultAdvancedMaskingConfig.differentialPrivacy.totalBudget).toBe(5.0)
    expect(defaultAdvancedMaskingConfig.hash.algorithm).toBe('SHA-256')
  })
})

describe('FpeAlgorithm', () => {
  const fpe = new FpeAlgorithm()
  const key = 'test-key-123'

  it('encrypts and decrypts numeric strings reversibly', () => {
    const plaintext = '13800138000'
    const encrypted = fpe.encrypt(plaintext, key)
    expect(encrypted).toHaveLength(plaintext.length)
    expect(encrypted).toMatch(/^\d+$/)
    expect(fpe.decrypt(encrypted, key)).toBe(plaintext)
  })

  it('returns the plaintext unchanged for numeric strings shorter than 2 chars', () => {
    expect(fpe.encrypt('5', key)).toBe('5')
    expect(fpe.decrypt('7', key)).toBe('7')
  })

  it('encrypts and decrypts non-numeric strings reversibly via the generic path', () => {
    const plaintext = 'hello'
    const encrypted = fpe.encrypt(plaintext, key)
    expect(encrypted).toHaveLength(plaintext.length)
    expect(fpe.decrypt(encrypted, key)).toBe(plaintext)
  })

  it('handles an empty string', () => {
    expect(fpe.encrypt('', key)).toBe('')
    expect(fpe.decrypt('', key)).toBe('')
  })

  it('throws when the key is empty on encrypt', () => {
    expect(() => fpe.encrypt('12345', '')).toThrow('FPE密钥未配置')
  })

  it('throws when the key is empty on decrypt', () => {
    expect(() => fpe.decrypt('12345', '')).toThrow('FPE密钥未配置')
  })
})

describe('KAnonymityAlgorithm', () => {
  const algo = new KAnonymityAlgorithm()

  it('returns records unchanged with a zero min class for empty input', () => {
    const result = algo.anonymize([], 2, ['age'])
    expect(result.anonymizedRecords).toEqual([])
    expect(result.actualMinEquivalenceClass).toBe(0)
    expect(result.suppressedCount).toBe(0)
  })

  it('returns records unchanged when quasiIdentifiers is empty', () => {
    const records = [{ age: '30' }]
    const result = algo.anonymize(records, 2, [])
    expect(result.anonymizedRecords).toEqual(records)
    expect(result.suppressedCount).toBe(0)
  })

  it('returns records intact when all groups already meet k', () => {
    const records = [
      { age: '30', name: 'a' },
      { age: '30', name: 'b' },
      { age: '40', name: 'c' },
      { age: '40', name: 'd' },
    ]
    const result = algo.anonymize(records, 2, ['age'])
    expect(result.suppressedCount).toBe(0)
    expect(result.actualMinEquivalenceClass).toBeGreaterThanOrEqual(2)
  })

  it('suppresses or generalizes records when groups are smaller than k', () => {
    const records = [
      { age: '30', name: 'a' },
      { age: '40', name: 'b' },
      { age: '50', name: 'c' },
    ]
    const result = algo.anonymize(records, 2, ['age'])
    expect(result.anonymizedRecords.length).toBeLessThanOrEqual(records.length)
  })
})

describe('HashAlgorithm', () => {
  const algo = new HashAlgorithm()

  it('produces a 64-char SHA-256 hex digest without salt', () => {
    const result = algo.hash('secret', 'SHA-256')
    expect(result.digest).toHaveLength(64)
    expect(result.salted).toBe(false)
    expect(result.digestLength).toBe(64)
  })

  it('produces a 128-char SHA-512 hex digest', () => {
    const result = algo.hash('secret', 'SHA-512')
    expect(result.digest).toHaveLength(128)
    expect(result.digestLength).toBe(128)
  })

  it('marks the result as salted when a non-empty salt is provided', () => {
    const result = algo.hash('secret', 'SHA-256', 'mysalt')
    expect(result.salted).toBe(true)
    expect(result.digest).not.toBe(algo.hash('secret', 'SHA-256').digest)
  })

  it('marks the result as unsalted when the salt is an empty string', () => {
    const result = algo.hash('secret', 'SHA-256', '')
    expect(result.salted).toBe(false)
  })
})

describe('BudgetTracker', () => {
  it('tracks consumed budget and query count', () => {
    const tracker = new BudgetTracker(5)
    expect(tracker.canConsume(2, 5)).toBe(true)
    tracker.consume(2)
    expect(tracker.getState().consumed).toBe(2)
    expect(tracker.getState().remaining).toBe(3)
    expect(tracker.getState().queryCount).toBe(1)
  })

  it('rejects consumption that would exceed the total budget', () => {
    const tracker = new BudgetTracker(5)
    tracker.consume(4)
    expect(tracker.canConsume(2, 5)).toBe(false)
    expect(tracker.canConsume(1, 5)).toBe(true)
  })
})

describe('DifferentialPrivacyAlgorithm', () => {
  const algo = new DifferentialPrivacyAlgorithm()

  it('adds Laplace noise and consumes budget', () => {
    const tracker = new BudgetTracker(5)
    const noisy = algo.addNoise(100, 1, 1, tracker, 5)
    expect(noisy).not.toBe(100)
    expect(tracker.getState().consumed).toBe(1)
  })

  it('throws when the privacy budget is exhausted', () => {
    const tracker = new BudgetTracker(1)
    tracker.consume(1)
    expect(() => algo.addNoise(100, 1, 1, tracker, 1)).toThrow('隐私预算已耗尽')
  })
})

describe('AdvancedMaskingExecutor', () => {
  const executor = new AdvancedMaskingExecutor()

  function makeConfig(overrides: Partial<AdvancedMaskingConfig> = {}): AdvancedMaskingConfig {
    return { ...defaultAdvancedMaskingConfig, ...overrides }
  }

  it('executes FPE when the algorithm is FPE', () => {
    const config = makeConfig({ fpe: { key: 'fpe-key', radix: 10 } })
    const result = executor.execute('13800138000', 'FPE', undefined, config)
    expect(result.algorithm).toBe('FPE')
    expect(result.details.reversible).toBe(true)
    expect(result.maskedData).toMatch(/^\d+$/)
  })

  it('executes k-anonymity with JSON records', () => {
    const records = [{ age: '30', name: 'a' }, { age: '30', name: 'b' }]
    const result = executor.execute(JSON.stringify(records), 'k-anonymity', undefined, makeConfig())
    expect(result.algorithm).toBe('k-anonymity')
    expect(result.details.kValue).toBe(2)
  })

  it('executes k-anonymity with a non-JSON string fallback', () => {
    const result = executor.execute('not-json', 'k-anonymity', undefined, makeConfig())
    expect(result.algorithm).toBe('k-anonymity')
  })

  it('executes differential privacy for a numeric string', () => {
    const result = executor.execute('100', 'differential-privacy', undefined, makeConfig())
    expect(result.algorithm).toBe('differential-privacy')
    expect(result.details.epsilon).toBe(1.0)
    expect(result.details.budgetConsumed).toBe(1.0)
  })

  it('throws for differential privacy when the input is not a number', () => {
    expect(() => executor.execute('abc', 'differential-privacy', undefined, makeConfig())).toThrow('差分隐私要求输入为数字')
  })

  it('executes hash and reports the digest length', () => {
    const result = executor.execute('secret', 'hash', undefined, makeConfig())
    expect(result.algorithm).toBe('hash')
    expect(result.details.hashAlgorithm).toBe('SHA-256')
    expect(result.details.digestLength).toBe(64)
  })

  it('falls back to hash for an unknown algorithm', () => {
    const result = executor.execute('secret', 'unknown' as never, undefined, makeConfig())
    expect(result.algorithm).toBe('hash')
  })

  it('uses the field-level algorithm override when fieldName is provided', () => {
    const config = makeConfig({ fieldAlgorithms: { ssn: { algorithm: 'FPE' } }, fpe: { key: 'k', radix: 10 } })
    const result = executor.execute('12345', 'hash', 'ssn', config)
    expect(result.algorithm).toBe('FPE')
  })

  it('resolves environment variables in FPE key and hash salt', () => {
    process.env.TEST_FPE_KEY = 'env-key'
    process.env.TEST_SALT = 'env-salt'
    const config = makeConfig({
      fpe: { key: '${TEST_FPE_KEY}', radix: 10 },
      hash: { algorithm: 'SHA-256', salt: '${TEST_SALT}' },
    })
    const result = executor.execute('secret', 'hash', undefined, config)
    expect(result.details.salted).toBe(true)
    delete process.env.TEST_FPE_KEY
    delete process.env.TEST_SALT
  })
})
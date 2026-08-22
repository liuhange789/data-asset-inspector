import type { AdvancedMaskingConfig } from '@liuhange/dsh-data-asset-shared'
import type { AdvancedMaskingResult, AdvancedMaskingAlgorithm, AlgorithmDetails } from './algorithms/types.js'
import { FpeAlgorithm } from './algorithms/fpeAlgorithm.js'
import { KAnonymityAlgorithm } from './algorithms/kAnonymityAlgorithm.js'
import { DifferentialPrivacyAlgorithm } from './algorithms/differentialPrivacyAlgorithm.js'
import { HashAlgorithm } from './algorithms/hashAlgorithm.js'
import { BudgetTracker } from './budgetTracker.js'

export class AdvancedMaskingExecutor {
  private fpeAlgorithm = new FpeAlgorithm()
  private kAnonymityAlgorithm = new KAnonymityAlgorithm()
  private differentialPrivacyAlgorithm = new DifferentialPrivacyAlgorithm()
  private hashAlgorithm = new HashAlgorithm()

  execute(
    data: string,
    algorithm: AdvancedMaskingAlgorithm,
    fieldName: string | undefined,
    config: AdvancedMaskingConfig,
  ): AdvancedMaskingResult {
    const fieldConfig = fieldName ? config.fieldAlgorithms[fieldName] : undefined
    const resolvedAlgorithm = fieldConfig?.algorithm ?? algorithm

    switch (resolvedAlgorithm) {
      case 'FPE':
        return this.executeFpe(data, config)
      case 'k-anonymity':
        return this.executeKAnonymity(data, config)
      case 'differential-privacy':
        return this.executeDifferentialPrivacy(data, config)
      case 'hash':
        return this.executeHash(data, config)
      default:
        return this.executeHash(data, config)
    }
  }

  private executeFpe(data: string, config: AdvancedMaskingConfig): AdvancedMaskingResult {
    const key = this.resolveEnvVar(config.fpe.key)
    const encrypted = this.fpeAlgorithm.encrypt(data, key)
    const details: AlgorithmDetails = {
      algorithm: 'FPE',
      reversible: true,
    }
    return { maskedData: encrypted, algorithm: 'FPE', details }
  }

  private executeKAnonymity(data: string, config: AdvancedMaskingConfig): AdvancedMaskingResult {
    const kValue = config.kAnonymity.kValue
    const quasiIdentifiers = config.kAnonymity.quasiIdentifiers
    let records: Record<string, unknown>[]
    try {
      records = JSON.parse(data)
    } catch {
      records = [{ value: data }]
    }

    const result = this.kAnonymityAlgorithm.anonymize(records, kValue, quasiIdentifiers)
    const details: AlgorithmDetails = {
      algorithm: 'k-anonymity',
      kValue,
      actualMinEquivalenceClass: result.actualMinEquivalenceClass,
      suppressedCount: result.suppressedCount,
    }
    return { maskedData: JSON.stringify(result.anonymizedRecords), algorithm: 'k-anonymity', details }
  }

  private executeDifferentialPrivacy(data: string, config: AdvancedMaskingConfig): AdvancedMaskingResult {
    const epsilon = config.differentialPrivacy.epsilon
    const totalBudget = config.differentialPrivacy.totalBudget
    const sensitivity = config.differentialPrivacy.sensitivity
    const budgetTracker = new BudgetTracker(totalBudget)

    const trueValue = Number(data)
    if (isNaN(trueValue)) {
      throw new Error('差分隐私要求输入为数字')
    }

    const noisyValue = this.differentialPrivacyAlgorithm.addNoise(trueValue, epsilon, sensitivity, budgetTracker, totalBudget)
    const budgetState = budgetTracker.getState()
    const details: AlgorithmDetails = {
      algorithm: 'differential-privacy',
      epsilon,
      budgetConsumed: budgetState.consumed,
      budgetRemaining: budgetState.remaining,
    }
    return { maskedData: String(noisyValue), algorithm: 'differential-privacy', details }
  }

  private executeHash(data: string, config: AdvancedMaskingConfig): AdvancedMaskingResult {
    const hashAlgo = config.hash.algorithm as 'SHA-256' | 'SHA-512'
    const salt = this.resolveEnvVar(config.hash.salt)
    const result = this.hashAlgorithm.hash(data, hashAlgo, salt || undefined)
    const details: AlgorithmDetails = {
      algorithm: 'hash',
      hashAlgorithm: hashAlgo,
      salted: result.salted,
      digestLength: result.digestLength,
    }
    return { maskedData: result.digest, algorithm: 'hash', details }
  }

  private resolveEnvVar(value: string): string {
    if (value.startsWith('${') && value.endsWith('}')) {
      const envVar = value.slice(2, -1)
      return process.env[envVar] ?? ''
    }
    return value
  }
}
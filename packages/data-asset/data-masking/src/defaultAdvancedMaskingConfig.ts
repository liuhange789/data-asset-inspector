import type { AdvancedMaskingConfig } from '@liuhange/dsh-data-asset-shared'

export const defaultAdvancedMaskingConfig: AdvancedMaskingConfig = {
  defaultAlgorithm: 'hash',
  fieldAlgorithms: {},
  fpe: {
    key: '',
    radix: 10,
  },
  kAnonymity: {
    kValue: 2,
    quasiIdentifiers: ['zipCode', 'age', 'gender'],
  },
  differentialPrivacy: {
    epsilon: 1.0,
    totalBudget: 5.0,
    sensitivity: 1.0,
  },
  hash: {
    algorithm: 'SHA-256',
    salt: '',
  },
}
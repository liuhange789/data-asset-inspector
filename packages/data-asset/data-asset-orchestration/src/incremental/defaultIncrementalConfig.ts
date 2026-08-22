import type { IncrementalSchedulingConfig } from '@liuhange/dsh-data-asset-shared'

export const defaultIncrementalConfig: IncrementalSchedulingConfig = {
  incrementalMode: false,
  cronExpression: '0 2 * * *',
  hashAlgorithm: 'SHA-256',
  watchDirectory: 'input',
  stateFilePath: 'state/incremental-state.json',
  lockTimeout: 3600,
}
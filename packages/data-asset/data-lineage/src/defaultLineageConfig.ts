import type { LineageConfig } from '@liuhange/dsh-data-asset-shared'

export const defaultLineageConfig: LineageConfig = {
  enabled: false,
  storagePath: 'lineage',
  hashAlgorithm: 'SHA-256',
}
import { loadJsonConfig } from '@liuhange/dsh-data-asset-shared'
import type { VerticalChain, VerticalChainRegistry } from './verticalChainTypes.js'

export function loadVerticalChains(): VerticalChainRegistry {
  try {
    const config = loadJsonConfig(
      'VERTICAL_CHAINS_PATH',
      'config/vertical-chains.json',
      '@liuhange/dsh-data-asset-shared/config/vertical-chains.json',
    )
    return { chains: (config as { chains: VerticalChain[] }).chains ?? [] }
  } catch {
    return { chains: [] }
  }
}

export function findChainByTrigger(trigger: string): VerticalChain | null {
  const registry = loadVerticalChains()
  return registry.chains.find((c) => c.trigger === trigger) ?? null
}
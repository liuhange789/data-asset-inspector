import type { KnowledgeBase, DataSourceStatusEntry } from './types.js'

const DEGRADED_STATUS: DataSourceStatusEntry = { status: 'degraded', fetchedAt: '', recordCount: 0 }

const EMPTY_KB: KnowledgeBase = {
  timeLimits: [],
  materials: [],
  conditions: [],
  dataSourceStatus: {
    national: DEGRADED_STATUS,
    provincial: DEGRADED_STATUS,
    standard: DEGRADED_STATUS,
  },
}

export interface DegradedModeResult {
  degradedMode: true
  degradedReason: string
  localKb: KnowledgeBase
}

export const DegradedModeController = {
  activate(reason: string): DegradedModeResult {
    return {
      degradedMode: true,
      degradedReason: reason,
      localKb: { ...EMPTY_KB, dataSourceStatus: { ...EMPTY_KB.dataSourceStatus } },
    }
  },
}
export interface IncrementalState {
  lastProcessedAt: string
  fileHashes: Record<string, string>
  processingSummary: ProcessingSummaryEntry[]
}

export interface ProcessingSummaryEntry {
  fileName: string
  status: 'processed' | 'skipped' | 'failed'
  timestamp: string
}

export interface IncrementalDetectionResult {
  addedFiles: string[]
  modifiedFiles: string[]
  deletedFiles: string[]
  unchangedFiles: string[]
}

export interface IncrementalProcessParams {
  watchDirectory: string
  incrementalMode: boolean
  stateFilePath?: string
}

export interface IncrementalProcessResult {
  processedFiles: string[]
  skippedFiles: string[]
  addedFiles: string[]
  modifiedFiles: string[]
  deletedFiles: string[]
  failedFiles: string[]
  stateUpdated: boolean
  report: string
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED'
  configStatus: string
}

export interface ConcurrencyLockState {
  locked: boolean
  lockedAt: string | null
}
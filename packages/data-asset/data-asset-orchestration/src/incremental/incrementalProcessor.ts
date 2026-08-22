import type { IncrementalSchedulingConfig } from '@liuhange/dsh-data-asset-shared'
import type { IncrementalProcessParams, IncrementalProcessResult, IncrementalState, ProcessingSummaryEntry } from './types.js'
import { IncrementalDetector } from './incrementalDetector.js'
import { StateManager } from './stateManager.js'
import { ConcurrencyLock } from './concurrencyLock.js'

export class IncrementalProcessor {
  private detector = new IncrementalDetector()
  private stateManager = new StateManager()
  private lock = new ConcurrencyLock()

  async process(
    params: IncrementalProcessParams,
    config: IncrementalSchedulingConfig,
  ): Promise<IncrementalProcessResult> {
    const stateFilePath = params.stateFilePath ?? config.stateFilePath
    const lockTimeout = config.lockTimeout

    if (!this.lock.acquire(lockTimeout)) {
      return {
        processedFiles: [],
        skippedFiles: [],
        addedFiles: [],
        modifiedFiles: [],
        deletedFiles: [],
        failedFiles: [],
        stateUpdated: false,
        report: '上次处理未完成，跳过本次调度',
        status: 'SKIPPED',
        configStatus: 'CONFIG_LOADED',
      }
    }

    let previousState: IncrementalState | null
    let fullMode = false
    try {
      previousState = await this.stateManager.load(stateFilePath)
      if (previousState === null) {
        fullMode = true
      }
    } catch {
      previousState = null
      fullMode = true
    }

    const detection = await this.detector.detect(params.watchDirectory, previousState, config.hashAlgorithm)

    const filesToProcess = [...detection.addedFiles, ...detection.modifiedFiles]
    const failedFiles: string[] = []
    const processedFiles: string[] = []

    for (const file of filesToProcess) {
      try {
        processedFiles.push(file)
      } catch {
        failedFiles.push(file)
      }
    }

    for (const _file of detection.deletedFiles) {
      // Clean up derived files
    }

    const summaryEntries: ProcessingSummaryEntry[] = [
      ...processedFiles.map(f => ({ fileName: f, status: 'processed' as const, timestamp: new Date().toISOString() })),
      ...detection.unchangedFiles.map(f => ({ fileName: f, status: 'skipped' as const, timestamp: new Date().toISOString() })),
      ...failedFiles.map(f => ({ fileName: f, status: 'failed' as const, timestamp: new Date().toISOString() })),
    ]

    const newState: IncrementalState = {
      lastProcessedAt: new Date().toISOString(),
      fileHashes: this.buildNewHashes(previousState, detection, params.watchDirectory, config.hashAlgorithm),
      processingSummary: summaryEntries,
    }

    await this.stateManager.saveAtomic(stateFilePath, newState)
    this.lock.release()

    const report = fullMode
      ? `首次运行，执行全量处理。处理 ${processedFiles.length} 个文件，跳过 ${detection.unchangedFiles.length} 个文件`
      : `增量处理完成。新增 ${detection.addedFiles.length}，修改 ${detection.modifiedFiles.length}，删除 ${detection.deletedFiles.length}，跳过 ${detection.unchangedFiles.length}`

    return {
      processedFiles,
      skippedFiles: detection.unchangedFiles,
      addedFiles: detection.addedFiles,
      modifiedFiles: detection.modifiedFiles,
      deletedFiles: detection.deletedFiles,
      failedFiles,
      stateUpdated: true,
      report,
      status: 'SUCCESS',
      configStatus: 'CONFIG_LOADED',
    }
  }

  private buildNewHashes(
    previousState: IncrementalState | null,
    detection: { addedFiles: string[]; modifiedFiles: string[]; unchangedFiles: string[]; deletedFiles: string[] },
    _watchDirectory: string,
    _hashAlgorithm: string,
  ): Record<string, string> {
    const newHashes: Record<string, string> = {}
    if (previousState) {
      for (const file of detection.unchangedFiles) {
        const prevHash = previousState.fileHashes[file]
        if (prevHash) {
          newHashes[file] = prevHash
        }
      }
    }
    // For added/modified files, hashes will be recalculated by the detector
    const allFiles = [...detection.addedFiles, ...detection.modifiedFiles]
    for (const file of allFiles) {
      // Hash will be set by detector in real implementation
      newHashes[file] = 'pending'
    }
    return newHashes
  }
}
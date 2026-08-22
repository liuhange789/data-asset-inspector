import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import type { IncrementalState, IncrementalDetectionResult } from './types.js'

export class IncrementalDetector {
  async detect(
    watchDirectory: string,
    previousState: IncrementalState | null,
    hashAlgorithm: string,
  ): Promise<IncrementalDetectionResult> {
    const currentFiles = this.scanDataFiles(watchDirectory)
    const currentHashes = this.calculateHashes(currentFiles, hashAlgorithm)

    if (previousState === null) {
      return {
        addedFiles: currentFiles,
        modifiedFiles: [],
        deletedFiles: [],
        unchangedFiles: [],
      }
    }

    const previousHashes = previousState.fileHashes
    const addedFiles: string[] = []
    const modifiedFiles: string[] = []
    const unchangedFiles: string[] = []
    const deletedFiles: string[] = []

    for (const file of currentFiles) {
      const hash = currentHashes[file]
      const prevHash = previousHashes[file]
      if (prevHash === undefined) {
        addedFiles.push(file)
      } else if (hash !== prevHash) {
        modifiedFiles.push(file)
      } else {
        unchangedFiles.push(file)
      }
    }

    for (const file of Object.keys(previousHashes)) {
      if (!currentFiles.includes(file)) {
        deletedFiles.push(file)
      }
    }

    return { addedFiles, modifiedFiles, deletedFiles, unchangedFiles }
  }

  private scanDataFiles(directory: string): string[] {
    if (!fs.existsSync(directory)) {
      return []
    }

    const files: string[] = []
    const entries = fs.readdirSync(directory)
    for (const entry of entries) {
      const fullPath = path.join(directory, entry)
      if (fs.statSync(fullPath).isFile()) {
        const ext = path.extname(entry).toLowerCase()
        if (['.csv', '.xlsx', '.json', '.txt'].includes(ext)) {
          files.push(fullPath)
        }
      }
    }
    return files
  }

  private calculateHashes(files: string[], algorithm: string): Record<string, string> {
    const hashes: Record<string, string> = {}
    for (const file of files) {
      try {
        const content = fs.readFileSync(file)
        const hash = crypto.createHash(algorithm)
        hash.update(content)
        hashes[file] = hash.digest('hex')
      } catch {
        // skip files that can't be read
      }
    }
    return hashes
  }
}
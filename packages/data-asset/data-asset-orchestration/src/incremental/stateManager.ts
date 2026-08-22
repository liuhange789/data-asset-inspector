import * as fs from 'fs'
import * as path from 'path'
import type { IncrementalState } from './types.js'

export class StateManager {
  async load(stateFilePath: string): Promise<IncrementalState | null> {
    if (!fs.existsSync(stateFilePath)) {
      return null
    }

    const content = fs.readFileSync(stateFilePath, 'utf-8')
    const parsed = JSON.parse(content) as IncrementalState

    if (!parsed.lastProcessedAt || !parsed.fileHashes || !parsed.processingSummary) {
      throw new Error('状态文件损坏')
    }

    return parsed
  }

  async saveAtomic(stateFilePath: string, state: IncrementalState): Promise<void> {
    const dir = path.dirname(stateFilePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const tempPath = `${stateFilePath}.tmp`
    fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf-8')

    try {
      fs.chmodSync(tempPath, 0o600)
    } catch {
      // chmod may fail on Windows, ignore
    }

    fs.renameSync(tempPath, stateFilePath)
  }
}
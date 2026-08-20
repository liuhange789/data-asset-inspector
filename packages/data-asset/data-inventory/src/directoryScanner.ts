import * as fs from 'fs'
import * as path from 'path'
import type { DataFile, DataFormat } from '@deepseek-ai/dsh-data-asset-shared'

export interface DirectoryScanResult {
  files: DataFile[]
  skippedFiles: number
}

const SUPPORTED_EXTENSIONS: DataFormat[] = ['csv', 'xlsx', 'json', 'txt']

export class DirectoryScanner {
  scan(directory: string): DirectoryScanResult {
    const files: DataFile[] = []
    let skippedFiles = 0

    if (!fs.existsSync(directory)) {
      return { files, skippedFiles }
    }

    const entries = fs.readdirSync(directory)
    for (const entry of entries) {
      const fullPath = path.join(directory, entry)
      try {
        const stats = fs.statSync(fullPath)
        if (!stats.isFile()) continue

        const ext = path.extname(entry).toLowerCase().slice(1)
        if (!SUPPORTED_EXTENSIONS.includes(ext as DataFormat)) continue

        files.push({
          fileName: entry,
          fullPath,
          size: stats.size,
          format: ext as DataFormat,
        })
      } catch {
        skippedFiles++
      }
    }

    return { files, skippedFiles }
  }
}

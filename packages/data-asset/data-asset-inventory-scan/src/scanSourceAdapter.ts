import { readdirSync, statSync } from 'node:fs'
import { join, extname, basename } from 'node:path'

export interface ScanSourceConfig {
  sourceType: 'directory' | 'database'
  scanSource: string
  outputPathDir?: string
}

export interface DataObjectMetadata {
  id: string
  name: string
  path: string
  size: number
  type: string
  createdAt: string
  modifiedAt: string
  fields?: Record<string, string>
}

export class DirectoryScanAdapter {
  scan(dirPath: string, scaleLimit: number): DataObjectMetadata[] {
    const results: DataObjectMetadata[] = []
    this._scanRecursive(dirPath, results, scaleLimit)
    if (results.length > scaleLimit) {
      throw new Error(`SCAN_SCALE_EXCEEDED: ${results.length} > ${scaleLimit}`)
    }
    return results
  }

  private _scanRecursive(dir: string, results: DataObjectMetadata[], limit: number) {
    if (results.length >= limit) return
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      throw new Error(`SCAN_SOURCE_UNREACHABLE: ${dir}`)
    }
    for (const entry of entries) {
      if (results.length >= limit) return
      const fullPath = join(dir, entry)
      let stat
      try {
        stat = statSync(fullPath)
      } catch {
        continue
      }
      if (stat.isDirectory()) {
        this._scanRecursive(fullPath, results, limit)
      } else {
        results.push({
          id: `${results.length + 1}`,
          name: basename(fullPath),
          path: fullPath,
          size: stat.size,
          type: extname(fullPath).slice(1) || 'unknown',
          createdAt: stat.birthtime.toISOString(),
          modifiedAt: stat.mtime.toISOString(),
        })
      }
    }
  }
}

export class DatabaseScanAdapter {
  scan(config: string, _scaleLimit: number): DataObjectMetadata[] {
    let dbConfig: Record<string, unknown>
    try {
      dbConfig = JSON.parse(config)
    } catch {
      throw new Error('INVALID_JSON: database config is not valid JSON')
    }
    const required = ['host', 'port', 'database']
    for (const field of required) {
      if (!(field in dbConfig)) {
        throw new Error(`INVALID_CONFIG: missing field ${field}`)
      }
    }
    throw new Error('DATABASE_SCAN_NOT_IMPLEMENTED: use directory scan or provide database driver')
  }
}

export class ScanSourceAdapterFactory {
  static create(sourceType: 'directory' | 'database') {
    if (sourceType === 'directory') return new DirectoryScanAdapter()
    if (sourceType === 'database') return new DatabaseScanAdapter()
    throw new Error(`INVALID_SOURCE_TYPE: ${sourceType}`)
  }
}
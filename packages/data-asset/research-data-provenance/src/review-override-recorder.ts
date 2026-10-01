import { existsSync, mkdirSync, appendFileSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { OVERRIDE_RECORDS_LOG_DIR, OVERRIDE_RECORDS_LOG_FILE, ERROR_CODES } from './invariant.js'
import type { ReviewOverrideRecord } from './types.js'

export interface RecordResult {
  success: boolean
  record?: ReviewOverrideRecord
  error: string | undefined
}

export class ReviewOverrideRecorder {
  private readonly logFilePath: string

  constructor(logDir?: string) {
    this.logFilePath = resolve(logDir ?? join(process.cwd(), OVERRIDE_RECORDS_LOG_DIR), OVERRIDE_RECORDS_LOG_FILE)
  }

  record(reviewOverrideRecord: ReviewOverrideRecord): RecordResult {
    const validation = this.validateRecord(reviewOverrideRecord)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }
    const record: ReviewOverrideRecord = {
      ...reviewOverrideRecord,
      overrideTime: reviewOverrideRecord.overrideTime || new Date().toISOString(),
    }
    this.ensureLogDir()
    appendFileSync(this.logFilePath, JSON.stringify(record) + '\n', 'utf-8')
    return { success: true, record, error: undefined }
  }

  deleteAttempt(): { success: boolean; error: string } {
    return { success: false, error: ERROR_CODES.OVERWRITE_RECORD_IMMUTABLE }
  }

  readAll(): ReviewOverrideRecord[] {
    if (!existsSync(this.logFilePath)) {
      return []
    }
    const content = readFileSync(this.logFilePath, 'utf-8')
    const records: ReviewOverrideRecord[] = []
    for (const line of content.split('\n')) {
      if (line.trim() === '') {
        continue
      }
      try {
        records.push(JSON.parse(line) as ReviewOverrideRecord)
      } catch {
        continue
      }
    }
    return records
  }

  getLogFilePath(): string {
    return this.logFilePath
  }

  private ensureLogDir(): void {
    const dir = resolve(this.logFilePath, '..')
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  private validateRecord(record: ReviewOverrideRecord): { valid: boolean; error?: string } {
    if (!record || typeof record !== 'object') {
      return { valid: false, error: '覆盖记录为空' }
    }
    const required: Array<keyof ReviewOverrideRecord> = [
      'datasetId',
      'detectionItem',
      'originalConclusion',
      'newConclusion',
      'overrideReason',
      'operator',
    ]
    for (const field of required) {
      const value = record[field]
      if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        return { valid: false, error: `字段${String(field)}不得为空` }
      }
    }
    return { valid: true }
  }
}
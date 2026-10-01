import { appendFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import type { ReviewOverrideRecord } from './types.js'
import { ERROR_CODES, OVERRIDE_RECORD_FILE, OVERRIDE_CONCLUSIONS } from './invariant.js'
import type { ErrorCode } from './invariant.js'

export class ReviewOverrideRecorder {
  private readonly logFilePath: string

  constructor(logFilePath?: string) {
    this.logFilePath = logFilePath ?? resolve(process.cwd(), OVERRIDE_RECORD_FILE)
  }

  record(record: ReviewOverrideRecord): void {
    const dir = dirname(this.logFilePath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    const line = JSON.stringify(record) + '\n'
    appendFileSync(this.logFilePath, line, 'utf-8')
  }

  delete(): { error: ErrorCode; message: string } {
    return {
      error: ERROR_CODES.OVERWRITE_RECORD_IMMUTABLE,
      message: '人工复核覆盖记录不可删除，仅允许追加新的覆盖记录',
    }
  }

  readAll(): ReviewOverrideRecord[] {
    if (!existsSync(this.logFilePath)) {
      return []
    }

    const content = readFileSync(this.logFilePath, 'utf-8')
    const lines = content.split('\n').filter((line) => line.trim().length > 0)
    const records: ReviewOverrideRecord[] = []

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as ReviewOverrideRecord
        records.push(parsed)
      } catch {
        continue
      }
    }

    return records
  }

  validateOverrideInstruction(
    objectId: string,
    overrideConclusion: string,
    overrideReason: string,
    existingObjectIds: Set<string>,
  ): { valid: boolean; error: ErrorCode | null; message: string | null } {
    if (!existingObjectIds.has(objectId)) {
      return {
        valid: false,
        error: ERROR_CODES.OBJECT_NOT_FOUND,
        message: `对象标识 ${objectId} 在巡检结果中不存在`,
      }
    }

    if (!overrideReason || overrideReason.trim().length === 0) {
      return {
        valid: false,
        error: ERROR_CODES.REASON_REQUIRED,
        message: '覆盖理由不可为空',
      }
    }

    if (!OVERRIDE_CONCLUSIONS.includes(overrideConclusion as (typeof OVERRIDE_CONCLUSIONS)[number])) {
      return {
        valid: false,
        error: ERROR_CODES.INVALID_OVERRIDE_CONCLUSION,
        message: `覆盖结论不合法，须为 ${OVERRIDE_CONCLUSIONS.join('/')}`,
      }
    }

    return { valid: true, error: null, message: null }
  }
}
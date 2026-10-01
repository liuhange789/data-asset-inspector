import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { ReviewOverrideRecord } from './types.js'
import { DEFAULT_OVERRIDE_LOG_PATH } from './invariant.js'

export class ReviewOverrideRecorder {
  private readonly logPath: string

  constructor(logPath?: string) {
    this.logPath = logPath ?? resolve(process.cwd(), DEFAULT_OVERRIDE_LOG_PATH)
  }

  record(record: ReviewOverrideRecord): void {
    const dir = dirname(this.logPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    const line = JSON.stringify(record) + '\n'
    appendFileSync(this.logPath, line, 'utf-8')
  }

  getAll(): ReviewOverrideRecord[] {
    if (!existsSync(this.logPath)) {
      return []
    }
    const content = readFileSync(this.logPath, 'utf-8')
    const records: ReviewOverrideRecord[] = []
    for (const line of content.split(/\r?\n/)) {
      if (line.trim() === '') continue
      try {
        records.push(JSON.parse(line) as ReviewOverrideRecord)
      } catch {
        continue
      }
    }
    return records
  }

  delete(): { error: 'OVERWRITE_RECORD_IMMUTABLE'; message: string } {
    return {
      error: 'OVERWRITE_RECORD_IMMUTABLE',
      message: '覆盖记录不可删除，仅允许追加新的覆盖记录',
    }
  }

  buildRecord(params: {
    assetId: string
    reviewItem: ReviewOverrideRecord['reviewItem']
    originalConclusion: string
    newConclusion: string
    overrideReason: string
    operator: string
    originalAssetCode: string
  }): ReviewOverrideRecord {
    return {
      assetId: params.assetId,
      reviewItem: params.reviewItem,
      originalConclusion: params.originalConclusion,
      newConclusion: params.newConclusion,
      overrideReason: params.overrideReason,
      operator: params.operator,
      overrideTime: new Date().toISOString(),
      originalAssetCode: params.originalAssetCode,
    }
  }
}
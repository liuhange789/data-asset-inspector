import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ReviewOverrideRecorder } from '../src/review-override-recorder.js'
import { ERROR_CODES } from '../src/invariant.js'
import type { ReviewOverrideRecord } from '../src/types.js'

let tempDir: string

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'prov-override-'))
})

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

function makeRecord(overrides: Partial<ReviewOverrideRecord> = {}): ReviewOverrideRecord {
  return {
    datasetId: 'ds-001',
    detectionItem: '血缘缺失：采集方法',
    originalConclusion: '缺失',
    newConclusion: '不缺失',
    overrideReason: '经核实采集方法已记录于附件',
    operator: 'manager-001',
    overrideTime: '2025-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('ReviewOverrideRecorder', () => {
  it('追加覆盖记录至日志文件', () => {
    const recorder = new ReviewOverrideRecorder(tempDir)
    const result = recorder.record(makeRecord())
    expect(result.success).toBe(true)
    expect(existsSync(recorder.getLogFilePath())).toBe(true)
    const content = readFileSync(recorder.getLogFilePath(), 'utf-8')
    expect(content).toContain('血缘缺失：采集方法')
  })

  it('记录包含七项完整字段', () => {
    const recorder = new ReviewOverrideRecorder(tempDir)
    const result = recorder.record(makeRecord())
    expect(result.success).toBe(true)
    expect(result.record).toBeDefined()
    const rec = result.record!
    expect(rec.datasetId).toBe('ds-001')
    expect(rec.detectionItem).toBe('血缘缺失：采集方法')
    expect(rec.originalConclusion).toBe('缺失')
    expect(rec.newConclusion).toBe('不缺失')
    expect(rec.overrideReason).toBe('经核实采集方法已记录于附件')
    expect(rec.operator).toBe('manager-001')
    expect(rec.overrideTime).toBe('2025-01-01T00:00:00.000Z')
  })

  it('不可删除约束返回OVERWRITE_RECORD_IMMUTABLE', () => {
    const recorder = new ReviewOverrideRecorder(tempDir)
    const result = recorder.deleteAttempt()
    expect(result.success).toBe(false)
    expect(result.error).toBe(ERROR_CODES.OVERWRITE_RECORD_IMMUTABLE)
  })

  it('覆盖理由为空拒绝记录', () => {
    const recorder = new ReviewOverrideRecorder(tempDir)
    const result = recorder.record(makeRecord({ overrideReason: '' }))
    expect(result.success).toBe(false)
  })

  it('多次追加形成完整审计日志', () => {
    const recorder = new ReviewOverrideRecorder(tempDir)
    recorder.record(makeRecord({ detectionItem: 'item-1' }))
    recorder.record(makeRecord({ detectionItem: 'item-2' }))
    const all = recorder.readAll()
    expect(all).toHaveLength(2)
    expect(all[0]!.detectionItem).toBe('item-1')
    expect(all[1]!.detectionItem).toBe('item-2')
  })

  it('null记录拒绝', () => {
    const recorder = new ReviewOverrideRecorder(tempDir)
    const result = recorder.record(null as unknown as ReviewOverrideRecord)
    expect(result.success).toBe(false)
  })
})
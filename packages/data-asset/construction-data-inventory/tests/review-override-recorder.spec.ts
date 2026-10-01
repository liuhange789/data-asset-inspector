import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { existsSync, rmSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { ReviewOverrideRecorder } from '../src/review-override-recorder.js'
import type { ReviewOverrideRecord } from '../src/types.js'

const tmpLogPath = resolve(process.cwd(), 'tmp-test-override', 'override-records.log')

describe('ReviewOverrideRecorder', () => {
  let recorder: ReviewOverrideRecorder

  beforeEach(() => {
    const dir = resolve(process.cwd(), 'tmp-test-override')
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true })
    }
    mkdirSync(dir, { recursive: true })
    recorder = new ReviewOverrideRecorder(tmpLogPath)
  })

  afterEach(() => {
    const dir = resolve(process.cwd(), 'tmp-test-override')
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('追加覆盖记录到日志文件', () => {
    const record: ReviewOverrideRecord = {
      assetId: 'A-001',
      reviewItem: 'classification',
      originalConclusion: '14',
      newConclusion: '10',
      overrideReason: '分类错误，应为建筑物',
      operator: 'admin',
      overrideTime: '2024-01-01T00:00:00.000Z',
      originalAssetCode: '000140001X',
    }
    recorder.record(record)

    const records = recorder.getAll()
    expect(records.length).toBe(1)
    expect(records[0]!.assetId).toBe('A-001')
    expect(records[0]!.newConclusion).toBe('10')
  })

  it('不可删除约束返回 OVERWRITE_RECORD_IMMUTABLE', () => {
    const result = recorder.delete()
    expect(result.error).toBe('OVERWRITE_RECORD_IMMUTABLE')
    expect(result.message).toContain('不可删除')
  })

  it('记录包含八字段完整性', () => {
    const record = recorder.buildRecord({
      assetId: 'A-002',
      reviewItem: 'encoding',
      originalConclusion: '14',
      newConclusion: '10',
      overrideReason: '编码需重新生成',
      operator: 'admin',
      originalAssetCode: '000140001X',
    })
    recorder.record(record)

    const records = recorder.getAll()
    expect(records[0]!.assetId).toBe('A-002')
    expect(records[0]!.reviewItem).toBe('encoding')
    expect(records[0]!.originalConclusion).toBe('14')
    expect(records[0]!.newConclusion).toBe('10')
    expect(records[0]!.overrideReason).toBe('编码需重新生成')
    expect(records[0]!.operator).toBe('admin')
    expect(records[0]!.overrideTime).toBeDefined()
    expect(records[0]!.originalAssetCode).toBe('000140001X')
  })

  it('多条记录追加存储', () => {
    recorder.record(recorder.buildRecord({
      assetId: 'A-001',
      reviewItem: 'classification',
      originalConclusion: '14',
      newConclusion: '10',
      overrideReason: '理由1',
      operator: 'admin',
      originalAssetCode: 'code1',
    }))
    recorder.record(recorder.buildRecord({
      assetId: 'A-002',
      reviewItem: 'classification',
      originalConclusion: '21',
      newConclusion: '20',
      overrideReason: '理由2',
      operator: 'admin',
      originalAssetCode: 'code2',
    }))

    const records = recorder.getAll()
    expect(records.length).toBe(2)
  })

  it('空日志文件返回空数组', () => {
    const records = recorder.getAll()
    expect(records.length).toBe(0)
  })
})
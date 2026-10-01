import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ReviewOverrideRecorder } from '../src/review-override-recorder.js'
import { existsSync, unlinkSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import type { ReviewOverrideRecord } from '../src/types.js'

describe('ReviewOverrideRecorder', () => {
  const testLogDir = resolve(tmpdir(), 'underground-pipeline-test-override')
  const testLogPath = resolve(testLogDir, 'override-records-test.log')

  beforeEach(() => {
    mkdirSync(testLogDir, { recursive: true })
    if (existsSync(testLogPath)) {
      unlinkSync(testLogPath)
    }
  })

  afterEach(() => {
    if (existsSync(testLogPath)) {
      unlinkSync(testLogPath)
    }
  })

  const createRecord = (objectId: string): ReviewOverrideRecord => ({
    objectId,
    originalConclusion: 'A类错误',
    newConclusion: '误判',
    overrideReason: '经核实该对象为合法数据',
    operator: 'quality-officer-001',
    overrideTime: '2026-10-01T10:00:00.000Z',
  })

  it('覆盖记录追加写入文件', () => {
    const recorder = new ReviewOverrideRecorder(testLogPath)
    recorder.record(createRecord('P-OV-001'))
    recorder.record(createRecord('P-OV-002'))
    const records = recorder.readAll()
    expect(records.length).toBe(2)
    expect(records[0]?.objectId).toBe('P-OV-001')
    expect(records[1]?.objectId).toBe('P-OV-002')
  })

  it('不可删除 - delete 返回 OVERWRITE_RECORD_IMMUTABLE', () => {
    const recorder = new ReviewOverrideRecorder(testLogPath)
    const result = recorder.delete()
    expect(result.error).toBe('OVERWRITE_RECORD_IMMUTABLE')
    expect(result.message).toContain('不可删除')
  })

  it('记录完整性 - 六字段', () => {
    const recorder = new ReviewOverrideRecorder(testLogPath)
    recorder.record(createRecord('P-OV-003'))
    const records = recorder.readAll()
    expect(records.length).toBe(1)
    const record = records[0]
    expect(record).toBeDefined()
    expect(record?.objectId).toBe('P-OV-003')
    expect(record?.originalConclusion).toBe('A类错误')
    expect(record?.newConclusion).toBe('误判')
    expect(record?.overrideReason).toBe('经核实该对象为合法数据')
    expect(record?.operator).toBe('quality-officer-001')
    expect(record?.overrideTime).toBe('2026-10-01T10:00:00.000Z')
  })

  it('验证覆盖指令 - 对象不存在返回 OBJECT_NOT_FOUND', () => {
    const recorder = new ReviewOverrideRecorder(testLogPath)
    const existingIds = new Set(['P-EXIST-001'])
    const result = recorder.validateOverrideInstruction(
      'P-NOT-EXIST',
      '误判',
      '理由',
      existingIds,
    )
    expect(result.valid).toBe(false)
    expect(result.error).toBe('OBJECT_NOT_FOUND')
  })

  it('验证覆盖指令 - 理由为空返回 REASON_REQUIRED', () => {
    const recorder = new ReviewOverrideRecorder(testLogPath)
    const existingIds = new Set(['P-EXIST-001'])
    const result = recorder.validateOverrideInstruction(
      'P-EXIST-001',
      '误判',
      '',
      existingIds,
    )
    expect(result.valid).toBe(false)
    expect(result.error).toBe('REASON_REQUIRED')
  })

  it('验证覆盖指令 - 结论不合法返回 INVALID_OVERRIDE_CONCLUSION', () => {
    const recorder = new ReviewOverrideRecorder(testLogPath)
    const existingIds = new Set(['P-EXIST-001'])
    const result = recorder.validateOverrideInstruction(
      'P-EXIST-001',
      '无效结论',
      '理由',
      existingIds,
    )
    expect(result.valid).toBe(false)
    expect(result.error).toBe('INVALID_OVERRIDE_CONCLUSION')
  })

  it('验证覆盖指令 - 合法指令通过', () => {
    const recorder = new ReviewOverrideRecorder(testLogPath)
    const existingIds = new Set(['P-EXIST-001'])
    const result = recorder.validateOverrideInstruction(
      'P-EXIST-001',
      '误判',
      '经核实不应报告',
      existingIds,
    )
    expect(result.valid).toBe(true)
    expect(result.error).toBeNull()
  })

  it('readAll 文件不存在时返回空数组', () => {
    const recorder = new ReviewOverrideRecorder(resolve(testLogDir, 'nonexistent.log'))
    const records = recorder.readAll()
    expect(records.length).toBe(0)
  })

  it('append-only 多次追加不覆盖', () => {
    const recorder = new ReviewOverrideRecorder(testLogPath)
    recorder.record(createRecord('P-OV-004'))
    const records1 = recorder.readAll()
    recorder.record(createRecord('P-OV-005'))
    const records2 = recorder.readAll()
    expect(records1.length).toBe(1)
    expect(records2.length).toBe(2)
  })
})
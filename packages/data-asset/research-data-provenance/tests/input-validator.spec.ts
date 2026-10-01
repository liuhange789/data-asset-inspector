import { describe, it, expect } from 'vitest'
import { InputValidator } from '../src/input-validator.js'
import { ERROR_CODES } from '../src/invariant.js'
import type { DatasetMetadata, LineageRecord, AttachmentList } from '../src/types.js'

const validMetadata: DatasetMetadata = {
  datasetId: 'ds-001',
  datasetName: '测试数据集',
  creatingOrganization: '测试单位',
  createdAt: '2024-01-01T00:00:00.000Z',
}

describe('InputValidator', () => {
  it('合法元数据校验通过', () => {
    const result = new InputValidator().validateDataset(validMetadata)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('必填字段缺失校验失败', () => {
    const meta: DatasetMetadata = { ...validMetadata, datasetId: '' }
    const result = new InputValidator().validateDataset(meta)
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.code === ERROR_CODES.INPUT_INVALID)).toBe(true)
  })

  it('创建时间晚于当前时间校验失败', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    const meta: DatasetMetadata = { ...validMetadata, createdAt: future }
    const result = new InputValidator().validateDataset(meta)
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('不得晚于当前时间'))).toBe(true)
  })

  it('数据集不存在终止审计', () => {
    const result = new InputValidator().validateDataset(null)
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.code === ERROR_CODES.DATASET_NOT_FOUND)).toBe(true)
  })

  it('undefined数据集终止审计', () => {
    const result = new InputValidator().validateDataset(undefined)
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.code === ERROR_CODES.DATASET_NOT_FOUND)).toBe(true)
  })

  it('血缘格式不兼容标记跳过', () => {
    const bad = { wrong: 'shape' } as unknown as LineageRecord
    const result = new InputValidator().validateDataset(validMetadata, bad)
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('格式不兼容'))).toBe(true)
  })

  it('合法血缘格式校验通过', () => {
    const lineage: LineageRecord = {
      lineageId: 'lin-1',
      sourceSystem: 'sys',
      collectionTime: '2024-01-01T00:00:00.000Z',
      collectionMethod: 'method',
      steps: [],
    }
    const result = new InputValidator().validateDataset(validMetadata, lineage)
    expect(result.isValid).toBe(true)
  })

  it('附件格式不兼容校验失败', () => {
    const bad = { wrong: 'shape' } as unknown as AttachmentList
    const result = new InputValidator().validateDataset(validMetadata, undefined, bad)
    expect(result.isValid).toBe(false)
  })

  it('isLineageFormatCompatible 判断', () => {
    const validator = new InputValidator()
    expect(validator.isLineageFormatCompatible({ lineageId: 'x', steps: [] })).toBe(true)
    expect(validator.isLineageFormatCompatible({ wrong: true })).toBe(false)
    expect(validator.isLineageFormatCompatible(null)).toBe(false)
  })
})
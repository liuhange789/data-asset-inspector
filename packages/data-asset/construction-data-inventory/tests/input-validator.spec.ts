import { describe, expect, it, beforeEach } from 'vitest'
import { InputValidator } from '../src/input-validator.js'
import type { SourceConfig } from '../src/types.js'

describe('InputValidator', () => {
  let validator: InputValidator

  beforeEach(() => {
    validator = new InputValidator()
  })

  it('null 输入返回错误', () => {
    const result = validator.validateInspectInput(null)
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('undefined 输入返回错误', () => {
    const result = validator.validateInspectInput(undefined)
    expect(result.isValid).toBe(false)
  })

  it('缺少 projectId 返回错误', () => {
    const result = validator.validateInspectInput({ sourceConfigPath: '/path' })
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.errorMessage.includes('projectId'))).toBe(true)
  })

  it('缺少 sourceConfigPath 返回错误', () => {
    const result = validator.validateInspectInput({ projectId: 'proj-1' })
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.errorMessage.includes('sourceConfigPath'))).toBe(true)
  })

  it('完整输入通过校验', () => {
    const result = validator.validateInspectInput({ projectId: 'proj-1', sourceConfigPath: '/path' })
    expect(result.isValid).toBe(true)
  })

  it('覆盖指令 null 输入返回错误', () => {
    const result = validator.validateOverrideInput(null)
    expect(result.isValid).toBe(false)
  })

  it('覆盖指令缺少 assetId 返回错误', () => {
    const result = validator.validateOverrideInput({
      reviewItem: 'classification',
      overrideConclusion: '10',
      overrideReason: '理由',
      operator: 'admin',
      inventoryReportPath: '/path',
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.errorMessage.includes('assetId'))).toBe(true)
  })

  it('覆盖指令缺少 overrideReason 返回错误', () => {
    const result = validator.validateOverrideInput({
      assetId: 'A-001',
      reviewItem: 'classification',
      overrideConclusion: '10',
      overrideReason: '',
      operator: 'admin',
      inventoryReportPath: '/path',
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.errorMessage.includes('overrideReason'))).toBe(true)
  })

  it('数据源配置校验通过', () => {
    const sourceConfig: SourceConfig = {
      projectId: 'proj-1',
      sources: [
        { type: 'IFC', systemId: 'sys-1', path: '/path/to/ifc' },
      ],
    }
    const result = validator.validateSources(sourceConfig)
    expect(result.isValid).toBe(true)
  })

  it('数据源配置缺少 sources 数组返回错误', () => {
    const result = validator.validateSources({ projectId: 'proj-1', sources: 'invalid' as unknown as SourceConfig['sources'] })
    expect(result.isValid).toBe(false)
  })

  it('变更记录校验过滤不合法记录', () => {
    const records = [
      { changeId: 'CH-001', relatedAssetId: 'A-001', changeReason: '理由', impactScope: [], changeDate: '2024-01-01' },
      { relatedAssetId: 'A-002', changeReason: '理由' },
      null,
    ]
    const result = validator.validateChangeRecords(records)
    expect(result.valid.length).toBe(1)
    expect(result.invalid.length).toBe(2)
  })
})
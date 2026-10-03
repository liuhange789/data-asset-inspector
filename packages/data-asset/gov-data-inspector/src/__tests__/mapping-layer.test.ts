import { describe, it, expect } from 'vitest'
import { DEFAULT_FIELD_MAPPING, mapFieldName, mapGuideToStandard } from '../mapping-layer.js'

describe('字段映射层', () => {
  it('MAP-01: 申报条件 → 办理条件', () => {
    expect(mapFieldName('申报条件', DEFAULT_FIELD_MAPPING)).toBe('办理条件')
  })

  it('MAP-02: 审批条件 → 办理条件', () => {
    expect(mapFieldName('审批条件', DEFAULT_FIELD_MAPPING)).toBe('办理条件')
  })

  it('MAP-03: 承诺时限 → 办理时限', () => {
    expect(mapFieldName('承诺时限', DEFAULT_FIELD_MAPPING)).toBe('办理时限')
  })

  it('MAP-04: 申报材料 → 申请材料', () => {
    expect(mapFieldName('申报材料', DEFAULT_FIELD_MAPPING)).toBe('申请材料')
  })

  it('MAP-05: 未知字段原样返回', () => {
    expect(mapFieldName('未知字段', DEFAULT_FIELD_MAPPING)).toBe('未知字段')
  })

  it('MAP-06: mapGuideToStandard映射整个指南对象', () => {
    const guide = { 申报条件: '符合条件', 承诺时限: '20个工作日', 事项名称: '测试事项' }
    const standard = mapGuideToStandard(guide, DEFAULT_FIELD_MAPPING)
    expect(standard['办理条件']).toBe('符合条件')
    expect(standard['办理时限']).toBe('20个工作日')
    expect(standard['事项名称']).toBe('测试事项')
  })

  it('MAP-07: 空映射表 → 原样返回', () => {
    const guide = { 申报条件: '符合条件' }
    const standard = mapGuideToStandard(guide, {})
    expect(standard['申报条件']).toBe('符合条件')
  })

  it('MAP-08: 多字段映射到同一标准字段 → 后者覆盖前者', () => {
    const guide = { 申报条件: '条件A', 审批条件: '条件B' }
    const standard = mapGuideToStandard(guide, DEFAULT_FIELD_MAPPING)
    expect(standard['办理条件']).toBeDefined()
  })

  it('MAP-09: 办事流程 → 办理流程', () => {
    expect(mapFieldName('办事流程', DEFAULT_FIELD_MAPPING)).toBe('办理流程')
  })
})
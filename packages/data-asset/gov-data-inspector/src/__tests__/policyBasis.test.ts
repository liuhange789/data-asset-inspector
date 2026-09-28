import { describe, it, expect } from 'vitest'
import { resolvePolicyBasis } from '../policyBasis.js'

describe('政策依据配置', () => {
  it('读取GOV_DATA_INSPECTION段 → 含6个条目(4政策文件+2数据源来源说明)', () => {
    const basis = resolvePolicyBasis('GOV_DATA_INSPECTION')
    expect(basis.length).toBe(6)
  })

  it('policyBasis含DB1405/T 085-2025与国办发〔2017〕47号', () => {
    const basis = resolvePolicyBasis('GOV_DATA_INSPECTION')
    expect(basis.some((b) => b.includes('DB1405/T 085-2025'))).toBe(true)
    expect(basis.some((b) => b.includes('国办发〔2017〕47号'))).toBe(true)
  })

  it('policyBasis含国家政务服务平台与广东省政务服务事项管理系统来源说明', () => {
    const basis = resolvePolicyBasis('GOV_DATA_INSPECTION')
    expect(basis.some((b) => b.includes('国家政务服务平台事项库'))).toBe(true)
    expect(basis.some((b) => b.includes('广东省政务服务事项管理系统'))).toBe(true)
  })

  it('文号使用〔〕括号', () => {
    const basis = resolvePolicyBasis('GOV_DATA_INSPECTION')
    expect(basis.some((b) => b.includes('〔') && b.includes('〕'))).toBe(true)
  })
})
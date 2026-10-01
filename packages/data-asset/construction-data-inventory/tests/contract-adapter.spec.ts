import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { ContractAdapter } from '../src/contract-adapter.js'

const tmpDir = resolve(process.cwd(), 'tmp-test-contract')

describe('ContractAdapter', () => {
  let adapter: ContractAdapter

  beforeEach(() => {
    adapter = new ContractAdapter()
    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true })
    }
  })

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('提取合同元信息并转换为统一资产项', () => {
    const contracts = [
      { contractId: 'C-001', contractType: '施工合同', signDate: '2024-01-01', parties: ['甲方', '乙方'] },
      { contractId: 'C-002', contractType: '材料采购', signDate: '2024-02-01', parties: ['甲方', '供应商'] },
    ]
    const filePath = resolve(tmpDir, 'contracts.json')
    writeFileSync(filePath, JSON.stringify(contracts), 'utf-8')

    const result = adapter.adapt(filePath, 'proj-sys', 'proj-001')

    expect(result.assets.length).toBe(2)
    expect(result.assets[0]!.assetId).toBe('CONTRACT-C-001')
    expect(result.assets[0]!.dataType).toBe('参建方信息-组织角色')
    expect(result.assets[1]!.dataType).toBe('材料清单-组织角色')
    expect(result.assets[0]!.projectId).toBe('proj-001')
  })

  it('跳过缺少 contractId 的记录', () => {
    const contracts = [
      { contractType: '施工合同', signDate: '2024-01-01' },
      { contractId: 'C-002', contractType: '施工合同', signDate: '2024-02-01' },
    ]
    const filePath = resolve(tmpDir, 'contracts-invalid.json')
    writeFileSync(filePath, JSON.stringify(contracts), 'utf-8')

    const result = adapter.adapt(filePath, 'proj-sys', 'proj-001')

    expect(result.assets.length).toBe(1)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('文件不存在时返回错误', () => {
    const result = adapter.adapt(resolve(tmpDir, 'nonexistent.json'), 'proj-sys', 'proj-001')
    expect(result.assets.length).toBe(0)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('空数组返回空资产列表', () => {
    const filePath = resolve(tmpDir, 'empty.json')
    writeFileSync(filePath, '[]', 'utf-8')

    const result = adapter.adapt(filePath, 'proj-sys', 'proj-001')
    expect(result.assets.length).toBe(0)
  })
})
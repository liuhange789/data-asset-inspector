import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { AcceptanceDocAdapter } from '../src/acceptance-doc-adapter.js'

const tmpDir = resolve(process.cwd(), 'tmp-test-acceptance')

describe('AcceptanceDocAdapter', () => {
  let adapter: AcceptanceDocAdapter

  beforeEach(() => {
    adapter = new AcceptanceDocAdapter()
    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true })
    }
  })

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('提取验收信息并转换为统一资产项', () => {
    const records = [
      { acceptanceId: 'A-001', acceptancePart: '基础', acceptanceConclusion: '合格', acceptanceDate: '2024-01-20', acceptanceType: '质量' },
      { acceptanceId: 'A-002', acceptancePart: '主体', acceptanceConclusion: '合格', acceptanceDate: '2024-02-20' },
    ]
    const filePath = resolve(tmpDir, 'acceptance.json')
    writeFileSync(filePath, JSON.stringify(records), 'utf-8')

    const result = adapter.adapt(filePath, 'quality-sys', 'proj-001')

    expect(result.assets.length).toBe(2)
    expect(result.assets[0]!.assetId).toBe('ACCEPTANCE-A-001')
    expect(result.assets[0]!.dataType).toBe('质量属性')
    expect(result.assets[1]!.dataType).toBe('验收属性')
    expect(result.assets[0]!.collectionTime).toBe('2024-01-20')
  })

  it('跳过缺少 acceptanceId 的记录', () => {
    const records = [
      { acceptancePart: '基础', acceptanceConclusion: '合格' },
      { acceptanceId: 'A-002', acceptancePart: '主体', acceptanceConclusion: '合格', acceptanceDate: '2024-02-20' },
    ]
    const filePath = resolve(tmpDir, 'acceptance-invalid.json')
    writeFileSync(filePath, JSON.stringify(records), 'utf-8')

    const result = adapter.adapt(filePath, 'quality-sys', 'proj-001')
    expect(result.assets.length).toBe(1)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('文件不存在时返回错误', () => {
    const result = adapter.adapt(resolve(tmpDir, 'nonexistent.json'), 'quality-sys', 'proj-001')
    expect(result.assets.length).toBe(0)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})
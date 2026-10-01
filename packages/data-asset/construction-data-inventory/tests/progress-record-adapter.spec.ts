import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { ProgressRecordAdapter } from '../src/progress-record-adapter.js'

const tmpDir = resolve(process.cwd(), 'tmp-test-progress')

describe('ProgressRecordAdapter', () => {
  let adapter: ProgressRecordAdapter

  beforeEach(() => {
    adapter = new ProgressRecordAdapter()
    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true })
    }
  })

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('提取工序信息并转换为统一资产项', () => {
    const records = [
      { recordId: 'P-001', processNode: '基础施工', completionTime: '2024-01-15', processType: '阶段' },
      { recordId: 'P-002', processNode: '钢筋绑扎', completionTime: '2024-02-01', processType: '专业' },
    ]
    const filePath = resolve(tmpDir, 'progress.json')
    writeFileSync(filePath, JSON.stringify(records), 'utf-8')

    const result = adapter.adapt(filePath, 'construct-sys', 'proj-001')

    expect(result.assets.length).toBe(2)
    expect(result.assets[0]!.assetId).toBe('PROGRESS-P-001')
    expect(result.assets[0]!.dataType).toBe('进度记录-项目阶段')
    expect(result.assets[1]!.dataType).toBe('进度记录-专业领域')
    expect(result.assets[0]!.collectionTime).toBe('2024-01-15')
  })

  it('跳过缺少 recordId 的记录', () => {
    const records = [
      { processNode: '基础施工', completionTime: '2024-01-15' },
      { recordId: 'P-002', processNode: '钢筋绑扎', completionTime: '2024-02-01' },
    ]
    const filePath = resolve(tmpDir, 'progress-invalid.json')
    writeFileSync(filePath, JSON.stringify(records), 'utf-8')

    const result = adapter.adapt(filePath, 'construct-sys', 'proj-001')
    expect(result.assets.length).toBe(1)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('文件不存在时返回错误', () => {
    const result = adapter.adapt(resolve(tmpDir, 'nonexistent.json'), 'construct-sys', 'proj-001')
    expect(result.assets.length).toBe(0)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})
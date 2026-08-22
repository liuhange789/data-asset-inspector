
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defaultBusinessRules } from '@liuhange/dsh-data-asset-shared'
import type { ValueAssessmentRules } from '@liuhange/dsh-data-asset-shared'
import { AssetListGenerator } from '../src/assetListGenerator.js'
import { DirectoryScanner } from '../src/directoryScanner.js'
import { ValueAssessor } from '../src/valueAssessor.js'

const valueRules: ValueAssessmentRules = defaultBusinessRules.valueAssessment

let tempDir: string

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'dsh-inv-'))
})

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true })
})

describe('DirectoryScanner', () => {
  let scanner: DirectoryScanner

  beforeEach(() => {
    scanner = new DirectoryScanner()
  })

  it('returns an empty result when the directory does not exist', () => {
    const result = scanner.scan(join(tempDir, 'missing'))
    expect(result.files).toEqual([])
    expect(result.skippedFiles).toBe(0)
  })

  it('collects supported files (csv/xlsx/json/txt) with size and format', async () => {
    await writeFile(join(tempDir, 'a.csv'), 'h\nr')
    await writeFile(join(tempDir, 'b.json'), '{}')
    await writeFile(join(tempDir, 'c.txt'), 'x')
    await writeFile(join(tempDir, 'd.xlsx'), 's')
    const result = scanner.scan(tempDir)
    const names = result.files.map(f => f.fileName).sort()
    expect(names).toEqual(['a.csv', 'b.json', 'c.txt', 'd.xlsx'])
    const csv = result.files.find(f => f.fileName === 'a.csv')!
    expect(csv.format).toBe('csv')
    expect(csv.size).toBe(3)
    expect(csv.fullPath).toBe(join(tempDir, 'a.csv'))
  })

  it('skips unsupported extensions and subdirectories', async () => {
    await writeFile(join(tempDir, 'a.csv'), 'h')
    await writeFile(join(tempDir, 'b.parquet'), 'x')
    await mkdir(join(tempDir, 'sub'))
    const result = scanner.scan(tempDir)
    expect(result.files.map(f => f.fileName)).toEqual(['a.csv'])
  })
})

describe('ValueAssessor', () => {
  let assessor: ValueAssessor

  beforeEach(() => {
    assessor = new ValueAssessor()
  })

  it('scores a high-value keyword file with 5 stars', () => {
    const result = assessor.assess('供应链数据.csv', valueRules)
    expect(result.stars).toBe(5)
    expect(result.label).toBe('★★★★★')
    expect(result.recommendation).toBe('优先交易，建议入表')
  })

  it('scores a medium-value keyword file with 3 stars', () => {
    const result = assessor.assess('用户行为.json', valueRules)
    expect(result.stars).toBe(3)
    expect(result.label).toBe('★★★')
  })

  it('scores a low-value keyword file with 1 star', () => {
    const result = assessor.assess('系统日志.txt', valueRules)
    expect(result.stars).toBe(1)
    expect(result.label).toBe('★')
    expect(result.recommendation).toBe('评估处理成本')
  })

  it('falls back to the default rule when no keyword matches', () => {
    const result = assessor.assess('random-name.csv', valueRules)
    expect(result.stars).toBe(valueRules.defaultValue.score)
    expect(result.label).toBe(valueRules.defaultValue.label)
    expect(result.recommendation).toBe(valueRules.defaultValue.recommendation)
  })

  it('checks high-value before medium-value when both could match', () => {
    // '交易流水' is high-value; ensure precedence is high > medium > low.
    const result = assessor.assess('交易流水-用户行为.csv', valueRules)
    expect(result.stars).toBe(5)
  })
})

describe('AssetListGenerator', () => {
  let generator: AssetListGenerator
  let assessor: ValueAssessor

  beforeEach(() => {
    generator = new AssetListGenerator()
    assessor = new ValueAssessor()
  })

  it('maps each file to an AssetItem with human-readable size and assessment', () => {
    const files = [
      { fileName: '供应链.csv', fullPath: '/x/供应链.csv', size: 512, format: 'csv' as const },
      { fileName: '日志.txt', fullPath: '/x/日志.txt', size: 2048, format: 'txt' as const },
    ]
    const items = generator.generate(files, assessor, valueRules)
    expect(items).toHaveLength(2)
    expect(items[0]!.fileName).toBe('供应链.csv')
    expect(items[0]!.size).toBe('512 B')
    expect(items[0]!.type).toBe('csv')
    expect(items[0]!.valueAssessment).toBe('★★★★★')
    expect(items[1]!.size).toBe('2.0 KB')
    expect(items[1]!.valueAssessment).toBe('★')
  })

  it('humanReadableSize formats B, KB, MB, and GB boundaries', () => {
    expect(generator.humanReadableSize(0)).toBe('0 B')
    expect(generator.humanReadableSize(1023)).toBe('1023 B')
    expect(generator.humanReadableSize(1024)).toBe('1.0 KB')
    expect(generator.humanReadableSize(1024 * 1024)).toBe('1.0 MB')
    expect(generator.humanReadableSize(1024 * 1024 * 1024)).toBe('1.0 GB')
  })

  it('returns an empty list for no files', () => {
    expect(generator.generate([], assessor, valueRules)).toEqual([])
  })
})

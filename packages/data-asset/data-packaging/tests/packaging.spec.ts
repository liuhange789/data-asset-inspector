
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defaultBusinessRules } from '@deepseek-ai/dsh-data-asset-shared'
import type { PackagingRules } from '@deepseek-ai/dsh-data-asset-shared'
import { ComplianceGenerator } from '@deepseek-ai/dsh-data-packaging/src/complianceGenerator.ts'
import { ManualGenerator } from '@deepseek-ai/dsh-data-packaging/src/manualGenerator.ts'
import { SampleExtractor } from '@deepseek-ai/dsh-data-packaging/src/sampleExtractor.ts'

const packagingRules: PackagingRules = defaultBusinessRules.packaging

let tempDir: string

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'dsh-pkg-'))
})

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true })
})

describe('SampleExtractor', () => {
  it('extracts the first 5 lines by default', async () => {
    const file = join(tempDir, 'data.csv')
    await writeFile(file, Array.from({ length: 10 }, (_, i) => `line${i}`).join('\n'))
    const extractor = new SampleExtractor()
    const sample = await extractor.extract(file)
    expect(sample).toEqual(['line0', 'line1', 'line2', 'line3', 'line4'])
  })

  it('honors a custom line count', async () => {
    const file = join(tempDir, 'data.csv')
    await writeFile(file, Array.from({ length: 10 }, (_, i) => `line${i}`).join('\n'))
    const extractor = new SampleExtractor()
    const sample = await extractor.extract(file, 2)
    expect(sample).toEqual(['line0', 'line1'])
  })

  it('returns fewer lines when the file is shorter than the requested count', async () => {
    const file = join(tempDir, 'small.csv')
    await writeFile(file, 'only\nsecond')
    const extractor = new SampleExtractor()
    const sample = await extractor.extract(file, 5)
    expect(sample).toEqual(['only', 'second'])
  })
})

describe('ComplianceGenerator', () => {
  it('prefixes each compliance statement with a check mark', () => {
    const generator = new ComplianceGenerator()
    const result = generator.generate(packagingRules)
    expect(result).toEqual([
      '✅ 本数据产品已完成脱敏处理',
      '✅ 不包含个人身份信息',
      '✅ 数据来源合法',
      '✅ 建议交易前完成数据产权登记',
    ])
  })

  it('returns an empty array when there are no statements', () => {
    const generator = new ComplianceGenerator()
    expect(generator.generate({ ...packagingRules, complianceStatements: [] })).toEqual([])
  })
})

describe('ManualGenerator', () => {
  it('generates a ProductManual and rendered text from a data file', async () => {
    const file = join(tempDir, 'supply.csv')
    await writeFile(file, ['header', 'row1', 'row2', 'row3', 'row4', 'row5', 'row6'].join('\n'))
    const generator = new ManualGenerator()
    const { manual, text } = await generator.generate({
      dataPath: file,
      productName: '供应链产品',
      packagingRules,
      format: 'csv',
    })

    expect(manual.productName).toBe('供应链产品')
    expect(manual.version).toBe('V1.0')
    expect(manual.dataOverview.sourceFile).toBe('supply.csv')
    expect(manual.dataOverview.recordCount).toBe(7)
    expect(manual.dataOverview.format).toBe('csv')
    expect(manual.sampleLines).toHaveLength(5)
    expect(manual.complianceStatements[0]).toBe('✅ 本数据产品已完成脱敏处理')
    // pricingRules[2] is the ★★★ suggestion.
    expect(manual.pricingSuggestion).toBe('根据数据质量和应用场景综合定价')
    expect(text).toContain('【产品名称】供应链产品')
    expect(text).toContain('数据产品说明书')
  })

  it('uses the provided description as the usage scenario', async () => {
    const file = join(tempDir, 'data.csv')
    await writeFile(file, 'a\nb')
    const generator = new ManualGenerator()
    const { manual } = await generator.generate({
      dataPath: file,
      productName: 'P',
      description: '自定义场景',
      packagingRules,
      format: 'csv',
    })
    expect(manual.usageScenario).toBe('自定义场景')
  })

  it('falls back to the packaging default description when none is given', async () => {
    const file = join(tempDir, 'data.csv')
    await writeFile(file, 'a\nb')
    const generator = new ManualGenerator()
    const { manual } = await generator.generate({
      dataPath: file,
      productName: 'P',
      packagingRules,
      format: 'csv',
    })
    expect(manual.usageScenario).toBe(packagingRules.defaultDescription)
  })

  it('falls back to the first pricing rule when fewer than three exist', async () => {
    const file = join(tempDir, 'data.csv')
    await writeFile(file, 'a\nb')
    const generator = new ManualGenerator()
    const shortRules: PackagingRules = {
      ...packagingRules,
      pricingRules: [{ valueLevel: '★', suggestion: '仅一条' }],
    }
    const { manual } = await generator.generate({
      dataPath: file,
      productName: 'P',
      packagingRules: shortRules,
      format: 'csv',
    })
    expect(manual.pricingSuggestion).toBe('仅一条')
  })

  it('uses the generic suggestion when there are no pricing rules', async () => {
    const file = join(tempDir, 'data.csv')
    await writeFile(file, 'a\nb')
    const generator = new ManualGenerator()
    const emptyRules: PackagingRules = { ...packagingRules, pricingRules: [] }
    const { manual } = await generator.generate({
      dataPath: file,
      productName: 'P',
      packagingRules: emptyRules,
      format: 'csv',
    })
    expect(manual.pricingSuggestion).toBe('根据数据质量、稀缺性和应用场景综合定价')
  })

  it('falls back to an empty usage scenario when neither description nor default is provided', async () => {
    const file = join(tempDir, 'data.csv')
    await writeFile(file, 'a\nb')
    const generator = new ManualGenerator()
    const noDefault: PackagingRules = {
      ...packagingRules,
      defaultDescription: undefined as unknown as string,
    }
    const { manual } = await generator.generate({
      dataPath: file,
      productName: 'P',
      packagingRules: noDefault,
      format: 'csv',
    })
    expect(manual.usageScenario).toBe('')
  })
})

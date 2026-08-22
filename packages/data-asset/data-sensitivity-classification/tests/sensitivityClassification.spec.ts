import * as fs from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SensitivityClassificationConfig } from '@liuhange/dsh-data-asset-shared'
import { FieldNameMatcher } from '../src/fieldNameMatcher.js'
import { FieldValueMatcher } from '../src/fieldValueMatcher.js'
import { SensitivityClassifier } from '../src/sensitivityClassifier.js'
import { StrategyRecommender } from '../src/strategyRecommender.js'
import { ClassificationReportGenerator } from '../src/classificationReportGenerator.js'
import { defaultClassificationRules } from '../src/defaultClassificationRules.js'
import { apply, name, inject } from '../src/index.js'
import type { ClassificationReportJson } from '../src/types.js'

let tempDir: string
const originalCwd = process.cwd()

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'dsh-sensitivity-'))
})

afterEach(async () => {
  process.chdir(originalCwd)
  await rm(tempDir, { recursive: true, force: true })
})

describe('defaultClassificationRules', () => {
  it('provides field-name, field-value, level-mapping and a default level', () => {
    expect(defaultClassificationRules.fieldNameRules.length).toBeGreaterThan(0)
    expect(defaultClassificationRules.fieldValueRules.length).toBeGreaterThan(0)
    expect(defaultClassificationRules.levelMapping.Secret).toBe('encrypt')
    expect(defaultClassificationRules.defaultLevel).toBe('Internal')
  })
})

describe('FieldNameMatcher', () => {
  const matcher = new FieldNameMatcher()

  it('matches a field name by regex and returns the rule level', () => {
    const { result } = matcher.match('idCard', defaultClassificationRules.fieldNameRules)
    expect(result.matched).toBe(true)
    expect(result.level).toBe('Secret')
    expect(result.name).toBe('idCard')
  })

  it('matches case-insensitively', () => {
    const { result } = matcher.match('PHONE', defaultClassificationRules.fieldNameRules)
    expect(result.matched).toBe(true)
    expect(result.level).toBe('Confidential')
  })

  it('returns matched false when no rule matches', () => {
    const { result } = matcher.match('foobar', defaultClassificationRules.fieldNameRules)
    expect(result.matched).toBe(false)
  })

  it('collects invalid rules when a pattern fails to compile', () => {
    const rules: SensitivityClassificationConfig['fieldNameRules'] = [
      { name: 'broken', pattern: '(', level: 'Secret' },
      { name: 'phone', pattern: 'phone', level: 'Confidential' },
    ]
    const { result, invalidRules } = matcher.match('phone', rules)
    expect(result.matched).toBe(true)
    expect(invalidRules).toHaveLength(1)
    expect(invalidRules[0]!.ruleName).toBe('broken')
    expect(invalidRules[0]!.reason).toBe('正则编译失败')
  })
})

describe('FieldValueMatcher', () => {
  const matcher = new FieldValueMatcher()

  it('returns matched false for an empty sample array', () => {
    const { result } = matcher.match([], defaultClassificationRules.fieldValueRules)
    expect(result.matched).toBe(false)
  })

  it('matches a sample value by regex and returns the rule level', () => {
    const { result } = matcher.match(['13800138000'], defaultClassificationRules.fieldValueRules)
    expect(result.matched).toBe(true)
    expect(result.level).toBe('Confidential')
    expect(result.name).toBe('phoneValue')
  })

  it('returns matched false when no sample value matches any rule', () => {
    const { result } = matcher.match(['hello', 'world'], defaultClassificationRules.fieldValueRules)
    expect(result.matched).toBe(false)
  })

  it('skips null and undefined sample values', () => {
    const { result } = matcher.match([null, undefined, '11010119900307891X'], defaultClassificationRules.fieldValueRules)
    expect(result.matched).toBe(true)
    expect(result.level).toBe('Secret')
  })

  it('collects invalid rules when a pattern fails to compile', () => {
    const rules: SensitivityClassificationConfig['fieldValueRules'] = [
      { name: 'broken', pattern: '(', level: 'Secret' },
    ]
    const { invalidRules } = matcher.match(['x'], rules)
    expect(invalidRules).toHaveLength(1)
    expect(invalidRules[0]!.reason).toBe('正则编译失败')
  })
})

describe('SensitivityClassifier', () => {
  const classifier = new SensitivityClassifier()

  it('classifies a field by name rule when the name matches', () => {
    const { classifications } = classifier.classify(['idCard'], { idCard: ['11010119900307891X'] }, defaultClassificationRules)
    expect(classifications).toHaveLength(1)
    expect(classifications[0]!.fieldName).toBe('idCard')
    expect(classifications[0]!.sensitivityLevel).toBe('Secret')
    expect(classifications[0]!.identifiedBy.matchType).toBe('fieldName')
    expect(classifications[0]!.identifiedBy.ruleName).toBe('idCard')
  })

  it('falls back to value matching when the name does not match', () => {
    const { classifications } = classifier.classify(['col1'], { col1: ['13800138000'] }, defaultClassificationRules)
    expect(classifications[0]!.sensitivityLevel).toBe('Confidential')
    expect(classifications[0]!.identifiedBy.matchType).toBe('fieldValue')
  })

  it('falls back to the default level when neither name nor value matches', () => {
    const { classifications } = classifier.classify(['unknown'], { unknown: ['hello'] }, defaultClassificationRules)
    expect(classifications[0]!.sensitivityLevel).toBe('Internal')
    expect(classifications[0]!.identifiedBy.matchType).toBe('default')
    expect(classifications[0]!.identifiedBy.ruleName).toBe('default')
  })

  it('uses the default level when samples are missing for a field', () => {
    const { classifications } = classifier.classify(['orphan'], {}, defaultClassificationRules)
    expect(classifications[0]!.sensitivityLevel).toBe('Internal')
  })

  it('aggregates invalid rules from both name and value matchers', () => {
    const config: SensitivityClassificationConfig = {
      fieldNameRules: [{ name: 'badName', pattern: '(', level: 'Secret' }],
      fieldValueRules: [{ name: 'badValue', pattern: '(', level: 'Secret' }],
      levelMapping: { Public: 'none' },
      defaultLevel: 'Internal',
    }
    const { invalidRules } = classifier.classify(['field'], { field: ['x'] }, config)
    expect(invalidRules).toHaveLength(2)
  })

  it('classifies multiple fields in order', () => {
    const fields = ['idCard', 'phone', 'status']
    const samples = { idCard: ['11010119900307891X'], phone: ['13800138000'], status: ['active'] }
    const { classifications } = classifier.classify(fields, samples, defaultClassificationRules)
    expect(classifications).toHaveLength(3)
    expect(classifications[0]!.sensitivityLevel).toBe('Secret')
    expect(classifications[1]!.sensitivityLevel).toBe('Confidential')
    expect(classifications[2]!.sensitivityLevel).toBe('Public')
  })
})

describe('StrategyRecommender', () => {
  const recommender = new StrategyRecommender()

  it('recommends the mapped strategy for each known level', () => {
    const mapping = defaultClassificationRules.levelMapping
    expect(recommender.recommend('Public', mapping)).toBe('none')
    expect(recommender.recommend('Internal', mapping)).toBe('partial')
    expect(recommender.recommend('Confidential', mapping)).toBe('full')
    expect(recommender.recommend('Secret', mapping)).toBe('encrypt')
  })

  it('falls back to partial for an unmapped level', () => {
    expect(recommender.recommend('Unknown' as never, { Public: 'none' })).toBe('partial')
  })
})

describe('ClassificationReportGenerator', () => {
  const generator = new ClassificationReportGenerator()

  function makeReport(): ClassificationReportJson {
    return {
      fields: [
        { fieldName: 'idCard', sensitivityLevel: 'Secret', identifiedBy: { ruleName: 'idCard', matchType: 'fieldName' }, recommendedStrategy: 'encrypt' },
        { fieldName: 'status', sensitivityLevel: 'Public', identifiedBy: { ruleName: 'public', matchType: 'fieldName' }, recommendedStrategy: 'none' },
      ],
      configStatus: 'CONFIG_LOADED',
      classifiedAt: '2026-08-22T00:00:00.000Z',
    }
  }

  it('writeJson creates the parent dir and writes valid JSON', async () => {
    const out = join(tempDir, 'nested', 'classification_report.json')
    await generator.writeJson(out, makeReport())
    const parsed = JSON.parse(fs.readFileSync(out, 'utf-8'))
    expect(parsed.fields).toHaveLength(2)
    expect(parsed.configStatus).toBe('CONFIG_LOADED')
  })

  it('writeMarkdown renders the field table without invalid-rules section', async () => {
    const out = join(tempDir, 'classification_report.md')
    await generator.writeMarkdown(out, makeReport(), [])
    const md = fs.readFileSync(out, 'utf-8')
    expect(md).toContain('【数据敏感度分级报告】')
    expect(md).toContain('| idCard | Secret | fieldName(idCard) | encrypt |')
    expect(md).not.toContain('## 无效规则')
  })

  it('writeMarkdown renders the invalid-rules section when rules are invalid', async () => {
    const out = join(tempDir, 'classification_report.md')
    await generator.writeMarkdown(out, makeReport(), [{ ruleName: 'broken', reason: '正则编译失败' }])
    const md = fs.readFileSync(out, 'utf-8')
    expect(md).toContain('## 无效规则')
    expect(md).toContain('- broken: 正则编译失败')
    expect(md).toContain('- 无效规则数: 1')
  })
})

describe('apply (data-sensitivity-classification plugin)', () => {
  it('exports name, inject, and registers the classify_sensitivity tool', () => {
    expect(name).toBe('data-sensitivity-classification')
    expect(inject).toEqual(['tools'])
  })

  it('execute classifies a CSV file and writes JSON + Markdown reports', async () => {
    process.chdir(tempDir)
    const csv = join(tempDir, 'data.csv')
    fs.writeFileSync(csv, 'name,phone,idCard\nAlice,13800138000,11010119900307891X\nBob,13900139000,110101199003078888\n', 'utf-8')

    const registered: { execute: (args: Record<string, unknown>) => Promise<string> }[] = []
    const ctx = { tools: { register: (tool: unknown) => { registered.push(tool as { execute: (args: Record<string, unknown>) => Promise<string> }) } } }
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    apply(ctx as never)
    expect(registered).toHaveLength(1)
    consoleSpy.mockRestore()

    const result = await registered[0]!.execute({ filePath: 'data.csv' })
    const parsed = JSON.parse(result) as { status: string; fields: { fieldName: string; sensitivityLevel: string }[]; jsonReportPath: string; markdownReportPath: string }
    expect(parsed.status).toBe('SUCCESS')
    expect(parsed.fields.length).toBe(3)
    expect(fs.existsSync(parsed.jsonReportPath)).toBe(true)
    expect(fs.existsSync(parsed.markdownReportPath)).toBe(true)
  })

  it('execute returns an error string for an invalid path', async () => {
    process.chdir(tempDir)
    const registered: { execute: (args: Record<string, unknown>) => Promise<string> }[] = []
    const ctx = { tools: { register: (tool: unknown) => { registered.push(tool as { execute: (args: Record<string, unknown>) => Promise<string> }) } } }
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    apply(ctx as never)
    consoleSpy.mockRestore()

    const result = await registered[0]!.execute({ filePath: '../escape.csv' })
    expect(result).toContain('错误：路径不合法')
  })

  it('execute returns an error string when the file does not exist', async () => {
    process.chdir(tempDir)
    const registered: { execute: (args: Record<string, unknown>) => Promise<string> }[] = []
    const ctx = { tools: { register: (tool: unknown) => { registered.push(tool as { execute: (args: Record<string, unknown>) => Promise<string> }) } } }
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    apply(ctx as never)
    consoleSpy.mockRestore()

    const result = await registered[0]!.execute({ filePath: 'missing.csv' })
    expect(result).toContain('错误：文件不存在')
  })
})
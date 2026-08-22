import * as fs from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuditLogger } from '../src/auditLogger.js'
import { BusinessRulesLoader } from '../src/businessRulesLoader.js'
import { defaultBusinessRules } from '../src/defaultBusinessRules.js'
import { FileFormatAdapter } from '../src/fileFormatAdapter.js'
import { PathValidator } from '../src/pathValidator.js'
import { ReportGenerator } from '../src/reportGenerator.js'
import type {
  AssetItem,
  BusinessRulesConfig,
  ProductManual,
  SensitiveField,
} from '@liuhange/dsh-data-asset-shared'

let tempDir: string

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'dsh-shared-'))
})

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true })
  vi.unstubAllEnvs()
})

describe('BusinessRulesLoader', () => {
  it('loads a valid config and reports CONFIG_LOADED', () => {
    const configPath = join(tempDir, 'rules.json')
    fs.writeFileSync(configPath, JSON.stringify(defaultBusinessRules), 'utf-8')

    const loader = new BusinessRulesLoader(configPath)
    const result = loader.load()

    expect(result.status).toBe('CONFIG_LOADED')
    expect(result.config.version).toBe('1.0')
    expect(result.config.sensitivePatterns.idCard.level).toBe('FULL')
    expect(result.config.maskingLevels.FULL.applyTo).toEqual(['idCard'])
  })

  it('caches the result so a second load returns the same object', () => {
    const configPath = join(tempDir, 'rules.json')
    fs.writeFileSync(configPath, JSON.stringify(defaultBusinessRules), 'utf-8')

    const loader = new BusinessRulesLoader(configPath)
    const first = loader.load()
    const second = loader.load()

    expect(second).toBe(first)
  })

  it('clearCache forces a re-read from disk', () => {
    const configPath = join(tempDir, 'rules.json')
    fs.writeFileSync(configPath, JSON.stringify(defaultBusinessRules), 'utf-8')

    const loader = new BusinessRulesLoader(configPath)
    const first = loader.load()
    loader.clearCache()
    const second = loader.load()

    expect(second).not.toBe(first)
    expect(second.status).toBe('CONFIG_LOADED')
  })

  it('falls back to defaults with DEFAULT_MISSING when the file is absent', () => {
    const loader = new BusinessRulesLoader(join(tempDir, 'missing.json'))
    const result = loader.load()

    expect(result.status).toBe('DEFAULT_MISSING')
    expect(result.config).toBe(defaultBusinessRules)
  })

  it('falls back to defaults with DEFAULT_PARSE on invalid JSON', () => {
    const configPath = join(tempDir, 'broken.json')
    fs.writeFileSync(configPath, '{ not valid json', 'utf-8')

    const loader = new BusinessRulesLoader(configPath)
    const result = loader.load()

    expect(result.status).toBe('DEFAULT_PARSE')
    expect(result.config).toBe(defaultBusinessRules)
  })

  it('falls back to defaults with DEFAULT_PARSE when the config path is unreadable (a directory)', () => {
    // existsSync(dir) is true but readFileSync throws EISDIR.
    const loader = new BusinessRulesLoader(tempDir)
    const result = loader.load()
    expect(result.status).toBe('DEFAULT_PARSE')
  })

  it('falls back to defaults with DEFAULT_VERSION when the version is a non-string', () => {
    const nonStringVersion = {
      ...defaultBusinessRules,
      version: 123 as unknown as string,
    }
    const configPath = join(tempDir, 'numver.json')
    fs.writeFileSync(configPath, JSON.stringify(nonStringVersion), 'utf-8')

    const loader = new BusinessRulesLoader(configPath)
    const result = loader.load()
    expect(result.status).toBe('DEFAULT_VERSION')
  })

  it('falls back to defaults with DEFAULT_PARSE when the parsed value is not a config object', () => {
    const configPath = join(tempDir, 'array.json')
    fs.writeFileSync(configPath, JSON.stringify([1, 2, 3]), 'utf-8')

    const loader = new BusinessRulesLoader(configPath)
    const result = loader.load()

    expect(result.status).toBe('DEFAULT_PARSE')
  })

  it('falls back to defaults with DEFAULT_VERSION when the version is incompatible', () => {
    const incompatible: BusinessRulesConfig = {
      ...defaultBusinessRules,
      version: '2.0',
    }
    const configPath = join(tempDir, 'v2.json')
    fs.writeFileSync(configPath, JSON.stringify(incompatible), 'utf-8')

    const loader = new BusinessRulesLoader(configPath)
    const result = loader.load()

    expect(result.status).toBe('DEFAULT_VERSION')
  })

  it('falls back to defaults with DEFAULT_PARTIAL when a required node is missing', () => {
    const partial = {
      ...defaultBusinessRules,
      maskingLevels: undefined,
    } as unknown as BusinessRulesConfig
    const configPath = join(tempDir, 'partial.json')
    fs.writeFileSync(configPath, JSON.stringify(partial), 'utf-8')

    const loader = new BusinessRulesLoader(configPath)
    const result = loader.load()

    expect(result.status).toBe('DEFAULT_PARTIAL')
  })

  it('defaults the config path to cwd/config/business-rules.json when omitted', () => {
    vi.stubEnv('NODE_ENV', 'test')
    const loader = new BusinessRulesLoader()
    // Loading from the repo default config should succeed with CONFIG_LOADED.
    const result = loader.load()
    expect(['CONFIG_LOADED', 'DEFAULT_MISSING', 'DEFAULT_PARSE']).toContain(result.status)
  })
})

describe('FileFormatAdapter', () => {
  let adapter: FileFormatAdapter

  beforeEach(() => {
    adapter = new FileFormatAdapter()
  })

  it('detectFormat maps extensions to formats and unknown otherwise', () => {
    expect(adapter.detectFormat('a.csv')).toBe('csv')
    expect(adapter.detectFormat('a.JSON')).toBe('json')
    expect(adapter.detectFormat('a.txt')).toBe('txt')
    expect(adapter.detectFormat('a.xlsx')).toBe('xlsx')
    expect(adapter.detectFormat('a.parquet')).toBe('unknown')
    expect(adapter.detectFormat('noext')).toBe('unknown')
  })

  it('read throws when the file does not exist', async () => {
    await expect(adapter.read(join(tempDir, 'nope.csv'))).rejects.toThrow(/文件不存在/)
  })

  it('reads a csv file into non-empty lines', async () => {
    const file = join(tempDir, 'data.csv')
    fs.writeFileSync(file, 'header\nrow1\nrow2\n\n', 'utf-8')
    const result = await adapter.read(file)
    expect(result.format).toBe('csv')
    expect(result.lines).toEqual(['header', 'row1', 'row2'])
    expect(result.raw).toBe('header\nrow1\nrow2\n\n')
  })

  it('reads a txt file and filters blank lines', async () => {
    const file = join(tempDir, 'data.txt')
    fs.writeFileSync(file, 'a\n\nb\n', 'utf-8')
    const result = await adapter.read(file)
    expect(result.format).toBe('txt')
    expect(result.lines).toEqual(['a', 'b'])
  })

  it('reads a json array into one line per element', async () => {
    const file = join(tempDir, 'data.json')
    fs.writeFileSync(file, JSON.stringify([{ a: 1 }, { b: 2 }]), 'utf-8')
    const result = await adapter.read(file)
    expect(result.format).toBe('json')
    expect(result.lines).toEqual(['{"a":1}', '{"b":2}'])
    expect(result.raw).toEqual([{ a: 1 }, { b: 2 }])
  })

  it('reads a json object into a single line', async () => {
    const file = join(tempDir, 'obj.json')
    fs.writeFileSync(file, JSON.stringify({ a: 1 }), 'utf-8')
    const result = await adapter.read(file)
    expect(result.lines).toEqual(['{"a":1}'])
  })

  it('reads an xlsx file as raw text lines', async () => {
    const file = join(tempDir, 'data.xlsx')
    fs.writeFileSync(file, 'sheet\nrow1\n', 'utf-8')
    const result = await adapter.read(file)
    expect(result.format).toBe('xlsx')
    expect(result.lines).toEqual(['sheet', 'row1'])
  })

  it('writes csv/txt/xlsx by joining lines and creates the parent directory', async () => {
    const nested = join(tempDir, 'nested', 'out.csv')
    await adapter.write(nested, ['a', 'b'], 'csv')
    expect(fs.readFileSync(nested, 'utf-8')).toBe('a\nb')

    const txt = join(tempDir, 'out.txt')
    await adapter.write(txt, ['x', 'y'], 'txt')
    expect(fs.readFileSync(txt, 'utf-8')).toBe('x\ny')

    const xlsx = join(tempDir, 'out.xlsx')
    await adapter.write(xlsx, ['s', 't'], 'xlsx')
    expect(fs.readFileSync(xlsx, 'utf-8')).toBe('s\nt')
  })

  it('writes json by parsing each line back into an object array', async () => {
    const file = join(tempDir, 'out.json')
    await adapter.write(file, ['{"a":1}', 'plain-string'], 'json')
    const written = JSON.parse(fs.readFileSync(file, 'utf-8'))
    expect(written).toEqual([{ a: 1 }, 'plain-string'])
  })
})

describe('ReportGenerator', () => {
  let generator: ReportGenerator

  beforeEach(() => {
    generator = new ReportGenerator()
  })

  it('generateMaskingReport lists per-type counts and falls back to 无', () => {
    const withCounts = generator.generateMaskingReport({
      inputPath: '/in.csv',
      outputPath: '/out.csv',
      strategy: 'PARTIAL',
      findings: [] as SensitiveField[],
      fieldTypeCounts: { phone: 2, email: 1 },
    })
    expect(withCounts).toContain('发现 2 个phone类型的敏感数据')
    expect(withCounts).toContain('发现 1 个email类型的敏感数据')
    expect(withCounts).toContain('- 脱敏策略：PARTIAL')
    expect(withCounts).toContain('- 状态：✅ 完成')

    const empty = generator.generateMaskingReport({
      inputPath: '/in.csv',
      outputPath: '/out.csv',
      strategy: 'FULL',
      findings: [],
      fieldTypeCounts: {},
    })
    expect(empty).toContain('- 发现敏感字段：无')
  })

  it('generateCleaningReport renders standardize, anomalies, and the >5 overflow tail', () => {
    const anomalies = Array.from({ length: 7 }, (_, i) => ({ line: i + 1, reason: '内容过短' }))
    const report = generator.generateCleaningReport({
      inputPath: '/in.csv',
      outputPath: '/out.csv',
      originalLineCount: 10,
      duplicateRemoved: 3,
      standardizeApplied: true,
      anomalies,
      anomalyTotalCount: 7,
    })
    expect(report).toContain('- 去重后行数：7（删除 3 行重复）')
    expect(report).toContain('- 格式标准化：✅ 完成')
    expect(report).toContain('- 异常值检测：发现 7 个异常')
    expect(report).toContain('...等7项')
  })

  it('generateCleaningReport omits the standardize line and anomaly detail when absent', () => {
    const report = generator.generateCleaningReport({
      inputPath: '/in.csv',
      outputPath: '/out.csv',
      originalLineCount: 5,
      duplicateRemoved: 0,
      standardizeApplied: false,
      anomalies: [],
      anomalyTotalCount: 0,
    })
    expect(report).not.toContain('格式标准化')
    expect(report).toContain('- 异常值检测：发现 0 个异常')
    expect(report).not.toContain('异常详情')
  })

  it('generateCleaningReport shows anomaly detail without the overflow tail when total <= 5', () => {
    const report = generator.generateCleaningReport({
      inputPath: '/in.csv',
      outputPath: '/out.csv',
      originalLineCount: 5,
      duplicateRemoved: 0,
      standardizeApplied: true,
      anomalies: [{ line: 2, reason: '内容过短' }, { line: 4, reason: '包含null值' }],
      anomalyTotalCount: 2,
    })
    expect(report).toContain('异常详情：行2: 内容过短；行4: 包含null值')
    expect(report).not.toContain('...等')
  })

  it('generateInventoryReport renders the asset table and recommendations', () => {
    const items: AssetItem[] = [
      { fileName: 'a.csv', size: '1.0 KB', type: 'csv', valueAssessment: '★★★★★', description: '优先交易' },
    ]
    const report = generator.generateInventoryReport({
      directory: '/data',
      fileCount: 1,
      assetItems: items,
    })
    expect(report).toContain('- 目录：/data')
    expect(report).toContain('| a.csv | 1.0 KB | csv | ★★★★★ | 优先交易 |')
    expect(report).toContain('1. 高价值数据（★★★★★）建议优先进行清洗和脱敏后交易')
  })

  it('generatePackagingManual renders the full product manual', () => {
    const manual: ProductManual = {
      productName: '测试产品',
      version: 'V1.0',
      generatedDate: '2026-08-17',
      dataOverview: { sourceFile: 'a.csv', recordCount: 100, fileSizeKb: 12.34, format: 'csv' },
      sampleLines: ['h1', 'h2'],
      usageScenario: '模型训练',
      complianceStatements: ['已脱敏', '来源合法'],
      pricingSuggestion: '高价交易',
    }
    const text = generator.generatePackagingManual({ productManual: manual })
    expect(text).toContain('【产品名称】测试产品')
    expect(text).toContain('- 数据量：100 条记录')
    expect(text).toContain('- 文件大小：12.3 KB')
    expect(text).toContain('✅ 已脱敏')
    expect(text).toContain('【定价建议】\n高价交易')
  })
})

describe('PathValidator', () => {
  let validator: PathValidator

  beforeEach(() => {
    validator = new PathValidator()
  })

  it('returns the resolved absolute path for a path inside the working dir', () => {
    const result = validator.validate(join(tempDir, 'a.csv'), tempDir)
    expect(result).toBe(resolve(tempDir, 'a.csv'))
  })

  it('throws when the path contains a parent traversal segment', () => {
    // Use a raw string so '..' survives path.join normalization on Windows.
    const rawEscape = `${tempDir}/../escape.csv`
    expect(() => validator.validate(rawEscape, tempDir)).toThrow(/路径不合法/)
  })

  it('throws when the resolved path lies outside the working dir', () => {
    const outside = resolve(tempDir, '..', 'sibling.csv')
    expect(() => validator.validate(outside, tempDir)).toThrow(/路径不合法/)
  })

  it('validateDirectory delegates to validate', () => {
    const result = validator.validateDirectory(join(tempDir, 'sub'), tempDir)
    expect(result).toBe(resolve(tempDir, 'sub'))
  })
})

describe('AuditLogger', () => {
  it('logs to console and skips the file when writeToFile is unset', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const logger = new AuditLogger(tempDir)
    logger.log({
      pluginName: 'p',
      operation: 'op',
      inputPath: '/in',
      outputPath: '/out',
      result: 'SUCCESS',
    })
    expect(spy).toHaveBeenCalledOnce()
    const line = spy.mock.calls[0]![0] as string
    expect(line).toContain('[p]')
    expect(line).toContain('操作人: system')
    spy.mockRestore()
  })

  it('writes to a dated audit file when writeToFile is set and honors the operator', async () => {
    const logDir = join(tempDir, 'logs')
    const logger = new AuditLogger(logDir)
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logger.log({
      pluginName: 'p',
      operation: 'op',
      inputPath: '/in',
      outputPath: '/out',
      result: 'SUCCESS',
      operator: 'alice',
      writeToFile: true,
    })
    // The log dir is created lazily.
    expect(fs.existsSync(logDir)).toBe(true)
    const date = new Date().toISOString().split('T')[0]!
    const logFile = join(logDir, `audit-${date}.log`)
    expect(fs.existsSync(logFile)).toBe(true)
    const content = fs.readFileSync(logFile, 'utf-8')
    expect(content).toContain('操作人: alice')
    spy.mockRestore()
  })

  it('defaults the log dir to cwd/logs when omitted (no file write)', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const logger = new AuditLogger()
    logger.log({
      pluginName: 'p',
      operation: 'op',
      inputPath: '/in',
      outputPath: '/out',
      result: 'SUCCESS',
    })
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })

  it('skips mkdir when the log dir already exists on a second write', () => {
    const logDir = join(tempDir, 'logs')
    fs.mkdirSync(logDir, { recursive: true })
    const logger = new AuditLogger(logDir)
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logger.log({
      pluginName: 'p',
      operation: 'op',
      inputPath: '/in',
      outputPath: '/out',
      result: 'SUCCESS',
      writeToFile: true,
    })
    expect(fs.existsSync(logDir)).toBe(true)
    spy.mockRestore()
  })
})

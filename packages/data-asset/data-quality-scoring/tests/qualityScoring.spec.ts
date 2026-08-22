import * as fs from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { QualityScoringConfig } from '@liuhange/dsh-data-asset-shared'
import { CompletenessScorer } from '../src/completenessScorer.js'
import { AccuracyScorer } from '../src/accuracyScorer.js'
import { ConsistencyScorer } from '../src/consistencyScorer.js'
import { TimelinessScorer } from '../src/timelinessScorer.js'
import { WeightedScoreCalculator } from '../src/weightedScoreCalculator.js'
import { IssueCollector } from '../src/issueCollector.js'
import { SuggestionGenerator } from '../src/suggestionGenerator.js'
import { QualityReportGenerator } from '../src/qualityReportGenerator.js'
import { defaultScoringRules } from '../src/defaultScoringRules.js'
import { apply, name, inject } from '../src/index.js'
import type { ScoringContext, DimensionScoringResult, QualityDimensions, QualityScoringResult } from '../src/types.js'

let tempDir: string
const originalCwd = process.cwd()

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'dsh-qscoring-'))
})

afterEach(async () => {
  process.chdir(originalCwd)
  await rm(tempDir, { recursive: true, force: true })
  vi.unstubAllEnvs()
})

function makeContext(records: Record<string, unknown>[], fieldNames: string[], config: QualityScoringConfig = defaultScoringRules): ScoringContext {
  return { records, fieldNames, config }
}

describe('defaultScoringRules', () => {
  it('provides four equal weights summing to 1 and thresholds of 60', () => {
    expect(defaultScoringRules.weights.completeness).toBe(0.25)
    expect(defaultScoringRules.weights.accuracy).toBe(0.25)
    expect(defaultScoringRules.weights.consistency).toBe(0.25)
    expect(defaultScoringRules.weights.timeliness).toBe(0.25)
    expect(defaultScoringRules.thresholds.completeness).toBe(60)
    expect(defaultScoringRules.timeliness.timestampField).toBe('updatedAt')
    expect(defaultScoringRules.completeness.missingMarkers).toContain('N/A')
  })
})

describe('CompletenessScorer', () => {
  const scorer = new CompletenessScorer()

  it('returns score 0 with no issues for empty records', () => {
    const result = scorer.score(makeContext([], []))
    expect(result.score).toBe(0)
    expect(result.issues).toEqual([])
  })

  it('returns score 0 when fieldNames is empty', () => {
    const result = scorer.score(makeContext([{ a: 1 }], []))
    expect(result.score).toBe(0)
  })

  it('scores 100 when every field is present and non-missing', () => {
    const result = scorer.score(makeContext([{ a: 'x', b: 'y' }, { a: 'z', b: 'w' }], ['a', 'b']))
    expect(result.score).toBe(100)
    expect(result.issues).toHaveLength(0)
  })

  it('counts null/undefined and marker values as missing and records issues', () => {
    const records = [
      { a: 'x', b: null },
      { a: 'N/A', b: 'y' },
    ]
    const result = scorer.score(makeContext(records, ['a', 'b']))
    // 4 total values, 2 missing -> 50
    expect(result.score).toBe(50)
    expect(result.issues).toHaveLength(2)
    expect(result.issues[0]!.description).toContain('字段 b 缺失')
    expect(result.issues[0]!.location).toBe('行 1, 列 b')
    expect(result.issues[1]!.description).toContain('字段 a 缺失')
  })

  it('treats whitespace-only strings as present unless they are markers', () => {
    const result = scorer.score(makeContext([{ a: '   ' }], ['a']))
    // '   '.trim() = '' which is in markers
    expect(result.score).toBe(0)
    expect(result.issues).toHaveLength(1)
  })
})

describe('AccuracyScorer', () => {
  const scorer = new AccuracyScorer()

  it('returns score 0 for empty records', () => {
    const result = scorer.score(makeContext([], []))
    expect(result.score).toBe(0)
    expect(result.issues).toEqual([])
  })

  it('reports a low-severity issue when a format rule references a missing field', () => {
    const config: QualityScoringConfig = {
      ...defaultScoringRules,
      accuracy: {
        formatRules: [{ fieldName: 'phone', pattern: '1[3-9]\\d{9}', weight: 1 }],
        domainRules: [],
      },
    }
    const result = scorer.score(makeContext([{ a: '1' }], ['a'], config))
    expect(result.issues.some(i => i.description.includes('格式规则引用字段 phone 不存在'))).toBe(true)
  })

  it('counts compliant and non-compliant format values and records issues', () => {
    const config: QualityScoringConfig = {
      ...defaultScoringRules,
      accuracy: {
        formatRules: [{ fieldName: 'phone', pattern: '1[3-9]\\d{9}', weight: 1 }],
        domainRules: [],
      },
    }
    const records = [{ phone: '13800138000' }, { phone: 'abc' }]
    const result = scorer.score(makeContext(records, ['phone'], config))
    expect(result.issues.some(i => i.description.includes('不符合格式规则'))).toBe(true)
    // format compliance 0.5, domain 1 (no rules) -> (0.5*0.5 + 1*0.5)*100 = 75
    expect(result.score).toBe(75)
  })

  it('reports a high-severity issue when a format regex fails to compile', () => {
    const config: QualityScoringConfig = {
      ...defaultScoringRules,
      accuracy: {
        formatRules: [{ fieldName: 'phone', pattern: '(', weight: 1 }],
        domainRules: [],
      },
    }
    const result = scorer.score(makeContext([{ phone: '13800138000' }], ['phone'], config))
    expect(result.issues.some(i => i.severity === 'high' && i.description.includes('正则编译失败'))).toBe(true)
  })

  it('skips empty values when checking format rules', () => {
    const config: QualityScoringConfig = {
      ...defaultScoringRules,
      accuracy: {
        formatRules: [{ fieldName: 'phone', pattern: '1[3-9]\\d{9}', weight: 1 }],
        domainRules: [],
      },
    }
    const result = scorer.score(makeContext([{ phone: '' }, { phone: '   ' }], ['phone'], config))
    // no non-empty values -> formatWeightSum 0 -> formatCompliance 1; domain 1 -> 100
    expect(result.score).toBe(100)
  })

  it('reports a low-severity issue when a domain rule references a missing field', () => {
    const config: QualityScoringConfig = {
      ...defaultScoringRules,
      accuracy: {
        formatRules: [],
        domainRules: [{ fieldName: 'age', min: 0, max: 150, weight: 1 }],
      },
    }
    const result = scorer.score(makeContext([{ a: '1' }], ['a'], config))
    expect(result.issues.some(i => i.description.includes('值域规则引用字段 age 不存在'))).toBe(true)
  })

  it('validates numeric domain ranges and reports out-of-range values', () => {
    const config: QualityScoringConfig = {
      ...defaultScoringRules,
      accuracy: {
        formatRules: [],
        domainRules: [{ fieldName: 'age', min: 0, max: 150, weight: 1 }],
      },
    }
    const records = [{ age: '30' }, { age: '200' }]
    const result = scorer.score(makeContext(records, ['age'], config))
    expect(result.issues.some(i => i.description.includes('超出值域'))).toBe(true)
    // domain compliance 0.5, format 1 -> 75
    expect(result.score).toBe(75)
  })

  it('reports non-numeric values in domain rules as medium issues', () => {
    const config: QualityScoringConfig = {
      ...defaultScoringRules,
      accuracy: {
        formatRules: [],
        domainRules: [{ fieldName: 'age', min: 0, max: 150, weight: 1 }],
      },
    }
    const result = scorer.score(makeContext([{ age: 'abc' }], ['age'], config))
    expect(result.issues.some(i => i.description.includes('不是数字'))).toBe(true)
  })

  it('validates allowedValues domain rules for numeric values', () => {
    const config: QualityScoringConfig = {
      ...defaultScoringRules,
      accuracy: {
        formatRules: [],
        domainRules: [{ fieldName: 'status', allowedValues: [1, 2, 3], weight: 1 }],
      },
    }
    const records = [{ status: 1 }, { status: 5 }]
    const result = scorer.score(makeContext(records, ['status'], config))
    expect(result.issues.some(i => i.description.includes('不在允许值列表中'))).toBe(true)
    expect(result.score).toBe(75)
  })

  it('scores 100 when all format and domain rules pass', () => {
    const config: QualityScoringConfig = {
      ...defaultScoringRules,
      accuracy: {
        formatRules: [{ fieldName: 'phone', pattern: '1[3-9]\\d{9}', weight: 1 }],
        domainRules: [{ fieldName: 'age', min: 0, max: 150, weight: 1 }],
      },
    }
    const records = [{ phone: '13800138000', age: '30' }]
    const result = scorer.score(makeContext(records, ['phone', 'age'], config))
    expect(result.score).toBe(100)
    expect(result.issues).toHaveLength(0)
  })
})

describe('ConsistencyScorer', () => {
  const scorer = new ConsistencyScorer()

  it('returns score 0 for empty records', () => {
    const result = scorer.score(makeContext([], []))
    expect(result.score).toBe(0)
  })

  it('returns score 100 when there are no rules to check (totalChecks 0)', () => {
    const config: QualityScoringConfig = {
      ...defaultScoringRules,
      consistency: { crossFieldRules: [] },
    }
    const result = scorer.score(makeContext([{ a: '1' }], ['a'], config))
    expect(result.score).toBe(100)
  })

  it('reports a low-severity issue when a rule references missing fields', () => {
    const config: QualityScoringConfig = {
      ...defaultScoringRules,
      consistency: { crossFieldRules: [{ name: 'r1', fields: ['x', 'y'], constraint: 'after' }] },
    }
    const result = scorer.score(makeContext([{ a: '1' }], ['a'], config))
    expect(result.issues.some(i => i.description.includes('约束规则引用字段 x, y 不存在'))).toBe(true)
  })

  it('checks after constraint: satisfied when endDate >= startDate', () => {
    const config: QualityScoringConfig = {
      ...defaultScoringRules,
      consistency: { crossFieldRules: [{ name: 'endAfterStart', fields: ['startDate', 'endDate'], constraint: 'after' }] },
    }
    const records = [{ startDate: '2026-01-01', endDate: '2026-02-01' }]
    const result = scorer.score(makeContext(records, ['startDate', 'endDate'], config))
    expect(result.score).toBe(100)
  })

  it('checks after constraint: violated when endDate < startDate', () => {
    const config: QualityScoringConfig = {
      ...defaultScoringRules,
      consistency: { crossFieldRules: [{ name: 'endAfterStart', fields: ['startDate', 'endDate'], constraint: 'after' }] },
    }
    const records = [{ startDate: '2026-02-01', endDate: '2026-01-01' }]
    const result = scorer.score(makeContext(records, ['startDate', 'endDate'], config))
    expect(result.score).toBe(0)
    expect(result.issues.some(i => i.description.includes('不满足'))).toBe(true)
  })

  it('skips after constraint when either field is null', () => {
    const config: QualityScoringConfig = {
      ...defaultScoringRules,
      consistency: { crossFieldRules: [{ name: 'endAfterStart', fields: ['startDate', 'endDate'], constraint: 'after' }] },
    }
    const records = [{ startDate: null, endDate: '2026-01-01' }]
    const result = scorer.score(makeContext(records, ['startDate', 'endDate'], config))
    expect(result.score).toBe(100)
  })

  it('checks before constraint', () => {
    const config: QualityScoringConfig = {
      ...defaultScoringRules,
      consistency: { crossFieldRules: [{ name: 'r', fields: ['a', 'b'], constraint: 'before' }] },
    }
    const ok = scorer.score(makeContext([{ a: '2026-01-01', b: '2026-02-01' }], ['a', 'b'], config))
    expect(ok.score).toBe(100)
    const bad = scorer.score(makeContext([{ a: '2026-02-01', b: '2026-01-01' }], ['a', 'b'], config))
    expect(bad.score).toBe(0)
  })

  it('checks equal constraint', () => {
    const config: QualityScoringConfig = {
      ...defaultScoringRules,
      consistency: { crossFieldRules: [{ name: 'r', fields: ['a', 'b'], constraint: 'equal' }] },
    }
    expect(scorer.score(makeContext([{ a: 'x', b: 'x' }], ['a', 'b'], config)).score).toBe(100)
    expect(scorer.score(makeContext([{ a: 'x', b: 'y' }], ['a', 'b'], config)).score).toBe(0)
  })

  it('checks notEqual constraint', () => {
    const config: QualityScoringConfig = {
      ...defaultScoringRules,
      consistency: { crossFieldRules: [{ name: 'r', fields: ['a', 'b'], constraint: 'notEqual' }] },
    }
    expect(scorer.score(makeContext([{ a: 'x', b: 'y' }], ['a', 'b'], config)).score).toBe(100)
    expect(scorer.score(makeContext([{ a: 'x', b: 'x' }], ['a', 'b'], config)).score).toBe(0)
  })

  it('checks greaterThan constraint with a threshold value', () => {
    const config: QualityScoringConfig = {
      ...defaultScoringRules,
      consistency: { crossFieldRules: [{ name: 'r', fields: ['a'], constraint: 'greaterThan', value: 10 }] },
    }
    expect(scorer.score(makeContext([{ a: '20' }], ['a'], config)).score).toBe(100)
    expect(scorer.score(makeContext([{ a: '5' }], ['a'], config)).score).toBe(0)
  })

  it('skips greaterThan when the field is null', () => {
    const config: QualityScoringConfig = {
      ...defaultScoringRules,
      consistency: { crossFieldRules: [{ name: 'r', fields: ['a'], constraint: 'greaterThan', value: 10 }] },
    }
    expect(scorer.score(makeContext([{ a: null }], ['a'], config)).score).toBe(100)
  })

  it('checks lessThan constraint with a threshold value', () => {
    const config: QualityScoringConfig = {
      ...defaultScoringRules,
      consistency: { crossFieldRules: [{ name: 'r', fields: ['a'], constraint: 'lessThan', value: 10 }] },
    }
    expect(scorer.score(makeContext([{ a: '5' }], ['a'], config)).score).toBe(100)
    expect(scorer.score(makeContext([{ a: '20' }], ['a'], config)).score).toBe(0)
  })

  it('treats an unknown constraint type as satisfied', () => {
    const config: QualityScoringConfig = {
      ...defaultScoringRules,
      consistency: { crossFieldRules: [{ name: 'r', fields: ['a', 'b'], constraint: 'weird' }] },
    }
    const result = scorer.score(makeContext([{ a: '1', b: '2' }], ['a', 'b'], config))
    expect(result.score).toBe(100)
  })
})

describe('TimelinessScorer', () => {
  const scorer = new TimelinessScorer()

  it('returns score 0 for empty records', () => {
    const result = scorer.score(makeContext([], []))
    expect(result.score).toBe(0)
  })

  it('returns score 0 with a high-severity issue when the timestamp field is missing', () => {
    const result = scorer.score(makeContext([{ a: '1' }], ['a']))
    expect(result.score).toBe(0)
    expect(result.issues.some(i => i.severity === 'high' && i.description.includes('时间戳字段 updatedAt 不存在'))).toBe(true)
  })

  it('scores 100 for fresh data within the threshold', () => {
    const recent = new Date(Date.now() - 1000).toISOString()
    const result = scorer.score(makeContext([{ updatedAt: recent }], ['updatedAt']))
    expect(result.score).toBe(100)
  })

  it('scores below 100 and records issues for stale data', () => {
    const stale = new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString()
    const result = scorer.score(makeContext([{ updatedAt: stale }], ['updatedAt']))
    expect(result.score).toBe(0)
    expect(result.issues.some(i => i.description.includes('数据已过期'))).toBe(true)
  })

  it('reports a medium issue for unparseable timestamp values', () => {
    const result = scorer.score(makeContext([{ updatedAt: 'not-a-date' }], ['updatedAt']))
    expect(result.issues.some(i => i.description.includes('无法解析为日期'))).toBe(true)
  })

  it('returns score 0 when all timestamp values are empty or invalid', () => {
    const result = scorer.score(makeContext([{ updatedAt: '' }, { updatedAt: 'bad' }], ['updatedAt']))
    expect(result.score).toBe(0)
  })

  it('skips empty timestamp values', () => {
    const recent = new Date(Date.now() - 1000).toISOString()
    const result = scorer.score(makeContext([{ updatedAt: '' }, { updatedAt: recent }], ['updatedAt']))
    expect(result.score).toBe(100)
  })
})

describe('WeightedScoreCalculator', () => {
  const calc = new WeightedScoreCalculator()

  function makeDimensions(scores: { c: number; a: number; s: number; t: number }, weights: QualityScoringConfig['weights']): QualityDimensions {
    return {
      completeness: { score: scores.c, weight: weights.completeness, weightNormalized: weights.completeness, issues: [] },
      accuracy: { score: scores.a, weight: weights.accuracy, weightNormalized: weights.accuracy, issues: [] },
      consistency: { score: scores.s, weight: weights.consistency, weightNormalized: weights.consistency, issues: [] },
      timeliness: { score: scores.t, weight: weights.timeliness, weightNormalized: weights.timeliness, issues: [] },
    }
  }

  it('keeps weights as-is when they already sum to 1', () => {
    const weights = { completeness: 0.25, accuracy: 0.25, consistency: 0.25, timeliness: 0.25 }
    const dims = makeDimensions({ c: 80, a: 90, s: 70, t: 60 }, weights)
    const result = calc.calculate(dims, weights)
    expect(result.weightsNormalized).toBe(false)
    expect(result.totalScore).toBe(75)
  })

  it('normalizes weights when they do not sum to 1', () => {
    const weights = { completeness: 1, accuracy: 1, consistency: 1, timeliness: 1 }
    const dims = makeDimensions({ c: 80, a: 90, s: 70, t: 60 }, weights)
    const result = calc.calculate(dims, weights)
    expect(result.weightsNormalized).toBe(true)
    expect(result.normalizedWeights.completeness).toBeCloseTo(0.25)
    expect(result.totalScore).toBe(75)
  })
})

describe('IssueCollector', () => {
  const collector = new IssueCollector()

  it('flattens issues from all dimension results', () => {
    const results: DimensionScoringResult[] = [
      { score: 50, issues: [{ dimension: 'completeness', description: 'a', location: 'l1', severity: 'medium' }] },
      { score: 80, issues: [{ dimension: 'accuracy', description: 'b', location: 'l2', severity: 'low' }] },
      { score: 100, issues: [] },
    ]
    const issues = collector.collect(results)
    expect(issues).toHaveLength(2)
    expect(issues[0]!.description).toBe('a')
    expect(issues[1]!.description).toBe('b')
  })

  it('returns an empty array when no results have issues', () => {
    expect(collector.collect([{ score: 100, issues: [] }])).toEqual([])
  })
})

describe('SuggestionGenerator', () => {
  const gen = new SuggestionGenerator()

  function makeDims(scores: { c: number; a: number; s: number; t: number }): QualityDimensions {
    return {
      completeness: { score: scores.c, weight: 0.25, weightNormalized: 0.25, issues: [] },
      accuracy: { score: scores.a, weight: 0.25, weightNormalized: 0.25, issues: [] },
      consistency: { score: scores.s, weight: 0.25, weightNormalized: 0.25, issues: [] },
      timeliness: { score: scores.t, weight: 0.25, weightNormalized: 0.25, issues: [] },
    }
  }

  it('returns no suggestions when all dimensions meet thresholds', () => {
    const dims = makeDims({ c: 80, a: 80, s: 80, t: 80 })
    expect(gen.generate(dims, defaultScoringRules.thresholds)).toEqual([])
  })

  it('suggests improvements for each dimension below its threshold', () => {
    const dims = makeDims({ c: 50, a: 50, s: 50, t: 50 })
    const suggestions = gen.generate(dims, defaultScoringRules.thresholds)
    expect(suggestions).toHaveLength(4)
    expect(suggestions[0]!).toContain('完整性得分 50')
    expect(suggestions[1]!).toContain('准确性得分 50')
    expect(suggestions[2]!).toContain('一致性得分 50')
    expect(suggestions[3]!).toContain('时效性得分 50')
  })

  it('suggests only for the dimensions that fall below threshold', () => {
    const dims = makeDims({ c: 50, a: 80, s: 80, t: 80 })
    const suggestions = gen.generate(dims, defaultScoringRules.thresholds)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]!).toContain('完整性')
  })
})

describe('QualityReportGenerator', () => {
  const generator = new QualityReportGenerator()

  function makeResult(issues: QualityScoringResult['issues'], suggestions: string[]): QualityScoringResult {
    return {
      totalScore: 75,
      dimensions: {
        completeness: { score: 80, weight: 0.25, weightNormalized: 0.25, issues: [] },
        accuracy: { score: 70, weight: 0.25, weightNormalized: 0.25, issues: [] },
        consistency: { score: 80, weight: 0.25, weightNormalized: 0.25, issues: [] },
        timeliness: { score: 70, weight: 0.25, weightNormalized: 0.25, issues: [] },
      },
      issues,
      suggestions,
      weightsNormalized: false,
      scoredAt: '2026-08-22T00:00:00.000Z',
    }
  }

  it('writeJson creates the parent dir and writes valid JSON', async () => {
    const out = join(tempDir, 'nested', 'quality_report.json')
    await generator.writeJson(out, makeResult([], []))
    const parsed = JSON.parse(fs.readFileSync(out, 'utf-8'))
    expect(parsed.totalScore).toBe(75)
    expect(parsed.dimensions.completeness.score).toBe(80)
  })

  it('writeMarkdown renders the dimension table, no-issue and no-suggestion sections', async () => {
    const out = join(tempDir, 'quality_report.md')
    await generator.writeMarkdown(out, makeResult([], []))
    const md = fs.readFileSync(out, 'utf-8')
    expect(md).toContain('【数据质量评分报告】')
    expect(md).toContain('| 完整性 | 80 | 0.25 | 否 |')
    expect(md).toContain('无问题')
    expect(md).toContain('各维度得分均高于阈值，无需改进')
  })

  it('writeMarkdown renders issue and suggestion detail sections', async () => {
    const issues = [{ dimension: 'completeness' as const, description: '字段 a 缺失', location: '行 1', severity: 'medium' as const }]
    const out = join(tempDir, 'quality_report.md')
    await generator.writeMarkdown(out, makeResult(issues, ['补充缺失数据']))
    const md = fs.readFileSync(out, 'utf-8')
    expect(md).toContain('| completeness | 字段 a 缺失 | 行 1 | medium |')
    expect(md).toContain('- 补充缺失数据')
  })
})

describe('apply (data-quality-scoring plugin)', () => {
  it('exports name, inject, and registers the score_data_quality tool', () => {
    expect(name).toBe('data-quality-scoring')
    expect(inject).toEqual(['tools'])
  })

  it('execute scores a CSV file and writes JSON + Markdown reports', async () => {
    process.chdir(tempDir)
    const csv = join(tempDir, 'data.csv')
    fs.writeFileSync(csv, 'name,phone,updatedAt\nAlice,13800138000,2026-08-22T00:00:00.000Z\nBob,13900139000,2026-08-22T00:00:00.000Z\n', 'utf-8')

    const registered: { execute: (args: Record<string, unknown>) => Promise<string> }[] = []
    const ctx = { tools: { register: (tool: unknown) => { registered.push(tool as { execute: (args: Record<string, unknown>) => Promise<string> }) } } }
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    apply(ctx as never)
    expect(registered).toHaveLength(1)
    consoleSpy.mockRestore()

    const result = await registered[0]!.execute({ filePath: 'data.csv' })
    const parsed = JSON.parse(result) as { status: string; totalScore: number; jsonReportPath: string; markdownReportPath: string }
    expect(parsed.status).toBe('SUCCESS')
    expect(parsed.totalScore).toBeGreaterThanOrEqual(0)
    expect(fs.existsSync(parsed.jsonReportPath)).toBe(true)
    expect(fs.existsSync(parsed.markdownReportPath)).toBe(true)
  })

  it('execute returns an error string for an invalid path traversal', async () => {
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
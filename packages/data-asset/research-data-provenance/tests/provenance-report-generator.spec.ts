import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ProvenanceReportGenerator } from '../src/provenance-report-generator.js'
import { defaultRemediationSuggestionConfig } from '../src/default-quality-dimension-config.js'
import { LEGAL_DISCLAIMER } from '../src/invariant.js'
import type {
  LineageDetectionResult,
  ReproducibilityResult,
  QualityDimensionScore,
} from '../src/types.js'

let tempDir: string

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'prov-report-'))
})

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

const lineageResult: LineageDetectionResult = {
  completenessScore: 80,
  missingItems: ['血缘缺失：采集方法'],
  brokenPoints: [],
  policyBasis: '依据：《科学数据管理办法》（国办发〔2018〕17号）第九条',
  judgmentStatus: '自动判定',
}

const reproducibilityResult: ReproducibilityResult = {
  reproducibilityScore: 66.67,
  missingItems: ['参数不完整'],
  policyBasis: '依据：《科学数据管理办法》（国办发〔2018〕17号）第十一条',
  judgmentStatus: '自动判定',
  skipped: false,
}

const qualityScores: QualityDimensionScore[] = [
  { dimension: '准确性', score: 100, issues: [], policyBasis: '依据：《高质量数据集 建设指南》（TC609-5-2025-01）准确性维度', judgmentStatus: '自动判定' },
  { dimension: '完整性', score: 80, issues: ['存在缺失值'], policyBasis: '依据：《高质量数据集 建设指南》（TC609-5-2025-01）完整性维度', judgmentStatus: '自动判定' },
  { dimension: '一致性', score: 100, issues: [], policyBasis: '依据：《高质量数据集 建设指南》（TC609-5-2025-01）一致性维度', judgmentStatus: '自动判定' },
  { dimension: '时效性', score: 100, issues: [], policyBasis: '依据：《高质量数据集 建设指南》（TC609-5-2025-01）时效性维度', judgmentStatus: '自动判定' },
  { dimension: '规范性', score: 100, issues: [], policyBasis: '依据：《高质量数据集 建设指南》（TC609-5-2025-01）规范性维度', judgmentStatus: '自动判定' },
  { dimension: '安全性', score: 70, issues: ['敏感字段未标识'], policyBasis: '依据：《高质量数据集 建设指南》（TC609-5-2025-01）安全性维度', judgmentStatus: '自动判定' },
]

describe('ProvenanceReportGenerator', () => {
  it('报告包含七部分完整内容', () => {
    const gen = new ProvenanceReportGenerator()
    const report = gen.generate({
      datasetId: 'ds-001',
      lineageResult,
      reproducibilityResult,
      qualityScores,
      overrideList: [],
      errorList: [],
      configVersions: { qualityDimensionConfigVersion: '1.0.0', remediationSuggestionConfigVersion: '1.0.0' },
      remediationSuggestionConfig: defaultRemediationSuggestionConfig,
    })
    expect(report.reportId).toBeDefined()
    expect(report.auditTime).toBeDefined()
    expect(report.datasetId).toBe('ds-001')
    expect(report.lineageResult).toBeDefined()
    expect(report.reproducibilityResult).toBeDefined()
    expect(report.qualityScores).toHaveLength(6)
    expect(report.overrideList).toBeDefined()
    expect(report.remediationSuggestions).toBeDefined()
    expect(report.policyBasisSummary).toBeDefined()
    expect(report.configVersions).toBeDefined()
    expect(report.legalDisclaimer).toBeDefined()
  })

  it('双法规政策依据可追溯', () => {
    const gen = new ProvenanceReportGenerator()
    const report = gen.generate({
      datasetId: 'ds-001',
      lineageResult,
      reproducibilityResult,
      qualityScores,
      overrideList: [],
      errorList: [],
      configVersions: { qualityDimensionConfigVersion: '1.0.0', remediationSuggestionConfigVersion: '1.0.0' },
      remediationSuggestionConfig: defaultRemediationSuggestionConfig,
    })
    expect(report.policyBasisSummary.some((p) => p.includes('科学数据管理办法'))).toBe(true)
    expect(report.policyBasisSummary.some((p) => p.includes('高质量数据集 建设指南'))).toBe(true)
    expect(report.lineageResult.policyBasis).toContain('第九条')
    expect(report.reproducibilityResult.policyBasis).toContain('第十一条')
  })

  it('法律免责声明固定存在', () => {
    const gen = new ProvenanceReportGenerator()
    const report = gen.generate({
      datasetId: 'ds-001',
      lineageResult,
      reproducibilityResult,
      qualityScores,
      overrideList: [],
      errorList: [],
      configVersions: { qualityDimensionConfigVersion: '1.0.0', remediationSuggestionConfigVersion: '1.0.0' },
      remediationSuggestionConfig: defaultRemediationSuggestionConfig,
    })
    expect(report.legalDisclaimer).toBe(LEGAL_DISCLAIMER)
  })

  it('配置版本号记录', () => {
    const gen = new ProvenanceReportGenerator()
    const report = gen.generate({
      datasetId: 'ds-001',
      lineageResult,
      reproducibilityResult,
      qualityScores,
      overrideList: [],
      errorList: [],
      configVersions: { qualityDimensionConfigVersion: '2.1.0', remediationSuggestionConfigVersion: '1.3.0' },
      remediationSuggestionConfig: defaultRemediationSuggestionConfig,
    })
    expect(report.configVersions.qualityDimensionConfigVersion).toBe('2.1.0')
    expect(report.configVersions.remediationSuggestionConfigVersion).toBe('1.3.0')
  })

  it('报告不含原始数据内容', () => {
    const gen = new ProvenanceReportGenerator()
    const report = gen.generate({
      datasetId: 'ds-001',
      lineageResult,
      reproducibilityResult,
      qualityScores,
      overrideList: [],
      errorList: [],
      configVersions: { qualityDimensionConfigVersion: '1.0.0', remediationSuggestionConfigVersion: '1.0.0' },
      remediationSuggestionConfig: defaultRemediationSuggestionConfig,
    })
    const serialized = JSON.stringify(report)
    expect(serialized).not.toContain('rawDataContent')
    expect(serialized).not.toContain('sensitiveFieldValue')
  })

  it('整改建议非空且对应缺失项', () => {
    const gen = new ProvenanceReportGenerator()
    const report = gen.generate({
      datasetId: 'ds-001',
      lineageResult,
      reproducibilityResult,
      qualityScores,
      overrideList: [],
      errorList: [],
      configVersions: { qualityDimensionConfigVersion: '1.0.0', remediationSuggestionConfigVersion: '1.0.0' },
      remediationSuggestionConfig: defaultRemediationSuggestionConfig,
    })
    expect(report.remediationSuggestions.length).toBeGreaterThan(0)
    expect(report.remediationSuggestions.some((s) => s.missingItemType === '血缘缺失：采集方法')).toBe(true)
  })

  it('writeJson 输出 JSON 文件', () => {
    const gen = new ProvenanceReportGenerator()
    const report = gen.generate({
      datasetId: 'ds-001',
      lineageResult,
      reproducibilityResult,
      qualityScores,
      overrideList: [],
      errorList: [],
      configVersions: { qualityDimensionConfigVersion: '1.0.0', remediationSuggestionConfigVersion: '1.0.0' },
      remediationSuggestionConfig: defaultRemediationSuggestionConfig,
    })
    const path = gen.writeJson(report, tempDir)
    expect(existsSync(path)).toBe(true)
    const content = readFileSync(path, 'utf-8')
    expect(JSON.parse(content).datasetId).toBe('ds-001')
  })

  it('writeMarkdown 输出 Markdown 文件', () => {
    const gen = new ProvenanceReportGenerator()
    const report = gen.generate({
      datasetId: 'ds-001',
      lineageResult,
      reproducibilityResult,
      qualityScores,
      overrideList: [],
      errorList: [],
      configVersions: { qualityDimensionConfigVersion: '1.0.0', remediationSuggestionConfigVersion: '1.0.0' },
      remediationSuggestionConfig: defaultRemediationSuggestionConfig,
    })
    const path = gen.writeMarkdown(report, tempDir)
    expect(existsSync(path)).toBe(true)
    const content = readFileSync(path, 'utf-8')
    expect(content).toContain('科研数据溯源审计报告')
    expect(content).toContain(LEGAL_DISCLAIMER)
  })
})
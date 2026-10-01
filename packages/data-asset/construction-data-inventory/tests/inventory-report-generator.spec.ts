import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { existsSync, rmSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { InventoryReportGenerator } from '../src/inventory-report-generator.js'
import type {
  ChangeTraceabilityResult,
  ClassificationEncodingEntry,
  ConfigVersionSet,
  UnifiedAssetItem,
} from '../src/types.js'
import { LEGAL_DISCLAIMER } from '../src/invariant.js'

const tmpDir = resolve(process.cwd(), 'tmp-test-report')

describe('InventoryReportGenerator', () => {
  let generator: InventoryReportGenerator

  beforeEach(() => {
    generator = new InventoryReportGenerator()
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true })
    }
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  const sampleAssets: UnifiedAssetItem[] = [
    {
      assetId: 'A-001',
      sourceSystemId: 'sys-1',
      dataType: 'BIM构件-元素',
      projectId: 'proj-1',
      collectionTime: '2024-01-01',
      classificationCode: '14',
      assetCode: '000140001X',
      judgmentStatus: '自动判定',
      policyBasis: '依据：《建筑信息模型分类和编码标准》（GB/T 51269-2017）分类体系',
    },
  ]

  const sampleClassificationEncodingList: ClassificationEncodingEntry[] = [
    {
      assetId: 'A-001',
      classificationCode: '14',
      assetCode: '000140001X',
      policyBasis: '依据：《建筑信息模型分类和编码标准》（GB/T 51269-2017）编码规则',
      judgmentStatus: '自动判定',
    },
  ]

  const sampleChangeTraceability: ChangeTraceabilityResult[] = []

  const sampleConfigVersions: ConfigVersionSet = {
    classificationConfigVersion: '1.0.0',
    encodingRuleConfigVersion: '1.0.0',
    sourceAdapterConfigVersion: '1.0.0',
  }

  it('报告包含七个部分', () => {
    const report = generator.generate({
      assetList: sampleAssets,
      classificationEncodingList: sampleClassificationEncodingList,
      changeTraceabilityReport: sampleChangeTraceability,
      overrideList: [],
      errorList: [],
      configVersions: sampleConfigVersions,
      projectId: 'proj-1',
    })

    expect(report.reportId).toBeDefined()
    expect(report.inventoryTime).toBeDefined()
    expect(report.projectId).toBe('proj-1')
    expect(Array.isArray(report.assetList)).toBe(true)
    expect(Array.isArray(report.classificationEncodingList)).toBe(true)
    expect(Array.isArray(report.changeTraceabilityReport)).toBe(true)
    expect(Array.isArray(report.overrideList)).toBe(true)
    expect(Array.isArray(report.errorList)).toBe(true)
    expect(Array.isArray(report.policyBasisSummary)).toBe(true)
    expect(report.configVersions).toBeDefined()
    expect(report.legalDisclaimer).toBeDefined()
  })

  it('法律免责声明固定文本', () => {
    const report = generator.generate({
      assetList: [],
      classificationEncodingList: [],
      changeTraceabilityReport: [],
      overrideList: [],
      errorList: [],
      configVersions: sampleConfigVersions,
      projectId: 'proj-1',
    })

    expect(report.legalDisclaimer).toBe(LEGAL_DISCLAIMER)
    expect(report.legalDisclaimer).toBe('本报告由辅助盘点工具生成，不替代GB/T 51269标准的正式合规认证')
  })

  it('配置版本记录', () => {
    const report = generator.generate({
      assetList: [],
      classificationEncodingList: [],
      changeTraceabilityReport: [],
      overrideList: [],
      errorList: [],
      configVersions: sampleConfigVersions,
      projectId: 'proj-1',
    })

    expect(report.configVersions.classificationConfigVersion).toBe('1.0.0')
    expect(report.configVersions.encodingRuleConfigVersion).toBe('1.0.0')
    expect(report.configVersions.sourceAdapterConfigVersion).toBe('1.0.0')
  })

  it('政策依据汇总去重', () => {
    const assets: UnifiedAssetItem[] = [
      {
        ...sampleAssets[0]!,
        policyBasis: '依据：《建筑信息模型分类和编码标准》（GB/T 51269-2017）分类体系',
      },
      {
        ...sampleAssets[0]!,
        assetId: 'A-002',
        policyBasis: '依据：《建筑信息模型分类和编码标准》（GB/T 51269-2017）分类体系',
      },
    ]
    const report = generator.generate({
      assetList: assets,
      classificationEncodingList: sampleClassificationEncodingList,
      changeTraceabilityReport: [],
      overrideList: [],
      errorList: [],
      configVersions: sampleConfigVersions,
      projectId: 'proj-1',
    })

    const basisCount = report.policyBasisSummary.filter((b) => b.includes('分类体系')).length
    expect(basisCount).toBe(1)
  })

  it('输出 JSON 格式报告', () => {
    const report = generator.generate({
      assetList: sampleAssets,
      classificationEncodingList: sampleClassificationEncodingList,
      changeTraceabilityReport: [],
      overrideList: [],
      errorList: [],
      configVersions: sampleConfigVersions,
      projectId: 'proj-1',
    })
    const path = generator.writeJson(report, tmpDir)

    expect(existsSync(path)).toBe(true)
  })

  it('输出 Markdown 格式报告', () => {
    const report = generator.generate({
      assetList: sampleAssets,
      classificationEncodingList: sampleClassificationEncodingList,
      changeTraceabilityReport: [],
      overrideList: [],
      errorList: [],
      configVersions: sampleConfigVersions,
      projectId: 'proj-1',
    })
    const path = generator.writeMarkdown(report, tmpDir)

    expect(existsSync(path)).toBe(true)
  })

  it('输出资产台账', () => {
    const path = generator.exportLedger(sampleAssets, tmpDir)

    expect(existsSync(path)).toBe(true)
  })
})
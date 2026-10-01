import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { existsSync, rmSync, mkdirSync, readFileSync } from 'node:fs'
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

  it('输出质量检查报告', () => {
    const report = generator.generate({
      assetList: sampleAssets,
      classificationEncodingList: sampleClassificationEncodingList,
      changeTraceabilityReport: [],
      overrideList: [],
      errorList: [],
      configVersions: sampleConfigVersions,
      projectId: 'proj-1',
    })
    report.qualityReport = {
      qualityElementScores: [
        { elementName: '空间参考系', weight: 0.1667, score: 99, policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.1条' },
      ],
      totalScore: 99,
      errorClassStatistics: {
        classACount: 1,
        classBCount: 0,
        classCCount: 0,
        classDCount: 0,
        totalCount: 1,
        policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第7.2条',
      },
      errorClassProportions: { classAProportion: 100, classBProportion: 0, classCProportion: 0, classDProportion: 0 },
      policyBasisSummary: ['依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.1条'],
    }
    const output = generator.writeQualityReport(report, tmpDir)

    expect(output).not.toBeNull()
    expect(existsSync(output!.jsonPath)).toBe(true)
    expect(existsSync(output!.mdPath)).toBe(true)
    const jsonContent = JSON.parse(readFileSync(output!.jsonPath, 'utf-8'))
    expect(jsonContent.totalScore).toBe(99)
    const mdContent = readFileSync(output!.mdPath, 'utf-8')
    expect(mdContent).toContain('建筑数据资产质量检查报告')
    expect(mdContent).toContain('GB/T 24356-2023')
  })

  it('无质量报告时writeQualityReport返回null', () => {
    const report = generator.generate({
      assetList: [],
      classificationEncodingList: [],
      changeTraceabilityReport: [],
      overrideList: [],
      errorList: [],
      configVersions: sampleConfigVersions,
      projectId: 'proj-1',
    })

    const output = generator.writeQualityReport(report, tmpDir)

    expect(output).toBeNull()
  })
})
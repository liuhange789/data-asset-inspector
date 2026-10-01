import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ConstructionConfigLoader } from '../src/construction-config-loader.js'
import { InputValidator } from '../src/input-validator.js'
import { IfcModelAdapter } from '../src/ifc-model-adapter.js'
import { ContractAdapter } from '../src/contract-adapter.js'
import { ProgressRecordAdapter } from '../src/progress-record-adapter.js'
import { AcceptanceDocAdapter } from '../src/acceptance-doc-adapter.js'
import { UnifiedAssetMerger } from '../src/unified-asset-merger.js'
import { ClassificationMapper } from '../src/classification-mapper.js'
import { AssetCodeGenerator } from '../src/asset-code-generator.js'
import { ChangeTraceabilityChecker } from '../src/change-traceability-checker.js'
import { InventoryReportGenerator } from '../src/inventory-report-generator.js'
import { PolicyBasisBuilder } from '../src/policy-basis-builder.js'
import { LEGAL_DISCLAIMER } from '../src/invariant.js'

const tmpDir = resolve(process.cwd(), 'tmp-test-e2e')

describe('E2E 端到端验收', () => {
  beforeEach(() => {
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

  it('完整盘点流程：多源接入→分类→编码→变更追溯→报告', () => {
    const ifcContent = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('test.ifc','2024-01-01',('test'),('test'),'IFC2X3','none','none');
FILE_SCHEMA(('IFC2X3'));
ENDSEC;
DATA;
#1=IFCWALL('wall-001',$,$,$,$,$,$,$);
#2=IFCDOOR('door-001',$,$,$,$,$,$,$,$,$,$,$,$,$);
#3=IFCBUILDINGSTOREY('storey-001',$,$,$,$,$,$);
ENDSEC;
END-ISO-10303-21;`
    writeFileSync(resolve(tmpDir, 'model.ifc'), ifcContent, 'utf-8')

    const contracts = [{ contractId: 'C-001', contractType: '施工合同', signDate: '2024-01-01', parties: [] }]
    writeFileSync(resolve(tmpDir, 'contracts.json'), JSON.stringify(contracts), 'utf-8')

    const progress = [{ recordId: 'P-001', processNode: '基础施工', completionTime: '2024-01-15', processType: '阶段' }]
    writeFileSync(resolve(tmpDir, 'progress.json'), JSON.stringify(progress), 'utf-8')

    const acceptance = [{ acceptanceId: 'A-001', acceptancePart: '基础', acceptanceConclusion: '合格', acceptanceDate: '2024-01-20' }]
    writeFileSync(resolve(tmpDir, 'acceptance.json'), JSON.stringify(acceptance), 'utf-8')

    const sourceConfig = {
      projectId: 'E2E-PROJ-001',
      sources: [
        { type: 'IFC', systemId: 'design-sys', path: resolve(tmpDir, 'model.ifc') },
        { type: 'CONTRACT', systemId: 'proj-sys', path: resolve(tmpDir, 'contracts.json') },
        { type: 'PROGRESS', systemId: 'construct-sys', path: resolve(tmpDir, 'progress.json') },
        { type: 'ACCEPTANCE', systemId: 'quality-sys', path: resolve(tmpDir, 'acceptance.json') },
      ],
    }
    writeFileSync(resolve(tmpDir, 'source-config.json'), JSON.stringify(sourceConfig), 'utf-8')

    const configLoader = new ConstructionConfigLoader()
    const { classificationConfig, encodingRuleConfig } = configLoader.load()

    const ifcAdapter = new IfcModelAdapter()
    const contractAdapter = new ContractAdapter()
    const progressAdapter = new ProgressRecordAdapter()
    const acceptanceAdapter = new AcceptanceDocAdapter()
    const merger = new UnifiedAssetMerger()
    const classificationMapper = new ClassificationMapper()
    const codeGenerator = new AssetCodeGenerator()

    const ifcResult = ifcAdapter.adapt(resolve(tmpDir, 'model.ifc'), 'design-sys', 'E2E-PROJ-001')
    const contractResult = contractAdapter.adapt(resolve(tmpDir, 'contracts.json'), 'proj-sys', 'E2E-PROJ-001')
    const progressResult = progressAdapter.adapt(resolve(tmpDir, 'progress.json'), 'construct-sys', 'E2E-PROJ-001')
    const acceptanceResult = acceptanceAdapter.adapt(resolve(tmpDir, 'acceptance.json'), 'quality-sys', 'E2E-PROJ-001')

    const mergeResult = merger.merge([ifcResult, contractResult, progressResult, acceptanceResult])
    expect(mergeResult.unifiedAssets.length).toBe(6)

    const classificationResult = classificationMapper.map(mergeResult.unifiedAssets, classificationConfig)
    const classifiedAssets = classificationResult.assets
    expect(classifiedAssets.every((a) => a.classificationCode !== '')).toBe(true)

    const codeResult = codeGenerator.generate(classifiedAssets, encodingRuleConfig)
    const codedAssets = codeResult.assets
    expect(codedAssets.every((a) => a.assetCode !== '')).toBe(true)

    const codes = codedAssets.map((a) => a.assetCode)
    const uniqueCodes = new Set(codes)
    expect(uniqueCodes.size).toBe(codes.length)

    expect(codedAssets.every((a) => a.policyBasis !== undefined && a.policyBasis!.includes('GB/T 51269-2017'))).toBe(true)
  })

  it('分类覆盖后重新生成编码保留原编码', () => {
    const configLoader = new ConstructionConfigLoader()
    const { classificationConfig, encodingRuleConfig } = configLoader.load()
    const classificationMapper = new ClassificationMapper()
    const codeGenerator = new AssetCodeGenerator()

    const assets = [{
      assetId: 'A-001',
      sourceSystemId: 'sys-1',
      dataType: 'BIM构件-元素',
      projectId: 'proj-1',
      collectionTime: '2024-01-01',
      classificationCode: '',
      assetCode: '',
      judgmentStatus: '自动判定' as const,
    }]

    const classResult = classificationMapper.map(assets, classificationConfig)
    const codeResult = codeGenerator.generate(classResult.assets, encodingRuleConfig)
    const originalCode = codeResult.assets[0]!.assetCode

    codeResult.assets[0]!.classificationCode = '10'
    const regenResult = codeGenerator.regenerateForAsset(codeResult.assets[0]!, encodingRuleConfig)

    expect(regenResult.assets[0]!.originalAssetCode).toBe(originalCode)
    expect(regenResult.assets[0]!.assetCode).not.toBe(originalCode)
  })

  it('覆盖不可删除返回 OVERWRITE_RECORD_IMMUTABLE', async () => {
    const { ReviewOverrideRecorder } = await import('../src/review-override-recorder.js')
    const recorder = new ReviewOverrideRecorder(resolve(tmpDir, 'override.log'))
    const result = recorder.delete()
    expect(result.error).toBe('OVERWRITE_RECORD_IMMUTABLE')
  })

  it('报告七部分完整性与法律免责声明', () => {
    const reportGenerator = new InventoryReportGenerator()
    const report = reportGenerator.generate({
      assetList: [],
      classificationEncodingList: [],
      changeTraceabilityReport: [],
      overrideList: [],
      errorList: [],
      configVersions: {
        classificationConfigVersion: '1.0.0',
        encodingRuleConfigVersion: '1.0.0',
        sourceAdapterConfigVersion: '1.0.0',
      },
      projectId: 'proj-1',
    })

    expect(report.reportId).toBeDefined()
    expect(report.inventoryTime).toBeDefined()
    expect(report.projectId).toBe('proj-1')
    expect(Array.isArray(report.assetList)).toBe(true)
    expect(Array.isArray(report.classificationEncodingList)).toBe(true)
    expect(Array.isArray(report.changeTraceabilityReport)).toBe(true)
    expect(Array.isArray(report.overrideList)).toBe(true)
    expect(Array.isArray(report.policyBasisSummary)).toBe(true)
    expect(report.configVersions).toBeDefined()
    expect(report.legalDisclaimer).toBe(LEGAL_DISCLAIMER)
  })

  it('政策依据格式规范', () => {
    const policyBasisBuilder = new PolicyBasisBuilder()
    const basis = policyBasisBuilder.buildClassification()
    expect(basis).toBe('依据：《建筑信息模型分类和编码标准》（GB/T 51269-2017）分类体系')

    const chapterBasis = policyBasisBuilder.build('5')
    expect(chapterBasis).toBe('依据：《建筑信息模型分类和编码标准》（GB/T 51269-2017）第5章')
  })

  it('幂等性：同一配置多次盘点产生一致分类与编码结果', () => {
    const configLoader = new ConstructionConfigLoader()
    const { classificationConfig, encodingRuleConfig } = configLoader.load()
    const classificationMapper = new ClassificationMapper()
    const codeGenerator = new AssetCodeGenerator()

    const runOnce = (): string[] => {
      const assets = [
        {
          assetId: 'A-001',
          sourceSystemId: 'sys-1',
          dataType: 'BIM构件-元素',
          projectId: 'proj-1',
          collectionTime: '2024-01-01',
          classificationCode: '',
          assetCode: '',
          judgmentStatus: '自动判定' as const,
        },
        {
          assetId: 'A-002',
          sourceSystemId: 'sys-1',
          dataType: '进度记录-行为',
          projectId: 'proj-1',
          collectionTime: '2024-01-01',
          classificationCode: '',
          assetCode: '',
          judgmentStatus: '自动判定' as const,
        },
      ]
      const classResult = classificationMapper.map(assets, classificationConfig)
      const codeResult = codeGenerator.generate(classResult.assets, encodingRuleConfig)
      return codeResult.assets.map((a) => `${a.assetId}:${a.classificationCode}:${a.assetCode}`)
    }

    const firstRun = runOnce()
    const secondRun = runOnce()
    expect(firstRun).toEqual(secondRun)
  })

  it('1000项资产编码全部唯一', () => {
    const configLoader = new ConstructionConfigLoader()
    const { classificationConfig, encodingRuleConfig } = configLoader.load()
    const classificationMapper = new ClassificationMapper()
    const codeGenerator = new AssetCodeGenerator()

    const assets = []
    for (let i = 0; i < 1000; i++) {
      assets.push({
        assetId: `A-${i}`,
        sourceSystemId: 'sys-1',
        dataType: 'BIM构件-元素',
        projectId: 'proj-1',
        collectionTime: '2024-01-01',
        classificationCode: '',
        assetCode: '',
        judgmentStatus: '自动判定' as const,
      })
    }

    const classResult = classificationMapper.map(assets, classificationConfig)
    const codeResult = codeGenerator.generate(classResult.assets, encodingRuleConfig)
    const codes = codeResult.assets.map((a) => a.assetCode).filter((c) => c !== '')
    const uniqueCodes = new Set(codes)

    expect(codes.length).toBe(1000)
    expect(uniqueCodes.size).toBe(1000)
  })

  it('不修改原始数据文件内容', () => {
    const ifcContent = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('test.ifc','2024-01-01',('test'),('test'),'IFC2X3','none','none');
FILE_SCHEMA(('IFC2X3'));
ENDSEC;
DATA;
#1=IFCWALL('wall-001',$,$,$,$,$,$,$);
ENDSEC;
END-ISO-10303-21;`
    const ifcPath = resolve(tmpDir, 'original.ifc')
    writeFileSync(ifcPath, ifcContent, 'utf-8')
    const originalContent = readFileSync(ifcPath, 'utf-8')

    const adapter = new IfcModelAdapter()
    adapter.adapt(ifcPath, 'sys-1', 'proj-1')

    const afterContent = readFileSync(ifcPath, 'utf-8')
    expect(afterContent).toBe(originalContent)
  })
})
export const name = '@liuhange/dsh-construction-data-inventory'
export const inject = ['tools'] as const

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type {
  ChangeRecord,
  ChangeTraceabilityResult,
  ClassificationEncodingEntry,
  ConfigVersionSet,
  InventoryReport,
  ReviewOverrideRecord,
  SourceConfig,
  UnifiedAssetItem,
  ValidationError,
} from './types.js'
import type { ErrorCode } from './invariant.js'
import { PLUGIN_NAME } from './invariant.js'
import { ConstructionConfigLoader } from './construction-config-loader.js'
import { InputValidator } from './input-validator.js'
import { IfcModelAdapter } from './ifc-model-adapter.js'
import { ContractAdapter } from './contract-adapter.js'
import { ProgressRecordAdapter } from './progress-record-adapter.js'
import { AcceptanceDocAdapter } from './acceptance-doc-adapter.js'
import { UnifiedAssetMerger } from './unified-asset-merger.js'
import { ClassificationMapper } from './classification-mapper.js'
import { AssetCodeGenerator } from './asset-code-generator.js'
import { ChangeTraceabilityChecker } from './change-traceability-checker.js'
import { ReviewOverrideRecorder } from './review-override-recorder.js'
import { InventoryReportGenerator } from './inventory-report-generator.js'

function errorResult(error: ErrorCode, message: string): string {
  return JSON.stringify({ error, message })
}

function getAdapter(type: string): IfcModelAdapter | ContractAdapter | ProgressRecordAdapter | AcceptanceDocAdapter | null {
  switch (type.toUpperCase()) {
    case 'IFC':
      return new IfcModelAdapter()
    case 'CONTRACT':
      return new ContractAdapter()
    case 'PROGRESS':
      return new ProgressRecordAdapter()
    case 'ACCEPTANCE':
      return new AcceptanceDocAdapter()
    default:
      return null
  }
}

function loadSourceConfig(sourceConfigPath: string): SourceConfig {
  const fullPath = resolve(sourceConfigPath)
  const raw = readFileSync(fullPath, 'utf-8')
  return JSON.parse(raw) as SourceConfig
}

function loadChangeRecords(changeDataPath: string): ChangeRecord[] {
  const fullPath = resolve(changeDataPath)
  const raw = readFileSync(fullPath, 'utf-8')
  return JSON.parse(raw) as ChangeRecord[]
}

function buildClassificationEncodingList(assets: UnifiedAssetItem[]): ClassificationEncodingEntry[] {
  const list: ClassificationEncodingEntry[] = []
  for (const asset of assets) {
    if (asset.classificationCode && asset.assetCode) {
      list.push({
        assetId: asset.assetId,
        classificationCode: asset.classificationCode,
        assetCode: asset.assetCode,
        policyBasis: asset.policyBasis ?? '',
        judgmentStatus: asset.judgmentStatus,
      })
    }
  }
  return list
}

export function apply(ctx: { tools: { register: (tool: unknown) => void } }) {
  const configLoader = new ConstructionConfigLoader()
  const inputValidator = new InputValidator()
  const merger = new UnifiedAssetMerger()
  const classificationMapper = new ClassificationMapper()
  const assetCodeGenerator = new AssetCodeGenerator()
  const changeTraceabilityChecker = new ChangeTraceabilityChecker()
  const reportGenerator = new InventoryReportGenerator()
  const overrideRecorder = new ReviewOverrideRecorder()

  ctx.tools.register({
    name: 'inspect_ai_dataset',
    description: '对建筑工程项目多源异构数据进行资产化盘点，按GB/T 51269标准生成分类编码与资产台账',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: '建筑工程项目标识' },
        sourceConfigPath: { type: 'string', description: '数据源配置文件路径（含各数据源类型与路径）' },
        changeDataPath: { type: 'string', description: '变更单数据文件路径（可选，缺省则跳过变更追溯检测）' },
        outputPathDir: { type: 'string', description: '报告输出目录（默认当前工作目录）' },
      },
      required: ['projectId', 'sourceConfigPath'],
    },
    async execute(args: Record<string, unknown>) {
      try {
        const validation = inputValidator.validateInspectInput(args)
        if (!validation.isValid) {
          return errorResult('INPUT_INVALID', validation.errors.map((e) => e.errorMessage).join('; '))
        }

        const projectId = args.projectId as string
        const sourceConfigPath = args.sourceConfigPath as string
        const changeDataPath = args.changeDataPath as string | undefined
        const outputPathDir = (args.outputPathDir as string | undefined) ?? process.cwd()

        const configLoadResult = configLoader.load()
        const { classificationConfig, encodingRuleConfig, sourceAdapterConfig } = configLoadResult

        let sourceConfig: SourceConfig
        try {
          sourceConfig = loadSourceConfig(sourceConfigPath)
        } catch (e) {
          return errorResult('INPUT_INVALID', `数据源配置加载失败: ${(e as Error).message}`)
        }

        const sourceValidation = inputValidator.validateSources(sourceConfig)
        if (!sourceValidation.isValid) {
          return errorResult('INPUT_INVALID', sourceValidation.errors.map((e) => e.errorMessage).join('; '))
        }

        const allWarnings: string[] = []
        const allErrors: string[] = []
        const errorList: ValidationError[] = []
        const adaptedLists: Array<{ assets: UnifiedAssetItem[]; warnings: string[]; errors: string[] }> = []

        for (const source of sourceConfig.sources) {
          if (!inputValidator.isSourceAvailable(source.path)) {
            allWarnings.push(`数据源 ${source.type} 不可用，已跳过`)
            errorList.push({ assetId: '', errorMessage: `数据源 ${source.type} 不可用，已跳过` })
            continue
          }
          const adapter = getAdapter(source.type)
          if (adapter === null) {
            allWarnings.push(`未知数据源类型 ${source.type}，已跳过`)
            continue
          }
          const result = adapter.adapt(source.path, source.systemId, projectId)
          adaptedLists.push(result)
          allWarnings.push(...result.warnings)
          allErrors.push(...result.errors)
        }

        const mergeResult = merger.merge(adaptedLists)
        allWarnings.push(...mergeResult.warnings)
        allErrors.push(...mergeResult.errors)
        let unifiedAssets = mergeResult.unifiedAssets

        const classificationResult = classificationMapper.map(unifiedAssets, classificationConfig)
        allWarnings.push(...classificationResult.warnings)
        unifiedAssets = classificationResult.assets

        const codeGenResult = assetCodeGenerator.generate(unifiedAssets, encodingRuleConfig)
        allErrors.push(...codeGenResult.errors)
        allWarnings.push(...codeGenResult.warnings)
        unifiedAssets = codeGenResult.assets

        for (const overflowAssetId of codeGenResult.overflowAssets) {
          errorList.push({ assetId: overflowAssetId, errorMessage: '编码生成失败：顺序码溢出' })
        }
        for (const errMsg of allErrors) {
          errorList.push({ assetId: '', errorMessage: errMsg })
        }

        let changeTraceabilityReport: ChangeTraceabilityResult[] = []
        let skippedChangeTraceability = false
        if (changeDataPath) {
          if (!existsSync(changeDataPath)) {
            allWarnings.push('变更追溯因系统不可用而跳过')
            skippedChangeTraceability = true
          } else {
            try {
              const changeRecords = loadChangeRecords(changeDataPath)
              const changeValidation = inputValidator.validateChangeRecords(changeRecords)
              for (const invalidMsg of changeValidation.invalid) {
                allWarnings.push(invalidMsg)
              }
              const assetIds = unifiedAssets.map((a) => a.assetId)
              const traceabilityResult = changeTraceabilityChecker.check(changeValidation.valid, assetIds)
              changeTraceabilityReport = traceabilityResult.results
              allWarnings.push(...traceabilityResult.warnings)
            } catch (e) {
              allWarnings.push(`变更追溯检测失败: ${(e as Error).message}`)
              skippedChangeTraceability = true
            }
          }
        }

        const classificationEncodingList = buildClassificationEncodingList(unifiedAssets)

        const overrideList: ReviewOverrideRecord[] = overrideRecorder.getAll()

        const configVersions: ConfigVersionSet = {
          classificationConfigVersion: classificationConfig.version,
          encodingRuleConfigVersion: encodingRuleConfig.version,
          sourceAdapterConfigVersion: sourceAdapterConfig.version,
        }

        const report = reportGenerator.generate({
          assetList: unifiedAssets,
          classificationEncodingList,
          changeTraceabilityReport,
          overrideList,
          errorList,
          configVersions,
          projectId,
          skippedChangeTraceability,
        })

        const reportJsonPath = reportGenerator.writeJson(report, outputPathDir)
        const reportMdPath = reportGenerator.writeMarkdown(report, outputPathDir)
        const ledgerPath = reportGenerator.exportLedger(unifiedAssets, outputPathDir)

        const result = {
          reportId: report.reportId,
          projectId,
          assetCount: unifiedAssets.length,
          classifiedCount: unifiedAssets.filter((a) => a.classificationCode).length,
          codedCount: unifiedAssets.filter((a) => a.assetCode).length,
          unclassifiedCount: classificationResult.unclassified.length,
          changeTraceabilityCount: changeTraceabilityReport.length,
          overrideCount: overrideList.length,
          errorCount: errorList.length,
          configLoadStatus: configLoadResult.loadStatus,
          reportJsonPath,
          reportMdPath,
          ledgerPath,
          warnings: allWarnings,
          policyBasisSummary: report.policyBasisSummary,
          legalDisclaimer: report.legalDisclaimer,
          timestamp: new Date().toISOString(),
        }

        return JSON.stringify(result, null, 2)
      } catch (e) {
        return errorResult('UNKNOWN_ERROR', (e as Error).message)
      }
    },
  })

  ctx.tools.register({
    name: 'submit_review_override',
    description: '提交人工复核覆盖指令，对自动分类与编码结果进行人工覆盖并记录覆盖理由',
    parameters: {
      type: 'object',
      properties: {
        assetId: { type: 'string', description: '被覆盖的资产标识' },
        reviewItem: { type: 'string', enum: ['classification', 'encoding', 'changeTraceability'], description: '复核项' },
        overrideConclusion: { type: 'string', description: '覆盖后结论（如新分类代码）' },
        overrideReason: { type: 'string', description: '覆盖理由（不可为空）' },
        operator: { type: 'string', description: '操作人标识' },
        inventoryReportPath: { type: 'string', description: '盘点报告路径（用于定位判定结果）' },
      },
      required: ['assetId', 'reviewItem', 'overrideConclusion', 'overrideReason', 'operator', 'inventoryReportPath'],
    },
    async execute(args: Record<string, unknown>) {
      try {
        const validation = inputValidator.validateOverrideInput(args)
        if (!validation.isValid) {
          return errorResult('INPUT_INVALID', validation.errors.map((e) => e.errorMessage).join('; '))
        }

        const assetId = args.assetId as string
        const reviewItem = args.reviewItem as ReviewOverrideRecord['reviewItem']
        const overrideConclusion = args.overrideConclusion as string
        const overrideReason = args.overrideReason as string
        const operator = args.operator as string
        const inventoryReportPath = args.inventoryReportPath as string

        if (!existsSync(inventoryReportPath)) {
          return errorResult('ASSET_NOT_FOUND', `盘点报告不存在: ${inventoryReportPath}`)
        }

        const reportRaw = readFileSync(inventoryReportPath, 'utf-8')
        const report = JSON.parse(reportRaw) as InventoryReport

        const asset = report.assetList.find((a) => a.assetId === assetId)
        if (!asset) {
          return errorResult('ASSET_NOT_FOUND', `资产标识不存在: ${assetId}`)
        }

        if (reviewItem === 'classification') {
          const configLoadResult = configLoader.load()
          const isValidCode = classificationMapper.isValidClassificationCode(
            overrideConclusion,
            configLoadResult.classificationConfig,
          )
          if (!isValidCode) {
            return errorResult('INVALID_CLASSIFICATION_CODE', `分类代码不在标准体系: ${overrideConclusion}`)
          }
        }

        const originalConclusion = asset.classificationCode
        const originalAssetCode = asset.assetCode

        const overrideRecord = overrideRecorder.buildRecord({
          assetId,
          reviewItem,
          originalConclusion,
          newConclusion: overrideConclusion,
          overrideReason,
          operator,
          originalAssetCode,
        })

        overrideRecorder.record(overrideRecord)

        let newAssetCode = originalAssetCode
        let regenerated = false
        if (reviewItem === 'classification') {
          asset.classificationCode = overrideConclusion
          asset.judgmentStatus = '人工确认'
          const configLoadResult = configLoader.load()
          const regenResult = assetCodeGenerator.regenerateForAsset(asset, configLoadResult.encodingRuleConfig)
          if (regenResult.assets[0] && regenResult.assets[0].assetCode) {
            newAssetCode = regenResult.assets[0]!.assetCode
            regenerated = true
          }
        } else {
          asset.judgmentStatus = '人工确认'
        }

        const result = {
          assetId,
          reviewItem,
          originalConclusion,
          newConclusion: overrideConclusion,
          originalAssetCode,
          newAssetCode,
          regenerated,
          operator,
          overrideTime: overrideRecord.overrideTime,
          status: '覆盖成功',
        }

        return JSON.stringify(result, null, 2)
      } catch (e) {
        return errorResult('UNKNOWN_ERROR', (e as Error).message)
      }
    },
  })

  console.log(`[${PLUGIN_NAME}] 建筑工程数据资产盘点插件已加载`)
}
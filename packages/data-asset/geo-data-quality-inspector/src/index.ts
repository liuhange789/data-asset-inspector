export const name = '@liuhange/dsh-geo-data-quality-inspector'
export const inject = ['tools'] as const

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { GeoConfigLoader } from './geo-config-loader.js'
import { InputValidator } from './input-validator.js'
import { SpatialReferenceChecker } from './spatial-reference-checker.js'
import { ElevationAccuracyChecker } from './elevation-accuracy-checker.js'
import { PlanarAccuracyChecker } from './planar-accuracy-checker.js'
import { EdgeAccuracyChecker } from './edge-accuracy-checker.js'
import { LogicalConsistencyChecker } from './logical-consistency-checker.js'
import { FormatConsistencyChecker } from './format-consistency-checker.js'
import { TopologyChecker } from './topology-checker.js'
import { AttributePrecisionChecker } from './attribute-precision-checker.js'
import { GridParameterChecker } from './grid-parameter-checker.js'
import { QualityElementScorer } from './quality-element-scorer.js'
import { ErrorClassifier } from './error-classifier.js'
import { InspectionReportGenerator } from './inspection-report-generator.js'
import { ReviewOverrideRecorder } from './review-override-recorder.js'
import { PolicyBasisBuilder } from './policy-basis-builder.js'

import { ERROR_CODES, LEGAL_DISCLAIMER } from './invariant.js'
import type { ErrorCode } from './invariant.js'
import type {
  QualityCheckResult,
  InspectionReport,
  ReviewOverrideRecord,
  ConfigVersionSet,
} from './types.js'

export function apply(ctx: { tools: { register: (tool: unknown) => void } }) {
  ctx.tools.register({
    name: 'inspect_geo_data_quality',
    description: '对地理空间数据进行质量巡检，输出高程精度、平面精度、接边精度、拓扑、格式一致性、逻辑一致性、属性精度、格网参数检测结果、质量元素评分、错误分类统计与政策依据',
    parameters: {
      type: 'object',
      properties: {
        datasetFilePath: { type: 'string', description: '地理空间数据集文件路径（JSON格式，含format/features/checkPoints等）' },
        outputPathDir: { type: 'string', description: '报告输出目录（默认数据文件所在目录）' },
      },
      required: ['datasetFilePath'],
    },
    async execute(args: Record<string, unknown>) {
      try {
        if (!args || typeof args !== 'object') {
          return JSON.stringify({ error: ERROR_CODES.INPUT_INVALID, message: '参数不能为空' })
        }

        const datasetFilePath = args.datasetFilePath
        if (!datasetFilePath || typeof datasetFilePath !== 'string') {
          return JSON.stringify({ error: ERROR_CODES.INPUT_INVALID, message: 'datasetFilePath 为必填字段' })
        }

        if (!existsSync(datasetFilePath)) {
          return JSON.stringify({ error: ERROR_CODES.FILE_NOT_FOUND, message: `文件不存在 - ${datasetFilePath}` })
        }

        const datasetFileRaw = readFileSync(datasetFilePath, 'utf-8')
        let datasetFileData: unknown
        try {
          datasetFileData = JSON.parse(datasetFileRaw)
        } catch {
          return JSON.stringify({ error: ERROR_CODES.CONFIG_INVALID, message: '数据集文件 JSON 解析失败' })
        }

        const configLoader = new GeoConfigLoader()
        const configLoadResult = configLoader.load()
        const { geoAccuracyConfig, geoTopologyConfig, qualityElementConfig } = configLoadResult

        const inputValidator = new InputValidator()
        const { dataset, errors: validationErrors } = inputValidator.validateDataset(datasetFileData)

        if (dataset === null) {
          return JSON.stringify({
            error: ERROR_CODES.DATASET_EMPTY,
            message: '数据集无效，无法执行巡检',
            validationErrors,
          })
        }

        const allCheckResults: QualityCheckResult[] = []
        const allWarnings: string[] = [...configLoadResult.warnings]

        const formatConsistencyChecker = new FormatConsistencyChecker()
        const formatResult = formatConsistencyChecker.check(dataset, geoAccuracyConfig)
        allCheckResults.push(...formatResult.checkResults)

        if (formatResult.blocked) {
          allWarnings.push('数据集因格式一致性检查未通过（A类错误）被阻断，跳过后续检查')

          const qualityElementScorer = new QualityElementScorer()
          const { scores: qualityElementScores, totalScore } = qualityElementScorer.score(
            allCheckResults,
            qualityElementConfig,
          )

          const policyBasisBuilder = new PolicyBasisBuilder()
          const errorClassPolicyBasis = policyBasisBuilder.buildByKey('GBT_24356', '第7.2条')

          const errorClassifier = new ErrorClassifier()
          const errorClassStatistics = errorClassifier.classify(allCheckResults, errorClassPolicyBasis)

          const overrideRecorder = new ReviewOverrideRecorder()
          const overrideList = overrideRecorder.readAll()

          const configVersions: ConfigVersionSet = {
            geoAccuracyConfigVersion: geoAccuracyConfig.version,
            geoTopologyConfigVersion: geoTopologyConfig.version,
            qualityElementConfigVersion: qualityElementConfig.version,
          }

          const reportGenerator = new InspectionReportGenerator()
          const report = reportGenerator.generate({
            checkResults: allCheckResults,
            qualityElementScores,
            totalQualityScore: totalScore,
            errorClassStatistics,
            overrideList,
            errorList: validationErrors,
            configVersions,
            inspectionScope: datasetFilePath,
            warnings: allWarnings,
          })

          const outputPathDir = (args.outputPathDir as string) ?? dirname(datasetFilePath)
          const jsonPath = resolve(outputPathDir, 'inspection-report.json')
          const markdownPath = resolve(outputPathDir, 'inspection-report.md')
          reportGenerator.writeJson(report, jsonPath)
          reportGenerator.writeMarkdown(report, markdownPath)

          const result = {
            reportId: report.reportId,
            inspectionTime: report.inspectionTime,
            summary: {
              totalFeatures: dataset.features.length,
              totalCheckResults: allCheckResults.length,
              classAErrors: errorClassStatistics.classACount,
              classBErrors: errorClassStatistics.classBCount,
              classCErrors: errorClassStatistics.classCCount,
              classDErrors: errorClassStatistics.classDCount,
              totalQualityScore: totalScore,
              overrideCount: overrideList.length,
              validationErrorCount: validationErrors.length,
              blocked: true,
            },
            configVersions,
            legalDisclaimer: LEGAL_DISCLAIMER,
            reportPaths: { json: jsonPath, markdown: markdownPath },
          }

          return JSON.stringify(result, null, 2)
        }

        const spatialReferenceChecker = new SpatialReferenceChecker()
        const { spatialReferenceResult, checkResults: spatialResults } = spatialReferenceChecker.check(dataset, geoAccuracyConfig)
        allCheckResults.push(...spatialResults)

        const logicalConsistencyChecker = new LogicalConsistencyChecker()
        const { checkResults: logicalResults } = logicalConsistencyChecker.check(dataset, geoAccuracyConfig)
        allCheckResults.push(...logicalResults)

        const topologyChecker = new TopologyChecker()
        const topologyResult = topologyChecker.check(dataset, geoTopologyConfig)
        allCheckResults.push(...topologyResult.checkResults)
        if (topologyResult.timedOut) {
          allWarnings.push('面要素拓扑计算超时未完成，建议分批处理')
        }

        const attributePrecisionChecker = new AttributePrecisionChecker()
        const { checkResults: attributeResults } = attributePrecisionChecker.check(dataset, geoAccuracyConfig)
        allCheckResults.push(...attributeResults)

        const gridParameterChecker = new GridParameterChecker()
        const { checkResults: gridResults } = gridParameterChecker.check(dataset, geoAccuracyConfig)
        allCheckResults.push(...gridResults)

        if (spatialReferenceResult.resolvable) {
          const elevationAccuracyChecker = new ElevationAccuracyChecker()
          const elevationResult = elevationAccuracyChecker.check(dataset, geoAccuracyConfig)
          allCheckResults.push(...elevationResult.checkResults)
          if (elevationResult.degradationReason !== undefined) {
            allWarnings.push(`高程精度检测降级: ${elevationResult.degradationReason}`)
          }
          if (elevationResult.rmse === null) {
            allWarnings.push('高程中误差未计算（检测点数不足）')
          }

          const planarAccuracyChecker = new PlanarAccuracyChecker()
          const planarResult = planarAccuracyChecker.check(dataset, geoAccuracyConfig)
          allCheckResults.push(...planarResult.checkResults)

          const edgeAccuracyChecker = new EdgeAccuracyChecker()
          const { checkResults: edgeResults } = edgeAccuracyChecker.check(dataset, geoAccuracyConfig)
          allCheckResults.push(...edgeResults)
        } else {
          allWarnings.push('空间参考系无法解析，跳过依赖坐标的精度检查项（高程精度、平面精度、接边精度）')
        }

        const qualityElementScorer = new QualityElementScorer()
        const { scores: qualityElementScores, totalScore } = qualityElementScorer.score(
          allCheckResults,
          qualityElementConfig,
        )

        const policyBasisBuilder = new PolicyBasisBuilder()
        const errorClassPolicyBasis = policyBasisBuilder.buildByKey('GBT_24356', '第7.2条')

        const errorClassifier = new ErrorClassifier()
        const errorClassStatistics = errorClassifier.classify(allCheckResults, errorClassPolicyBasis)

        const overrideRecorder = new ReviewOverrideRecorder()
        const overrideList = overrideRecorder.readAll()

        const configVersions: ConfigVersionSet = {
          geoAccuracyConfigVersion: geoAccuracyConfig.version,
          geoTopologyConfigVersion: geoTopologyConfig.version,
          qualityElementConfigVersion: qualityElementConfig.version,
        }

        if (dataset.features.length === 0) {
          allWarnings.push('巡检范围内无地理空间要素数据')
        }

        const reportGenerator = new InspectionReportGenerator()
        const report = reportGenerator.generate({
          checkResults: allCheckResults,
          qualityElementScores,
          totalQualityScore: totalScore,
          errorClassStatistics,
          overrideList,
          errorList: validationErrors,
          configVersions,
          inspectionScope: datasetFilePath,
          warnings: allWarnings,
        })

        const outputPathDir = (args.outputPathDir as string) ?? dirname(datasetFilePath)
        const jsonPath = resolve(outputPathDir, 'inspection-report.json')
        const markdownPath = resolve(outputPathDir, 'inspection-report.md')
        reportGenerator.writeJson(report, jsonPath)
        reportGenerator.writeMarkdown(report, markdownPath)

        const result = {
          reportId: report.reportId,
          inspectionTime: report.inspectionTime,
          summary: {
            totalFeatures: dataset.features.length,
            totalCheckResults: allCheckResults.length,
            classAErrors: errorClassStatistics.classACount,
            classBErrors: errorClassStatistics.classBCount,
            classCErrors: errorClassStatistics.classCCount,
            classDErrors: errorClassStatistics.classDCount,
            totalQualityScore: totalScore,
            overrideCount: overrideList.length,
            validationErrorCount: validationErrors.length,
            spatialReferenceResolvable: spatialReferenceResult.resolvable,
            topologyTimedOut: topologyResult.timedOut,
          },
          configVersions,
          legalDisclaimer: LEGAL_DISCLAIMER,
          reportPaths: { json: jsonPath, markdown: markdownPath },
        }

        return JSON.stringify(result, null, 2)
      } catch (e) {
        return JSON.stringify({ error: ERROR_CODES.UNKNOWN_ERROR as ErrorCode, message: (e as Error).message })
      }
    },
  })

  ctx.tools.register({
    name: 'submit_review_override',
    description: '提交人工复核覆盖指令，对自动判定结果进行人工覆盖并记录覆盖理由',
    parameters: {
      type: 'object',
      properties: {
        objectId: { type: 'string', description: '被覆盖的对象标识' },
        overrideConclusion: { type: 'string', description: '覆盖后结论（合格/不合格/误判/需复检）' },
        overrideReason: { type: 'string', description: '覆盖理由（不可为空）' },
        operator: { type: 'string', description: '操作人标识' },
        inspectionReportPath: { type: 'string', description: '巡检报告路径（用于定位判定结果）' },
      },
      required: ['objectId', 'overrideConclusion', 'overrideReason', 'operator', 'inspectionReportPath'],
    },
    async execute(args: Record<string, unknown>) {
      try {
        if (!args || typeof args !== 'object') {
          return JSON.stringify({ error: ERROR_CODES.INPUT_INVALID, message: '参数不能为空' })
        }

        const objectId = args.objectId
        const overrideConclusion = args.overrideConclusion
        const overrideReason = args.overrideReason
        const operator = args.operator
        const inspectionReportPath = args.inspectionReportPath

        if (!objectId || typeof objectId !== 'string') {
          return JSON.stringify({ error: ERROR_CODES.INPUT_INVALID, message: 'objectId 为必填字段' })
        }
        if (!overrideConclusion || typeof overrideConclusion !== 'string') {
          return JSON.stringify({ error: ERROR_CODES.INPUT_INVALID, message: 'overrideConclusion 为必填字段' })
        }
        if (!overrideReason || typeof overrideReason !== 'string') {
          return JSON.stringify({ error: ERROR_CODES.REASON_REQUIRED, message: '覆盖理由不可为空' })
        }
        if (!operator || typeof operator !== 'string') {
          return JSON.stringify({ error: ERROR_CODES.INPUT_INVALID, message: 'operator 为必填字段' })
        }
        if (!inspectionReportPath || typeof inspectionReportPath !== 'string') {
          return JSON.stringify({ error: ERROR_CODES.INPUT_INVALID, message: 'inspectionReportPath 为必填字段' })
        }

        if (!existsSync(inspectionReportPath)) {
          return JSON.stringify({ error: ERROR_CODES.FILE_NOT_FOUND, message: `巡检报告文件不存在 - ${inspectionReportPath}` })
        }

        const reportRaw = readFileSync(inspectionReportPath, 'utf-8')
        let reportData: InspectionReport
        try {
          reportData = JSON.parse(reportRaw) as InspectionReport
        } catch {
          return JSON.stringify({ error: ERROR_CODES.CONFIG_INVALID, message: '巡检报告文件 JSON 解析失败' })
        }

        const existingObjectIds = new Set<string>()
        for (const item of reportData.checkResults) {
          existingObjectIds.add(item.objectId)
        }

        const overrideRecorder = new ReviewOverrideRecorder()
        const validation = overrideRecorder.validateOverrideInstruction(
          objectId,
          overrideConclusion,
          overrideReason,
          existingObjectIds,
        )

        if (!validation.valid) {
          return JSON.stringify({ error: validation.error, message: validation.message })
        }

        const originalConclusion = findOriginalConclusion(reportData, objectId)

        const overrideRecord: ReviewOverrideRecord = {
          objectId,
          originalConclusion,
          newConclusion: overrideConclusion,
          overrideReason,
          operator,
          overrideTime: new Date().toISOString(),
        }

        overrideRecorder.record(overrideRecord)

        const result = {
          success: true,
          objectId,
          originalConclusion,
          newConclusion: overrideConclusion,
          overrideReason,
          operator,
          overrideTime: overrideRecord.overrideTime,
          message: '人工复核覆盖已记录',
        }

        return JSON.stringify(result, null, 2)
      } catch (e) {
        return JSON.stringify({ error: ERROR_CODES.UNKNOWN_ERROR as ErrorCode, message: (e as Error).message })
      }
    },
  })
}

function findOriginalConclusion(report: InspectionReport, objectId: string): string {
  for (const item of report.checkResults) {
    if (item.objectId === objectId) {
      return `${item.errorClass}类错误`
    }
  }
  return '未知'
}
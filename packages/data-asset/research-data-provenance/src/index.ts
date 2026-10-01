export const name = '@liuhange/dsh-research-data-provenance'
export const inject = ['tools'] as const

import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import {
  ERROR_CODES,
} from './invariant.js'
import type {
  ErrorCode,
  DatasetMetadata,
  LineageRecord,
  AttachmentList,
  QualityDimensionConfig,
  QualityDimensionRule,
  QualityDimensionScore,
  ReviewOverrideRecord,
  ProvenanceAuditReport,
} from './types.js'
import { ProvenanceConfigLoader } from './provenance-config-loader.js'
import { InputValidator } from './input-validator.js'
import { LineageCompletenessChecker } from './lineage-completeness-checker.js'
import { ReproducibilityChecker } from './reproducibility-checker.js'
import { evaluateQualityRule } from './normality-scorer.js'
import { PolicyBasisBuilder } from './policy-basis-builder.js'
import { ProvenanceReportGenerator } from './provenance-report-generator.js'
import { ReviewOverrideRecorder } from './review-override-recorder.js'

const DIMENSION_NODES: Array<{ node: keyof QualityDimensionConfig; name: string }> = [
  { node: 'accuracy', name: '准确性' },
  { node: 'completeness', name: '完整性' },
  { node: 'consistency', name: '一致性' },
  { node: 'timeliness', name: '时效性' },
  { node: 'normality', name: '规范性' },
  { node: 'security', name: '安全性' },
]

export function apply(ctx: { tools: { register: (tool: unknown) => void } }) {
  ctx.tools.register({
    name: 'attest_data_quality',
    description: '对科研数据集进行溯源审计，检测数据血缘完整性、可复现性与六维质量，输出审计报告与整改建议',
    parameters: {
      type: 'object',
      properties: {
        datasetMetadataPath: { type: 'string', description: '数据集元数据文件路径（JSON格式）' },
        lineageRecordPath: { type: 'string', description: '数据血缘记录文件路径（可选，缺省则血缘完整度记为0.00）' },
        attachmentListPath: { type: 'string', description: '数据集附件清单文件路径（可选，缺省则可复现性记为0.00）' },
        qualityRecordsPath: { type: 'string', description: '六维度质量检测输入记录文件路径（JSON格式，可选）' },
        outputPathDir: { type: 'string', description: '报告输出目录（默认元数据文件所在目录）' },
      },
      required: ['datasetMetadataPath'],
    },
    async execute(args: Record<string, unknown>) {
      try {
        const datasetMetadataPath = args?.datasetMetadataPath
        if (typeof datasetMetadataPath !== 'string' || datasetMetadataPath.trim() === '') {
          return JSON.stringify({ error: ERROR_CODES.INPUT_INVALID as ErrorCode, message: 'datasetMetadataPath 为必填项' })
        }
        if (!existsSync(datasetMetadataPath)) {
          return JSON.stringify({ error: ERROR_CODES.DATASET_NOT_FOUND as ErrorCode, message: `数据集元数据文件不存在: ${datasetMetadataPath}` })
        }

        const metadata = JSON.parse(readFileSync(datasetMetadataPath, 'utf-8')) as DatasetMetadata
        const lineageRecordPath = args.lineageRecordPath as string | undefined
        const attachmentListPath = args.attachmentListPath as string | undefined
        const qualityRecordsPath = args.qualityRecordsPath as string | undefined
        const outputPathDir = (args.outputPathDir as string | undefined) ?? dirname(resolve(datasetMetadataPath))

        const lineageRecord = lineageRecordPath && existsSync(lineageRecordPath)
          ? (JSON.parse(readFileSync(lineageRecordPath, 'utf-8')) as LineageRecord)
          : null
        const attachmentList = attachmentListPath && existsSync(attachmentListPath)
          ? (JSON.parse(readFileSync(attachmentListPath, 'utf-8')) as AttachmentList)
          : null
        const qualityRecords = qualityRecordsPath && existsSync(qualityRecordsPath)
          ? (JSON.parse(readFileSync(qualityRecordsPath, 'utf-8')) as Record<string, unknown>)
          : {}

        const configLoader = new ProvenanceConfigLoader()
        const configLoad = configLoader.load()
        const qualityDimensionConfig = configLoad.qualityDimensionConfig
        const remediationSuggestionConfig = configLoad.remediationSuggestionConfig

        const validator = new InputValidator()
        const validation = validator.validateDataset(metadata, lineageRecord, attachmentList)
        if (!validation.isValid) {
          const fatal = validation.errors.find((e) => e.code === ERROR_CODES.DATASET_NOT_FOUND)
          if (fatal) {
            return JSON.stringify({ error: ERROR_CODES.DATASET_NOT_FOUND as ErrorCode, message: fatal.message })
          }
        }

        const lineageChecker = new LineageCompletenessChecker()
        const lineageDetail = lineageChecker.check(metadata, lineageRecord)

        const reproChecker = new ReproducibilityChecker()
        const reproDetail = reproChecker.check(attachmentList)

        const policyBasisBuilder = new PolicyBasisBuilder()
        const qualityScores = scoreAllDimensions(qualityRecords, qualityDimensionConfig, policyBasisBuilder)

        const reportGenerator = new ProvenanceReportGenerator(policyBasisBuilder)
        const report = reportGenerator.generate({
          datasetId: metadata.datasetId,
          lineageResult: lineageDetail.result,
          reproducibilityResult: reproDetail.result,
          qualityScores,
          overrideList: [],
          errorList: validation.errors,
          configVersions: {
            qualityDimensionConfigVersion: qualityDimensionConfig.version,
            remediationSuggestionConfigVersion: remediationSuggestionConfig.version,
          },
          remediationSuggestionConfig,
        })

        const jsonPath = reportGenerator.writeJson(report, outputPathDir)
        reportGenerator.writeMarkdown(report, outputPathDir)

        return JSON.stringify({
          reportId: report.reportId,
          auditTime: report.auditTime,
          datasetId: report.datasetId,
          lineageCompletenessScore: report.lineageResult.completenessScore,
          reproducibilityScore: report.reproducibilityResult.reproducibilityScore,
          qualityScores: report.qualityScores.map((q) => ({ dimension: q.dimension, score: q.score })),
          remediationSuggestions: report.remediationSuggestions,
          policyBasisSummary: report.policyBasisSummary,
          configVersions: report.configVersions,
          legalDisclaimer: report.legalDisclaimer,
          reportPath: jsonPath,
        }, null, 2)
      } catch (e) {
        return JSON.stringify({ error: ERROR_CODES.UNKNOWN_ERROR as ErrorCode, message: (e as Error).message })
      }
    },
  })

  ctx.tools.register({
    name: 'submit_review_override',
    description: '提交人工复核覆盖指令，对自动检测结果进行人工覆盖并记录覆盖理由',
    parameters: {
      type: 'object',
      properties: {
        datasetId: { type: 'string', description: '数据集标识' },
        detectionItem: { type: 'string', description: '被覆盖的检测项标识' },
        overrideConclusion: { type: 'string', description: '覆盖后结论' },
        overrideReason: { type: 'string', description: '覆盖理由（不可为空）' },
        operator: { type: 'string', description: '操作人标识' },
        auditReportPath: { type: 'string', description: '审计报告路径（用于定位检测结果）' },
      },
      required: ['datasetId', 'detectionItem', 'overrideConclusion', 'overrideReason', 'operator', 'auditReportPath'],
    },
    async execute(args: Record<string, unknown>) {
      try {
        const datasetId = args?.datasetId as string | undefined
        const detectionItem = args?.detectionItem as string | undefined
        const overrideConclusion = args?.overrideConclusion as string | undefined
        const overrideReason = args?.overrideReason as string | undefined
        const operator = args?.operator as string | undefined
        const auditReportPath = args?.auditReportPath as string | undefined

        if (!datasetId || !detectionItem || !overrideConclusion || !operator || !auditReportPath) {
          return JSON.stringify({ error: ERROR_CODES.INPUT_INVALID as ErrorCode, message: '必填参数缺失' })
        }
        if (!overrideReason || overrideReason.trim() === '') {
          return JSON.stringify({ error: ERROR_CODES.REASON_REQUIRED as ErrorCode, message: '覆盖理由不可为空' })
        }
        if (!existsSync(auditReportPath)) {
          return JSON.stringify({ error: ERROR_CODES.INPUT_INVALID as ErrorCode, message: `审计报告不存在: ${auditReportPath}` })
        }

        const report = JSON.parse(readFileSync(auditReportPath, 'utf-8')) as ProvenanceAuditReport
        const originalConclusion = findOriginalConclusion(report, detectionItem)
        if (originalConclusion === null) {
          return JSON.stringify({ error: ERROR_CODES.DETECTION_ITEM_NOT_FOUND as ErrorCode, message: `检测项不存在: ${detectionItem}`, detectionItem })
        }

        const recorder = new ReviewOverrideRecorder()
        const overrideRecord: ReviewOverrideRecord = {
          datasetId,
          detectionItem,
          originalConclusion,
          newConclusion: overrideConclusion,
          overrideReason,
          operator,
          overrideTime: new Date().toISOString(),
        }
        const recordResult = recorder.record(overrideRecord)
        if (!recordResult.success) {
          return JSON.stringify({ error: ERROR_CODES.UNKNOWN_ERROR as ErrorCode, message: recordResult.error })
        }

        applyOverrideToReport(report, detectionItem)
        writeFileSyncSafe(auditReportPath, JSON.stringify(report, null, 2))

        return JSON.stringify({
          success: true,
          datasetId,
          detectionItem,
          originalConclusion,
          newConclusion: overrideConclusion,
          operator,
          overrideTime: overrideRecord.overrideTime,
          message: '人工复核覆盖已记录，检测结果状态已更新为"人工确认"',
        }, null, 2)
      } catch (e) {
        return JSON.stringify({ error: ERROR_CODES.UNKNOWN_ERROR as ErrorCode, message: (e as Error).message })
      }
    },
  })
}

function scoreAllDimensions(
  records: Record<string, unknown>,
  config: QualityDimensionConfig,
  policyBasisBuilder: PolicyBasisBuilder,
): QualityDimensionScore[] {
  const scores: QualityDimensionScore[] = []
  for (const { node, name } of DIMENSION_NODES) {
    const dimensionConfig = config[node] as { rules: QualityDimensionRule[] } | undefined
    if (!dimensionConfig || !dimensionConfig.rules) {
      scores.push({
        dimension: name,
        score: null,
        issues: [],
        policyBasis: policyBasisBuilder.buildQualityGuideClause(`${name}维度`),
        judgmentStatus: '自动判定',
      })
      continue
    }
    const issues: string[] = []
    let passedWeight = 0
    let enabledWeight = 0
    for (const rule of dimensionConfig.rules) {
      if (!rule.enabled) {
        continue
      }
      enabledWeight += rule.weight
      try {
        const passed = evaluateQualityRule(records, rule.judgmentLogic)
        if (passed) {
          passedWeight += rule.weight
        } else {
          issues.push(rule.description)
        }
      } catch (e) {
        issues.push(`${rule.description}（规则执行异常: ${(e as Error).message}）`)
      }
    }
    const score = enabledWeight <= 0 ? 100 : Math.round((passedWeight / enabledWeight) * 100 * 100) / 100
    scores.push({
      dimension: name,
      score,
      issues,
      policyBasis: policyBasisBuilder.buildQualityGuideClause(`${name}维度`),
      judgmentStatus: '自动判定',
    })
  }
  return scores
}

function findOriginalConclusion(report: ProvenanceAuditReport, detectionItem: string): string | null {
  if (report.lineageResult.missingItems.includes(detectionItem)) {
    return '缺失'
  }
  if (report.lineageResult.brokenPoints.includes(detectionItem)) {
    return '断裂'
  }
  if (report.reproducibilityResult.missingItems.includes(detectionItem)) {
    return '缺失'
  }
  for (const q of report.qualityScores) {
    if (q.dimension === detectionItem) {
      return String(q.score)
    }
    if (q.issues.includes(detectionItem)) {
      return '不通过'
    }
  }
  return null
}

function applyOverrideToReport(report: ProvenanceAuditReport, detectionItem: string): void {
  if (report.lineageResult.missingItems.includes(detectionItem) || report.lineageResult.brokenPoints.includes(detectionItem)) {
    report.lineageResult.judgmentStatus = '人工确认'
  }
  if (report.reproducibilityResult.missingItems.includes(detectionItem)) {
    report.reproducibilityResult.judgmentStatus = '人工确认'
  }
  for (const q of report.qualityScores) {
    if (q.dimension === detectionItem || q.issues.includes(detectionItem)) {
      q.judgmentStatus = '人工确认'
    }
  }
}

function writeFileSyncSafe(filePath: string, content: string): void {
  writeFileSync(filePath, content, 'utf-8')
}
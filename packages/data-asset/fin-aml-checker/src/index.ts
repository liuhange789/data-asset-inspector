export const name = '@liuhange/dsh-fin-aml-checker'
export const inject = ['tools'] as const

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { FinAmlConfigLoader } from './fin-aml-config-loader.js'
import { InputValidator } from './input-validator.js'
import { ThresholdEngine } from './threshold-engine.js'
import { ExemptionFilter } from './exemption-filter.js'
import { TimelinessChecker } from './timeliness-checker.js'
import { InspectionReportGenerator } from './inspection-report-generator.js'
import { ReviewOverrideRecorder } from './review-override-recorder.js'

import { ERROR_CODES, LEGAL_DISCLAIMER } from './invariant.js'
import type { ErrorCode } from './invariant.js'
import type {
  Transaction,
  SubmittedReport,
  InspectionReport,
  ReviewOverrideRecord,
  ConfigVersionSet,
} from './types.js'

export function apply(ctx: { tools: { register: (tool: unknown) => void } }) {
  ctx.tools.register({
    name: 'assess_circulation',
    description: '对金融交易数据进行反洗钱大额交易合规巡检，输出应报/豁免/逾期清单与政策依据',
    parameters: {
      type: 'object',
      properties: {
        transactionFilePath: { type: 'string', description: '交易明细数据文件路径（JSON格式）' },
        submittedReportFilePath: { type: 'string', description: '已提交报告清单文件路径（可选，缺省则跳过时效检查）' },
        outputPathDir: { type: 'string', description: '报告输出目录（默认交易文件所在目录）' },
      },
      required: ['transactionFilePath'],
    },
    async execute(args: Record<string, unknown>) {
      try {
        if (!args || typeof args !== 'object') {
          return JSON.stringify({ error: ERROR_CODES.INPUT_INVALID, message: '参数不能为空' })
        }

        const transactionFilePath = args.transactionFilePath
        if (!transactionFilePath || typeof transactionFilePath !== 'string') {
          return JSON.stringify({ error: ERROR_CODES.INPUT_INVALID, message: 'transactionFilePath 为必填字段' })
        }

        if (!existsSync(transactionFilePath)) {
          return JSON.stringify({ error: ERROR_CODES.FILE_NOT_FOUND, message: `文件不存在 - ${transactionFilePath}` })
        }

        const transactionFileRaw = readFileSync(transactionFilePath, 'utf-8')
        let transactionFileData: unknown
        try {
          transactionFileData = JSON.parse(transactionFileRaw)
        } catch {
          return JSON.stringify({ error: ERROR_CODES.CONFIG_INVALID, message: '交易明细文件 JSON 解析失败' })
        }

        const transactionsRaw = (transactionFileData as { transactions?: unknown })?.transactions
        if (!Array.isArray(transactionsRaw)) {
          return JSON.stringify({ error: ERROR_CODES.INPUT_INVALID, message: '交易明细文件缺少 transactions 数组' })
        }

        const configLoader = new FinAmlConfigLoader()
        const configLoadResult = configLoader.load()
        const { thresholdConfig, exemptionConfig, exchangeRateConfig, holidayConfig } = configLoadResult

        const inputValidator = new InputValidator()
        const { validTransactions, errors: validationErrors } = inputValidator.validateBatch(transactionsRaw)

        const transactionMap = new Map<string, Transaction>()
        const transactionDateMap = new Map<string, string>()
        for (const tx of validTransactions) {
          transactionMap.set(tx.transactionId, tx)
          transactionDateMap.set(tx.transactionId, tx.transactionDate)
        }

        const thresholdEngine = new ThresholdEngine()
        const { reportable: reportableCandidates, warnings: thresholdWarnings } = thresholdEngine.evaluateBatch(
          validTransactions,
          thresholdConfig,
          exchangeRateConfig,
        )

        const exemptionFilter = new ExemptionFilter()
        const { exempted, remaining: reportableList } = exemptionFilter.filter(
          reportableCandidates,
          transactionMap,
          exemptionConfig,
        )

        let submittedReports: SubmittedReport[] | null = null
        const submittedReportFilePath = args.submittedReportFilePath
        if (submittedReportFilePath && typeof submittedReportFilePath === 'string') {
          if (existsSync(submittedReportFilePath)) {
            try {
              const submittedRaw = readFileSync(submittedReportFilePath, 'utf-8')
              const submittedData = JSON.parse(submittedRaw) as { reports?: SubmittedReport[] }
              submittedReports = Array.isArray(submittedData.reports) ? submittedData.reports : null
            } catch {
              submittedReports = null
            }
          } else {
            submittedReports = null
          }
        }

        const timelinessChecker = new TimelinessChecker()
        const { overdue: overdueList, warnings: timelinessWarnings } = timelinessChecker.check(
          reportableList,
          submittedReports,
          holidayConfig,
          transactionDateMap,
        )

        const overrideRecorder = new ReviewOverrideRecorder()
        const overrideList = overrideRecorder.readAll()

        const configVersions: ConfigVersionSet = {
          thresholdConfigVersion: thresholdConfig.version,
          exemptionConfigVersion: exemptionConfig.version,
          exchangeRateConfigVersion: exchangeRateConfig.version,
          holidayConfigVersion: holidayConfig.version,
        }

        const allWarnings = [...configLoadResult.warnings, ...thresholdWarnings, ...timelinessWarnings]
        if (validTransactions.length === 0 && transactionsRaw.length === 0) {
          allWarnings.push('巡检范围内无交易数据')
        }

        const reportGenerator = new InspectionReportGenerator()
        const report = reportGenerator.generate({
          reportableList,
          exemptedList: exempted,
          overdueList,
          overrideList,
          errorList: validationErrors,
          configVersions,
          inspectionScope: transactionFilePath,
          warnings: allWarnings,
        })

        const outputPathDir = (args.outputPathDir as string) ?? dirname(transactionFilePath)
        const jsonPath = resolve(outputPathDir, 'inspection-report.json')
        const markdownPath = resolve(outputPathDir, 'inspection-report.md')
        reportGenerator.writeJson(report, jsonPath)
        reportGenerator.writeMarkdown(report, markdownPath)

        const result = {
          reportId: report.reportId,
          inspectionTime: report.inspectionTime,
          summary: {
            totalTransactions: transactionsRaw.length,
            validTransactions: validTransactions.length,
            reportableCount: reportableList.length,
            exemptedCount: exempted.length,
            overdueCount: overdueList.length,
            overrideCount: overrideList.length,
            errorCount: validationErrors.length,
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
        transactionId: { type: 'string', description: '被覆盖的交易标识' },
        overrideConclusion: { type: 'string', description: '覆盖后结论（应报/不应报/豁免/不豁免）' },
        overrideReason: { type: 'string', description: '覆盖理由（不可为空）' },
        operator: { type: 'string', description: '操作人标识' },
        inspectionReportPath: { type: 'string', description: '巡检报告路径（用于定位判定结果）' },
      },
      required: ['transactionId', 'overrideConclusion', 'overrideReason', 'operator', 'inspectionReportPath'],
    },
    async execute(args: Record<string, unknown>) {
      try {
        if (!args || typeof args !== 'object') {
          return JSON.stringify({ error: ERROR_CODES.INPUT_INVALID, message: '参数不能为空' })
        }

        const transactionId = args.transactionId
        const overrideConclusion = args.overrideConclusion
        const overrideReason = args.overrideReason
        const operator = args.operator
        const inspectionReportPath = args.inspectionReportPath

        if (!transactionId || typeof transactionId !== 'string') {
          return JSON.stringify({ error: ERROR_CODES.INPUT_INVALID, message: 'transactionId 为必填字段' })
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

        const existingTransactionIds = new Set<string>()
        for (const item of reportData.reportableList) {
          existingTransactionIds.add(item.transactionId)
        }
        for (const item of reportData.exemptedList) {
          existingTransactionIds.add(item.transactionId)
        }
        for (const item of reportData.overdueList) {
          existingTransactionIds.add(item.transactionId)
        }

        const overrideRecorder = new ReviewOverrideRecorder()
        const validation = overrideRecorder.validateOverrideInstruction(
          transactionId,
          overrideConclusion,
          overrideReason,
          existingTransactionIds,
        )

        if (!validation.valid) {
          return JSON.stringify({ error: validation.error, message: validation.message })
        }

        const originalConclusion = findOriginalConclusion(reportData, transactionId)

        const overrideRecord: ReviewOverrideRecord = {
          transactionId,
          originalConclusion,
          newConclusion: overrideConclusion,
          overrideReason,
          operator,
          overrideTime: new Date().toISOString(),
        }

        overrideRecorder.record(overrideRecord)

        const result = {
          success: true,
          transactionId,
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

function findOriginalConclusion(report: InspectionReport, transactionId: string): string {
  for (const item of report.reportableList) {
    if (item.transactionId === transactionId) return '应报'
  }
  for (const item of report.exemptedList) {
    if (item.transactionId === transactionId) return '豁免'
  }
  for (const item of report.overdueList) {
    if (item.transactionId === transactionId) return '逾期'
  }
  return '未知'
}
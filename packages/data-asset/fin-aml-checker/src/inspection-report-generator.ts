import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'
import type {
  ReportableTransaction,
  ExemptedTransaction,
  OverdueTransaction,
  ReviewOverrideRecord,
  ValidationError,
  ConfigVersionSet,
  InspectionReport,
} from './types.js'
import { PolicyBasisBuilder } from './policy-basis-builder.js'
import { ReportDesensitizer } from './report-desensitizer.js'
import { LEGAL_DISCLAIMER } from './invariant.js'

export interface GenerateReportParams {
  reportableList: ReportableTransaction[]
  exemptedList: ExemptedTransaction[]
  overdueList: OverdueTransaction[]
  overrideList: ReviewOverrideRecord[]
  errorList: ValidationError[]
  configVersions: ConfigVersionSet
  inspectionScope: string
  warnings: string[]
}

export class InspectionReportGenerator {
  private readonly policyBasisBuilder: PolicyBasisBuilder
  private readonly reportDesensitizer: ReportDesensitizer

  constructor() {
    this.policyBasisBuilder = new PolicyBasisBuilder()
    this.reportDesensitizer = new ReportDesensitizer()
  }

  generate(params: GenerateReportParams): InspectionReport {
    const {
      reportableList,
      exemptedList,
      overdueList,
      overrideList,
      errorList,
      configVersions,
      inspectionScope,
      warnings,
    } = params

    const allPolicyBasis: string[] = []
    for (const item of reportableList) {
      allPolicyBasis.push(item.policyBasis)
    }
    for (const item of exemptedList) {
      allPolicyBasis.push(item.policyBasis)
    }
    for (const item of overdueList) {
      allPolicyBasis.push(item.policyBasis)
    }

    const policyBasisSummary = this.policyBasisBuilder.buildSummary(allPolicyBasis)

    const report: InspectionReport = {
      reportId: this.generateReportId(),
      inspectionTime: new Date().toISOString(),
      inspectionScope,
      reportableList,
      exemptedList,
      overdueList,
      overrideList,
      errorList,
      policyBasisSummary,
      configVersions,
      legalDisclaimer: LEGAL_DISCLAIMER,
      warnings,
    }

    return report
  }

  writeJson(report: InspectionReport, outputPath: string): void {
    const dir = dirname(outputPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    const desensitized = this.reportDesensitizer.desensitizeReport(
      report as unknown as Record<string, unknown>,
    )
    writeFileSync(outputPath, JSON.stringify(desensitized, null, 2), 'utf-8')
  }

  writeMarkdown(report: InspectionReport, outputPath: string): void {
    const dir = dirname(outputPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    const markdown = this.renderMarkdown(report)
    writeFileSync(outputPath, markdown, 'utf-8')
  }

  private generateReportId(): string {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 10000)
    return `RPT-${timestamp}-${random}`
  }

  private renderMarkdown(report: InspectionReport): string {
    const lines: string[] = []

    lines.push('# 金融反洗钱大额交易合规巡检报告')
    lines.push('')
    lines.push(`> ${report.legalDisclaimer}`)
    lines.push('')
    lines.push('## 巡检元数据')
    lines.push('')
    lines.push(`- 报告标识: ${report.reportId}`)
    lines.push(`- 巡检时间: ${report.inspectionTime}`)
    lines.push(`- 巡检范围: ${report.inspectionScope}`)
    lines.push(`- 阈值配置版本: ${report.configVersions.thresholdConfigVersion}`)
    lines.push(`- 豁免规则配置版本: ${report.configVersions.exemptionConfigVersion}`)
    lines.push(`- 汇率配置版本: ${report.configVersions.exchangeRateConfigVersion}`)
    lines.push(`- 节假日配置版本: ${report.configVersions.holidayConfigVersion}`)
    lines.push('')

    lines.push('## 应报交易清单')
    lines.push('')
    if (report.reportableList.length === 0) {
      lines.push('（无应报交易）')
    } else {
      lines.push('| 交易标识 | 触发阈值类型 | 政策依据 | 判定状态 |')
      lines.push('|---|---|---|---|')
      for (const item of report.reportableList) {
        lines.push(`| ${item.transactionId} | ${item.triggeredThresholdType} | ${item.policyBasis} | ${item.judgmentStatus} |`)
      }
    }
    lines.push('')

    lines.push('## 豁免交易清单')
    lines.push('')
    if (report.exemptedList.length === 0) {
      lines.push('（无豁免交易）')
    } else {
      lines.push('| 交易标识 | 豁免原因 | 政策依据 | 判定状态 |')
      lines.push('|---|---|---|---|')
      for (const item of report.exemptedList) {
        lines.push(`| ${item.transactionId} | ${item.exemptionReason} | ${item.policyBasis} | ${item.judgmentStatus} |`)
      }
    }
    lines.push('')

    lines.push('## 逾期预警清单')
    lines.push('')
    if (report.overdueList.length === 0) {
      lines.push('（无逾期交易）')
    } else {
      lines.push('| 交易标识 | 逾期天数 | 政策依据 |')
      lines.push('|---|---|---|')
      for (const item of report.overdueList) {
        lines.push(`| ${item.transactionId} | ${item.overdueDays} | ${item.policyBasis} |`)
      }
    }
    lines.push('')

    lines.push('## 人工覆盖记录清单')
    lines.push('')
    if (report.overrideList.length === 0) {
      lines.push('（无人工覆盖记录）')
    } else {
      lines.push('| 交易标识 | 原结论 | 新结论 | 覆盖理由 | 操作人 | 操作时间 |')
      lines.push('|---|---|---|---|---|---|')
      for (const item of report.overrideList) {
        lines.push(`| ${item.transactionId} | ${item.originalConclusion} | ${item.newConclusion} | ${item.overrideReason} | ${item.operator} | ${item.overrideTime} |`)
      }
    }
    lines.push('')

    lines.push('## 数据校验错误清单')
    lines.push('')
    if (report.errorList.length === 0) {
      lines.push('（无校验错误）')
    } else {
      lines.push('| 交易标识 | 缺失字段 | 错误信息 |')
      lines.push('|---|---|---|')
      for (const item of report.errorList) {
        lines.push(`| ${item.transactionId} | ${item.missingFields.join(', ')} | ${item.errorMessage} |`)
      }
    }
    lines.push('')

    lines.push('## 政策依据汇总')
    lines.push('')
    if (report.policyBasisSummary.length === 0) {
      lines.push('（无政策依据）')
    } else {
      for (const basis of report.policyBasisSummary) {
        lines.push(`- ${basis}`)
      }
    }
    lines.push('')

    if (report.warnings.length > 0) {
      lines.push('## 警告信息')
      lines.push('')
      for (const warning of report.warnings) {
        lines.push(`- ${warning}`)
      }
      lines.push('')
    }

    return lines.join('\n')
  }
}
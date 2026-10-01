import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'
import type {
  QualityCheckResult,
  QualityElementScore,
  ErrorClassStatistics,
  GrossErrorRateResult,
  ReviewOverrideRecord,
  ValidationError,
  ConfigVersionSet,
  InspectionReport,
} from './types.js'
import { PolicyBasisBuilder } from './policy-basis-builder.js'
import { LEGAL_DISCLAIMER, INSPECTION_RATIO_STATEMENT } from './invariant.js'

export interface GenerateReportParams {
  checkResults: QualityCheckResult[]
  qualityElementScores: QualityElementScore[]
  totalQualityScore: number
  errorClassStatistics: ErrorClassStatistics
  grossErrorRate: GrossErrorRateResult
  overrideList: ReviewOverrideRecord[]
  errorList: ValidationError[]
  configVersions: ConfigVersionSet
  inspectionScope: string
  warnings: string[]
}

export class InspectionReportGenerator {
  private readonly policyBasisBuilder: PolicyBasisBuilder

  constructor() {
    this.policyBasisBuilder = new PolicyBasisBuilder()
  }

  generate(params: GenerateReportParams): InspectionReport {
    const {
      checkResults,
      qualityElementScores,
      errorClassStatistics,
      grossErrorRate,
      overrideList,
      errorList,
      configVersions,
      inspectionScope,
      warnings,
    } = params

    const allPolicyBasis: string[] = []
    for (const result of checkResults) {
      allPolicyBasis.push(result.policyBasis)
    }
    for (const score of qualityElementScores) {
      allPolicyBasis.push(score.policyBasis)
    }
    allPolicyBasis.push(errorClassStatistics.policyBasis)
    allPolicyBasis.push(grossErrorRate.policyBasis)

    const policyBasisSummary = this.policyBasisBuilder.buildSummary(allPolicyBasis)

    const report: InspectionReport = {
      reportId: this.generateReportId(),
      inspectionTime: new Date().toISOString(),
      inspectionScope,
      inspectionRatioStatement: INSPECTION_RATIO_STATEMENT,
      checkResults,
      qualityElementScores,
      errorClassStatistics,
      grossErrorRate,
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
    writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8')
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

    lines.push('# 地下管线数据质量巡检报告')
    lines.push('')
    lines.push(`> ${report.legalDisclaimer}`)
    lines.push('')
    lines.push('## 巡检元数据')
    lines.push('')
    lines.push(`- 报告标识: ${report.reportId}`)
    lines.push(`- 巡检时间: ${report.inspectionTime}`)
    lines.push(`- 巡检范围: ${report.inspectionScope}`)
    lines.push(`- 检测比例: ${report.inspectionRatioStatement}`)
    lines.push(`- 巡检配置版本: ${report.configVersions.inspectionConfigVersion}`)
    lines.push(`- 属性配置版本: ${report.configVersions.attributeConfigVersion}`)
    lines.push(`- 质量元素配置版本: ${report.configVersions.qualityElementConfigVersion}`)
    lines.push('')

    lines.push('## 检测结果清单')
    lines.push('')
    if (report.checkResults.length === 0) {
      lines.push('（无检测结果）')
    } else {
      lines.push('| 检查项 | 错误类别 | 对象标识 | 描述 | 政策依据 |')
      lines.push('|---|---|---|---|---|')
      for (const result of report.checkResults) {
        lines.push(`| ${result.checkName} | ${result.errorClass} | ${result.objectId} | ${result.description} | ${result.policyBasis} |`)
      }
    }
    lines.push('')

    lines.push('## 质量元素评分')
    lines.push('')
    if (report.qualityElementScores.length === 0) {
      lines.push('（无质量元素评分）')
    } else {
      lines.push('| 质量元素 | 权重 | 得分 | 政策依据 |')
      lines.push('|---|---|---|---|')
      for (const score of report.qualityElementScores) {
        lines.push(`| ${score.elementName} | ${score.weight} | ${score.score} | ${score.policyBasis} |`)
      }
    }
    lines.push('')

    lines.push('## 错误分类统计')
    lines.push('')
    const stats = report.errorClassStatistics
    lines.push(`- A类错误: ${stats.classACount}`)
    lines.push(`- B类错误: ${stats.classBCount}`)
    lines.push(`- C类错误: ${stats.classCCount}`)
    lines.push(`- D类错误: ${stats.classDCount}`)
    lines.push(`- 总计: ${stats.totalCount}`)
    lines.push(`- 政策依据: ${stats.policyBasis}`)
    lines.push('')

    lines.push('## 管线点粗差率')
    lines.push('')
    const ger = report.grossErrorRate
    lines.push(`- 管线点总数: ${ger.totalPoints}`)
    lines.push(`- 粗差点数: ${ger.grossErrorPoints}`)
    lines.push(`- 粗差率: ${(ger.rate * 100).toFixed(2)}%`)
    lines.push(`- 阈值: ${(ger.threshold * 100).toFixed(2)}%`)
    lines.push(`- 结论: ${ger.passed ? '合格' : '不合格'}`)
    lines.push(`- 政策依据: ${ger.policyBasis}`)
    lines.push('')

    lines.push('## 人工覆盖记录清单')
    lines.push('')
    if (report.overrideList.length === 0) {
      lines.push('（无人工覆盖记录）')
    } else {
      lines.push('| 对象标识 | 原结论 | 新结论 | 覆盖理由 | 操作人 | 操作时间 |')
      lines.push('|---|---|---|---|---|---|')
      for (const item of report.overrideList) {
        lines.push(`| ${item.objectId} | ${item.originalConclusion} | ${item.newConclusion} | ${item.overrideReason} | ${item.operator} | ${item.overrideTime} |`)
      }
    }
    lines.push('')

    lines.push('## 数据校验错误清单')
    lines.push('')
    if (report.errorList.length === 0) {
      lines.push('（无校验错误）')
    } else {
      lines.push('| 对象标识 | 缺失字段 | 错误信息 |')
      lines.push('|---|---|---|')
      for (const item of report.errorList) {
        lines.push(`| ${item.objectId} | ${item.missingFields.join(', ')} | ${item.errorMessage} |`)
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
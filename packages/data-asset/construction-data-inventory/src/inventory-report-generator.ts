import { writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import type {
  ChangeTraceabilityResult,
  ClassificationEncodingEntry,
  ConfigVersionSet,
  InventoryReport,
  QualityReport,
  ReviewOverrideRecord,
  UnifiedAssetItem,
  ValidationError,
} from './types.js'
import { LEGAL_DISCLAIMER } from './invariant.js'
import { PolicyBasisBuilder } from './policy-basis-builder.js'
import { ReportDesensitizer } from './report-desensitizer.js'
import { AssetLedgerExporter } from './asset-ledger-exporter.js'

export class InventoryReportGenerator {
  private readonly policyBasisBuilder: PolicyBasisBuilder
  private readonly desensitizer: ReportDesensitizer
  private readonly ledgerExporter: AssetLedgerExporter

  constructor() {
    this.policyBasisBuilder = new PolicyBasisBuilder()
    this.desensitizer = new ReportDesensitizer()
    this.ledgerExporter = new AssetLedgerExporter()
  }

  generate(params: {
    assetList: UnifiedAssetItem[]
    classificationEncodingList: ClassificationEncodingEntry[]
    changeTraceabilityReport: ChangeTraceabilityResult[]
    overrideList: ReviewOverrideRecord[]
    errorList: ValidationError[]
    configVersions: ConfigVersionSet
    projectId: string
    skippedChangeTraceability?: boolean
  }): InventoryReport {
    const {
      assetList,
      classificationEncodingList,
      changeTraceabilityReport,
      overrideList,
      errorList,
      configVersions,
      projectId,
    } = params

    const policyBasisList: string[] = []
    for (const asset of assetList) {
      if (asset.policyBasis) policyBasisList.push(asset.policyBasis)
    }
    for (const entry of classificationEncodingList) {
      if (entry.policyBasis) policyBasisList.push(entry.policyBasis)
    }
    for (const result of changeTraceabilityReport) {
      if (result.policyBasis) policyBasisList.push(result.policyBasis)
    }
    const policyBasisSummary = this.policyBasisBuilder.buildSummary(policyBasisList)

    let report: InventoryReport = {
      reportId: randomUUID(),
      inventoryTime: new Date().toISOString(),
      projectId,
      assetList,
      classificationEncodingList,
      changeTraceabilityReport,
      overrideList,
      errorList,
      policyBasisSummary,
      configVersions,
      legalDisclaimer: LEGAL_DISCLAIMER,
    }

    const desensitizeResult = this.desensitizer.desensitize(report)
    report = desensitizeResult.report

    return report
  }

  writeJson(report: InventoryReport, outputPathDir: string): string {
    const fullPath = resolve(outputPathDir, 'inventory-report.json')
    if (!existsSync(outputPathDir)) {
      mkdirSync(outputPathDir, { recursive: true })
    }
    writeFileSync(fullPath, JSON.stringify(report, null, 2), 'utf-8')
    return fullPath
  }

  writeMarkdown(report: InventoryReport, outputPathDir: string): string {
    const fullPath = resolve(outputPathDir, 'inventory-report.md')
    if (!existsSync(outputPathDir)) {
      mkdirSync(outputPathDir, { recursive: true })
    }
    const markdown = this.renderMarkdown(report)
    writeFileSync(fullPath, markdown, 'utf-8')
    return fullPath
  }

  exportLedger(assetList: UnifiedAssetItem[], outputPathDir: string): string {
    return this.ledgerExporter.exportToPath(assetList, outputPathDir)
  }

  writeQualityReport(
    report: InventoryReport,
    outputPathDir: string,
  ): { jsonPath: string; mdPath: string } | null {
    if (!report.qualityReport) {
      return null
    }
    if (!existsSync(outputPathDir)) {
      mkdirSync(outputPathDir, { recursive: true })
    }
    const jsonPath = resolve(outputPathDir, 'quality-check-report.json')
    writeFileSync(jsonPath, JSON.stringify(report.qualityReport, null, 2), 'utf-8')
    const mdPath = resolve(outputPathDir, 'quality-check-report.md')
    writeFileSync(mdPath, this.renderQualityMarkdown(report.qualityReport), 'utf-8')
    return { jsonPath, mdPath }
  }

  private renderMarkdown(report: InventoryReport): string {
    const lines: string[] = []
    lines.push(`# 建筑工程项目数据资产盘点报告`)
    lines.push('')
    lines.push(`> ${report.legalDisclaimer}`)
    lines.push('')
    lines.push(`## 报告元信息`)
    lines.push(`- 报告标识: ${report.reportId}`)
    lines.push(`- 盘点时间: ${report.inventoryTime}`)
    lines.push(`- 项目标识: ${report.projectId}`)
    lines.push(`- 分类配置版本: ${report.configVersions.classificationConfigVersion}`)
    lines.push(`- 编码规则配置版本: ${report.configVersions.encodingRuleConfigVersion}`)
    lines.push(`- 适配器配置版本: ${report.configVersions.sourceAdapterConfigVersion}`)
    lines.push('')
    lines.push(`## 资产清单 (${report.assetList.length} 项)`)
    lines.push('| 资产标识 | 数据类型 | 分类代码 | 资产编码 | 判定状态 | 政策依据 |')
    lines.push('|---------|---------|---------|---------|---------|---------|')
    for (const asset of report.assetList) {
      lines.push(`| ${asset.assetId} | ${asset.dataType} | ${asset.classificationCode || '未分类'} | ${asset.assetCode || '未生成'} | ${asset.judgmentStatus} | ${asset.policyBasis || '-'} |`)
    }
    lines.push('')
    lines.push(`## 分类编码清单 (${report.classificationEncodingList.length} 项)`)
    lines.push('| 资产标识 | 分类代码 | 资产编码 | 判定状态 | 政策依据 |')
    lines.push('|---------|---------|---------|---------|---------|')
    for (const entry of report.classificationEncodingList) {
      lines.push(`| ${entry.assetId} | ${entry.classificationCode} | ${entry.assetCode} | ${entry.judgmentStatus} | ${entry.policyBasis} |`)
    }
    lines.push('')
    lines.push(`## 变更追溯报告 (${report.changeTraceabilityReport.length} 项)`)
    if (report.changeTraceabilityReport.length === 0) {
      lines.push('无变更追溯结果')
    } else {
      lines.push('| 变更标识 | 关联资产 | 记录完整 | 审批链完整 | 影响范围 | 缺失项 | 政策依据 |')
      lines.push('|---------|---------|---------|---------|---------|---------|---------|')
      for (const result of report.changeTraceabilityReport) {
        lines.push(`| ${result.changeId} | ${result.assetLinked ? '是' : '否'} | ${result.recordComplete ? '是' : '否'} | ${result.approvalChainComplete ? '是' : '否'} | ${result.impactScopeLinked ? '是' : '否'} | ${result.missingItems.join('、') || '-'} | ${result.policyBasis} |`)
      }
    }
    lines.push('')
    lines.push(`## 人工覆盖记录 (${report.overrideList.length} 项)`)
    if (report.overrideList.length === 0) {
      lines.push('无人工覆盖记录')
    } else {
      lines.push('| 资产标识 | 复核项 | 原结论 | 新结论 | 覆盖理由 | 操作人 | 操作时间 | 原资产编码 |')
      lines.push('|---------|---------|---------|---------|---------|---------|---------|---------|')
      for (const override of report.overrideList) {
        lines.push(`| ${override.assetId} | ${override.reviewItem} | ${override.originalConclusion} | ${override.newConclusion} | ${override.overrideReason} | ${override.operator} | ${override.overrideTime} | ${override.originalAssetCode} |`)
      }
    }
    lines.push('')
    lines.push(`## 错误清单 (${report.errorList.length} 项)`)
    if (report.errorList.length === 0) {
      lines.push('无错误')
    } else {
      for (const error of report.errorList) {
        lines.push(`- ${error.assetId}: ${error.errorMessage}`)
      }
    }
    lines.push('')
    lines.push(`## 政策依据汇总`)
    for (const basis of report.policyBasisSummary) {
      lines.push(`- ${basis}`)
    }
    lines.push('')
    return lines.join('\n')
  }

  private renderQualityMarkdown(qr: QualityReport): string {
    const lines: string[] = []
    lines.push(`# 建筑数据资产质量检查报告`)
    lines.push('')
    lines.push(`> 依据：《测绘成果质量检查与验收》（GB/T 24356-2023）`)
    lines.push('')
    lines.push(`## 质量元素评分`)
    lines.push('| 质量元素 | 权重 | 得分 | 政策依据 |')
    lines.push('|---------|------|------|---------|')
    for (const s of qr.qualityElementScores) {
      lines.push(`| ${s.elementName} | ${s.weight} | ${s.score} | ${s.policyBasis} |`)
    }
    lines.push('')
    lines.push(`- 综合得分: ${qr.totalScore}`)
    lines.push('')
    lines.push(`## 错误分类统计`)
    lines.push(`- A类错误: ${qr.errorClassStatistics.classACount} (${qr.errorClassProportions.classAProportion}%)`)
    lines.push(`- B类错误: ${qr.errorClassStatistics.classBCount} (${qr.errorClassProportions.classBProportion}%)`)
    lines.push(`- C类错误: ${qr.errorClassStatistics.classCCount} (${qr.errorClassProportions.classCProportion}%)`)
    lines.push(`- D类错误: ${qr.errorClassStatistics.classDCount} (${qr.errorClassProportions.classDProportion}%)`)
    lines.push(`- 违规总数: ${qr.errorClassStatistics.totalCount}`)
    lines.push(`- ${qr.errorClassStatistics.policyBasis}`)
    lines.push('')
    lines.push(`## 政策依据汇总`)
    for (const basis of qr.policyBasisSummary) {
      lines.push(`- ${basis}`)
    }
    lines.push('')
    return lines.join('\n')
  }
}
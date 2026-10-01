import { randomUUID } from 'node:crypto'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { LEGAL_DISCLAIMER } from './invariant.js'
import { PolicyBasisBuilder } from './policy-basis-builder.js'
import { RemediationSuggestionGenerator } from './remediation-suggestion-generator.js'
import type {
  LineageDetectionResult,
  ReproducibilityResult,
  QualityDimensionScore,
  ReviewOverrideRecord,
  ValidationError,
  ConfigVersionSet,
  ProvenanceAuditReport,

  RemediationSuggestionConfig,
} from './types.js'

export interface ReportGenerateParams {
  datasetId: string
  lineageResult: LineageDetectionResult
  reproducibilityResult: ReproducibilityResult
  qualityScores: QualityDimensionScore[]
  overrideList: ReviewOverrideRecord[]
  errorList: ValidationError[]
  configVersions: ConfigVersionSet
  remediationSuggestionConfig: RemediationSuggestionConfig | null | undefined
}

export class ProvenanceReportGenerator {
  private readonly policyBasisBuilder: PolicyBasisBuilder
  private readonly remediationSuggestionGenerator: RemediationSuggestionGenerator

  constructor(
    policyBasisBuilder?: PolicyBasisBuilder,
    remediationSuggestionGenerator?: RemediationSuggestionGenerator,
  ) {
    this.policyBasisBuilder = policyBasisBuilder ?? new PolicyBasisBuilder()
    this.remediationSuggestionGenerator = remediationSuggestionGenerator ?? new RemediationSuggestionGenerator(this.policyBasisBuilder)
  }

  generate(params: ReportGenerateParams): ProvenanceAuditReport {
    const allMissingItems = [
      ...params.lineageResult.missingItems,
      ...params.lineageResult.brokenPoints,
      ...params.reproducibilityResult.missingItems,
      ...params.qualityScores.flatMap((q) => q.issues),
    ]
    const remediationSuggestions = this.remediationSuggestionGenerator.generate(
      allMissingItems,
      params.remediationSuggestionConfig,
    )

    const policyBasisList = this.collectPolicyBasis(params)
    const policyBasisSummary = this.policyBasisBuilder.buildSummary(policyBasisList)

    return {
      reportId: randomUUID(),
      auditTime: new Date().toISOString(),
      datasetId: params.datasetId,
      lineageResult: params.lineageResult,
      reproducibilityResult: params.reproducibilityResult,
      qualityScores: params.qualityScores,
      overrideList: params.overrideList,
      remediationSuggestions,
      errorList: params.errorList,
      policyBasisSummary,
      configVersions: params.configVersions,
      legalDisclaimer: LEGAL_DISCLAIMER,
    }
  }

  writeJson(report: ProvenanceAuditReport, outputPath: string): string {
    const filePath = resolve(outputPath, 'provenance-report.json')
    this.ensureDir(dirname(filePath))
    writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8')
    return filePath
  }

  writeMarkdown(report: ProvenanceAuditReport, outputPath: string): string {
    const filePath = resolve(outputPath, 'provenance-report.md')
    this.ensureDir(dirname(filePath))
    writeFileSync(filePath, this.renderMarkdown(report), 'utf-8')
    return filePath
  }

  private collectPolicyBasis(params: ReportGenerateParams): string[] {
    const list: string[] = []
    list.push(params.lineageResult.policyBasis)
    list.push(params.reproducibilityResult.policyBasis)
    for (const q of params.qualityScores) {
      list.push(q.policyBasis)
    }
    return list
  }

  private ensureDir(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  private renderMarkdown(report: ProvenanceAuditReport): string {
    const lines: string[] = []
    lines.push(`# 科研数据溯源审计报告`)
    lines.push('')
    lines.push(`> ${report.legalDisclaimer}`)
    lines.push('')
    lines.push(`- 报告标识：${report.reportId}`)
    lines.push(`- 审计时间：${report.auditTime}`)
    lines.push(`- 数据集标识：${report.datasetId}`)
    lines.push('')
    lines.push(`## 一、数据血缘完整性检测`)
    lines.push(`- 完整度评分：${report.lineageResult.completenessScore.toFixed(2)}`)
    lines.push(`- 缺失项：${report.lineageResult.missingItems.join('；') || '无'}`)
    lines.push(`- 断裂点：${report.lineageResult.brokenPoints.join('；') || '无'}`)
    lines.push(`- 政策依据：${report.lineageResult.policyBasis}`)
    lines.push(`- 判定状态：${report.lineageResult.judgmentStatus}`)
    lines.push('')
    lines.push(`## 二、可复现性检测`)
    const reproScore = report.reproducibilityResult.reproducibilityScore
    lines.push(`- 可复现性评分：${report.reproducibilityResult.skipped ? 'N/A' : (reproScore !== null ? reproScore.toFixed(2) : 'N/A')}`)
    lines.push(`- 缺失项：${report.reproducibilityResult.missingItems.join('；') || '无'}`)
    lines.push(`- 政策依据：${report.reproducibilityResult.policyBasis}`)
    lines.push(`- 判定状态：${report.reproducibilityResult.judgmentStatus}`)
    lines.push('')
    lines.push(`## 三、六维质量得分`)
    for (const q of report.qualityScores) {
      const scoreText = q.score === null ? 'N/A' : q.score.toFixed(2)
      lines.push(`- ${q.dimension}：${scoreText}（${q.judgmentStatus}）`)
      if (q.issues.length > 0) {
        lines.push(`  - 问题：${q.issues.join('；')}`)
      }
      lines.push(`  - ${q.policyBasis}`)
    }
    lines.push('')
    lines.push(`## 四、人工覆盖记录`)
    if (report.overrideList.length === 0) {
      lines.push('- 无人工覆盖记录')
    } else {
      for (const o of report.overrideList) {
        lines.push(`- ${o.detectionItem}：${o.originalConclusion} → ${o.newConclusion}（操作人：${o.operator}，时间，${o.overrideTime}）`)
        lines.push(`  - 理由：${o.overrideReason}`)
      }
    }
    lines.push('')
    lines.push(`## 五、整改建议`)
    if (report.remediationSuggestions.length === 0) {
      lines.push('- 无整改建议')
    } else {
      for (const s of report.remediationSuggestions) {
        lines.push(`- ${s.missingItemType}：${s.suggestion}（${s.policyBasis}）`)
      }
    }
    lines.push('')
    lines.push(`## 六、政策依据汇总`)
    for (const p of report.policyBasisSummary) {
      lines.push(`- ${p}`)
    }
    lines.push('')
    lines.push(`## 七、配置版本号`)
    lines.push(`- 质量维度配置：${report.configVersions.qualityDimensionConfigVersion}`)
    lines.push(`- 整改建议配置：${report.configVersions.remediationSuggestionConfigVersion}`)
    if (report.errorList.length > 0) {
      lines.push('')
      lines.push(`## 八、错误清单`)
      for (const e of report.errorList) {
        lines.push(`- [${e.code}] ${e.message}`)
      }
    }
    return lines.join('\n') + '\n'
  }
}

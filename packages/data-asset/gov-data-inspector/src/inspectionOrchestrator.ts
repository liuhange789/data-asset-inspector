import type { ErrorDetail, FormatIssue, GuideInspectionResult, KnowledgeBase, StandardRule, FormatRule, DetectionRates, UnmatchedWarning } from './types.js'
import { MissingFieldDetector } from './missingFieldDetector.js'
import { SemanticRuleEngine } from './semanticRuleEngine.js'
import { LogicRuleEngine } from './logicRuleEngine.js'
import { FormatValidator } from './formatValidator.js'
import { QualityMetricsCalculator } from './qualityMetricsCalculator.js'
import { ErrorDetailBuilder } from './errorDetailBuilder.js'

export interface OrchestrateConfig {
  guideRequiredElements: string[]
  formatRules: FormatRule[]
  severityMapping: Record<string, string>
  scoreWeights: { completeness: number; accuracy: number; traceability: number }
  convenienceWeights: Record<string, number>
  itemTypeMatching: Record<string, { keywords: string[]; codePrefix: string }>
  materialConciseThreshold: number
  missingFieldStandardClause: string
}

export interface OrchestrateOptions {
  degradedMode?: boolean | undefined
  itemTypeOverride?: string | undefined
}

export interface OrchestrateResult extends GuideInspectionResult {
  warnings: UnmatchedWarning[]
}

export const InspectionOrchestrator = {
  orchestrate(
    data: unknown[],
    config: OrchestrateConfig,
    kb: KnowledgeBase,
    standardRules: StandardRule[],
    options?: OrchestrateOptions,
  ): OrchestrateResult {
    const allErrorDetails: ErrorDetail[] = []
    const allFormatIssues: FormatIssue[] = []
    const allWarnings: UnmatchedWarning[] = []
    let completeCount = 0
    let serviceConvenience = 0

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      if (typeof row !== 'object' || row === null) continue
      const guide = row as Record<string, unknown>
      const guideId = String(guide['事项名称'] ?? `指南${i + 1}`)

      const missingDetails = MissingFieldDetector.detect(
        guide,
        guideId,
        config.guideRequiredElements,
        config.severityMapping,
        undefined,
        config.missingFieldStandardClause,
      )
      allErrorDetails.push(...missingDetails)

      const isComplete = missingDetails.length === 0
      if (isComplete) completeCount++

      const semanticResult = SemanticRuleEngine.detect(
        guide,
        guideId,
        kb,
        config.itemTypeMatching,
        config.severityMapping,
        { degradedMode: options?.degradedMode, itemTypeOverride: options?.itemTypeOverride },
      )
      allErrorDetails.push(...semanticResult.details)
      if (semanticResult.warning) {
        allWarnings.push(semanticResult.warning)
      }

      const logicalDetails = LogicRuleEngine.detect(
        guide,
        guideId,
        standardRules,
        config.severityMapping,
      )
      allErrorDetails.push(...logicalDetails)

      const formatIssues = FormatValidator.validate(guide, guideId, config.formatRules)
      allFormatIssues.push(...formatIssues)

      if (guide['办理时限'] && typeof guide['办理时限'] === 'string' && (guide['办理时限'] as string).includes('工作日')) {
        serviceConvenience += config.convenienceWeights.timeLimit ?? 0.3
      }
      if (guide.onlineCapable === true) {
        serviceConvenience += config.convenienceWeights.onlineCapable ?? 0.4
      }
      const materialStr = String(guide['申请材料'] ?? '')
      if (materialStr) {
        const materialCount = materialStr.split(/[、,，;；\n]/).filter(Boolean).length
        if (materialCount <= (config.materialConciseThreshold ?? 5)) {
          serviceConvenience += config.convenienceWeights.materialConcise ?? 0.3
        }
      }
    }

    const counts = ErrorDetailBuilder.countByType(allErrorDetails)
    const totalFieldCount = data.length * config.guideRequiredElements.length

    const detectionRates: DetectionRates = QualityMetricsCalculator.calculate({
      semanticErrorCount: counts.semantic,
      logicalErrorCount: counts.logical,
      missingFieldCount: counts.missing,
      formatIssueCount: allFormatIssues.length,
      totalGuides: data.length,
      requiredFieldCount: config.guideRequiredElements.length,
      totalFieldCount: totalFieldCount > 0 ? totalFieldCount : 1,
      errorDetails: allErrorDetails,
      scoreWeights: config.scoreWeights,
    })

    return {
      completeness: data.length > 0 ? Math.round((completeCount / data.length) * 100) : 0,
      missingFields: counts.missing,
      semanticErrors: counts.semantic,
      logicalErrors: counts.logical,
      errorDetails: allErrorDetails,
      formatIssues: allFormatIssues,
      serviceConvenience: Math.round(serviceConvenience * 100) / 100,
      totalGuidesChecked: data.length,
      detectionRates,
      warnings: allWarnings,
    }
  },
}
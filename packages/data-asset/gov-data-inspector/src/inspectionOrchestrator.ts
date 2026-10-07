import type { ErrorDetail, FormatIssue, GuideInspectionResult, KnowledgeBase, StandardRule, FormatRule, DetectionRates, UnmatchedWarning, GroundTruth } from './types.js'
import { MissingFieldDetector } from './missingFieldDetector.js'
import { SemanticRuleEngine } from './semanticRuleEngine.js'
import { LogicRuleEngine } from './logicRuleEngine.js'
import { FormatValidator } from './formatValidator.js'
import { QualityMetricsCalculator } from './qualityMetricsCalculator.js'
import { ErrorDetailBuilder } from './errorDetailBuilder.js'
import { mapGuideToStandard } from './mapping-layer.js'

export function deduplicateCrossEngine(errors: ErrorDetail[]): ErrorDetail[] {
  const logicalKeys = new Set(
    errors
      .filter((e) => e.errorType === 'logical')
      .map((e) => `${e.guideId}:${e.field}:${e.standardClause ?? ''}`),
  )
  const seenLogicalFields = new Set<string>()
  return errors.filter((e) => {
    if (e.errorType === 'semantic' && logicalKeys.has(`${e.guideId}:${e.field}:${e.standardClause ?? ''}`)) {
      return false
    }
    if (e.errorType === 'logical') {
      const fieldKey = `${e.guideId}:${e.field}`
      if (seenLogicalFields.has(fieldKey)) return false
      seenLogicalFields.add(fieldKey)
    }
    return true
  })
}

export interface OrchestrateConfig {
  guideRequiredElements?: string[]
  requiredFields?: string[]
  coreRequiredFields?: string[]
  extendedRequiredFields?: string[]
  formatRules: FormatRule[]
  severityMapping: Record<string, string>
  scoreWeights?: { completeness: number; accuracy: number; traceability: number }
  scoringWeights?: { completeness: number; accuracy: number; traceability: number }
  convenienceWeights: Record<string, number>
  itemTypeMatching: Record<string, { keywords: string[]; codePrefix: string }>
  materialConciseThreshold: number
  missingFieldStandardClause: string
  gbt47949Mapping?: Record<string, string>
  gbtMapping?: Record<string, string>
  fieldMapping?: Record<string, string> | undefined
  semanticConflictRules?: import('./types.js').SemanticConflictRules | undefined
  vagueTerms?: string[] | undefined
  substantiveWords?: string[] | undefined
  validShortValues?: string[] | undefined
  govServiceHotlineWhitelist?: string[] | undefined
  timeLimitValidExpressions?: string[] | undefined
  chargeValidPatterns?: string[] | undefined
  processCoreStepKeywords?: string[] | undefined
  processSimplifiedStepAliases?: Record<string, string[]> | undefined
  fieldResidueValues?: string[] | undefined
}

export interface OrchestrateOptions {
  degradedMode?: boolean | undefined
  itemTypeOverride?: string | undefined
  localTermsPath?: string | undefined
  degradedSimilarityThreshold?: number | undefined
  inlineLocalTerms?: { materials: string[]; conditions: string[] } | undefined
  referenceSystem?: import('./types.js').ReferenceSystem | null
  groundTruth?: GroundTruth
}

export interface OrchestrateResult extends GuideInspectionResult {
  warnings: UnmatchedWarning[]
  coreMissingCount?: number
  extendedMissingCount?: number
  itemType?: string | null
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
    const allSuspectedErrors: ErrorDetail[] = []
    const allFormatIssues: FormatIssue[] = []
    const allWarnings: UnmatchedWarning[] = []
    let completeCount = 0
    let serviceConvenience = 0
    let coreMissingCount = 0
    let extendedMissingCount = 0
    let lastItemType: string | null = null

    const requiredFields = config.requiredFields ?? config.guideRequiredElements ?? []
    const coreRequiredFields = config.coreRequiredFields ?? config.requiredFields ?? config.guideRequiredElements ?? []
    const extendedRequiredFields = config.extendedRequiredFields ?? []
    const scoringWeights = config.scoringWeights ?? config.scoreWeights
    const useGraded = config.coreRequiredFields !== undefined && config.coreRequiredFields.length > 0

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      if (typeof row !== 'object' || row === null) continue
      const guide = row as Record<string, unknown>
      const guideId = String(guide['事项名称'] ?? `指南${i + 1}`)

      const standardGuide = config.fieldMapping
        ? mapGuideToStandard(guide, config.fieldMapping)
        : guide

      if (useGraded) {
        const matchResult = SemanticRuleEngine.matchItemType(standardGuide, config.itemTypeMatching, { itemTypeOverride: options?.itemTypeOverride })
        lastItemType = matchResult.itemType

        const graded = MissingFieldDetector.detectGraded(
          standardGuide,
          guideId,
          coreRequiredFields,
          extendedRequiredFields,
          config.severityMapping,
          undefined,
          config.missingFieldStandardClause,
          matchResult.itemType ?? undefined,
          { ...(config.fieldResidueValues ? { fieldResidueValues: config.fieldResidueValues } : {}) },
        )
        allErrorDetails.push(...graded.coreDetails, ...graded.extendedDetails)
        coreMissingCount += graded.coreDetails.length
        extendedMissingCount += graded.extendedDetails.length
        const isComplete = graded.coreDetails.length === 0
        if (isComplete) completeCount++
      } else {

        const missingDetails = MissingFieldDetector.detect(
          standardGuide,
          guideId,
          requiredFields,
          config.severityMapping,
          undefined,
          config.missingFieldStandardClause,
          { ...(config.fieldResidueValues ? { fieldResidueValues: config.fieldResidueValues } : {}) },
        )
        allErrorDetails.push(...missingDetails)
        coreMissingCount += missingDetails.length
        const isComplete = missingDetails.length === 0
        if (isComplete) completeCount++
      }

      const semanticResult = SemanticRuleEngine.detect(
        standardGuide,
        guideId,
        kb,
        config.itemTypeMatching,
        config.severityMapping,
        { degradedMode: options?.degradedMode, itemTypeOverride: options?.itemTypeOverride, localTermsPath: options?.localTermsPath, degradedSimilarityThreshold: options?.degradedSimilarityThreshold, inlineLocalTerms: options?.inlineLocalTerms, semanticConflictRules: config.semanticConflictRules, ...(config.vagueTerms ? { vagueTerms: config.vagueTerms } : {}), ...(config.substantiveWords ? { substantiveWords: config.substantiveWords } : {}), ...(config.validShortValues ? { validShortValues: config.validShortValues } : {}) },
      )
      const suspected = semanticResult.details.filter(
        (d) => d.standardClause?.includes('降级模式') && d.description.includes('相似度'),
      )
      allSuspectedErrors.push(...suspected)
      if (semanticResult.warning) {
        allWarnings.push(semanticResult.warning)
      }

      const logicalDetails = LogicRuleEngine.detect(
        standardGuide,
        guideId,
        standardRules,
        config.severityMapping,
        {
          ...(config.processCoreStepKeywords ? { processCoreStepKeywords: config.processCoreStepKeywords } : {}),
          ...(config.processSimplifiedStepAliases ? { processSimplifiedStepAliases: config.processSimplifiedStepAliases } : {}),
        },
      )

      allErrorDetails.push(...semanticResult.details, ...logicalDetails)

      const formatIssues = FormatValidator.validate(standardGuide, guideId, config.formatRules, useGraded ? [...coreRequiredFields, ...extendedRequiredFields] : requiredFields, {
        ...(config.govServiceHotlineWhitelist ? { govServiceHotlineWhitelist: config.govServiceHotlineWhitelist } : {}),
        ...(config.timeLimitValidExpressions ? { timeLimitValidExpressions: config.timeLimitValidExpressions } : {}),
        ...(config.chargeValidPatterns ? { chargeValidPatterns: config.chargeValidPatterns } : {}),
      })
      allFormatIssues.push(...formatIssues)

      if (standardGuide['办理时限'] && typeof standardGuide['办理时限'] === 'string' && (standardGuide['办理时限'] as string).includes('工作日')) {
        serviceConvenience += config.convenienceWeights.timeLimit ?? 0.3
      }
      if (standardGuide.onlineCapable === true) {
        serviceConvenience += config.convenienceWeights.onlineCapable ?? 0.4
      }
      const materialStr = String(standardGuide['申请材料'] ?? '')
      if (materialStr) {
        const materialCount = materialStr.split(/[、,，;；\n]/).filter(Boolean).length
        if (materialCount <= (config.materialConciseThreshold ?? 5)) {
          serviceConvenience += config.convenienceWeights.materialConcise ?? 0.3
        }
      }
    }

    const counts = ErrorDetailBuilder.countByType(allErrorDetails)
    const effectiveFieldCount = useGraded ? coreRequiredFields.length : requiredFields.length
    const totalFieldCount = data.length * effectiveFieldCount

    const detectionRates: DetectionRates = QualityMetricsCalculator.calculate({
      semanticErrorCount: counts.semantic,
      logicalErrorCount: counts.logical,
      missingFieldCount: coreMissingCount,
      formatIssueCount: allFormatIssues.length,
      totalGuides: data.length,
      requiredFieldCount: effectiveFieldCount,
      totalFieldCount: totalFieldCount > 0 ? totalFieldCount : 1,
      errorDetails: allErrorDetails,
      scoreWeights: scoringWeights!,
      ...(options?.groundTruth ? { groundTruth: options.groundTruth } : {}),
    })

    return {
      completeness: data.length > 0 ? Math.round((completeCount / data.length) * 100) : 0,
      missingFields: coreMissingCount,
      semanticErrors: counts.semantic,
      logicalErrors: counts.logical,
      errorDetails: allErrorDetails,
      suspectedErrors: allSuspectedErrors,
      formatIssues: allFormatIssues,
      serviceConvenience: Math.round(serviceConvenience * 100) / 100,
      totalGuidesChecked: data.length,
      detectionRates,
      warnings: allWarnings,
      coreMissingCount,
      extendedMissingCount,
      itemType: lastItemType,
    }
  },
}
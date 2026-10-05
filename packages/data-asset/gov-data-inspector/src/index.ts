export const name = '@liuhange/dsh-gov-data-inspector'
export const inject = ['tools'] as const

import { resolvePolicyBasis } from './policyBasis.js'
import { KnowledgeBaseLoader } from './knowledgeBaseLoader.js'
import { InspectionOrchestrator } from './inspectionOrchestrator.js'
import { ReportGenerator } from './reportGenerator.js'
import { StandardRuleSource } from './standardRuleSource.js'
import { EncodingDetector } from './encodingDetector.js'
import { DataScaleGuard } from './dataScaleGuard.js'
import { UrlReachabilityChecker } from './urlReachabilityChecker.js'
import { InputBoundaryChecker } from './input-boundary-checker.js'
import { ConfigPackLoader } from './configPackLoader.js'
import type { ErrorCode, KnowledgeBase, StandardRule, DataSourceStatus, Warning } from './types.js'

export function apply(ctx: { tools: { register: (tool: unknown) => void } }) {
  ctx.tools.register({
    name: 'inspect_gov_data',
    description: '政务数据专项巡检，含办事指南质量检查（漏项/语义/逻辑/格式五维检测）和公共数据资产分类',
    parameters: {
      type: 'object',
      properties: {
        dataSource: { type: 'string', description: '政务数据文件路径' },
        inspectionMode: { type: 'string', enum: ['guide', 'classification', 'full'] },
        itemTypeOverride: { type: 'string', description: '手动指定事项类型，覆盖自动匹配结果' },
      },
      required: ['dataSource'],
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          dataSource: { type: 'string', description: '巡检数据源路径' },
          inspectionMode: { type: 'string', enum: ['guide', 'classification', 'full'], description: '巡检模式' },
          timestamp: { type: 'string', description: '巡检时间戳(ISO8601)' },
          policyBasis: { type: 'array', items: { type: 'string' }, description: '政策依据列表' },
          configPackId: { type: 'string', description: '配置包标识' },
          region: { type: 'string', description: '配置包适用地区' },
          configPackVersion: { type: 'string', description: '配置包版本' },
          dataSourceStatus: { type: 'object', description: '数据源获取状态' },
          degradedMode: { type: 'boolean', description: '是否降级模式' },
          degradedReason: { type: 'string', description: '降级原因' },
          guideInspection: { type: 'object', description: '办事指南巡检结果(含completeness/missingFields/semanticErrors/logicalErrors/errorDetails/suspectedErrors/formatIssues/detectionRates等)' },
          classification: { type: 'object', description: '公共数据资产分类结果(含dataAssetCode/categoryLevel/specificType)' },
          warnings: { type: 'array', description: '未匹配事项类型等告警信息' },
        },
        required: ['dataSource', 'inspectionMode', 'timestamp', 'policyBasis'],
      },
      render: { type: 'json' },
    },
    async execute(args: Record<string, unknown>) {
      try {
        if (!args?.dataSource || typeof args.dataSource !== 'string') {
          return JSON.stringify({ error: 'GOV_DATA_INPUT_INVALID' as ErrorCode, message: 'dataSource is required' })
        }

        const { configPack, warnings: packWarnings } = ConfigPackLoader.load()

        const encodingResult = EncodingDetector.detect(args.dataSource as string)
        if (encodingResult.content === null) {
          if (encodingResult.encodingError === '文件为空') {
            return JSON.stringify({ error: 'GOV_DATA_INPUT_INVALID' as ErrorCode, message: '无数据，请确认输入文件内容' })
          }
          if (encodingResult.encodingError?.includes('无法读取文件')) {
            const reachability = await UrlReachabilityChecker.check(args.dataSource as string)
            if (!reachability.reachable) {
              return JSON.stringify({ error: 'GOV_DATA_URL_UNREACHABLE' as ErrorCode, message: reachability.error ?? '数据源不可达，请检查路径或 URL' })
            }
          }
          return JSON.stringify({ error: 'GOV_DATA_ENCODING_ERROR' as ErrorCode, message: encodingResult.encodingError ?? '文件编码错误' })
        }

        let data: unknown[]
        try {
          const raw = encodingResult.content
          if (raw.trim() === '') {
            return JSON.stringify({ error: 'GOV_DATA_INPUT_INVALID' as ErrorCode, message: '无数据，请确认输入文件内容' })
          }
          const inputLengthThreshold = configPack.inputLengthThreshold ?? 50000
          const tooLargeResult = InputBoundaryChecker.checkTooLarge(raw, inputLengthThreshold)
          if (tooLargeResult.isTooLarge) {
            return JSON.stringify({ error: 'GOV_DATA_INPUT_TOO_LARGE' as ErrorCode, message: '输入数据超过处理上限，请分批提交' })
          }
          data = JSON.parse(raw)
          if (!Array.isArray(data)) data = [data]
        } catch (e) {
          return JSON.stringify({ error: 'GOV_DATA_INPUT_INVALID' as ErrorCode, message: `JSON 格式错误，请检查文件内容: ${(e as Error).message}` })
        }

        if (data.length === 0) {
          return JSON.stringify({ error: 'GOV_DATA_INPUT_INVALID' as ErrorCode, message: '无数据，请确认输入文件内容' })
        }

        const emptyCheck = InputBoundaryChecker.checkEmpty(data)
        if (emptyCheck.isEmpty) {
          return JSON.stringify({ error: 'GOV_DATA_NO_DATA' as ErrorCode, message: '未检测到有效数据' })
        }

        const scaleResult = DataScaleGuard.check(data, undefined)
        if (scaleResult.exceeded) {
          return JSON.stringify({ error: 'GOV_DATA_SCALE_EXCEEDED' as ErrorCode, message: `数据量超出处理上限（字段数${scaleResult.fieldCount}），请分批处理或增加maxFieldCount配置` })
        }

        const credentials = configPack.dataSourceCredentials
        const credConfig = {
          national: {
            apiKey: process.env[credentials.national.apiKey],
            endpoint: process.env[credentials.national.endpoint],
          },
          provincial: {
            apiKey: process.env[credentials.provincial.apiKey],
            endpoint: process.env[credentials.provincial.endpoint],
          },
        }

        const kbLoadResult = await KnowledgeBaseLoader.load(credConfig, configPack.dataSourcePriority)
        const kb: KnowledgeBase = kbLoadResult.kb
        const degradedMode = kbLoadResult.degraded
        const degradedReason = kbLoadResult.degradedReason

        const dataSourceStatus: DataSourceStatus = KnowledgeBaseLoader.getDataSourceStatus()

        let standardRules: StandardRule[]
        const stdRuleResult = await StandardRuleSource.fetch({
          docPath: process.env[credentials.standard.docPath],
          endpoint: process.env[credentials.standard.endpoint],
        })
        if (stdRuleResult.rules.length > 0) {
          standardRules = stdRuleResult.rules
          dataSourceStatus.standard = stdRuleResult.status
        } else {
          standardRules = configPack.logicErrorRules
        }

        if (!standardRules || standardRules.length === 0) {
          if (!degradedMode) {
            return JSON.stringify({ error: 'GOV_DATA_LOGIC_RULES_MISSING' as ErrorCode, message: '标准规则集缺失，逻辑错误检测已中止' })
          }
          standardRules = []
        }

        let policyBasis: string[]
        try {
          policyBasis = resolvePolicyBasis('GOV_DATA_INSPECTION', configPack.policyBasis)
          if (!policyBasis || policyBasis.length === 0) {
            return JSON.stringify({ error: 'GOV_DATA_POLICY_MISSING' as ErrorCode, message: '政策依据配置缺失' })
          }
        } catch {
          return JSON.stringify({ error: 'GOV_DATA_POLICY_MISSING' as ErrorCode, message: '政策依据配置加载失败' })
        }

        const mode = (args.inspectionMode as string) ?? 'full'
        const itemTypeOverride = args.itemTypeOverride as string | undefined

        const result: Record<string, unknown> = {
          dataSource: args.dataSource,
          inspectionMode: mode,
          timestamp: new Date().toISOString(),
          policyBasis,
          configPackId: configPack.configPackId,
          region: configPack.region,
          configPackVersion: configPack.configPackVersion,
          dataSourceStatus,
        }

        if (degradedMode) {
          result.degradedMode = true
          result.degradedReason = degradedReason
        }

        const allWarnings: Warning[] = [...packWarnings]

        if (mode === 'guide' || mode === 'full') {
          const orchestrateResult = InspectionOrchestrator.orchestrate(
            data,
            {
              requiredFields: configPack.requiredFields,
              ...(configPack.coreRequiredFields ? { coreRequiredFields: configPack.coreRequiredFields } : {}),
              ...(configPack.extendedRequiredFields ? { extendedRequiredFields: configPack.extendedRequiredFields } : {}),
              formatRules: configPack.formatRules,
              severityMapping: configPack.severityMapping,
              scoringWeights: configPack.scoringWeights,
              convenienceWeights: configPack.convenienceWeights ?? { timeLimit: 0.3, onlineCapable: 0.4, materialConcise: 0.3 },
              itemTypeMatching: configPack.itemTypeMatching,
              materialConciseThreshold: configPack.materialConciseThreshold ?? 5,
              missingFieldStandardClause: configPack.missingFieldStandardClause ?? '标准规范条款',
              gbtMapping: configPack.gbtMapping,
              fieldMapping: configPack.fieldMapping,
              semanticConflictRules: configPack.semanticConflictRules,
            },
            kb,
            standardRules,
            {
              degradedMode,
              itemTypeOverride,
              degradedSimilarityThreshold: configPack.degradedSimilarityThreshold,
              inlineLocalTerms: configPack.localStandardTerms,
              referenceSystem: configPack.referenceSystem ?? null,
              ...(args.groundTruth ? { groundTruth: args.groundTruth as import('./types.js').GroundTruth } : {}),
            },
          )
          result.guideInspection = orchestrateResult
          if (orchestrateResult.warnings && orchestrateResult.warnings.length > 0) {
            allWarnings.push(...orchestrateResult.warnings)
          }

          const reportResult = ReportGenerator.generate({
            rawErrorDetails: orchestrateResult.errorDetails,
            formatIssues: orchestrateResult.formatIssues,
            suspectedErrors: orchestrateResult.suspectedErrors,
            detectionRates: orchestrateResult.detectionRates,
            completeness: orchestrateResult.completeness,
            missingFields: orchestrateResult.missingFields,
            semanticErrors: orchestrateResult.semanticErrors,
            logicalErrors: orchestrateResult.logicalErrors,
            serviceConvenience: orchestrateResult.serviceConvenience,
            totalGuidesChecked: orchestrateResult.totalGuidesChecked,
            warnings: orchestrateResult.warnings,
            referenceSystem: configPack.referenceSystem ?? null,
            policyReferences: configPack.policyBasis as import('./policyBasis.js').PolicyDoc[],
            severityMapping: configPack.severityMapping,
          })
          result.guideInspection = {
            ...orchestrateResult,
            errorDetails: reportResult.errorDetails,
          }
          result.policyBasis = reportResult.reportPolicyBasis
          if (reportResult.metricsWarnings.length > 0) {
            allWarnings.push(...reportResult.metricsWarnings)
          }
        }

        if (mode === 'classification' || mode === 'full') {
          result.classification = classifyGovData(data, configPack.gbtMapping)
        }

        if (allWarnings.length > 0) {
          result.warnings = allWarnings
        }

        return JSON.stringify(result, null, 2)
      } catch (e) {
        return JSON.stringify({ error: 'UNKNOWN_ERROR' as ErrorCode, message: (e as Error).message })
      }
    },
  })
}

function classifyGovData(data: unknown[], gbtMapping: Record<string, string>): Record<string, unknown> {
  let structured = 0, semiStructured = 0, unstructured = 0
  for (const row of data) {
    if (Array.isArray(row) || (typeof row === 'object' && row !== null)) {
      const keys = Object.keys(row as Record<string, unknown>)
      if (keys.every((k) => /^[a-zA-Z_]+$/.test(k))) structured++
      else if (keys.length > 0) semiStructured++
      else unstructured++
    } else {
      unstructured++
    }
  }
  const dominant = structured >= semiStructured && structured >= unstructured ? 'structured' : semiStructured >= unstructured ? 'semi-structured' : 'unstructured'
  const codeKey = dominant === 'structured' ? 'structured' : dominant === 'semi-structured' ? 'semiStructured' : 'unstructured'
  return {
    dataAssetCode: gbtMapping[codeKey] ?? 'A00',
    categoryLevel: dominant,
    specificType: '政务数据',
  }
}
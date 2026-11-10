export const name = '@liuhange/dsh-data-circulation-assessor'
export const inject = ['tools'] as const

import { loadJsonConfig } from '@liuhange/dsh-data-asset-shared'
import { resolvePolicyBasis } from './policyBasis.js'

type ErrorCode = 'CIRCULATION_INPUT_INVALID' | 'CIRCULATION_RULES_MISSING' | 'UNKNOWN_ERROR'

/**
 * DSH 工具契约要求 execute 返回对象、output.render 是函数。
 * 这里只做形状适配：工具名、入参、判定逻辑与返回文本全部原样保留，统一收进 { report }。
 */
type ReportToolLike = {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute: (...args: any[]) => Promise<unknown>
}

function withReportShape<T extends ReportToolLike>(definition: T) {
  return {
    ...definition,
    output: {
      schema: {
        type: 'object',
        properties: { report: { type: 'string' } },
        required: ['report'],
      },
      render: (_args: unknown, value: { report: string }) => [{ type: 'text' as const, text: value.report }],
    },
    async execute(args: Record<string, unknown>) {
      const result = await definition.execute(args)
      return { report: typeof result === 'string' ? result : JSON.stringify(result) }
    },
  }
}

export function apply(rawCtx: { tools: { register: (tool: unknown) => void } }) {
  const ctx = { tools: { register: (tool: Parameters<typeof withReportShape>[0] & Record<string, unknown>) => rawCtx.tools.register(withReportShape(tool)) } }
  ctx.tools.register({
    name: 'assess_circulation',
    description: '评估数据的可流通性，含可信数据空间接入就绪度和交易合规预判',
    parameters: {
      type: 'object',
      properties: {
        datasetId: { type: 'string', description: '数据集标识' },
        targetSpace: { type: 'string', enum: ['enterprise', 'industry', 'city', 'cross-border'] },
        complianceResultRef: { type: 'string', description: 'compliance-check工具输出引用（可选）' },
      },
      required: ['datasetId'],
    },
    async execute(args: Record<string, unknown>) {
      try {
        if (!args?.datasetId || typeof args.datasetId !== 'string') {
          return JSON.stringify({ error: 'CIRCULATION_INPUT_INVALID' as ErrorCode, message: 'datasetId is required' })
        }

        let rulesConfig: Record<string, unknown>
        try {
          rulesConfig = loadJsonConfig('BUSINESS_RULES_PATH', 'config/business-rules.json', '@liuhange/dsh-data-asset-shared/config/business-rules.json')
        } catch {
          return JSON.stringify({ error: 'CIRCULATION_RULES_MISSING' as ErrorCode, message: '无法加载business-rules.json' })
        }

        const circConfig = rulesConfig.dataCirculationAssessment as { tdsAccessCriteria: { tech: string[]; compliance: string[] }; tradeComplianceRules: string[]; weights: Record<string, number> } | undefined
        if (!circConfig) {
          return JSON.stringify({ error: 'CIRCULATION_RULES_MISSING', message: 'dataCirculationAssessment配置段缺失' })
        }

        const policyBasis = resolvePolicyBasis('DATA_CIRCULATION_ASSESSMENT')

        const trustedSpaceReadiness = assessTdsReadiness(circConfig.tdsAccessCriteria)
        const transactionCompliance = assessTransactionCompliance(circConfig.tradeComplianceRules)
        const circulationScore = computeCirculationScore(trustedSpaceReadiness, transactionCompliance, circConfig.weights)
        const recommendations = generateRecommendations(trustedSpaceReadiness, transactionCompliance, circulationScore)

        const result = {
          datasetId: args.datasetId as string,
          targetSpace: (args.targetSpace as string) ?? 'enterprise',
          trustedSpaceReadiness,
          transactionCompliance,
          circulationScore,
          circulationLevel: circulationScore >= 80 ? 'high' : circulationScore >= 50 ? 'medium' : 'low',
          recommendations,
          policyBasis,
          timestamp: new Date().toISOString(),
        }

        return JSON.stringify(result, null, 2)
      } catch (e) {
        return JSON.stringify({ error: 'UNKNOWN_ERROR' as ErrorCode, message: (e as Error).message })
      }
    },
  })
}

function assessTdsReadiness(criteria: { tech: string[]; compliance: string[] }): Record<string, boolean> {
  return {
    identityVerified: criteria.tech.includes('身份认证'),
    resourceEncapsulated: criteria.tech.includes('资源封装'),
    directoryMaintained: criteria.tech.includes('目录维护'),
    auditTrailAvailable: criteria.tech.includes('审计追溯'),
  }
}

function assessTransactionCompliance(rules: string[]): Record<string, boolean> {
  return {
    participantCompliant: rules.includes('参与方合规'),
    platformCompliant: rules.includes('交易平台合规'),
    subjectCompliant: rules.includes('交易标的合规'),
    processCompliant: rules.includes('交易过程合规'),
  }
}

function computeCirculationScore(readiness: Record<string, boolean>, compliance: Record<string, boolean>, weights: Record<string, number>): number {
  const readinessScore = Object.values(readiness).filter(Boolean).length / Object.keys(readiness).length
  const complianceScore = Object.values(compliance).filter(Boolean).length / Object.keys(compliance).length
  const score = complianceScore * (weights.compliance ?? 0.4) + readinessScore * (weights.tdsAccess ?? 0.3) + complianceScore * (weights.tradePrediction ?? 0.3)
  return Math.round(score * 100)
}

function generateRecommendations(readiness: Record<string, boolean>, compliance: Record<string, boolean>, score: number): string[] {
  const recs: string[] = []
  if (!readiness.identityVerified) recs.push('完成接入身份认证')
  if (!readiness.resourceEncapsulated) recs.push('完成数据资源封装')
  if (!readiness.directoryMaintained) recs.push('建立数据目录维护机制')
  if (!readiness.auditTrailAvailable) recs.push('建立审计追溯体系')
  if (!compliance.participantCompliant) recs.push('确认参与方合规资质')
  if (!compliance.platformCompliant) recs.push('确认交易平台合规资质')
  if (score < 50) recs.push('当前可流通性较低，建议优先完成合规基础建设')
  return recs
}
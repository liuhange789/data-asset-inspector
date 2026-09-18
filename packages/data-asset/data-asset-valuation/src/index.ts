import { calculateCostBasedValue } from './costBasedValuation.js'
import { calculateIncomeBasedValue } from './incomeBasedValuation.js'
import { generateValuationReport } from './valuationReportGenerator.js'
import { validateValuationArgs } from './invariant.js'
import { checkCapitalizationTrace, annotateCostReliability } from './capitalizationTraceGuard.js'
import { loadJsonConfig } from '@liuhange/dsh-data-asset-shared'

export const name = '@liuhange/dsh-data-asset-valuation'
export const inject = ['tools'] as const

export function apply(ctx: { tools: { register: (tool: unknown) => void } }) {
  ctx.tools.register({
    name: 'value_data_asset',
    description: '数据资产估值：成本法（重置成本-折旧）+ 收益法（DCF折现）双模型，输出建议估值与定价区间',
    parameters: {
      type: 'object',
      properties: {
        assetName: { type: 'string', description: '数据资产名称' },
        costItems: {
          type: 'array',
          description: '成本明细列表',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string', description: '成本类别(acquisition/processing/storage/maintenance/labor/infrastructure)' },
              amount: { type: 'number', description: '金额(元)' },
              year: { type: 'number', description: '年份' },
            },
          },
        },
        incomeScenarios: {
          type: 'array',
          description: '收益场景列表',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', description: '场景类型(direct_sale/subscription/api_call/data_sharing/analytics_service)' },
              annualRevenue: { type: 'number', description: '年收益(元)' },
              annualCost: { type: 'number', description: '年成本(元)' },
              years: { type: 'number', description: '持续年限' },
            },
          },
        },
        discountRate: { type: 'number', description: '自定义折现率（可选，默认从配置读取）' },
        qualityScore: { type: 'number', description: '质量评分（可选，影响价值等级判定）' },
      },
      required: ['assetName', 'costItems', 'incomeScenarios'],
    },
    async execute(args: Record<string, unknown>) {
      try {
        const validated = validateValuationArgs(args)


        let rulesConfig: Record<string, unknown>
        try {
          rulesConfig = loadJsonConfig('BUSINESS_RULES_PATH', 'config/business-rules.json', '@liuhange/dsh-data-asset-shared/config/business-rules.json')
        } catch {
          return JSON.stringify({ error: 'VALUATION_RULES_MISSING', message: '无法加载business-rules.json' })
        }

        const valuationConfig = rulesConfig.valuation as Record<string, unknown>
        if (!valuationConfig) {
          return JSON.stringify({ error: 'VALUATION_RULES_MISSING', message: 'valuation配置段缺失' })
        }

        let policyDocuments: { name: string; docNumber: string; coreRequirement: string }[]
        try {
          const policyConfig = loadJsonConfig('POLICY_REFS_PATH', 'config/policy-references.json', '@liuhange/dsh-data-asset-shared/config/policy-references.json')
          const refs = policyConfig.policyReferences as { stage: string; documents: { name: string; docNumber: string; coreRequirement: string }[] }[] | undefined
          const stage = refs?.find(s => s.stage === 'VALUATION')
          policyDocuments = stage?.documents ?? []
        } catch {
          policyDocuments = []
        }

        if (!policyDocuments || policyDocuments.length === 0) {
          return JSON.stringify({ error: 'POLICY_REFERENCES_EMPTY', message: 'VALUATION阶段政策依据缺失' })
        }

        const costBased = calculateCostBasedValue(validated.costItems, valuationConfig.costBased as {
          costCategories: string[]
          depreciationYears: number
          depreciationMethod: 'straight-line' | 'double-declining'
        })

        const incomeBased = calculateIncomeBasedValue(
          validated.incomeScenarios,
          valuationConfig.incomeBased as {
            defaultDiscountRate: number
            defaultScenarioYears: number
            scenarioTemplates: string[]
          },
          validated.discountRate,
        )

        const report = generateValuationReport(
          validated.assetName,
          costBased,
          incomeBased,
          valuationConfig.pricingReference as {
            valueLevelThresholds: { high: number; medium: number; low: number }
          },
          validated.qualityScore,
          policyDocuments,
        )

        const capGuardConfig = valuationConfig.capitalizationTraceGuard as {
          enabled: boolean
          policyRef: string
          rule: string
          warningMessage: string
        }
        const capGuard = capGuardConfig
          ? checkCapitalizationTrace(report.recommendedValue, capGuardConfig)
          : null

        const costRelConfig = valuationConfig.costReliabilityMeasurement as {
          enabled: boolean
          policyRef: string
          reliabilityLevels: string[]
          criteria: Record<string, string>
        }
        const costReliability = costRelConfig
          ? annotateCostReliability(true, false, costRelConfig)
          : null

        const enrichedReport = {
          ...report,
          capitalizationTraceGuard: capGuard,
          costReliabilityAnnotation: costReliability,
        }

        return JSON.stringify(enrichedReport, null, 2)
      } catch (e) {
        const err = e as Error
        return JSON.stringify({
          error: err.message.split(':')[0] ?? 'UNKNOWN_ERROR',
          message: err.message,
        })
      }
    },
  })
}
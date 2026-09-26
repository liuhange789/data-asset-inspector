export const name = '@liuhange/dsh-gov-data-inspector'
export const inject = ['tools'] as const

import { loadJsonConfig } from '@liuhange/dsh-data-asset-shared'
import { resolvePolicyBasis } from './policyBasis.js'

type ErrorCode = 'GOV_DATA_INPUT_INVALID' | 'GOV_DATA_RULES_MISSING' | 'UNKNOWN_ERROR'

export function apply(ctx: { tools: { register: (tool: unknown) => void } }) {
  ctx.tools.register({
    name: 'inspect_gov_data',
    description: '政务数据专项巡检，含办事指南质量检查和公共数据资产分类',
    parameters: {
      type: 'object',
      properties: {
        dataSource: { type: 'string', description: '政务数据文件路径' },
        inspectionMode: { type: 'string', enum: ['guide', 'classification', 'full'] },
      },
      required: ['dataSource'],
    },
    async execute(args: Record<string, unknown>) {
      try {
        if (!args?.dataSource || typeof args.dataSource !== 'string') {
          return JSON.stringify({ error: 'GOV_DATA_INPUT_INVALID' as ErrorCode, message: 'dataSource is required' })
        }

        let rulesConfig: Record<string, unknown>
        try {
          rulesConfig = loadJsonConfig('BUSINESS_RULES_PATH', 'config/business-rules.json', '@liuhange/dsh-data-asset-shared/config/business-rules.json')
        } catch {
          return JSON.stringify({ error: 'GOV_DATA_RULES_MISSING' as ErrorCode, message: '无法加载business-rules.json' })
        }

        const govConfig = rulesConfig.govDataInspection as { guideRequiredElements: string[]; convenienceWeights: Record<string, number>; gbt47949Mapping: Record<string, string> } | undefined
        if (!govConfig) {
          return JSON.stringify({ error: 'GOV_DATA_RULES_MISSING', message: 'govDataInspection配置段缺失' })
        }

        let data: unknown[]
        try {
          const { readFileSync } = await import('node:fs')
          const raw = readFileSync(args.dataSource as string, 'utf-8')
          data = JSON.parse(raw)
          if (!Array.isArray(data)) data = [data]
        } catch {
          return JSON.stringify({ error: 'GOV_DATA_INPUT_INVALID', message: `无法加载数据: ${args.dataSource}` })
        }

        const mode = (args.inspectionMode as string) ?? 'full'
        const policyBasis = resolvePolicyBasis('GOV_DATA_INSPECTION')

        const result: Record<string, unknown> = {
          dataSource: args.dataSource,
          inspectionMode: mode,
          timestamp: new Date().toISOString(),
          policyBasis,
        }

        if (mode === 'guide' || mode === 'full') {
          result.guideInspection = inspectGuides(data, govConfig.guideRequiredElements, govConfig.convenienceWeights)
        }

        if (mode === 'classification' || mode === 'full') {
          result.classification = classifyGovData(data, govConfig.gbt47949Mapping)
        }

        return JSON.stringify(result, null, 2)
      } catch (e) {
        return JSON.stringify({ error: 'UNKNOWN_ERROR' as ErrorCode, message: (e as Error).message })
      }
    },
  })
}

function inspectGuides(data: unknown[], requiredElements: string[], weights: Record<string, number>): Record<string, unknown> {
  let completeCount = 0
  let semanticErrors = 0
  let logicalErrors = 0
  let serviceConvenience = 0

  for (const row of data) {
    if (typeof row === 'object' && row !== null) {
      const obj = row as Record<string, unknown>
      let hasAllElements = true
      for (const elem of requiredElements) {
        if (!obj[elem]) {
          hasAllElements = false
          semanticErrors++
        }
      }
      if (hasAllElements) completeCount++
      if (obj.timeLimit && typeof obj.timeLimit === 'string' && obj.timeLimit.includes('工作日')) {
        serviceConvenience += weights.timeLimit ?? 0.3
      }
      if (obj.onlineCapable === true) {
        serviceConvenience += weights.onlineCapable ?? 0.4
      }
    }
  }

  return {
    completeness: data.length > 0 ? Math.round((completeCount / data.length) * 100) : 0,
    semanticErrors,
    logicalErrors,
    serviceConvenience: Math.round(serviceConvenience * 100) / 100,
    totalGuidesChecked: data.length,
  }
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
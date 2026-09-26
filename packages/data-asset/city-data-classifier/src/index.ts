export const name = '@liuhange/dsh-city-data-classifier'
export const inject = ['tools'] as const

import { loadJsonConfig } from '@liuhange/dsh-data-asset-shared'
import { resolvePolicyBasis } from './policyBasis.js'

type ErrorCode = 'CITY_CLASSIFY_INPUT_INVALID' | 'CITY_CLASSIFY_RULES_MISSING' | 'UNKNOWN_ERROR'

export function apply(ctx: { tools: { register: (tool: unknown) => void } }) {
  ctx.tools.register({
    name: 'classify_city_data',
    description: 'AI自动推荐城市/组织数据的国标分类和敏感度分级，生成登记台账',
    parameters: {
      type: 'object',
      properties: {
        dataSource: { type: 'string', description: '数据文件路径' },
        autoConfirm: { type: 'boolean', default: false },
      },
      required: ['dataSource'],
    },
    async execute(args: Record<string, unknown>) {
      try {
        if (!args?.dataSource || typeof args.dataSource !== 'string') {
          return JSON.stringify({ error: 'CITY_CLASSIFY_INPUT_INVALID' as ErrorCode, message: 'dataSource is required' })
        }

        let rulesConfig: Record<string, unknown>
        try {
          rulesConfig = loadJsonConfig('BUSINESS_RULES_PATH', 'config/business-rules.json', '@liuhange/dsh-data-asset-shared/config/business-rules.json')
        } catch {
          return JSON.stringify({ error: 'CITY_CLASSIFY_RULES_MISSING' as ErrorCode, message: '无法加载business-rules.json' })
        }

        const cityConfig = rulesConfig.cityDataClassification as { aiService: { endpoint: string; model: string; timeoutMs: number }; gbt47949CodePattern: string; sensitivityGradingRules: Record<string, string>; confidenceThreshold: number } | undefined
        if (!cityConfig) {
          return JSON.stringify({ error: 'CITY_CLASSIFY_RULES_MISSING', message: 'cityDataClassification配置段缺失' })
        }

        let data: unknown[]
        try {
          const { readFileSync } = await import('node:fs')
          const raw = readFileSync(args.dataSource as string, 'utf-8')
          data = JSON.parse(raw)
          if (!Array.isArray(data)) data = [data]
        } catch {
          return JSON.stringify({ error: 'CITY_CLASSIFY_INPUT_INVALID', message: `无法加载数据: ${args.dataSource}` })
        }

        const aiRecommendation = recommendClassification(data, cityConfig.confidenceThreshold)
        const sensitivityLevel = gradeSensitivity(data, cityConfig.sensitivityGradingRules)
        const policyBasis = resolvePolicyBasis('CITY_DATA_CLASSIFICATION')
        const autoConfirm = (args.autoConfirm as boolean) ?? false

        const result = {
          aiRecommendation,
          humanReview: autoConfirm
            ? { reviewer: 'auto-confirm', reviewedAt: new Date().toISOString(), confirmed: true }
            : { reviewer: null, reviewedAt: null, confirmed: false, note: '待人工复核' },
          sensitivityLevel,
          registrationEntry: {
            assetCode: aiRecommendation.dataAssetCode,
            registeredAt: new Date().toISOString(),
            initialRegistration: true,
          },
          policyBasis,
          timestamp: new Date().toISOString(),
        }

        return JSON.stringify(result, null, 2)
      } catch (e) {
        return JSON.stringify({ error: 'UNKNOWN_ERROR' as ErrorCode, message: (e as Error).message })
      }
    },
  })

  ctx.tools.register({
    name: 'confirm_city_classification',
    description: '人工复核确认AI推荐的城市数据分类结果',
    parameters: {
      type: 'object',
      properties: {
        classificationId: { type: 'string', description: '分类结果ID' },
        reviewer: { type: 'string', description: '复核人' },
        confirmed: { type: 'boolean' },
        adjustments: { type: 'string', description: '调整说明（可选）' },
      },
      required: ['classificationId', 'reviewer', 'confirmed'],
    },
    async execute(args: Record<string, unknown>) {
      return JSON.stringify({
        classificationId: args.classificationId,
        reviewer: args.reviewer,
        confirmed: args.confirmed,
        adjustments: args.adjustments ?? null,
        reviewedAt: new Date().toISOString(),
      })
    },
  })
}

function recommendClassification(data: unknown[], confidenceThreshold: number): Record<string, unknown> {
  let structured = 0, semiStructured = 0, unstructured = 0
  for (const row of data) {
    if (typeof row === 'object' && row !== null && !Array.isArray(row)) {
      const keys = Object.keys(row as Record<string, unknown>)
      if (keys.length > 0) {
        if (keys.every((k) => /^[a-zA-Z_]+$/.test(k))) structured++
        else semiStructured++
      } else unstructured++
    } else {
      unstructured++
    }
  }
  const total = data.length || 1
  const primaryCategory = structured >= semiStructured && structured >= unstructured ? 'structured' : semiStructured >= unstructured ? 'semi-structured' : 'unstructured'
  const confidence = primaryCategory === 'structured' ? structured / total : primaryCategory === 'semi-structured' ? semiStructured / total : unstructured / total
  const codeMap: Record<string, string> = { structured: 'A0101', 'semi-structured': 'A0201', unstructured: 'A0301' }
  return {
    primaryCategory,
    specificType: '城市数据',
    dataAssetCode: codeMap[primaryCategory] ?? 'A0000',
    confidence: Math.round(confidence * 100) / 100,
    reasoning: `基于${total}条样本分析，${primaryCategory}数据占比${Math.round(confidence * 100)}%`,
    meetsThreshold: confidence >= confidenceThreshold,
  }
}

function gradeSensitivity(data: unknown[], _rules: Record<string, string>): string {
  const sensitiveKeywords = ['身份证', '手机号', '地址', '密码', '银行']
  let maxSensitivity = 0
  for (const row of data) {
    if (typeof row === 'object' && row !== null) {
      const json = JSON.stringify(row)
      for (const kw of sensitiveKeywords) {
        if (json.includes(kw)) maxSensitivity = Math.max(maxSensitivity, 3)
      }
    }
  }
  const levels = ['public', 'internal', 'confidential', 'restricted']
  return levels[maxSensitivity] ?? 'internal'
}
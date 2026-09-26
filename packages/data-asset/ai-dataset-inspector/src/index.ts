export const name = '@liuhange/dsh-ai-dataset-inspector'
export const inject = ['tools'] as const

import { loadJsonConfig } from '@liuhange/dsh-data-asset-shared'
import { resolvePolicyBasis } from './policyBasis.js'

type ErrorCode = 'AI_DATASET_INPUT_INVALID' | 'AI_DATASET_RULES_MISSING' | 'UNKNOWN_ERROR'

export function apply(ctx: { tools: { register: (tool: unknown) => void } }) {
  ctx.tools.register({
    name: 'inspect_ai_dataset',
    description: '检查AI训练数据集质量，涵盖标注一致性、标签均衡性、数据泄露等维度',
    parameters: {
      type: 'object',
      properties: {
        datasetPath: { type: 'string', description: '数据集文件路径' },
        datasetType: { type: 'string', enum: ['training', 'validation', 'test', 'full'] },
        maskingResultRef: { type: 'string', description: 'data-masking工具输出引用（可选）' },
      },
      required: ['datasetPath'],
    },
    async execute(args: Record<string, unknown>) {
      try {
        if (!args?.datasetPath || typeof args.datasetPath !== 'string') {
          return JSON.stringify({ error: 'AI_DATASET_INPUT_INVALID' as ErrorCode, message: 'datasetPath is required' })
        }

        let rulesConfig: Record<string, unknown>
        try {
          rulesConfig = loadJsonConfig('BUSINESS_RULES_PATH', 'config/business-rules.json', '@liuhange/dsh-data-asset-shared/config/business-rules.json')
        } catch {
          return JSON.stringify({ error: 'AI_DATASET_RULES_MISSING' as ErrorCode, message: '无法加载business-rules.json' })
        }

        const aiConfig = rulesConfig.aiDatasetInspection as { kappaThreshold: number; minSampleThreshold: number; leakDetectionScaleLimit: number } | undefined
        if (!aiConfig) {
          return JSON.stringify({ error: 'AI_DATASET_RULES_MISSING', message: 'aiDatasetInspection配置段缺失' })
        }

        let dataset: unknown[]
        try {
          const { readFileSync } = await import('node:fs')
          const raw = readFileSync(args.datasetPath as string, 'utf-8')
          dataset = JSON.parse(raw)
          if (!Array.isArray(dataset)) dataset = [dataset]
        } catch {
          return JSON.stringify({ error: 'AI_DATASET_INPUT_INVALID', message: `无法加载数据集: ${args.datasetPath}` })
        }

        const annotationConsistency = computeKappa(dataset, aiConfig.kappaThreshold)
        const labelDistribution = analyzeLabelDistribution(dataset)
        const dataLeakage = detectLeakage(dataset)

        const policyBasis = resolvePolicyBasis('AI_DATASET_INSPECTION')

        const result = {
          datasetId: args.datasetPath as string,
          inspectionType: (args.datasetType as string) ?? 'full',
          annotationConsistency,
          labelDistribution,
          dataLeakage,
          piiResidue: args.maskingResultRef ? '已引用data-masking结果检测PII残留' : '未提供masking结果引用',
          cleaningStatus: '建议配合data-cleaning做预处理质量检查',
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

function computeKappa(dataset: unknown[], threshold: number): { kappaCoefficient: number; disputedSamples: number; passed: boolean } {
  let agreed = 0
  let disputed = 0
  for (const row of dataset) {
    if (typeof row === 'object' && row !== null) {
      const obj = row as Record<string, unknown>
      if (obj.annotation1 !== undefined && obj.annotation2 !== undefined) {
        if (obj.annotation1 === obj.annotation2) agreed++
        else disputed++
      }
    }
  }
  const total = agreed + disputed
  const kappa = total > 0 ? agreed / total : 1
  return { kappaCoefficient: Math.round(kappa * 100) / 100, disputedSamples: disputed, passed: kappa >= threshold }
}

function analyzeLabelDistribution(dataset: unknown[]): { isBalanced: boolean; imbalanceRatio: number; classDistribution: Record<string, number> } {
  const distribution: Record<string, number> = {}
  for (const row of dataset) {
    if (typeof row === 'object' && row !== null) {
      const label = (row as Record<string, unknown>).label as string | undefined
      if (label) distribution[label] = (distribution[label] ?? 0) + 1
    }
  }
  const counts = Object.values(distribution)
  const max = counts.length > 0 ? Math.max(...counts) : 0
  const min = counts.length > 0 ? Math.min(...counts) : 0
  const ratio = min > 0 ? max / min : Infinity
  return { isBalanced: ratio <= 2, imbalanceRatio: Math.round(ratio * 100) / 100, classDistribution: distribution }
}

function detectLeakage(dataset: unknown[]): { detected: boolean; leakageType: string; overlappingSamples: number } {
  const ids = new Set<string>()
  let overlapping = 0
  for (const row of dataset) {
    if (typeof row === 'object' && row !== null) {
      const id = (row as Record<string, unknown>).id as string | undefined
      if (id) {
        if (ids.has(id)) overlapping++
        else ids.add(id)
      }
    }
  }
  return { detected: overlapping > 0, leakageType: overlapping > 0 ? 'train_val' : 'none', overlappingSamples: overlapping }
}
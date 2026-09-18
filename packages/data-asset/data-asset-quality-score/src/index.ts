export const name = '@liuhange/dsh-data-asset-quality-score'
export const inject = ['tools'] as const

import { loadJsonConfig } from '@liuhange/dsh-data-asset-shared'

export function apply(ctx: { tools: { register: (tool: unknown) => void } }) {
  ctx.tools.register({
    name: 'score_data_quality',
    description: '数据质量量化评分：六维（规范性+完整性+准确性+一致性+时效性+可访问性）0-100分',
    parameters: {
      type: 'object',
      properties: {
        dataSource: { type: 'string', description: '数据文件路径或JSON数据' },
        schema: { type: 'string', description: '数据schema声明（可选）' },
      },
      required: ['dataSource'],
    },
    async execute(args: Record<string, unknown>) {
      try {
        if (!args?.dataSource || typeof args.dataSource !== 'string') {
          return JSON.stringify({ error: 'INVALID_ARGS', message: 'dataSource is required' })
        }


        let rulesConfig: Record<string, unknown>
        try {
          rulesConfig = loadJsonConfig('BUSINESS_RULES_PATH', 'config/business-rules.json', '@liuhange/dsh-data-asset-shared/config/business-rules.json')
        } catch {
          return JSON.stringify({ error: 'QUALITY_RULES_MISSING', message: '无法加载business-rules.json' })
        }

        const qsConfig = rulesConfig.qualityScoringExtended as Record<string, unknown>
        if (!qsConfig) {
          return JSON.stringify({ error: 'QUALITY_RULES_MISSING', message: 'qualityScoringExtended配置段缺失' })
        }

        let policyDocuments: { name: string; docNumber: string; coreRequirement: string }[] = []
        try {
          const policyConfig = loadJsonConfig('POLICY_REFS_PATH', 'config/policy-references.json', '@liuhange/dsh-data-asset-shared/config/policy-references.json')
          const refs = policyConfig.policyReferences as { stage: string; documents: { name: string; docNumber: string; coreRequirement: string }[] }[] | undefined
          const stage = refs?.find(s => s.stage === 'QUALITY_SCORE')
          policyDocuments = stage?.documents ?? []
        } catch { /* empty */ }

        const weights = qsConfig.weights as Record<string, number>

        const weightSum = Object.values(weights).reduce((a: number, b: number) => a + b, 0)
        if (Math.abs(weightSum - 1) > 0.001) {
          return JSON.stringify({ error: 'WEIGHT_SUM_INVALID', message: `权重和=${weightSum}，必须为1` })
        }

        let data: unknown[]
        try {
          const { readFileSync: rfs } = await import('node:fs')
          const raw = rfs(args.dataSource, 'utf-8')
          data = JSON.parse(raw)
          if (!Array.isArray(data)) data = [data]
        } catch {
          return JSON.stringify({ error: 'DATA_LOAD_FAILED', message: `无法加载数据: ${args.dataSource}` })
        }

        const dimensions: { dimension: string; score: number; weight: number; issues: string[] }[] = []

        const normalityConfig = qsConfig.normality as { fieldNamePattern: string; requiredFields: string[] }
        const normalityScore = scoreNormality(data, normalityConfig)
        dimensions.push({ dimension: 'normality', score: normalityScore.score, weight: weights.normality ?? 0, issues: normalityScore.issues })

        const completenessConfig = (rulesConfig.qualityScoring as Record<string, unknown>)?.completeness as { missingMarkers: string[] }
        const completenessScore = scoreCompleteness(data, completenessConfig)
        dimensions.push({ dimension: 'completeness', score: completenessScore.score, weight: weights.completeness ?? 0, issues: completenessScore.issues })

        const accuracyScore = scoreAccuracy(data)
        dimensions.push({ dimension: 'accuracy', score: accuracyScore.score, weight: weights.accuracy ?? 0, issues: accuracyScore.issues })

        const consistencyScore = scoreConsistency(data)
        dimensions.push({ dimension: 'consistency', score: consistencyScore.score, weight: weights.consistency ?? 0, issues: consistencyScore.issues })

        const timelinessScore = scoreTimeliness(data)
        dimensions.push({ dimension: 'timeliness', score: timelinessScore.score, weight: weights.timeliness ?? 0, issues: timelinessScore.issues })

        const accessibilityConfig = qsConfig.accessibility as { readTimeoutMs: number; minAccessibleRate: number }
        const accessibilityScore = scoreAccessibility(data, accessibilityConfig)
        dimensions.push({ dimension: 'accessibility', score: accessibilityScore.score, weight: weights.accessibility ?? 0, issues: accessibilityScore.issues })

        const totalScore = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0)

        const report = {
          dimensions,
          totalScore: Math.round(totalScore * 10) / 10,
          policyReferences: policyDocuments,
          timestamp: new Date().toISOString(),
        }

        return JSON.stringify(report, null, 2)
      } catch (e) {
        return JSON.stringify({ error: 'UNKNOWN_ERROR', message: (e as Error).message })
      }
    },
  })
}

function scoreNormality(data: unknown[], config: { fieldNamePattern: string; requiredFields: string[] }): { score: number; issues: string[] } {
  const issues: string[] = []
  const pattern = new RegExp(config.fieldNamePattern)
  let fieldCount = 0, validCount = 0
  for (const row of data) {
    if (typeof row === 'object' && row !== null) {
      for (const key of Object.keys(row as Record<string, unknown>)) {
        fieldCount++
        if (pattern.test(key)) validCount++
        else issues.push(`字段名不规范: ${key}`)
      }
    }
  }
  for (const req of config.requiredFields) {
    const hasField = data.some(row => typeof row === 'object' && row !== null && req in (row as Record<string, unknown>))
    if (!hasField) issues.push(`必填字段缺失: ${req}`)
  }
  const score = fieldCount > 0 ? (validCount / fieldCount) * 100 : 50
  return { score: Math.round(score), issues }
}

function scoreCompleteness(data: unknown[], config: { missingMarkers: string[] }): { score: number; issues: string[] } {
  const issues: string[] = []
  let totalFields = 0, missingFields = 0
  for (const row of data) {
    if (typeof row === 'object' && row !== null) {
      for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
        totalFields++
        if (value === null || value === undefined || config.missingMarkers.includes(String(value))) {
          missingFields++
          issues.push(`字段缺失: ${key}`)
        }
      }
    }
  }
  const score = totalFields > 0 ? ((totalFields - missingFields) / totalFields) * 100 : 50
  return { score: Math.round(score), issues }
}

function scoreAccuracy(data: unknown[]): { score: number; issues: string[] } {
  const issues: string[] = []
  let validCount = 0
  for (const row of data) {
    if (typeof row === 'object' && row !== null) {
      const obj = row as Record<string, unknown>
      if (obj.age !== undefined) {
        const age = Number(obj.age)
        if (age < 0 || age > 150) issues.push(`年龄异常: ${obj.age}`)
        else validCount++
      }
      if (obj.phone !== undefined) {
        if (!/^1[3-9]\d{9}$/.test(String(obj.phone))) issues.push(`手机号格式错误: ${obj.phone}`)
        else validCount++
      }
    }
  }
  return { score: Math.min(100, 60 + validCount * 5), issues }
}

function scoreConsistency(data: unknown[]): { score: number; issues: string[] } {
  const issues: string[] = []
  let consistentCount = 0
  for (const row of data) {
    if (typeof row === 'object' && row !== null) {
      const obj = row as Record<string, unknown>
      if (obj.startDate && obj.endDate) {
        if (new Date(obj.startDate as string) <= new Date(obj.endDate as string)) consistentCount++
        else issues.push(`日期不一致: startDate=${obj.startDate} > endDate=${obj.endDate}`)
      }
    }
  }
  return { score: Math.min(100, 60 + consistentCount * 5), issues }
}

function scoreTimeliness(data: unknown[]): { score: number; issues: string[] } {
  const issues: string[] = []
  const now = Date.now()
  const thresholdMs = 720 * 60 * 60 * 1000
  let freshCount = 0
  for (const row of data) {
    if (typeof row === 'object' && row !== null) {
      const obj = row as Record<string, unknown>
      if (obj.updatedAt) {
        const updated = new Date(obj.updatedAt as string).getTime()
        if (now - updated < thresholdMs) freshCount++
        else issues.push(`数据过期: updatedAt=${obj.updatedAt}`)
      }
    }
  }
  return { score: Math.min(100, 50 + freshCount * 10), issues }
}

function scoreAccessibility(data: unknown[], config: { readTimeoutMs: number; minAccessibleRate: number }): { score: number; issues: string[] } {
  const issues: string[] = []
  const accessibleRate = data.length > 0 ? 1 : 0
  if (accessibleRate < config.minAccessibleRate) {
    issues.push(`可访问率${accessibleRate} < ${config.minAccessibleRate}`)
  }
  return { score: accessibleRate >= config.minAccessibleRate ? 100 : 50, issues }
}
export const name = '@liuhange/dsh-data-asset-attestation'
export const inject = ['tools'] as const

import { createHash, randomUUID } from 'node:crypto'
import { loadJsonConfig } from '@liuhange/dsh-data-asset-shared'
import { resolvePolicyBasis } from './policyBasis.js'

type ErrorCode = 'ATTESTATION_INPUT_INVALID' | 'ATTESTATION_RULES_MISSING' | 'EVIDENCE_CHAIN_BUILD_FAILED' | 'UNKNOWN_ERROR'

export function apply(ctx: { tools: { register: (tool: unknown) => void } }) {
  ctx.tools.register({
    name: 'attest_data_quality',
    description: '生成鉴证级数据质量报告，含时间戳、证据链哈希和鉴证声明',
    parameters: {
      type: 'object',
      properties: {
        qualityScoreResult: { type: 'string', description: 'quality-score工具输出的JSON结果' },
        assetId: { type: 'string', description: '数据资产标识（可选）' },
      },
      required: ['qualityScoreResult'],
    },
    async execute(args: Record<string, unknown>) {
      try {
        if (!args?.qualityScoreResult || typeof args.qualityScoreResult !== 'string') {
          return JSON.stringify({ error: 'ATTESTATION_INPUT_INVALID' as ErrorCode, message: 'qualityScoreResult is required' })
        }

        const scoreResult = JSON.parse(args.qualityScoreResult as string)
        if (scoreResult.error) {
          return JSON.stringify({ error: 'ATTESTATION_INPUT_INVALID', message: `quality-score错误透传: ${scoreResult.error}` })
        }

        let rulesConfig: Record<string, unknown>
        try {
          rulesConfig = loadJsonConfig('BUSINESS_RULES_PATH', 'config/business-rules.json', '@liuhange/dsh-data-asset-shared/config/business-rules.json')
        } catch {
          return JSON.stringify({ error: 'ATTESTATION_RULES_MISSING' as ErrorCode, message: '无法加载business-rules.json' })
        }

        const attestationConfig = rulesConfig.attestation as { severityMapping: Record<string, number>; statementTemplate: { scope: string; basis: string; conclusion: string } } | undefined
        if (!attestationConfig) {
          return JSON.stringify({ error: 'ATTESTATION_RULES_MISSING', message: 'attestation配置段缺失' })
        }

        const dimensions = (scoreResult.dimensions ?? []) as { dimension: string; score: number; issues: string[] }[]
        const anomalies = locateAnomalies(dimensions, attestationConfig.severityMapping, (args.assetId as string) ?? 'unknown')

        const evidenceChainHash = buildEvidenceChain(anomalies, scoreResult)

        const policyBasis = resolvePolicyBasis('ATTESTATION')
        const statement = generateStatement(anomalies, attestationConfig.statementTemplate)

        const report = {
          reportId: randomUUID(),
          generatedAt: new Date().toISOString(),
          inspector: 'dsh-data-asset-attestation',
          inspectionMethod: '基于六维质量评分的自动化鉴证',
          dataSampleSize: anomalies.length,
          anomalies,
          evidenceChainHash,
          attestationStatement: statement,
          policyBasis,
          qualityScoreReference: scoreResult.timestamp ?? 'unknown',
          disclaimer: '鉴证报告底稿，正式鉴证须由具备资质的鉴证机构出具',
        }

        return JSON.stringify(report, null, 2)
      } catch (e) {
        return JSON.stringify({ error: 'UNKNOWN_ERROR' as ErrorCode, message: (e as Error).message })
      }
    },
  })
}

function locateAnomalies(
  dimensions: { dimension: string; score: number; issues: string[] }[],
  severityMapping: Record<string, number>,
  assetId: string,
): { dimension: string; severity: string; assetId: string; issue: string }[] {
  const anomalies: { dimension: string; severity: string; assetId: string; issue: string }[] = []
  for (const dim of dimensions) {
    if (dim.score < 60) {
      const deduction = 100 - dim.score
      let severity = 'minor'
      if (deduction >= (severityMapping.critical ?? 20)) severity = 'critical'
      else if (deduction >= (severityMapping.major ?? 10)) severity = 'major'
      for (const issue of dim.issues) {
        anomalies.push({ dimension: dim.dimension, severity, assetId, issue })
      }
    }
  }
  return anomalies
}

function buildEvidenceChain(anomalies: unknown, scoreResult: unknown): string {
  try {
    const serialized = JSON.stringify({ anomalies, scoreResult, timestamp: new Date().toISOString() })
    return createHash('sha256').update(serialized).digest('hex')
  } catch (e) {
    return `构建失败: ${(e as Error).message}`
  }
}

function generateStatement(
  anomalies: unknown[],
  template: { scope: string; basis: string; conclusion: string },
): string {
  const conclusion = anomalies.length === 0 ? '数据质量符合入表要求' : '数据质量不符合入表要求，存在异常项'
  return `${template.scope}。${template.basis}。${conclusion}。`
}
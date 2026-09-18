import { checkCompliance } from './complianceChecker.js'
import { validateComplianceArgs } from './invariant.js'
import { embedPilotPolicyReference } from './pilotPolicyReferenceEmbedder.js'
import { loadJsonConfig } from '@liuhange/dsh-data-asset-shared'

export const name = '@liuhange/dsh-data-asset-compliance-check'
export const inject = ['tools'] as const

export function apply(ctx: { tools: { register: (tool: unknown) => void } }) {
  ctx.tools.register({
    name: 'check_compliance',
    description: '数据资产合规审查：来源合规+加工合规+用途合规三查，个人信息脱敏检查，输出合规报告与政策依据',
    parameters: {
      type: 'object',
      properties: {
        assetName: { type: 'string', description: '数据资产名称' },
        sourceDescription: { type: 'string', description: '数据来源描述' },
        processingDescription: { type: 'string', description: '数据加工描述' },
        usageDescription: { type: 'string', description: '数据使用场景描述' },
        hasPersonalInfo: { type: 'boolean', description: '是否包含个人信息' },
        personalInfoFields: { type: 'array', items: { type: 'string' }, description: '个人信息字段列表' },
      },
      required: ['assetName', 'sourceDescription', 'processingDescription', 'usageDescription'],
    },
    async execute(args: Record<string, unknown>) {
      try {
        const validated = validateComplianceArgs(args)


        let rulesConfig: Record<string, unknown>
        try {
          rulesConfig = loadJsonConfig('BUSINESS_RULES_PATH', 'config/business-rules.json', '@liuhange/dsh-data-asset-shared/config/business-rules.json')
        } catch {
          return JSON.stringify({ error: 'COMPLIANCE_RULES_MISSING', message: '无法加载business-rules.json' })
        }

        const complianceConfig = rulesConfig.complianceCheck as Record<string, unknown>
        if (!complianceConfig) {
          return JSON.stringify({ error: 'COMPLIANCE_RULES_MISSING', message: 'complianceCheck配置段缺失' })
        }

        let policyDocuments: { name: string; docNumber: string; coreRequirement: string }[]
        try {
          const policyConfig = loadJsonConfig('POLICY_REFS_PATH', 'config/policy-references.json', '@liuhange/dsh-data-asset-shared/config/policy-references.json')
          const refs = policyConfig.policyReferences as { stage: string; documents: { name: string; docNumber: string; coreRequirement: string }[] }[] | undefined
          const stage = refs?.find(s => s.stage === 'COMPLIANCE_CHECK')
          policyDocuments = stage?.documents ?? []
        } catch {
          policyDocuments = []
        }

        if (!policyDocuments || policyDocuments.length === 0) {
          return JSON.stringify({ error: 'POLICY_REFERENCES_EMPTY', message: 'COMPLIANCE_CHECK阶段政策依据缺失' })
        }

        const report = checkCompliance(
          {
            assetName: validated.assetName,
            sourceDescription: validated.sourceDescription,
            processingDescription: validated.processingDescription,
            usageDescription: validated.usageDescription,
            hasPersonalInfo: validated.hasPersonalInfo,
            personalInfoFields: validated.personalInfoFields,
          },
          complianceConfig as {
            sourceRules: Array<{ id: string; condition: string; lawRef: string; compliant: boolean }>
            processingRules: Array<{ id: string; condition: string; lawRef: string; compliant: boolean }>
            usageRules: Array<{ id: string; condition: string; lawRef: string; compliant: boolean }>
            personalInfoMinimizeFields: string[]
          },
          policyDocuments,
        )

        const pilotConfig = complianceConfig.pilotPolicyReference as {
          enabled: boolean
          policyName: string
          policyRef: string
          keyPoints: string[]
          embedMessage: string
        }
        const pilotPolicy = pilotConfig ? embedPilotPolicyReference(pilotConfig) : null

        const enrichedReport = {
          ...report,
          pilotPolicyReference: pilotPolicy,
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
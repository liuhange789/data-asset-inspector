import { checkDisallowedScenarios } from './disallowedScenarioChecker.js'
import { matchAgency } from './agencyMatcher.js'
import { generateRegistrationReport } from './registrationReportGenerator.js'
import { validateRegistrationArgs } from './invariant.js'
import { promptTripleAuditStandard, promptSevenStepFlow } from './tripleAuditAndSevenStep.js'
import { loadJsonConfig } from '@liuhange/dsh-data-asset-shared'

export const name = '@liuhange/dsh-data-asset-registration-helper'
export const inject = ['tools'] as const

export function apply(ctx: { tools: { register: (tool: unknown) => void } }) {
  ctx.tools.register({
    name: 'registration_helper',
    description: '数据资产登记助手：禁止场景检查+权属纠纷检查+登记机构匹配+登记流程指引，兼容已有registration-precheck/generate-registration-docs/match-registration-agency',
    parameters: {
      type: 'object',
      properties: {
        assetName: { type: 'string', description: '数据资产名称' },
        assetDescription: { type: 'string', description: '数据资产描述（用于禁止场景检测）' },
        dataType: { type: 'string', description: '数据类型（金融/医疗/交通等）' },
        region: { type: 'string', description: '意向登记地区（beijing/shanghai/shenzhen，可选）' },
        ownershipConfirmation: {
          type: 'object',
          description: '权属确认信息',
          properties: {
            hasDispute: { type: 'boolean', description: '是否存在权属纠纷' },
            confirmedAt: { type: 'string', description: '确认时间' },
            holder: { type: 'string', description: '持有方' },
            processor: { type: 'string', description: '加工方' },
            operator: { type: 'string', description: '运营方' },
          },
        },
        orchestrationResult: { type: 'string', description: '体检全流程产物JSON' },
      },
      required: ['assetName', 'assetDescription', 'dataType', 'ownershipConfirmation', 'orchestrationResult'],
    },
    async execute(args: Record<string, unknown>) {
      try {
        const validated = validateRegistrationArgs(args)


        let rulesConfig: Record<string, unknown>
        try {
          rulesConfig = loadJsonConfig('BUSINESS_RULES_PATH', 'config/business-rules.json', '@liuhange/dsh-data-asset-shared/config/business-rules.json')
        } catch {
          return JSON.stringify({ error: 'REGISTRATION_RULES_MISSING', message: '无法加载business-rules.json' })
        }

        const registrationConfig = rulesConfig.registration as Record<string, unknown>
        if (!registrationConfig) {
          return JSON.stringify({ error: 'REGISTRATION_RULES_MISSING', message: 'registration配置段缺失' })
        }

        let policyDocuments: { name: string; docNumber: string; coreRequirement: string }[]
        try {
          const policyConfig = loadJsonConfig('POLICY_REFS_PATH', 'config/policy-references.json', '@liuhange/dsh-data-asset-shared/config/policy-references.json')
          const refs = policyConfig.policyReferences as { stage: string; documents: { name: string; docNumber: string; coreRequirement: string }[] }[] | undefined
          const stage = refs?.find(s => s.stage === 'PRECHECK')
          policyDocuments = stage?.documents ?? []
        } catch {
          policyDocuments = []
        }

        const disallowedScenarios = (registrationConfig.rules as { disallowedScenarios: Array<{ id: string; label: string; keywords: string[] }> })?.disallowedScenarios ?? []
        const precheck = checkDisallowedScenarios(
          validated.assetDescription,
          disallowedScenarios,
          validated.ownershipConfirmation.hasDispute,
        )

        let agencyMatch = null
        if (precheck.conclusion === 'CAN_REGISTER') {
          agencyMatch = matchAgency(
            validated.dataType,
            validated.region,
            registrationConfig.agencies as {
              mode: string
              httpEndpoints: Record<string, { url: string; apiKey: string }>
            },
          )
        }

        const report = generateRegistrationReport(
          validated.assetName,
          precheck,
          agencyMatch,
          policyDocuments,
        )

        const tripleAuditConfig = registrationConfig.tripleAuditStandard as {
          enabled: boolean
          standards: string[]
          policyRef: string
          promptMessage: string
        }
        const tripleAudit = tripleAuditConfig ? promptTripleAuditStandard(tripleAuditConfig) : null

        const sevenStepConfig = registrationConfig.sevenStepFlow as {
          enabled: boolean
          steps: Array<{ step: number; name: string; durationDays: number | null }>
          policyRef: string
        }
        const sevenStep = sevenStepConfig ? promptSevenStepFlow(sevenStepConfig) : null

        const enrichedReport = {
          ...report,
          tripleAuditStandard: tripleAudit,
          sevenStepFlow: sevenStep,
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
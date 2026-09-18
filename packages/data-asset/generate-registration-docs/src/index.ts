import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  AuditLogger,
} from '@liuhange/dsh-data-asset-shared'
import type {
  OrchestrationResult,
  PrecheckReport,
} from '@liuhange/dsh-data-asset-shared'
import { DocGenerator } from './docGenerator.js'
import { DocPackager } from './docPackager.js'

export const name = 'generate-registration-docs'
export const inject = ['tools']

export function apply(ctx: Context) {
  const auditLogger = new AuditLogger()
  const docGenerator = new DocGenerator()
  const docPackager = new DocPackager()

  ctx.tools.register(
    defineTool({
      name: 'generate_registration_docs',
      description: '根据体检报告自动生成国家登记系统所需的申请材料（《数据描述》《来源合法性声明》《产权归属说明》）',
      parameters: {
        orchestrationResult: {
          type: 'string',
          required: true,
          description: '体检全流程产物JSON',
        },
        precheckReport: {
          type: 'string',
          required: true,
          description: '登记预检报告JSON（结论须为 CAN_REGISTER）',
        },
        ownershipConfirmation: {
          type: 'string',
          required: true,
          description: '权属确认信息JSON',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const orchestrationResult = JSON.parse(args.orchestrationResult as string) as OrchestrationResult
        const precheckReport = JSON.parse(args.precheckReport as string) as PrecheckReport
        const ownershipConfirmation = JSON.parse(args.ownershipConfirmation as string) as {
          hasDispute: boolean
          confirmedAt: string
          holder: string
          processor: string
          operator: string
        }

        if (precheckReport.conclusion !== 'CAN_REGISTER') {
          return JSON.stringify({
            error: '预检未通过，无法生成登记材料',
            failedItems: precheckReport.failedItems,
          }, null, 2)
        }

        const docs = docGenerator.generate(orchestrationResult, ownershipConfirmation)
        const pkg = await docPackager.package(docs)

        auditLogger.log({
          pluginName: 'generate-registration-docs',
          operation: 'generate_registration_docs',
          inputPath: '-',
          outputPath: pkg.packagePath,
          result: 'SUCCESS',
        })

        return JSON.stringify(pkg, null, 2)
      },
    }),
  )

  console.log('[generate-registration-docs] 登记材料生成插件已加载')
}

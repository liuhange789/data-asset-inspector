import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  AuditLogger,
} from '@liuhange/dsh-data-asset-shared'
import type { OrchestrationResult } from '@liuhange/dsh-data-asset-shared'
import { PrecheckExecutor } from './precheckExecutor.js'

export const name = 'registration-precheck'
export const inject = ['tools']

export function apply(ctx: Context) {
  const auditLogger = new AuditLogger()
  const precheckExecutor = new PrecheckExecutor()

  ctx.tools.register(
    defineTool({
      name: 'registration_precheck',
      description: '登记预检：检查数据是否满足国家数据产权登记条件，输出《登记预检报告》',
      parameters: {
        orchestrationResult: {
          type: 'string',
          required: true,
          description: '体检全流程产物JSON（含 maskingReport/cleaningReport/inventoryReport/packagingManual）',
        },
        ownershipConfirmation: {
          type: 'string',
          required: true,
          description: '权属确认信息JSON（含 hasDispute/confirmedAt）',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const orchestrationResult = JSON.parse(args.orchestrationResult as string) as OrchestrationResult
        const ownershipConfirmation = JSON.parse(args.ownershipConfirmation as string) as {
          hasDispute: boolean
          confirmedAt: string
        }

        const report = precheckExecutor.execute(orchestrationResult, ownershipConfirmation)

        auditLogger.log({
          pluginName: 'registration-precheck',
          operation: 'registration_precheck',
          inputPath: '-',
          outputPath: '-',
          result: report.conclusion === 'CAN_REGISTER' ? 'SUCCESS' : 'FAILED',
        })

        return JSON.stringify(report, null, 2)
      },
    }),
  )

  console.log('[registration-precheck] 登记预检插件已加载')
}

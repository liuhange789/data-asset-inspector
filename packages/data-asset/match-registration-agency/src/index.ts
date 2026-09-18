import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { AgencyMatcher } from './agencyMatcher.js'

export const name = 'match-registration-agency'
export const inject = ['tools']

export function apply(ctx: Context) {
  const matcher = new AgencyMatcher()

  ctx.tools.register(
    defineTool({
      name: 'match_registration_agency',
      description: '根据数据类型匹配推荐登记机构（北京/上海/深圳数据交易所）',
      parameters: {
        dataType: {
          type: 'string',
          required: true,
          description: '数据类型（如：金融/医疗/交通等）',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const dataType = args.dataType as string
        const result = matcher.match(dataType)
        return JSON.stringify(result, null, 2)
      },
    }),
  )

  console.log('[match-registration-agency] 登记机构匹配插件已加载')
}
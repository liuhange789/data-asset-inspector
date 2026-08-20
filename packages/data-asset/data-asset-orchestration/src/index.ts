import type { Context } from '@deepseek-ai/cordis'
import {} from '@deepseek-ai/dsh-tools'
import {} from '@deepseek-ai/dsh-skill'

export const name = 'data-asset-orchestration'
export const inject = ['skills', 'tools']

export function apply(ctx: Context) {
  ctx.skills.register({
    name: 'data-asset-orchestration',
    description: '数据资产化全流程编排',
    source: 'runtime',
    content: `# 数据资产化全流程编排
## 触发条件
当用户要求"对某份数据执行数据资产化处理"或"完整处理这份数据"时使用此 Skill。
## 执行步骤
1. 调用 mask_sensitive_data(filePath, strategy) 执行脱敏
2. 以脱敏输出文件为输入，调用 clean_data(maskedPath, true, true) 执行清洗
3. 以清洗后数据所在目录为输入，调用 inventory_data(directory) 执行盘点
4. 以清洗脱敏后数据文件为输入，调用 package_data_asset(cleanedPath, productName) 执行包装
## 输出
汇总返回脱敏报告、清洗报告、盘点报告、产品说明书四份完整文档。
## 失败处理
任一阶段失败时停止后续阶段，返回已完成阶段的报告和失败阶段的错误信息。`,
    invocation: {
      modelInvocable: true,
      userInvocable: true,
    },
  })

  console.log('[data-asset-orchestration] 全流程编排插件已加载')
}

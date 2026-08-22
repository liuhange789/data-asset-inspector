import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {} from '@deepseek-ai/dsh-skill'
import {
  BusinessRulesLoader,
} from '@liuhange/dsh-data-asset-shared'
import { defaultIncrementalConfig } from './incremental/defaultIncrementalConfig.js'
import { IncrementalProcessor } from './incremental/incrementalProcessor.js'
import { CronScheduler } from './incremental/cronScheduler.js'

export const name = 'data-asset-orchestration'
export const inject = ['skills', 'tools']

export function apply(ctx: Context) {
  const loader = new BusinessRulesLoader()
  const incrementalProcessor = new IncrementalProcessor()
  const cronScheduler = new CronScheduler()

  ctx.skills.register({
    name: 'data-asset-orchestration',
    description: '数据资产化全流程编排（支持全量和增量模式）',
    source: 'runtime',
    content: `# 数据资产化全流程编排
## 触发条件
- 全量模式：当用户要求"对某份数据执行数据资产化处理"或"完整处理这份数据"时使用此 Skill。
- 增量模式：当用户要求"增量处理"或 Cron 调度触发时使用此 Skill。
## 全量执行步骤
1. 调用 mask_sensitive_data(filePath, strategy) 执行脱敏
2. 以脱敏输出文件为输入，调用 clean_data(maskedPath, true, true) 执行清洗
3. 以清洗后数据所在目录为输入，调用 inventory_data(directory) 执行盘点
4. 以清洗脱敏后数据文件为输入，调用 package_data_asset(cleanedPath, productName) 执行包装
## 增量执行步骤
1. 读取上次处理状态（state/incremental-state.json）
2. 对 watchDirectory 下所有文件计算 hash，与上次状态对比
3. 对新增/修改文件执行完整处理流程（脱敏→清洗→盘点→包装）
4. 对删除文件清理产物
5. 合并结果到已有产物中
6. 原子更新状态文件
## 输出
- 全量模式：汇总返回脱敏报告、清洗报告、盘点报告、产品说明书四份完整文档。
- 增量模式：返回处理的文件列表（新增/修改/删除/跳过）和状态更新结果。
## 失败处理
任一阶段失败时停止后续阶段，返回已完成阶段的报告和失败阶段的错误信息。增量模式下单文件失败不影响其他文件处理。`,
    invocation: {
      modelInvocable: true,
      userInvocable: true,
    },
  })

  ctx.tools.register(
    defineTool({
      name: 'run_incremental_processing',
      description: '执行增量数据处理：检测文件变更，仅处理新增/修改文件，支持状态持久化',
      parameters: {
        watchDirectory: { type: 'string', required: true, description: '监控目录路径' },
        stateFilePath: { type: 'string', description: '状态文件路径（默认 state/incremental-state.json）' },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const { config } = loader.load()
        const incrementalConfig = config.incrementalScheduling ?? defaultIncrementalConfig

        const watchDirectory = args.watchDirectory as string
        const stateFilePath = (args.stateFilePath as string) ?? incrementalConfig.stateFilePath

        const result = await incrementalProcessor.process(
          {
            watchDirectory,
            incrementalMode: true,
            stateFilePath,
          },
          incrementalConfig,
        )

        return JSON.stringify(result, null, 2)
      },
    }),
  )

  ctx.tools.register(
    defineTool({
      name: 'setup_incremental_schedule',
      description: '配置增量处理的定时调度（Cron表达式），适配宿主环境调度能力',
      parameters: {
        cronExpression: { type: 'string', required: true, description: 'Cron表达式（5段式: minute hour day month weekday）' },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const { config } = loader.load()
        const incrementalConfig = config.incrementalScheduling ?? defaultIncrementalConfig
        const cronExpression = args.cronExpression as string

        const updatedConfig = { ...incrementalConfig, cronExpression }
        const setupResult = cronScheduler.setup(updatedConfig)

        return JSON.stringify({
          message: '增量处理调度已配置',
          ...setupResult,
        }, null, 2)
      },
    }),
  )

  console.log('[data-asset-orchestration] 全流程编排插件已加载（支持增量模式）')
}

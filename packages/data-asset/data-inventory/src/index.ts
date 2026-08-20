import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import * as fs from 'fs'
import * as path from 'path'
import {
  BusinessRulesLoader,
  ReportGenerator,
  PathValidator,
  AuditLogger,
} from '@deepseek-ai/dsh-data-asset-shared'
import { DirectoryScanner } from './directoryScanner.js'
import { ValueAssessor } from './valueAssessor.js'
import { AssetListGenerator } from './assetListGenerator.js'

export const name = 'data-inventory'
export const inject = ['tools']

export function apply(ctx: Context) {
  const loader = new BusinessRulesLoader()
  const reportGenerator = new ReportGenerator()
  const pathValidator = new PathValidator()
  const auditLogger = new AuditLogger()
  const directoryScanner = new DirectoryScanner()
  const valueAssessor = new ValueAssessor()
  const assetListGenerator = new AssetListGenerator()

  ctx.tools.register(
    defineTool({
      name: 'inventory_data',
      description: '盘点数据资产，生成资产清单和价值评估',
      parameters: {
        directory: { type: 'string', required: true, description: '待盘点的目录路径' },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const { config } = loader.load()
        const workingDir = process.cwd()

        try {
          pathValidator.validateDirectory(args.directory, workingDir)
        } catch {
          return `错误：路径不合法 - ${args.directory}`
        }

        const dir = path.resolve(args.directory)
        if (!fs.existsSync(dir)) {
          return `错误：目录不存在 - ${dir}`
        }

        const scanResult = directoryScanner.scan(dir)
        const assetItems = assetListGenerator.generate(
          scanResult.files,
          valueAssessor,
          config.valueAssessment,
        )

        const report = reportGenerator.generateInventoryReport({
          directory: dir,
          fileCount: scanResult.files.length,
          assetItems,
        })

        auditLogger.log({
          pluginName: 'data-inventory',
          operation: 'inventory_data',
          inputPath: dir,
          outputPath: '-',
          result: 'SUCCESS',
        })

        return report
      },
    }),
  )

  console.log('[data-inventory] 盘点插件已加载')
}

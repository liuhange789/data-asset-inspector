import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import * as fs from 'fs'
import * as path from 'path'
import {
  BusinessRulesLoader,
  FileFormatAdapter,
  PathValidator,
  AuditLogger,
} from '@deepseek-ai/dsh-data-asset-shared'
import { ManualGenerator } from './manualGenerator.js'

export const name = 'data-packaging'
export const inject = ['tools']

export function apply(ctx: Context) {
  const loader = new BusinessRulesLoader()
  const formatAdapter = new FileFormatAdapter()
  const pathValidator = new PathValidator()
  const auditLogger = new AuditLogger()
  const manualGenerator = new ManualGenerator()

  ctx.tools.register(
    defineTool({
      name: 'package_data_asset',
      description: '将清洗脱敏后的数据打包为可交易的数据产品',
      parameters: {
        dataPath: { type: 'string', required: true, description: '数据文件路径' },
        productName: { type: 'string', required: true, description: '产品名称' },
        description: { type: 'string', description: '产品描述' },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const { config } = loader.load()
        const workingDir = process.cwd()
        const dataPath = args.dataPath as string
        const productName = args.productName as string
        const description = args.description as string | undefined

        if (!productName || productName.trim() === '') {
          return '错误：产品名称不能为空'
        }

        try {
          pathValidator.validate(dataPath, workingDir)
        } catch {
          return `错误：路径不合法 - ${dataPath}`
        }

        const fullPath = path.resolve(dataPath)
        if (!fs.existsSync(fullPath)) {
          return `错误：文件不存在 - ${fullPath}`
        }

        const format = formatAdapter.detectFormat(fullPath)

        const generateParams: {
          dataPath: string
          productName: string
          packagingRules: typeof config.packaging
          format: typeof format
          description?: string
        } = {
          dataPath: fullPath,
          productName,
          packagingRules: config.packaging,
          format,
        }
        if (description) {
          generateParams.description = description
        }

        const { text: manualText } = await manualGenerator.generate(generateParams)

        const outputPath = path.join(
          path.dirname(fullPath),
          `${productName}_产品说明书.txt`,
        )
        fs.writeFileSync(outputPath, manualText, 'utf-8')

        auditLogger.log({
          pluginName: 'data-packaging',
          operation: 'package_data_asset',
          inputPath: fullPath,
          outputPath,
          result: 'SUCCESS',
        })

        return `
【数据产品打包完成】
- 产品名称：${productName}
- 数据文件：${fullPath}
- 说明书：${outputPath}
- 状态：✅ 可交易

【下一步建议】
1. 将数据文件与说明书一并提交数据交易所
2. 完成数据产权登记（依据国数综政策〔2026〕35号）
3. 出具合规声明后即可挂牌交易
        `
      },
    }),
  )

  console.log('[data-packaging] 包装插件已加载')
}

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import * as fs from 'fs'
import * as path from 'path'
import {
  BusinessRulesLoader,
  FileFormatAdapter,
  ReportGenerator,
  PathValidator,
  AuditLogger,
} from '@deepseek-ai/dsh-data-asset-shared'
import type { MaskingStrategy, SensitiveFieldType } from '@deepseek-ai/dsh-data-asset-shared'
import { SensitiveFieldScanner } from './sensitiveFieldScanner.js'
import { MaskingStrategyExecutor } from './maskingStrategyExecutor.js'

export const name = 'data-masking'
export const inject = ['tools']

export function apply(ctx: Context) {
  const loader = new BusinessRulesLoader()
  const formatAdapter = new FileFormatAdapter()
  const reportGenerator = new ReportGenerator()
  const pathValidator = new PathValidator()
  const auditLogger = new AuditLogger()
  const scanner = new SensitiveFieldScanner()
  const strategyExecutor = new MaskingStrategyExecutor()

  ctx.tools.register(
    defineTool({
      name: 'mask_sensitive_data',
      description: '识别并脱敏数据中的敏感字段（身份证、手机号、银行卡、邮箱）',
      parameters: {
        filePath: { type: 'string', required: true, description: '待处理文件的路径' },
        strategy: {
          type: 'string',
          description: '脱敏策略: FULL | PARTIAL | GENERALIZE',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const { config } = loader.load()
        const workingDir = process.cwd()
        const filePath = args.filePath as string
        const strategy = (args.strategy as MaskingStrategy) ?? 'PARTIAL'

        try {
          pathValidator.validate(filePath, workingDir)
        } catch {
          return `错误：路径不合法 - ${filePath}`
        }

        const fullPath = path.resolve(filePath)
        if (!fs.existsSync(fullPath)) {
          return `错误：文件不存在 - ${fullPath}`
        }

        const readResult = await formatAdapter.read(fullPath)
        const lines = readResult.lines

        const scanResult = scanner.scan(lines, config.sensitivePatterns)

        let maskedLines = [...lines]
        for (const field of scanResult.fields) {
          const fieldType = field.type as SensitiveFieldType
          const patternConfig = config.sensitivePatterns[fieldType]
          const fieldStrategy = (patternConfig.level as MaskingStrategy) ?? strategy
          const maskedValue = strategyExecutor.execute(field.value, fieldType, fieldStrategy)
          maskedLines = maskedLines.map(line => line.replace(field.value, maskedValue))
        }

        const ext = path.extname(fullPath)
        const baseName = path.basename(fullPath, ext)
        const outputPath = path.join(path.dirname(fullPath), `${baseName}_masked${ext}`)

        await formatAdapter.write(outputPath, maskedLines, readResult.format)

        const report = reportGenerator.generateMaskingReport({
          inputPath: fullPath,
          outputPath,
          strategy: strategyExecutor.resolveStrategy(strategy),
          findings: scanResult.fields,
          fieldTypeCounts: scanResult.typeCounts,
        })

        auditLogger.log({
          pluginName: 'data-masking',
          operation: 'mask_sensitive_data',
          inputPath: fullPath,
          outputPath,
          result: 'SUCCESS',
        })

        return report
      },
    }),
  )

  console.log('[data-masking] 脱敏插件已加载')
}

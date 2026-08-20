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
import { DuplicateRemover } from './duplicateRemover.js'
import { FormatStandardizer } from './formatStandardizer.js'
import { AnomalyDetector } from './anomalyDetector.js'

export const name = 'data-cleaning'
export const inject = ['tools']

export function apply(ctx: Context) {
  const loader = new BusinessRulesLoader()
  const formatAdapter = new FileFormatAdapter()
  const reportGenerator = new ReportGenerator()
  const pathValidator = new PathValidator()
  const auditLogger = new AuditLogger()
  const duplicateRemover = new DuplicateRemover()
  const formatStandardizer = new FormatStandardizer()
  const anomalyDetector = new AnomalyDetector()

  ctx.tools.register(
    defineTool({
      name: 'clean_data',
      description: '清洗数据：去重、格式标准化、异常值检测',
      parameters: {
        filePath: { type: 'string', required: true, description: '待清洗文件路径' },
        removeDuplicates: { type: 'boolean', description: '是否去重' },
        standardizeFormat: { type: 'boolean', description: '是否标准化格式' },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        loader.load()
        const workingDir = process.cwd()
        const filePath = args.filePath as string
        const removeDuplicates = (args.removeDuplicates as boolean) ?? true
        const standardizeFormat = (args.standardizeFormat as boolean) ?? true

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
        const originalLineCount = lines.length

        let cleanedLines = [...lines]
        let duplicateRemoved = 0

        if (removeDuplicates) {
          const dedupResult = duplicateRemover.remove(cleanedLines)
          cleanedLines = dedupResult.cleanedLines
          duplicateRemoved = dedupResult.duplicateRemoved
        }

        if (standardizeFormat) {
          cleanedLines = formatStandardizer.standardize(cleanedLines)
        }

        const anomalyResult = anomalyDetector.detect(cleanedLines)

        const ext = path.extname(fullPath)
        const baseName = path.basename(fullPath, ext)
        const outputPath = path.join(path.dirname(fullPath), `${baseName}_cleaned${ext}`)

        await formatAdapter.write(outputPath, cleanedLines, readResult.format)

        const report = reportGenerator.generateCleaningReport({
          inputPath: fullPath,
          outputPath,
          originalLineCount,
          duplicateRemoved,
          standardizeApplied: standardizeFormat,
          anomalies: anomalyResult.anomalies,
          anomalyTotalCount: anomalyResult.totalCount,
        })

        auditLogger.log({
          pluginName: 'data-cleaning',
          operation: 'clean_data',
          inputPath: fullPath,
          outputPath,
          result: 'SUCCESS',
        })

        return report
      },
    }),
  )

  console.log('[data-cleaning] 清洗插件已加载')
}

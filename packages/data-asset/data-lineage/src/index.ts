import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import * as fs from 'fs'
import * as path from 'path'
import {

  PathValidator,
  AuditLogger,
} from '@liuhange/dsh-data-asset-shared'
import type { TraceDataLineageResult, LineageChain } from './types.js'
import { LineageReportGenerator } from './lineageReportGenerator.js'

export const name = 'data-lineage'
export const inject = ['tools']

export function apply(ctx: Context) {

  const pathValidator = new PathValidator()
  const auditLogger = new AuditLogger()
  const reportGenerator = new LineageReportGenerator()

  ctx.tools.register(
    defineTool({
      name: 'trace_data_lineage',
      description: '导出数据血缘追踪报告（JSON/Mermaid/Markdown格式），展示数据从源头到最终产品的流转路径',
      parameters: {
        lineageFilePath: { type: 'string', required: true, description: '血缘记录文件路径（lineage.json）' },
        outputFormat: { type: 'string', description: '输出格式: json | mermaid | markdown | all（默认all）' },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {

        const workingDir = process.cwd()
        const lineageFilePath = args.lineageFilePath as string
        const outputFormat = (args.outputFormat as string) ?? 'all'

        try {
          pathValidator.validate(lineageFilePath, workingDir)
        } catch {
          return `错误：路径不合法 - ${lineageFilePath}`
        }

        const fullPath = path.resolve(lineageFilePath)
        if (!fs.existsSync(fullPath)) {
          return `错误：文件不存在 - ${fullPath}`
        }


        let chain: LineageChain
        try {
          const content = fs.readFileSync(fullPath, 'utf-8')
          chain = JSON.parse(content) as LineageChain
        } catch {
          return `错误：无法解析血缘文件 - ${fullPath}`
        }

        const basePath = path.dirname(fullPath)
        const result: TraceDataLineageResult = {
          report: chain,
          stepCount: chain.steps.length,
          chainIntact: chain.chainIntact,
          status: 'SUCCESS',
        }

        if (outputFormat === 'json' || outputFormat === 'all') {
          const jsonPath = path.join(basePath, 'lineage_export.json')
          await reportGenerator.writeJson(jsonPath, chain)
          result.jsonPath = jsonPath
        }

        if (outputFormat === 'mermaid' || outputFormat === 'all') {
          const mermaidPath = path.join(basePath, 'lineage_export.mmd')
          await reportGenerator.writeMermaid(mermaidPath, chain)
          result.mermaidPath = mermaidPath
        }

        if (outputFormat === 'markdown' || outputFormat === 'all') {
          const markdownPath = path.join(basePath, 'lineage_export_report.md')
          await reportGenerator.writeMarkdown(markdownPath, chain)
          result.markdownPath = markdownPath
        }

        auditLogger.log({
          pluginName: 'data-lineage',
          operation: 'trace_data_lineage',
          inputPath: fullPath,
          outputPath: result.jsonPath ?? fullPath,
          result: 'SUCCESS',
        })

        return JSON.stringify(result, null, 2)
      },
    }),
  )

  console.log('[data-lineage] 数据血缘追踪插件已加载')
}
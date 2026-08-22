import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import * as fs from 'fs'
import * as path from 'path'
import {
  BusinessRulesLoader,
  PathValidator,
  AuditLogger,
} from '@liuhange/dsh-data-asset-shared'
import type { GenerateVisualizationResult, ChartRenderResult } from './types.js'
import { defaultVisualizationConfig } from './defaultVisualizationConfig.js'
import { ReportDataLoader } from './reportDataLoader.js'
import { BarChartRenderer } from './chartRenderers/barChartRenderer.js'
import { ComparisonChartRenderer } from './chartRenderers/comparisonChartRenderer.js'
import { PieChartRenderer } from './chartRenderers/pieChartRenderer.js'
import { RadarChartRenderer } from './chartRenderers/radarChartRenderer.js'
import { FlowchartRenderer } from './chartRenderers/flowchartRenderer.js'
import { HtmlAssembler } from './htmlAssembler.js'
import { TemplateLoader } from './templateLoader.js'

export const name = 'data-visualization'
export const inject = ['tools']

export function apply(ctx: Context) {
  const loader = new BusinessRulesLoader()
  const pathValidator = new PathValidator()
  const auditLogger = new AuditLogger()
  const dataLoader = new ReportDataLoader()
  const barRenderer = new BarChartRenderer()
  const comparisonRenderer = new ComparisonChartRenderer()
  const pieRenderer = new PieChartRenderer()
  const radarRenderer = new RadarChartRenderer()
  const flowchartRenderer = new FlowchartRenderer()
  const htmlAssembler = new HtmlAssembler()
  const templateLoader = new TemplateLoader()

  ctx.tools.register(
    defineTool({
      name: 'generate_visualization',
      description: '生成可视化HTML报表，含脱敏统计/清洗对比/资产分布/质量评分/血缘追踪图表',
      parameters: {
        reportPaths: { type: 'string', required: true, description: '各报告JSON文件路径（JSON格式: {masking, cleaning, inventory, quality, lineage}）' },
        outputPath: { type: 'string', required: true, description: 'HTML报表输出路径' },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const { config, status: configStatus } = loader.load()
        const workingDir = process.cwd()
        const params = args as unknown as { reportPaths: string; outputPath: string }
        const outputPath = params.outputPath

        try {
          pathValidator.validate(outputPath, workingDir)
        } catch {
          return `错误：路径不合法 - ${outputPath}`
        }

        const vizConfig = templateLoader.load(config.visualization ?? defaultVisualizationConfig)

        let reportPathsObj: { masking?: string; cleaning?: string; inventory?: string; quality?: string; lineage?: string }
        try {
          reportPathsObj = JSON.parse(params.reportPaths)
        } catch {
          reportPathsObj = {}
        }
        const reportPaths = reportPathsObj
        const maskingData = reportPaths.masking ? await dataLoader.load(reportPaths.masking) : { data: null }
        const cleaningData = reportPaths.cleaning ? await dataLoader.load(reportPaths.cleaning) : { data: null }
        const inventoryData = reportPaths.inventory ? await dataLoader.load(reportPaths.inventory) : { data: null }
        const qualityData = reportPaths.quality ? await dataLoader.load(reportPaths.quality) : { data: null }
        const lineageData = reportPaths.lineage ? await dataLoader.load(reportPaths.lineage) : { data: null }

        const charts: ChartRenderResult[] = []
        if (vizConfig.charts.bar?.enabled) {
          charts.push(barRenderer.render(maskingData.data, vizConfig))
        }
        if (vizConfig.charts.comparison?.enabled) {
          charts.push(comparisonRenderer.render(cleaningData.data, vizConfig))
        }
        if (vizConfig.charts.pie?.enabled) {
          charts.push(pieRenderer.render(inventoryData.data, vizConfig))
        }
        if (vizConfig.charts.radar?.enabled) {
          charts.push(radarRenderer.render(qualityData.data, vizConfig))
        }
        if (vizConfig.charts.flowchart?.enabled) {
          charts.push(flowchartRenderer.render(lineageData.data, vizConfig))
        }

        const html = htmlAssembler.assemble({
          charts,
          config: vizConfig,
          reportData: {
            masking: maskingData.data,
            cleaning: cleaningData.data,
            inventory: inventoryData.data,
            quality: qualityData.data,
            lineage: lineageData.data,
          },
        })

        const htmlPath = path.resolve(outputPath)
        const dir = path.dirname(htmlPath)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        fs.writeFileSync(htmlPath, html, 'utf-8')

        auditLogger.log({
          pluginName: 'data-visualization',
          operation: 'generate_visualization',
          inputPath: JSON.stringify(reportPaths),
          outputPath: htmlPath,
          result: 'SUCCESS',
        })

        const result: GenerateVisualizationResult = {
          htmlPath,
          chartCount: charts.length,
          chartsRendered: charts.filter(c => c.dataAvailable).map(c => c.type),
          status: 'SUCCESS',
          configStatus,
        }

        return JSON.stringify(result, null, 2)
      },
    }),
  )

  console.log('[data-visualization] 可视化报表插件已加载')
}
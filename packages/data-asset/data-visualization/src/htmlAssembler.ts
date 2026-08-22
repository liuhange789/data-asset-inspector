import type { VisualizationConfig } from '@liuhange/dsh-data-asset-shared'
import type { ChartRenderResult } from './types.js'
import { InteractionScript } from './interactionScript.js'

export interface HtmlAssembleInput {
  charts: ChartRenderResult[]
  config: VisualizationConfig
  reportData: Record<string, unknown>
}

export class HtmlAssembler {
  private interactionScript = new InteractionScript()

  assemble(input: HtmlAssembleInput): string {
    const { charts, config, reportData } = input
    const colors = config.colorScheme
    const columns = config.layout.columns

    const chartSections = charts.map((chart, _i) => `
    <div class="chart-item" id="chart-${chart.type}" style="display:block;">
      <h3>${chart.title}</h3>
      ${chart.svgContent}
      ${chart.errorMessage ? `<p style="color:${colors.danger};">${chart.errorMessage}</p>` : ''}
    </div>`).join('\n')

    const script = this.interactionScript.generate(config.interactions)
    const dataJson = JSON.stringify(reportData)

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>数据资产可视化报表</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Microsoft YaHei', sans-serif; background: ${colors.background}; color: ${colors.text}; padding: 20px; }
    h1 { text-align: center; margin-bottom: 20px; color: ${colors.primary}; }
    .chart-grid { display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 20px; margin-bottom: 20px; }
    .chart-item { background: white; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .chart-item h3 { margin-bottom: 10px; color: ${colors.primary}; }
    .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <h1>数据资产可视化报表</h1>
  <div class="chart-grid">
    ${chartSections}
  </div>
  <div class="footer">生成时间: ${new Date().toISOString()} | 模板版本: ${config.templateVersion}</div>
  <script>
    const reportData = ${dataJson};
    ${script}
  </script>
</body>
</html>`
  }
}
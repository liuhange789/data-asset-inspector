import type { ChartRenderResult } from '../types.js'
import type { VisualizationConfig } from '@liuhange/dsh-data-asset-shared'

export class ComparisonChartRenderer {
  render(data: unknown, config: VisualizationConfig): ChartRenderResult {
    const title = config.charts.comparison?.title ?? '清洗前后对比'
    const primary = config.colorScheme.primary
    const secondary = config.colorScheme.secondary

    if (data === null || data === undefined) {
      return { type: 'comparison', title, svgContent: this.placeholder(title, '数据不可用'), dataAvailable: false }
    }

    const { before, after } = this.extractData(data)
    if (before === 0 && after === 0) {
      return { type: 'comparison', title, svgContent: this.placeholder(title, '无数据'), dataAvailable: false }
    }

    const maxValue = Math.max(before, after, 1)
    const chartHeight = 200
    const barWidth = 80
    const startX = 40
    const startY = 20

    const beforeHeight = (before / maxValue) * chartHeight
    const afterHeight = (after / maxValue) * chartHeight

    let svg = `<svg width="280" height="${chartHeight + startY + 40}" xmlns="http://www.w3.org/2000/svg">`
    svg += `<rect x="${startX}" y="${startY + chartHeight - beforeHeight}" width="${barWidth}" height="${beforeHeight}" fill="${primary}" />`
    svg += `<text x="${startX + barWidth / 2}" y="${startY + chartHeight + 20}" text-anchor="middle" fill="${config.colorScheme.text}" font-size="12">清洗前</text>`
    svg += `<text x="${startX + barWidth / 2}" y="${startY + chartHeight - beforeHeight - 5}" text-anchor="middle" fill="${config.colorScheme.text}" font-size="12">${before}</text>`
    svg += `<rect x="${startX + barWidth + 40}" y="${startY + chartHeight - afterHeight}" width="${barWidth}" height="${afterHeight}" fill="${secondary}" />`
    svg += `<text x="${startX + barWidth + 40 + barWidth / 2}" y="${startY + chartHeight + 20}" text-anchor="middle" fill="${config.colorScheme.text}" font-size="12">清洗后</text>`
    svg += `<text x="${startX + barWidth + 40 + barWidth / 2}" y="${startY + chartHeight - afterHeight - 5}" text-anchor="middle" fill="${config.colorScheme.text}" font-size="12">${after}</text>`
    svg += '</svg>'

    return { type: 'comparison', title, svgContent: svg, dataAvailable: true }
  }

  private extractData(data: unknown): { before: number; after: number } {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>
      const before = 'originalLineCount' in obj ? Number(obj.originalLineCount) : 0
      const after = 'cleanedLineCount' in obj ? Number(obj.cleanedLineCount) : 0
      return { before, after }
    }
    return { before: 0, after: 0 }
  }

  private placeholder(title: string, message: string): string {
    return `<svg width="300" height="100" xmlns="http://www.w3.org/2000/svg"><text x="150" y="50" text-anchor="middle" fill="#999" font-size="14">${title}: ${message}</text></svg>`
  }
}
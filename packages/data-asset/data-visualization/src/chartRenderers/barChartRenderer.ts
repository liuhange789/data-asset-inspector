import type { ChartRenderResult } from '../types.js'
import type { VisualizationConfig } from '@liuhange/dsh-data-asset-shared'

export class BarChartRenderer {
  render(data: unknown, config: VisualizationConfig): ChartRenderResult {
    const title = config.charts.bar?.title ?? '脱敏统计'
    const primary = config.colorScheme.primary

    if (data === null || data === undefined) {
      return { type: 'bar', title, svgContent: this.placeholder(title, '数据不可用'), dataAvailable: false }
    }

    const counts = this.extractCounts(data)
    if (counts.length === 0) {
      return { type: 'bar', title, svgContent: this.placeholder(title, '无数据'), dataAvailable: false }
    }

    const maxCount = Math.max(...counts.map(c => c.value))
    const barWidth = 60
    const gap = 20
    const chartHeight = 200
    const startX = 40
    const startY = 20

    let svg = `<svg width="${startX + counts.length * (barWidth + gap)}" height="${chartHeight + startY + 40}" xmlns="http://www.w3.org/2000/svg">`
    for (let i = 0; i < counts.length; i++) {
      const item = counts[i]!
      const barHeight = maxCount > 0 ? (item.value / maxCount) * chartHeight : 0
      const x = startX + i * (barWidth + gap)
      const y = startY + chartHeight - barHeight
      svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${primary}" />`
      svg += `<text x="${x + barWidth / 2}" y="${startY + chartHeight + 20}" text-anchor="middle" fill="${config.colorScheme.text}" font-size="12">${item.label}</text>`
      svg += `<text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" fill="${config.colorScheme.text}" font-size="12">${item.value}</text>`
    }
    svg += '</svg>'

    return { type: 'bar', title, svgContent: svg, dataAvailable: true }
  }

  private extractCounts(data: unknown): { label: string; value: number }[] {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>
      if ('fieldTypeCounts' in obj) {
        const counts = obj.fieldTypeCounts as Record<string, number>
        return Object.entries(counts).map(([label, value]) => ({ label, value }))
      }
    }
    return []
  }

  private placeholder(title: string, message: string): string {
    return `<svg width="300" height="100" xmlns="http://www.w3.org/2000/svg"><text x="150" y="50" text-anchor="middle" fill="#999" font-size="14">${title}: ${message}</text></svg>`
  }
}
import type { ChartRenderResult } from '../types.js'
import type { VisualizationConfig } from '@liuhange/dsh-data-asset-shared'

export class PieChartRenderer {
  render(data: unknown, config: VisualizationConfig): ChartRenderResult {
    const title = config.charts.pie?.title ?? '数据资产分布'
    const colors = [config.colorScheme.primary, config.colorScheme.secondary, config.colorScheme.success, config.colorScheme.warning, config.colorScheme.danger]

    if (data === null || data === undefined) {
      return { type: 'pie', title, svgContent: this.placeholder(title, '数据不可用'), dataAvailable: false }
    }

    const items = this.extractData(data)
    if (items.length === 0) {
      return { type: 'pie', title, svgContent: this.placeholder(title, '无数据'), dataAvailable: false }
    }

    const total = items.reduce((sum, item) => sum + item.value, 0)
    if (total === 0) {
      return { type: 'pie', title, svgContent: this.placeholder(title, '无数据'), dataAvailable: false }
    }

    const cx = 150
    const cy = 100
    const r = 80
    let currentAngle = -Math.PI / 2

    let svg = `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">`
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!
      const angle = (item.value / total) * 2 * Math.PI
      const x1 = cx + r * Math.cos(currentAngle)
      const y1 = cy + r * Math.sin(currentAngle)
      const x2 = cx + r * Math.cos(currentAngle + angle)
      const y2 = cy + r * Math.sin(currentAngle + angle)
      const largeArc = angle > Math.PI ? 1 : 0
      const color = colors[i % colors.length]!
      svg += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z" fill="${color}" />`
      currentAngle += angle
    }
    svg += '</svg>'

    return { type: 'pie', title, svgContent: svg, dataAvailable: true }
  }

  private extractData(data: unknown): { label: string; value: number }[] {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>
      if ('assetItems' in obj && Array.isArray(obj.assetItems)) {
        return (obj.assetItems as Record<string, unknown>[]).map(item => ({
          label: String(item.fileName ?? 'unknown'),
          value: Number(item.size ?? 0),
        }))
      }
    }
    return []
  }

  private placeholder(title: string, message: string): string {
    return `<svg width="300" height="100" xmlns="http://www.w3.org/2000/svg"><text x="150" y="50" text-anchor="middle" fill="#999" font-size="14">${title}: ${message}</text></svg>`
  }
}
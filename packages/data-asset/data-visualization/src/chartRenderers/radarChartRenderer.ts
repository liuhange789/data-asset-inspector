import type { ChartRenderResult } from '../types.js'
import type { VisualizationConfig } from '@liuhange/dsh-data-asset-shared'

export class RadarChartRenderer {
  render(data: unknown, config: VisualizationConfig): ChartRenderResult {
    const title = config.charts.radar?.title ?? '质量评分'
    const primary = config.colorScheme.primary

    if (data === null || data === undefined) {
      return { type: 'radar', title, svgContent: this.placeholder(title, '数据不可用'), dataAvailable: false }
    }

    const dimensions = this.extractData(data)
    if (dimensions.length === 0) {
      return { type: 'radar', title, svgContent: this.placeholder(title, '无数据'), dataAvailable: false }
    }

    const cx = 150
    const cy = 100
    const maxR = 80
    const n = dimensions.length

    let svg = `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">`

    for (let i = 0; i < n; i++) {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2
      const x = cx + maxR * Math.cos(angle)
      const y = cy + maxR * Math.sin(angle)
      svg += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#ddd" stroke-width="1" />`
      const labelX = cx + (maxR + 15) * Math.cos(angle)
      const labelY = cy + (maxR + 15) * Math.sin(angle)
      svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" fill="${config.colorScheme.text}" font-size="10">${dimensions[i]!.label}</text>`
    }

    let pathData = ''
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2
      const r = (dimensions[i]!.value / 100) * maxR
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      pathData += (i === 0 ? 'M' : 'L') + `${x},${y} `
    }
    pathData += 'Z'
    svg += `<path d="${pathData}" fill="${primary}" fill-opacity="0.3" stroke="${primary}" stroke-width="2" />`
    svg += '</svg>'

    return { type: 'radar', title, svgContent: svg, dataAvailable: true }
  }

  private extractData(data: unknown): { label: string; value: number }[] {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>
      if ('dimensions' in obj && typeof obj.dimensions === 'object' && obj.dimensions !== null) {
        const dims = obj.dimensions as Record<string, Record<string, unknown>>
        return Object.entries(dims).map(([key, val]) => ({
          label: key,
          value: Number(val.score ?? 0),
        }))
      }
    }
    return []
  }

  private placeholder(title: string, message: string): string {
    return `<svg width="300" height="100" xmlns="http://www.w3.org/2000/svg"><text x="150" y="50" text-anchor="middle" fill="#999" font-size="14">${title}: ${message}</text></svg>`
  }
}
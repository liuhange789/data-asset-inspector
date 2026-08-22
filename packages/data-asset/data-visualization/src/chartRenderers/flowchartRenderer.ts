import type { ChartRenderResult } from '../types.js'
import type { VisualizationConfig } from '@liuhange/dsh-data-asset-shared'

export class FlowchartRenderer {
  render(data: unknown, config: VisualizationConfig): ChartRenderResult {
    const title = config.charts.flowchart?.title ?? '血缘追踪'
    const primary = config.colorScheme.primary

    if (data === null || data === undefined) {
      return { type: 'flowchart', title, svgContent: this.placeholder(title, '数据不可用'), dataAvailable: false }
    }

    const steps = this.extractData(data)
    if (steps.length === 0) {
      return { type: 'flowchart', title, svgContent: this.placeholder(title, '无数据'), dataAvailable: false }
    }

    const nodeWidth = 120
    const nodeHeight = 40
    const gap = 60
    const startX = 20
    const startY = 80

    let svg = `<svg width="${startX + steps.length * (nodeWidth + gap)}" height="160" xmlns="http://www.w3.org/2000/svg">`
    for (let i = 0; i < steps.length; i++) {
      const x = startX + i * (nodeWidth + gap)
      svg += `<rect x="${x}" y="${startY}" width="${nodeWidth}" height="${nodeHeight}" rx="5" fill="${primary}" fill-opacity="0.2" stroke="${primary}" stroke-width="2" />`
      svg += `<text x="${x + nodeWidth / 2}" y="${startY + nodeHeight / 2 + 5}" text-anchor="middle" fill="${config.colorScheme.text}" font-size="12">${steps[i]}</text>`
      if (i < steps.length - 1) {
        const arrowX = x + nodeWidth
        svg += `<line x1="${arrowX}" y1="${startY + nodeHeight / 2}" x2="${arrowX + gap}" y2="${startY + nodeHeight / 2}" stroke="${primary}" stroke-width="2" />`
        svg += `<polygon points="${arrowX + gap},${startY + nodeHeight / 2} ${arrowX + gap - 5},${startY + nodeHeight / 2 - 5} ${arrowX + gap - 5},${startY + nodeHeight / 2 + 5}" fill="${primary}" />`
      }
    }
    svg += '</svg>'

    return { type: 'flowchart', title, svgContent: svg, dataAvailable: true }
  }

  private extractData(data: unknown): string[] {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>
      if ('steps' in obj && Array.isArray(obj.steps)) {
        return (obj.steps as Record<string, unknown>[]).map(step => String(step.stepName ?? ''))
      }
    }
    return []
  }

  private placeholder(title: string, message: string): string {
    return `<svg width="300" height="100" xmlns="http://www.w3.org/2000/svg"><text x="150" y="50" text-anchor="middle" fill="#999" font-size="14">${title}: ${message}</text></svg>`
  }
}
import * as fs from 'fs'
import * as path from 'path'
import type { LineageChain } from './types.js'
import { MermaidGenerator } from './mermaidGenerator.js'

export class LineageReportGenerator {
  private mermaidGenerator = new MermaidGenerator()

  async writeJson(filePath: string, chain: LineageChain): Promise<void> {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, JSON.stringify(chain, null, 2), 'utf-8')
  }

  async writeMermaid(filePath: string, chain: LineageChain): Promise<void> {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, this.mermaidGenerator.generate(chain), 'utf-8')
  }

  async writeMarkdown(filePath: string, chain: LineageChain): Promise<void> {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const lines: string[] = []
    lines.push('【数据血缘追踪报告】')
    lines.push('')
    lines.push(`> 生成时间: ${chain.generatedAt}`)
    lines.push(`> 步骤数: ${chain.steps.length}`)
    lines.push(`> 链完整性: ${chain.chainIntact ? '完整' : '断裂'}`)
    if (chain.brokenAt !== undefined) {
      lines.push(`> 断裂位置: 步骤 ${chain.brokenAt}`)
    }
    lines.push('')

    lines.push('## 步骤明细')
    lines.push('')
    if (chain.steps.length === 0) {
      lines.push('无血缘步骤')
    } else {
      lines.push('| 序号 | 步骤名 | 时间 | 输入 | 输出 | 变换规则 |')
      lines.push('|------|--------|------|------|------|---------|')
      for (let i = 0; i < chain.steps.length; i++) {
        const step = chain.steps[i]!
        lines.push(`| ${i} | ${step.stepName} | ${step.timestamp} | ${step.input.filePath} | ${step.output.filePath} | ${step.transformRule} |`)
      }
    }
    lines.push('')

    lines.push('## 链式追溯路径')
    lines.push('')
    if (chain.steps.length === 0) {
      lines.push('无追溯路径')
    } else {
      const pathParts = chain.steps.map(s => s.stepName)
      lines.push(pathParts.join(' → '))
    }

    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8')
  }

  async writeAll(basePath: string, chain: LineageChain): Promise<{ jsonPath: string; mermaidPath: string; markdownPath: string }> {
    const dir = path.dirname(basePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const jsonPath = basePath.endsWith('.json') ? basePath : path.join(basePath, 'lineage.json')
    const mermaidPath = basePath.endsWith('.json') ? basePath.replace('.json', '.mmd') : path.join(basePath, 'lineage.mmd')
    const markdownPath = basePath.endsWith('.json') ? basePath.replace('.json', '_report.md') : path.join(basePath, 'lineage_report.md')

    await this.writeJson(jsonPath, chain)
    await this.writeMermaid(mermaidPath, chain)
    await this.writeMarkdown(markdownPath, chain)

    return { jsonPath, mermaidPath, markdownPath }
  }
}
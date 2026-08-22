import * as fs from 'fs'
import * as path from 'path'
import type { QualityScoringResult } from './types.js'

export class QualityReportGenerator {
  async writeJson(filePath: string, result: QualityScoringResult): Promise<void> {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const jsonContent = {
      dimensions: result.dimensions,
      totalScore: result.totalScore,
      issues: result.issues,
      suggestions: result.suggestions,
      weightsNormalized: result.weightsNormalized,
      scoredAt: result.scoredAt,
    }
    fs.writeFileSync(filePath, JSON.stringify(jsonContent, null, 2), 'utf-8')
  }

  async writeMarkdown(filePath: string, result: QualityScoringResult): Promise<void> {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const lines: string[] = []
    lines.push('【数据质量评分报告】')
    lines.push('')
    lines.push(`> 评分时间: ${result.scoredAt}`)
    lines.push(`> 总分: ${result.totalScore} 分`)
    lines.push('')

    lines.push('## 维度得分')
    lines.push('')
    lines.push('| 维度 | 得分 | 权重 | 是否归一化 |')
    lines.push('|------|------|------|-----------|')
    lines.push(`| 完整性 | ${result.dimensions.completeness.score} | ${result.dimensions.completeness.weight} | ${result.weightsNormalized ? '是' : '否'} |`)
    lines.push(`| 准确性 | ${result.dimensions.accuracy.score} | ${result.dimensions.accuracy.weight} | ${result.weightsNormalized ? '是' : '否'} |`)
    lines.push(`| 一致性 | ${result.dimensions.consistency.score} | ${result.dimensions.consistency.weight} | ${result.weightsNormalized ? '是' : '否'} |`)
    lines.push(`| 时效性 | ${result.dimensions.timeliness.score} | ${result.dimensions.timeliness.weight} | ${result.weightsNormalized ? '是' : '否'} |`)
    lines.push('')

    lines.push('## 问题明细')
    lines.push('')
    if (result.issues.length === 0) {
      lines.push('无问题')
    } else {
      lines.push('| 维度 | 描述 | 位置 | 严重程度 |')
      lines.push('|------|------|------|---------|')
      for (const issue of result.issues) {
        lines.push(`| ${issue.dimension} | ${issue.description} | ${issue.location} | ${issue.severity} |`)
      }
    }
    lines.push('')

    lines.push('## 改进建议')
    lines.push('')
    if (result.suggestions.length === 0) {
      lines.push('各维度得分均高于阈值，无需改进')
    } else {
      for (const suggestion of result.suggestions) {
        lines.push(`- ${suggestion}`)
      }
    }
    lines.push('')

    lines.push('## 配置状态')
    lines.push('')
    lines.push(`- 权重是否归一化: ${result.weightsNormalized ? '是' : '否'}`)
    lines.push(`- 问题总数: ${result.issues.length}`)
    lines.push(`- 建议总数: ${result.suggestions.length}`)

    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8')
  }
}
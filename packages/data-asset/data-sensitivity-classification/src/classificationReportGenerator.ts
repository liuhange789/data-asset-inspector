import * as fs from 'fs'
import * as path from 'path'
import type { ClassificationReportJson, InvalidRule } from './types.js'

export class ClassificationReportGenerator {
  async writeJson(filePath: string, data: ClassificationReportJson): Promise<void> {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  }

  async writeMarkdown(filePath: string, data: ClassificationReportJson, invalidRules: InvalidRule[]): Promise<void> {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const lines: string[] = []
    lines.push('【数据敏感度分级报告】')
    lines.push('')
    lines.push(`> 分类时间: ${data.classifiedAt}`)
    lines.push(`> 字段数: ${data.fields.length}`)
    lines.push('')

    lines.push('## 字段分级')
    lines.push('')
    lines.push('| 字段名 | 敏感度等级 | 识别依据 | 推荐策略 |')
    lines.push('|--------|-----------|---------|---------|')
    for (const field of data.fields) {
      lines.push(`| ${field.fieldName} | ${field.sensitivityLevel} | ${field.identifiedBy.matchType}(${field.identifiedBy.ruleName}) | ${field.recommendedStrategy} |`)
    }
    lines.push('')

    if (invalidRules.length > 0) {
      lines.push('## 无效规则')
      lines.push('')
      for (const rule of invalidRules) {
        lines.push(`- ${rule.ruleName}: ${rule.reason}`)
      }
      lines.push('')
    }

    lines.push('## 配置状态')
    lines.push('')
    lines.push(`- 配置状态: ${data.configStatus}`)
    lines.push(`- 无效规则数: ${invalidRules.length}`)

    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8')
  }
}
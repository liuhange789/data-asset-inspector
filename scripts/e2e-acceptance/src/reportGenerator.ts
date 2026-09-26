import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { AcceptanceReport, ThreeStandardsSummary, ErrorRecord } from './types.js'
import { matchFixSuggestion } from './policyKnowledgeBase.js'

function formatErrors(errors: readonly ErrorRecord[]): string {
  if (errors.length === 0) return '无错误'
  return errors.map(e => {
    const fix = matchFixSuggestion(e.message) ?? matchFixSuggestion(e.code)
    const lines = [`- **[${e.severity.toUpperCase()}] ${e.code}**: ${e.message}`]
    if (e.context) lines.push(`  - 上下文: ${e.context}`)
    if (fix) {
      lines.push(`  - 可能原因: ${fix.possibleCause}`)
      lines.push(`  - 修复建议: ${fix.fixSuggestion}`)
    }
    return lines.join('\n')
  }).join('\n')
}

export function generateReport(report: AcceptanceReport, outputDir: string): string {
  mkdirSync(outputDir, { recursive: true })

  const lines: string[] = []
  lines.push('# 数据资产体检仪 v3.1.1 端到端运行验收报告')
  lines.push('')
  lines.push(`> 生成时间: ${report.generatedAt}`)
  lines.push(`> 总体结论: ${report.overallPassed ? '✅ 全部通过' : '❌ 存在失败项'}`)
  lines.push('')

  lines.push('## 环境信息')
  lines.push('')
  lines.push(`- Node.js: ${report.environment.nodeVersion}`)
  lines.push(`- 平台: ${report.environment.platform}`)
  lines.push(`- 沙箱目录: ${report.environment.sandboxDir}`)
  lines.push(`- DSH Base URL: ${report.environment.dshBaseUrl}`)
  lines.push(`- 启动时间: ${report.environment.startedAt}`)
  lines.push('')

  lines.push('## 三标准汇总')
  lines.push('')
  lines.push('| 标准 | 结果 | 说明 |')
  lines.push('|------|------|------|')
  lines.push(`| 可见 | ${report.threeStandards.visible.passed ? '✅' : '❌'} | ${report.threeStandards.visible.details} |`)
  lines.push(`| 可查 | ${report.threeStandards.queryable.passed ? '✅' : '❌'} | ${report.threeStandards.queryable.details} |`)
  lines.push(`| 可用 | ${report.threeStandards.usable.passed ? '✅' : '❌'} | ${report.threeStandards.usable.details} |`)
  lines.push('')

  lines.push('## 验收项 1: 插件加载可见性')
  lines.push('')
  lines.push(`**结果**: ${report.visibility.passed ? '✅ 通过' : '❌ 失败'}`)
  lines.push('')
  lines.push('### 插件可见性')
  lines.push('| 包名 | 可见 |')
  lines.push('|------|------|')
  for (const p of report.visibility.pluginsVisible) {
    lines.push(`| ${p.packageName} | ${p.visible ? '✅' : '❌'} |`)
  }
  lines.push('')
  lines.push('### 工具注册')
  lines.push('| 工具名 | 已注册 |')
  lines.push('|--------|--------|')
  for (const t of report.visibility.toolsRegistered) {
    lines.push(`| ${t.toolName} | ${t.registered ? '✅' : '❌'} |`)
  }
  lines.push('')
  if (report.visibility.loadErrors.length > 0) {
    lines.push('### 加载错误')
    for (const e of report.visibility.loadErrors) lines.push(`- ${e}`)
    lines.push('')
  }
  if (report.visibility.peerDepWarnings.length > 0) {
    lines.push('### peerDependency 警告')
    for (const w of report.visibility.peerDepWarnings) lines.push(`- ${w}`)
    lines.push('')
  }

  lines.push('## 验收项 2: 5条编排链路端到端')
  lines.push('')
  lines.push(`**结果**: ${report.chain.passed ? '✅ 通过' : '❌ 失败'}`)
  lines.push('')
  lines.push('| 触发词 | 成功 | 耗时(ms) |')
  lines.push('|--------|------|----------|')
  for (const r of report.chain.chainResults) {
    lines.push(`| ${r.trigger} | ${r.success ? '✅' : '❌'} | ${r.durationMs} |`)
  }
  lines.push('')
  if (report.chain.checkpointChecks.length > 0) {
    lines.push('### 检查点字段')
    lines.push('| 触发词 | 字段 | 存在 | 非空 |')
    lines.push('|--------|------|------|------|')
    for (const c of report.chain.checkpointChecks) {
      lines.push(`| ${c.trigger} | ${c.field} | ${c.present ? '✅' : '❌'} | ${c.nonEmpty ? '✅' : '❌'} |`)
    }
    lines.push('')
  }

  lines.push('## 验收项 3: 失败处理验证')
  lines.push('')
  lines.push(`**结果**: ${report.failure.passed ? '✅ 通过' : '❌ 失败'}`)
  lines.push('')
  lines.push('| 触发词 | 失败结构正确 | 失败环节 | 已完成环节 |')
  lines.push('|--------|------------|---------|-----------|')
  for (const f of report.failure.failureResults) {
    lines.push(`| ${f.trigger} | ${f.passed ? '✅' : '❌'} | ${f.failedStep ?? 'N/A'} | ${f.completedSteps.join(', ')} |`)
  }
  lines.push('')

  lines.push('## 验收项 4: 政策依据可查性')
  lines.push('')
  lines.push(`**结果**: ${report.policy.passed ? '✅ 通过' : '❌ 失败'}`)
  lines.push('')
  lines.push(`- 预期政策依据数: ${report.policy.totalExpected}`)
  lines.push(`- 报告中找到: ${report.policy.foundInReports.length}`)
  lines.push(`- 缺失: ${report.policy.missing.length}`)
  if (report.policy.missing.length > 0) {
    lines.push('')
    lines.push('### 缺失的政策依据')
    for (const m of report.policy.missing) {
      lines.push(`- ${m.fullName} (${m.docNumber})`)
    }
  }
  if (report.policy.formatIssues.length > 0) {
    lines.push('')
    lines.push('### 格式问题')
    for (const issue of report.policy.formatIssues) lines.push(`- ${issue}`)
  }
  lines.push('')

  lines.push('## 验收项 5: npm 包可查性')
  lines.push('')
  lines.push(`**结果**: ${report.npm.passed ? '✅ 通过' : '❌ 失败'}`)
  lines.push('')
  lines.push('| 包名 | 预期版本 | latest版本 | 版本一致 | 页面可访问 |')
  lines.push('|------|---------|----------|---------|-----------|')
  for (const c of report.npm.packageChecks) {
    lines.push(`| ${c.packageName} | ${c.expectedVersion} | ${c.actualLatest} | ${c.versionMatch ? '✅' : '❌'} | ${c.pageAccessible ? '✅' : '❌'} |`)
  }
  lines.push('')

  const allErrors = report.errors
  if (allErrors.length > 0) {
    lines.push('## 错误信息与修复建议')
    lines.push('')
    lines.push(formatErrors(allErrors))
    lines.push('')
  }

  lines.push('---')
  lines.push(`**可见**: ${report.threeStandards.visible.passed ? '✅' : '❌'} | **可查**: ${report.threeStandards.queryable.passed ? '✅' : '❌'} | **可用**: ${report.threeStandards.usable.passed ? '✅' : '❌'}`)

  const markdown = lines.join('\n')
  const reportPath = resolve(outputDir, 'acceptance-report.md')
  writeFileSync(reportPath, markdown, 'utf-8')

  return reportPath
}
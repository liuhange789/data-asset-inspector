import type { SensitiveField, AssetItem, ProductManual } from './types.js'

export interface MaskingReportParams {
  inputPath: string
  outputPath: string
  strategy: string
  findings: SensitiveField[]
  fieldTypeCounts: Record<string, number>
}

export interface CleaningReportParams {
  inputPath: string
  outputPath: string
  originalLineCount: number
  duplicateRemoved: number
  standardizeApplied: boolean
  anomalies: Array<{ line: number; reason: string }>
  anomalyTotalCount: number
}

export interface InventoryReportParams {
  directory: string
  fileCount: number
  assetItems: AssetItem[]
}

export interface PackagingManualParams {
  productManual: ProductManual
}

export class ReportGenerator {
  generateMaskingReport(params: MaskingReportParams): string {
    const findingsText =
      Object.keys(params.fieldTypeCounts).length > 0
        ? Object.entries(params.fieldTypeCounts)
          .map(([type, count]) => `发现 ${count} 个${type}类型的敏感数据`)
          .join('；')
        : '无'

    return `【脱敏报告】
- 处理文件：${params.inputPath}
- 发现敏感字段：${findingsText}
- 脱敏策略：${params.strategy}
- 输出文件：${params.outputPath}
- 状态：✅ 完成`
  }

  generateCleaningReport(params: CleaningReportParams): string {
    let report = `【数据清洗报告】
- 文件：${params.inputPath}
- 原始行数：${params.originalLineCount}
- 去重后行数：${params.originalLineCount - params.duplicateRemoved}（删除 ${params.duplicateRemoved} 行重复）
`
    if (params.standardizeApplied) {
      report += '- 格式标准化：✅ 完成\n'
    }
    report += `- 异常值检测：发现 ${params.anomalyTotalCount} 个异常\n`
    if (params.anomalies.length > 0) {
      const displayAnomalies = params.anomalies.slice(0, 5)
      const anomalyText = displayAnomalies.map(a => `行${a.line}: ${a.reason}`).join('；')
      report += `  异常详情：${anomalyText}`
      if (params.anomalyTotalCount > 5) {
        report += `...等${params.anomalyTotalCount}项`
      }
      report += '\n'
    }
    report += `- 输出文件：${params.outputPath}\n- 状态：✅ 完成`
    return report
  }

  generateInventoryReport(params: InventoryReportParams): string {
    let report = `【数据资产盘点报告】\n- 目录：${params.directory}\n- 发现数据文件：${params.fileCount} 个\n\n`
    report += '| 文件名 | 大小 | 类型 | 价值评估 | 说明 |\n'
    report += '|--------|------|------|----------|------|\n'

    for (const item of params.assetItems) {
      report += `| ${item.fileName} | ${item.size} | ${item.type} | ${item.valueAssessment} | ${item.description} |\n`
    }

    report += '\n---\n【建议】\n'
    report += '1. 高价值数据（★★★★★）建议优先进行清洗和脱敏后交易\n'
    report += '2. 低价值数据建议评估是否值得投入处理成本\n'
    report += '3. 所有数据交易前必须完成合规审查\n'

    return report
  }

  generatePackagingManual(params: PackagingManualParams): string {
    const manual = params.productManual
    const complianceText = manual.complianceStatements
      .map(stmt => `✅ ${stmt}`)
      .join('\n')

    return `========================================
        数据产品说明书
========================================

【产品名称】${manual.productName}
【版本】${manual.version}
【生成日期】${manual.generatedDate}

【数据概览】
- 源文件：${manual.dataOverview.sourceFile}
- 数据量：${manual.dataOverview.recordCount} 条记录
- 文件大小：${manual.dataOverview.fileSizeKb.toFixed(1)} KB
- 格式：${manual.dataOverview.format}

【数据样例】（前5行）
${manual.sampleLines.join('\n')}

【使用场景】
${manual.usageScenario}

【合规声明】
${complianceText}

【定价建议】
${manual.pricingSuggestion}

--- 本产品由数据资产化工具包自动生成 ---`
  }
}

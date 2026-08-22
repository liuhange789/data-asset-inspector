import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import * as fs from 'fs'
import * as path from 'path'
import {
  BusinessRulesLoader,
  FileFormatAdapter,
  PathValidator,
  AuditLogger,
} from '@liuhange/dsh-data-asset-shared'
import type { ClassifySensitivityResult, ClassificationReportJson, FieldClassification } from './types.js'
import { defaultClassificationRules } from './defaultClassificationRules.js'
import { SensitivityClassifier } from './sensitivityClassifier.js'
import { StrategyRecommender } from './strategyRecommender.js'
import { ClassificationReportGenerator } from './classificationReportGenerator.js'

export const name = 'data-sensitivity-classification'
export const inject = ['tools']

function parseRecords(lines: string[], format: string): Record<string, unknown>[] {
  if (format === 'csv' && lines.length > 0) {
    const header = lines[0]!.split(',')
    const records: Record<string, unknown>[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i]!.split(',')
      const record: Record<string, unknown> = {}
      for (let j = 0; j < header.length; j++) {
        record[header[j]!] = values[j] ?? ''
      }
      records.push(record)
    }
    return records
  }
  if (format === 'json') {
    const records: Record<string, unknown>[] = []
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line)
        if (typeof parsed === 'object' && parsed !== null) {
          records.push(parsed as Record<string, unknown>)
        }
      } catch {
        // skip
      }
    }
    return records
  }
  return []
}

export function apply(ctx: Context) {
  const loader = new BusinessRulesLoader()
  const formatAdapter = new FileFormatAdapter()
  const pathValidator = new PathValidator()
  const auditLogger = new AuditLogger()
  const classifier = new SensitivityClassifier()
  const recommender = new StrategyRecommender()
  const reportGenerator = new ClassificationReportGenerator()

  ctx.tools.register(
    defineTool({
      name: 'classify_sensitivity',
      description: '自动识别数据字段敏感度等级（公开/内部/机密/绝密），并推荐相应脱敏策略',
      parameters: {
        filePath: { type: 'string', required: true, description: '待分级数据文件的路径' },
        outputPathDir: { type: 'string', description: '报告输出目录（默认数据文件所在目录）' },
        sampleSize: { type: 'string', description: '样本大小（默认100）' },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const { config, status: configStatus } = loader.load()
        const workingDir = process.cwd()
        const filePath = args.filePath as string
        const outputPathDir = (args.outputPathDir as string) ?? path.dirname(path.resolve(filePath))
        const sampleSize = parseInt((args.sampleSize as string) ?? '100', 10)

        try {
          pathValidator.validate(filePath, workingDir)
        } catch {
          return `错误：路径不合法 - ${filePath}`
        }

        const fullPath = path.resolve(filePath)
        if (!fs.existsSync(fullPath)) {
          return `错误：文件不存在 - ${fullPath}`
        }

        const classificationConfig = config.sensitivityClassification ?? defaultClassificationRules

        const readResult = await formatAdapter.read(fullPath)
        const records = parseRecords(readResult.lines, readResult.format)
        const fieldNames = records.length > 0 ? Object.keys(records[0]!) : []

        const fieldSamples: Record<string, unknown[]> = {}
        for (const fieldName of fieldNames) {
          const samples: unknown[] = []
          for (let i = 0; i < Math.min(records.length, sampleSize); i++) {
            const value = records[i]![fieldName]
            if (value !== null && value !== undefined && String(value).trim() !== '') {
              samples.push(value)
            }
          }
          fieldSamples[fieldName] = samples
        }

        const { classifications, invalidRules } = classifier.classify(fieldNames, fieldSamples, classificationConfig)

        const fieldsWithStrategy: FieldClassification[] = classifications.map(c => ({
          ...c,
          recommendedStrategy: recommender.recommend(c.sensitivityLevel, classificationConfig.levelMapping),
        }))

        const reportJson: ClassificationReportJson = {
          fields: fieldsWithStrategy,
          configStatus,
          classifiedAt: new Date().toISOString(),
        }

        const jsonReportPath = path.join(outputPathDir, 'classification_report.json')
        const markdownReportPath = path.join(outputPathDir, 'classification_report.md')

        await reportGenerator.writeJson(jsonReportPath, reportJson)
        await reportGenerator.writeMarkdown(markdownReportPath, reportJson, invalidRules)

        auditLogger.log({
          pluginName: 'data-sensitivity-classification',
          operation: 'classify_sensitivity',
          inputPath: fullPath,
          outputPath: jsonReportPath,
          result: 'SUCCESS',
        })

        const result: ClassifySensitivityResult = {
          jsonReportPath,
          markdownReportPath,
          report: reportJson,
          fields: fieldsWithStrategy,
          status: 'SUCCESS',
          configStatus,
        }

        return JSON.stringify(result, null, 2)
      },
    }),
  )

  console.log('[data-sensitivity-classification] 数据敏感度分级插件已加载')
}
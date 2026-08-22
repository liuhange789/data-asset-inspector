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
import type { QualityScoringConfig } from '@liuhange/dsh-data-asset-shared'
import type { ScoreDataQualityResult, QualityScoringResult, QualityDimensions, DimensionScore, ScoringContext, DimensionScoringResult } from './types.js'
import { defaultScoringRules } from './defaultScoringRules.js'
import { CompletenessScorer } from './completenessScorer.js'
import { AccuracyScorer } from './accuracyScorer.js'
import { ConsistencyScorer } from './consistencyScorer.js'
import { TimelinessScorer } from './timelinessScorer.js'
import { WeightedScoreCalculator } from './weightedScoreCalculator.js'
import { IssueCollector } from './issueCollector.js'
import { SuggestionGenerator } from './suggestionGenerator.js'
import { QualityReportGenerator } from './qualityReportGenerator.js'

export const name = 'data-quality-scoring'
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
        // skip non-JSON lines
      }
    }
    return records
  }

  return []
}

function buildDimensionScore(result: DimensionScoringResult, weight: number, normalizedWeight: number): DimensionScore {
  return {
    score: result.score,
    weight,
    weightNormalized: normalizedWeight,
    issues: result.issues,
  }
}

function buildDimensions(
  completeness: DimensionScoringResult,
  accuracy: DimensionScoringResult,
  consistency: DimensionScoringResult,
  timeliness: DimensionScoringResult,
  weights: QualityScoringConfig['weights'],
  normalizedWeights: QualityScoringConfig['weights'],
): QualityDimensions {
  return {
    completeness: buildDimensionScore(completeness, weights.completeness, normalizedWeights.completeness),
    accuracy: buildDimensionScore(accuracy, weights.accuracy, normalizedWeights.accuracy),
    consistency: buildDimensionScore(consistency, weights.consistency, normalizedWeights.consistency),
    timeliness: buildDimensionScore(timeliness, weights.timeliness, normalizedWeights.timeliness),
  }
}

export function apply(ctx: Context) {
  const loader = new BusinessRulesLoader()
  const formatAdapter = new FileFormatAdapter()
  const pathValidator = new PathValidator()
  const auditLogger = new AuditLogger()
  const completenessScorer = new CompletenessScorer()
  const accuracyScorer = new AccuracyScorer()
  const consistencyScorer = new ConsistencyScorer()
  const timelinessScorer = new TimelinessScorer()
  const weightedCalculator = new WeightedScoreCalculator()
  const issueCollector = new IssueCollector()
  const suggestionGenerator = new SuggestionGenerator()
  const reportGenerator = new QualityReportGenerator()

  ctx.tools.register(
    defineTool({
      name: 'score_data_quality',
      description: '对数据文件进行多维度质量评分（完整性/准确性/一致性/时效性），生成质量评分报告',
      parameters: {
        filePath: { type: 'string', required: true, description: '待评分数据文件的路径' },
        outputPathDir: { type: 'string', description: '报告输出目录（默认数据文件所在目录）' },
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

        try {
          pathValidator.validate(filePath, workingDir)
        } catch {
          return `错误：路径不合法 - ${filePath}`
        }

        const fullPath = path.resolve(filePath)
        if (!fs.existsSync(fullPath)) {
          return `错误：文件不存在 - ${fullPath}`
        }

        const scoringConfig = config.qualityScoring ?? defaultScoringRules

        const readResult = await formatAdapter.read(fullPath)
        const records = parseRecords(readResult.lines, readResult.format)
        const fieldNames = records.length > 0 ? Object.keys(records[0]!) : []

        const context: ScoringContext = {
          records,
          fieldNames,
          config: scoringConfig,
        }

        const completenessResult = completenessScorer.score(context)
        const accuracyResult = accuracyScorer.score(context)
        const consistencyResult = consistencyScorer.score(context)
        const timelinessResult = timelinessScorer.score(context)

        const weights = scoringConfig.weights
        const tempDimensions = buildDimensions(
          completenessResult, accuracyResult, consistencyResult, timelinessResult,
          weights, weights,
        )
        const { totalScore, weightsNormalized, normalizedWeights } = weightedCalculator.calculate(tempDimensions, weights)

        const dimensions = buildDimensions(
          completenessResult, accuracyResult, consistencyResult, timelinessResult,
          weights, normalizedWeights,
        )

        const issues = issueCollector.collect([completenessResult, accuracyResult, consistencyResult, timelinessResult])
        const suggestions = suggestionGenerator.generate(dimensions, scoringConfig.thresholds)

        const scoringResult: QualityScoringResult = {
          totalScore,
          dimensions,
          issues,
          suggestions,
          weightsNormalized,
          scoredAt: new Date().toISOString(),
        }

        const jsonReportPath = path.join(outputPathDir, 'quality_report.json')
        const markdownReportPath = path.join(outputPathDir, 'quality_report.md')

        await reportGenerator.writeJson(jsonReportPath, scoringResult)
        await reportGenerator.writeMarkdown(markdownReportPath, scoringResult)

        auditLogger.log({
          pluginName: 'data-quality-scoring',
          operation: 'score_data_quality',
          inputPath: fullPath,
          outputPath: jsonReportPath,
          result: 'SUCCESS',
        })

        const result: ScoreDataQualityResult = {
          jsonReportPath,
          markdownReportPath,
          report: scoringResult,
          totalScore,
          dimensions,
          status: 'SUCCESS',
          configStatus,
        }

        return JSON.stringify(result, null, 2)
      },
    }),
  )

  console.log('[data-quality-scoring] 数据质量评分插件已加载')
}

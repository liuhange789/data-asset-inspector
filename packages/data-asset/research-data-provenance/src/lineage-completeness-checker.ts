import { LineageCompletenessScorer } from './lineage-completeness-scorer.js'
import type { DatasetMetadata, LineageRecord, LineageDetectionResult, ProcessingStep } from './types.js'

export interface LineageCheckDetail {
  result: LineageDetectionResult
  expectedItemCount: number
  actualItemCount: number
  lineageEmpty: boolean
  formatCompatible: boolean
}

export class LineageCompletenessChecker {
  private readonly scorer: LineageCompletenessScorer

  constructor(scorer?: LineageCompletenessScorer) {
    this.scorer = scorer ?? new LineageCompletenessScorer()
  }

  check(metadata: DatasetMetadata | null | undefined, lineageRecord: LineageRecord | null | undefined): LineageCheckDetail {
    if (metadata === null || metadata === undefined) {
      return this.buildEmptyResult('数据集元数据不存在')
    }

    if (lineageRecord === null || lineageRecord === undefined) {
      return this.buildEmptyResult('血缘完全缺失')
    }

    if (!this.isFormatCompatible(lineageRecord)) {
      const result = this.scorer.buildResult(0, ['血缘记录格式不兼容'], [])
      return { result, expectedItemCount: 0, actualItemCount: 0, lineageEmpty: false, formatCompatible: false }
    }

    const missingItems: string[] = []
    const brokenPoints: string[] = []
    let expectedItemCount = 0
    let actualItemCount = 0

    expectedItemCount += 3
    if (this.isPresent(lineageRecord.sourceSystem)) {
      actualItemCount += 1
    } else {
      missingItems.push('血缘缺失：来源系统')
    }
    if (this.isPresent(lineageRecord.collectionTime)) {
      actualItemCount += 1
    } else {
      missingItems.push('血缘缺失：采集时间')
    }
    if (this.isPresent(lineageRecord.collectionMethod)) {
      actualItemCount += 1
    } else {
      missingItems.push('血缘缺失：采集方法')
    }

    const steps = Array.isArray(lineageRecord.steps) ? lineageRecord.steps : []
    for (const step of steps) {
      expectedItemCount += 3
      const order = step.stepOrder
      if (this.isPresent(step.operationType)) {
        actualItemCount += 1
      } else {
        missingItems.push(`处理链断裂：第${order}步缺少操作类型`)
      }
      if (this.isPresent(step.processingTime)) {
        actualItemCount += 1
      } else {
        missingItems.push(`处理链断裂：第${order}步缺少处理时间`)
      }
      if (this.isPresent(step.operatorId)) {
        actualItemCount += 1
      } else {
        missingItems.push(`处理链断裂：第${order}步缺少处理人`)
      }
    }

    this.checkChainContinuity(steps, brokenPoints)

    const completenessScore = this.scorer.score(actualItemCount, expectedItemCount)
    const result = this.scorer.buildResult(completenessScore, missingItems, brokenPoints)

    return {
      result,
      expectedItemCount,
      actualItemCount,
      lineageEmpty: false,
      formatCompatible: true,
    }
  }

  private buildEmptyResult(reason: string): LineageCheckDetail {
    const result = this.scorer.buildResult(0, [reason], [])
    return { result, expectedItemCount: 0, actualItemCount: 0, lineageEmpty: true, formatCompatible: false }
  }

  private checkChainContinuity(steps: ProcessingStep[], brokenPoints: string[]): void {
    if (steps.length === 0) {
      return
    }
    const sorted = [...steps].sort((a, b) => a.stepOrder - b.stepOrder)
    const first = sorted[0]
    if (first !== undefined && first.stepOrder !== 1) {
      for (let i = 1; i < first.stepOrder; i++) {
        brokenPoints.push(`链路不连续：第${i}步缺失`)
      }
    }
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      if (prev !== undefined && curr !== undefined) {
        const gap = curr.stepOrder - prev.stepOrder
        if (gap > 1) {
          for (let j = prev.stepOrder + 1; j < curr.stepOrder; j++) {
            brokenPoints.push(`链路不连续：第${j}步缺失`)
          }
        }
      }
    }
  }

  private isPresent(value: unknown): boolean {
    return value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== '')
  }

  private isFormatCompatible(lineageRecord: unknown): boolean {
    if (typeof lineageRecord !== 'object' || lineageRecord === null) {
      return false
    }
    const rec = lineageRecord as Record<string, unknown>
    return typeof rec.lineageId === 'string' && Array.isArray(rec.steps)
  }
}
import { ReproducibilityScorer } from './reproducibility-scorer.js'
import type { AttachmentList, ReproducibilityResult, Attachment } from './types.js'

export interface ReproducibilityCheckDetail {
  result: ReproducibilityResult
  hasCode: boolean
  hasEnv: boolean
  hasParam: boolean
  storageUnavailable: boolean
}

export class ReproducibilityChecker {
  private readonly scorer: ReproducibilityScorer

  constructor(scorer?: ReproducibilityScorer) {
    this.scorer = scorer ?? new ReproducibilityScorer()
  }

  check(attachmentList: AttachmentList | null | undefined): ReproducibilityCheckDetail {
    if (attachmentList === null || attachmentList === undefined) {
      const result = this.scorer.buildResult(null, ['检测跳过：存储系统不可用'], true)
      return { result, hasCode: false, hasEnv: false, hasParam: false, storageUnavailable: true }
    }

    const missingItems: string[] = []
    const hasCode = this.isAttachmentPresent(attachmentList.analysisCode, '无分析代码', missingItems)
    const hasEnv = this.isAttachmentPresent(attachmentList.environmentDeclaration, '无环境声明', missingItems)
    const hasParam = this.isAttachmentPresent(attachmentList.parameterConfig, '参数不完整', missingItems)

    const score = this.scorer.score(hasCode, hasEnv, hasParam)
    const result = this.scorer.buildResult(score, missingItems, false)

    return { result, hasCode, hasEnv, hasParam, storageUnavailable: false }
  }

  private isAttachmentPresent(attachment: Attachment | null | undefined, missingLabel: string, missingItems: string[]): boolean {
    if (attachment === null || attachment === undefined) {
      missingItems.push(missingLabel)
      return false
    }
    if (!attachment.exists) {
      missingItems.push(missingLabel)
      return false
    }
    if (!attachment.nonEmpty || attachment.fileSize <= 0) {
      if (attachment.fileSize === 0) {
        missingItems.push(`${missingLabel}（代码文件为空）`)
      } else {
        missingItems.push(missingLabel)
      }
      return false
    }
    return true
  }
}
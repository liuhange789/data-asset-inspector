import type { AssetItem, DataFile } from '@deepseek-ai/dsh-data-asset-shared'
import type { ValueAssessor, ValueAssessResult } from './valueAssessor.js'

export class AssetListGenerator {
  generate(files: DataFile[], valueAssessor: ValueAssessor, valueRules: import('@deepseek-ai/dsh-data-asset-shared').ValueAssessmentRules): AssetItem[] {
    return files.map((file) => {
      const assessment: ValueAssessResult = valueAssessor.assess(file.fileName, valueRules)
      return {
        fileName: file.fileName,
        size: this.humanReadableSize(file.size),
        type: file.format,
        valueAssessment: assessment.label,
        description: assessment.recommendation,
      }
    })
  }

  humanReadableSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
}

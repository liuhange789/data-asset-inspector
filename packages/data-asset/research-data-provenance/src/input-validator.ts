import { ERROR_CODES } from './invariant.js'
import type { DatasetMetadata, LineageRecord, AttachmentList, InputValidationResult, ValidationError } from './types.js'

export class InputValidator {
  validateDataset(
    metadata: DatasetMetadata | null | undefined,
    lineageRecord?: LineageRecord | null,
    attachmentList?: AttachmentList | null,
  ): InputValidationResult {
    const errors: ValidationError[] = []

    if (metadata === null || metadata === undefined) {
      errors.push({ code: ERROR_CODES.DATASET_NOT_FOUND, message: '数据集元数据不存在' })
      return { isValid: false, errors }
    }

    const metadataErrors = this.validateMetadata(metadata)
    errors.push(...metadataErrors)

    if (lineageRecord !== undefined && lineageRecord !== null) {
      const lineageErrors = this.validateLineageRecord(lineageRecord)
      errors.push(...lineageErrors)
    }

    if (attachmentList !== undefined && attachmentList !== null) {
      const attachmentErrors = this.validateAttachmentList(attachmentList)
      errors.push(...attachmentErrors)
    }

    return { isValid: errors.length === 0, errors }
  }

  isLineageFormatCompatible(lineageRecord: unknown): boolean {
    if (typeof lineageRecord !== 'object' || lineageRecord === null) {
      return false
    }
    const rec = lineageRecord as Record<string, unknown>
    return (
      typeof rec.lineageId === 'string' &&
      Array.isArray(rec.steps)
    )
  }

  isAttachmentFormatCompatible(attachmentList: unknown): boolean {
    if (typeof attachmentList !== 'object' || attachmentList === null) {
      return false
    }
    const list = attachmentList as Record<string, unknown>
    return (
      typeof list.analysisCode === 'object' &&
      typeof list.environmentDeclaration === 'object' &&
      typeof list.parameterConfig === 'object'
    )
  }

  private validateMetadata(metadata: DatasetMetadata): ValidationError[] {
    const errors: ValidationError[] = []
    const requiredFields: Array<{ field: keyof DatasetMetadata; label: string }> = [
      { field: 'datasetId', label: '数据集标识' },
      { field: 'datasetName', label: '数据集名称' },
      { field: 'creatingOrganization', label: '创建单位' },
      { field: 'createdAt', label: '创建时间' },
    ]

    for (const { field, label } of requiredFields) {
      const value = metadata[field]
      if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        errors.push({ code: ERROR_CODES.INPUT_INVALID, message: `${label}不得为空`, field: String(field) })
      }
    }

    if (typeof metadata.createdAt === 'string' && metadata.createdAt.trim() !== '') {
      const created = new Date(metadata.createdAt)
      const now = new Date()
      if (Number.isNaN(created.getTime())) {
        errors.push({ code: ERROR_CODES.INPUT_INVALID, message: '创建时间格式无法解析', field: 'createdAt' })
      } else if (created.getTime() > now.getTime()) {
        errors.push({ code: ERROR_CODES.INPUT_INVALID, message: '创建时间不得晚于当前时间', field: 'createdAt' })
      }
    }

    return errors
  }

  private validateLineageRecord(lineageRecord: LineageRecord): ValidationError[] {
    const errors: ValidationError[] = []
    if (!this.isLineageFormatCompatible(lineageRecord)) {
      errors.push({ code: ERROR_CODES.INPUT_INVALID, message: '血缘记录格式不兼容，部分检测项跳过', field: 'lineageRecord' })
      return errors
    }
    if (!Array.isArray(lineageRecord.steps)) {
      errors.push({ code: ERROR_CODES.INPUT_INVALID, message: '血缘处理步骤须为数组', field: 'steps' })
    }
    return errors
  }

  private validateAttachmentList(attachmentList: AttachmentList): ValidationError[] {
    const errors: ValidationError[] = []
    if (!this.isAttachmentFormatCompatible(attachmentList)) {
      errors.push({ code: ERROR_CODES.INPUT_INVALID, message: '附件清单格式不兼容', field: 'attachmentList' })
    }
    return errors
  }
}
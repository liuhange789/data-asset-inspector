import { existsSync } from 'node:fs'
import type { ChangeRecord, SourceConfig, ValidationError, ValidationResult } from './types.js'

export class InputValidator {
  validateInspectInput(args: unknown): ValidationResult {
    const errors: ValidationError[] = []
    if (args === null || args === undefined) {
      errors.push({ assetId: '', errorMessage: '输入参数为空' })
      return { isValid: false, errors }
    }
    const obj = args as Record<string, unknown>
    if (typeof obj.projectId !== 'string' || (obj.projectId as string).trim() === '') {
      errors.push({ assetId: '', errorMessage: 'projectId必填且为非空字符串' })
    }
    if (typeof obj.sourceConfigPath !== 'string' || (obj.sourceConfigPath as string).trim() === '') {
      errors.push({ assetId: '', errorMessage: 'sourceConfigPath必填且为非空字符串' })
    }
    return { isValid: errors.length === 0, errors }
  }

  validateOverrideInput(args: unknown): ValidationResult {
    const errors: ValidationError[] = []
    if (args === null || args === undefined) {
      errors.push({ assetId: '', errorMessage: '输入参数为空' })
      return { isValid: false, errors }
    }
    const obj = args as Record<string, unknown>
    const assetId = obj.assetId
    if (typeof assetId !== 'string' || (assetId as string).trim() === '') {
      errors.push({ assetId: '', errorMessage: 'assetId必填且为非空字符串' })
    }
    if (typeof obj.reviewItem !== 'string' || (obj.reviewItem as string).trim() === '') {
      errors.push({ assetId: String(assetId ?? ''), errorMessage: 'reviewItem必填且为非空字符串' })
    }
    if (typeof obj.overrideConclusion !== 'string' || (obj.overrideConclusion as string).trim() === '') {
      errors.push({ assetId: String(assetId ?? ''), errorMessage: 'overrideConclusion必填且为非空字符串' })
    }
    if (typeof obj.overrideReason !== 'string' || (obj.overrideReason as string).trim() === '') {
      errors.push({ assetId: String(assetId ?? ''), errorMessage: 'overrideReason必填且为非空字符串' })
    }
    if (typeof obj.operator !== 'string' || (obj.operator as string).trim() === '') {
      errors.push({ assetId: String(assetId ?? ''), errorMessage: 'operator必填且为非空字符串' })
    }
    if (typeof obj.inventoryReportPath !== 'string' || (obj.inventoryReportPath as string).trim() === '') {
      errors.push({ assetId: String(assetId ?? ''), errorMessage: 'inventoryReportPath必填且为非空字符串' })
    }
    return { isValid: errors.length === 0, errors }
  }

  validateSources(sourceConfig: SourceConfig): ValidationResult {
    const errors: ValidationError[] = []
    if (!sourceConfig || typeof sourceConfig !== 'object') {
      errors.push({ assetId: '', errorMessage: '数据源配置为空' })
      return { isValid: false, errors }
    }
    if (typeof sourceConfig.projectId !== 'string' || sourceConfig.projectId.trim() === '') {
      errors.push({ assetId: '', errorMessage: '数据源配置projectId必填' })
    }
    if (!Array.isArray(sourceConfig.sources)) {
      errors.push({ assetId: '', errorMessage: '数据源配置sources须为数组' })
      return { isValid: false, errors }
    }
    for (const source of sourceConfig.sources) {
      if (!source || typeof source !== 'object') {
        errors.push({ assetId: '', errorMessage: '数据源项格式不合法' })
        continue
      }
      if (typeof source.type !== 'string' || source.type.trim() === '') {
        errors.push({ assetId: '', errorMessage: '数据源type必填' })
      }
      if (typeof source.systemId !== 'string' || source.systemId.trim() === '') {
        errors.push({ assetId: '', errorMessage: '数据源systemId必填' })
      }
      if (typeof source.path !== 'string' || source.path.trim() === '') {
        errors.push({ assetId: '', errorMessage: '数据源path必填' })
      }
    }
    return { isValid: errors.length === 0, errors }
  }

  isSourceAvailable(sourcePath: string): boolean {
    return existsSync(sourcePath)
  }

  validateChangeRecords(changeRecords: unknown): { valid: ChangeRecord[]; invalid: string[] } {
    const valid: ChangeRecord[] = []
    const invalid: string[] = []
    if (!Array.isArray(changeRecords)) {
      invalid.push('变更记录非数组')
      return { valid, invalid }
    }
    for (const record of changeRecords) {
      if (!record || typeof record !== 'object') {
        invalid.push('变更记录格式不兼容')
        continue
      }
      const r = record as Record<string, unknown>
      if (typeof r.changeId !== 'string' || r.changeId.trim() === '') {
        invalid.push('变更记录缺少changeId')
        continue
      }
      valid.push({
        changeId: r.changeId as string,
        relatedAssetId: typeof r.relatedAssetId === 'string' ? r.relatedAssetId : '',
        changeReason: typeof r.changeReason === 'string' ? r.changeReason : '',
        approvalChain: (r.approvalChain as ChangeRecord['approvalChain']) ?? {
          initiator: '',
          approver: '',
          approvalTime: '',
          approvalConclusion: '',
        },
        impactScope: Array.isArray(r.impactScope) ? (r.impactScope as string[]) : [],
        changeDate: typeof r.changeDate === 'string' ? r.changeDate : '',
      })
    }
    return { valid, invalid }
  }
}
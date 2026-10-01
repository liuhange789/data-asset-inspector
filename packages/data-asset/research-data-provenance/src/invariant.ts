export const PLUGIN_NAME = '@liuhange/dsh-research-data-provenance'

export const QUALITY_DIMENSION_CONFIG_ENV = 'RESEARCH_QUALITY_DIMENSION_CONFIG_PATH'
export const REMEDIATION_SUGGESTION_CONFIG_ENV = 'RESEARCH_REMEDIATION_SUGGESTION_CONFIG_PATH'
export const QUALITY_DIMENSION_CONFIG_LOCAL = 'config/quality-dimension-config.json'
export const REMEDIATION_SUGGESTION_CONFIG_LOCAL = 'config/remediation-suggestion-config.json'
export const QUALITY_DIMENSION_CONFIG_SHARED = '@liuhange/dsh-research-data-provenance/config/quality-dimension-config.json'
export const REMEDIATION_SUGGESTION_CONFIG_SHARED = '@liuhange/dsh-research-data-provenance/config/remediation-suggestion-config.json'

export const OVERRIDE_RECORDS_LOG_DIR = 'logs'
export const OVERRIDE_RECORDS_LOG_FILE = 'override-records.log'

export const LEGAL_DISCLAIMER = '本报告由辅助审计工具生成，不替代学术伦理审查与法人单位的数据管理主体责任'

export const SCIENCE_DATA_REGULATION_NAME = '《科学数据管理办法》'
export const SCIENCE_DATA_REGULATION_NUMBER = '国办发〔2018〕17号'
export const QUALITY_GUIDE_NAME = '《高质量数据集 建设指南》'
export const QUALITY_GUIDE_NUMBER = 'TC609-5-2025-01'

export const REMEDIATION_SUGGESTION_FALLBACK = '请联系管理员补充整改建议配置'

export type ErrorCode =
  | 'DETECTION_ITEM_NOT_FOUND'
  | 'REASON_REQUIRED'
  | 'OVERWRITE_RECORD_IMMUTABLE'
  | 'DATASET_NOT_FOUND'
  | 'INPUT_INVALID'
  | 'CONFIG_MISSING'
  | 'STORAGE_UNAVAILABLE'
  | 'UNKNOWN_ERROR'

export const ERROR_CODES = {
  DETECTION_ITEM_NOT_FOUND: 'DETECTION_ITEM_NOT_FOUND',
  REASON_REQUIRED: 'REASON_REQUIRED',
  OVERWRITE_RECORD_IMMUTABLE: 'OVERWRITE_RECORD_IMMUTABLE',
  DATASET_NOT_FOUND: 'DATASET_NOT_FOUND',
  INPUT_INVALID: 'INPUT_INVALID',
  CONFIG_MISSING: 'CONFIG_MISSING',
  STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const
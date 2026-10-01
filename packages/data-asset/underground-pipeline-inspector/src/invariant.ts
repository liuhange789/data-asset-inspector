export const PLUGIN_NAME = '@liuhange/dsh-underground-pipeline-inspector'

export const CONFIG_PATHS = {
  inspection: 'config/pipeline-inspection-config.json',
  attribute: 'config/pipeline-attribute-config.json',
  qualityElement: 'config/quality-element-config.json',
} as const

export const SHARED_CONFIG_PATHS = {
  inspection: '@liuhange/dsh-underground-pipeline-inspector/config/pipeline-inspection-config.json',
  attribute: '@liuhange/dsh-underground-pipeline-inspector/config/pipeline-attribute-config.json',
  qualityElement: '@liuhange/dsh-underground-pipeline-inspector/config/quality-element-config.json',
} as const

export const ENV_VARS = {
  inspection: 'UNDERGROUND_PIPELINE_INSPECTION_CONFIG_PATH',
  attribute: 'UNDERGROUND_PIPELINE_ATTRIBUTE_CONFIG_PATH',
  qualityElement: 'UNDERGROUND_PIPELINE_QUALITY_ELEMENT_CONFIG_PATH',
} as const

export const OVERRIDE_RECORD_FILE = 'logs/override-records.log'

export const LEGAL_DISCLAIMER =
  '本报告由辅助工具生成，不替代测绘单位的法定质量检验与验收义务，人工复核记录仅限本地保存'

export const STANDARDS = {
  GBT_35644: { fullName: '地下管线数据获取规程', number: 'GB/T 35644-2017' },
  GBT_29806: { fullName: '信息技术 地下管线数据交换技术要求', number: 'GB/T 29806-2013' },
  CJJ_61: { fullName: '城市地下管线探测技术规程', number: 'CJJ 61-2017' },
  CJJ_68: { fullName: '城镇排水管渠运行维护及安全技术规程', number: 'CJJ 68-2016' },
  GBT_24356: { fullName: '测绘成果质量检查与验收', number: 'GB/T 24356-2023' },
  GD_GUIDELINE: { fullName: '广东省地下管线数据检查导则', number: 'GD-PIPE-2020' },
} as const

export type StandardKey = keyof typeof STANDARDS

export const ERROR_CODES = {
  CONFIG_INVALID: 'CONFIG_INVALID',
  OBJECT_NOT_FOUND: 'OBJECT_NOT_FOUND',
  REASON_REQUIRED: 'REASON_REQUIRED',
  OVERWRITE_RECORD_IMMUTABLE: 'OVERWRITE_RECORD_IMMUTABLE',
  INVALID_OVERRIDE_CONCLUSION: 'INVALID_OVERRIDE_CONCLUSION',
  INPUT_INVALID: 'INPUT_INVALID',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PATH_INVALID: 'PATH_INVALID',
  DATASET_EMPTY: 'DATASET_EMPTY',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

export const OVERRIDE_CONCLUSIONS = ['合格', '不合格', '误判', '需复检'] as const
export type OverrideConclusion = (typeof OVERRIDE_CONCLUSIONS)[number]

export const INSPECTION_RATIO_STATEMENT = '本次检测采用全检比例，对工作区内全部管线点、管段、构筑物逐一检查'

export const QUALITY_GRADES = ['优级', '良级', '合格', '不合格'] as const
export type QualityGrade = (typeof QUALITY_GRADES)[number]
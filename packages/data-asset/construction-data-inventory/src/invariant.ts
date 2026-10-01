export const PLUGIN_NAME = '@liuhange/dsh-construction-data-inventory'

export const DEFAULT_CLASSIFICATION_CONFIG_PATH = 'config/classification-config.json'
export const DEFAULT_ENCODING_RULE_CONFIG_PATH = 'config/encoding-rule-config.json'
export const DEFAULT_SOURCE_ADAPTER_CONFIG_PATH = 'config/source-adapter-config.json'
export const DEFAULT_QUALITY_ELEMENT_CONFIG_PATH = 'config/quality-element-config.json'
export const DEFAULT_OVERRIDE_LOG_PATH = 'logs/override-records.log'

export const LEGAL_DISCLAIMER = '本报告由辅助盘点工具生成，不替代GB/T 51269标准的正式合规认证'

export const POLICY_STANDARD_NAME = '《建筑信息模型分类和编码标准》（GB/T 51269-2017）'

export type ErrorCode =
  | 'ASSET_NOT_FOUND'
  | 'REASON_REQUIRED'
  | 'OVERWRITE_RECORD_IMMUTABLE'
  | 'INVALID_CLASSIFICATION_CODE'
  | 'CHECKSUM_ALGORITHM_MISSING'
  | 'INPUT_INVALID'
  | 'CONFIG_NOT_FOUND'
  | 'SOURCE_UNAVAILABLE'
  | 'IFC_PARSE_ERROR'
  | 'SEQUENTIAL_CODE_OVERFLOW'
  | 'UNKNOWN_ERROR'

export type ConfigLoadStatus =
  | 'CONFIG_LOADED'
  | 'DEFAULT_MISSING'
  | 'DEFAULT_PARSE'
  | 'DEFAULT_VERSION'
  | 'DEFAULT_PARTIAL'

export const SUPPORTED_IFC_VERSIONS = ['IFC2X3', 'IFC4'] as const

export const IFC_ENTITY_TYPES = [
  'IFCWALL',
  'IFCWALLSTANDARDCASE',
  'IFCCOLUMN',
  'IFCCOLUMNSTANDARDCASE',
  'IFCSLAB',
  'IFCSLABSTANDARDCASE',
  'IFCDOOR',
  'IFCWINDOW',
  'IFCSPACE',
  'IFCBUILDINGSTOREY',
  'IFCBUILDING',
  'IFCSITE',
  'IFCROOF',
  'IFCBEAM',
  'IFCBEAMSTANDARDCASE',
  'IFCFOOTING',
  'IFCSTAIR',
  'IFCSTAIRFLIGHT',
  'IFCRAILING',
  'IFCCURTAINWALL',
  'IFCPROPERTYSET',
] as const
export const PLUGIN_NAME = '@liuhange/dsh-geo-data-quality-inspector'

export const CONFIG_PATHS = {
  geoAccuracy: 'config/geo-accuracy-config.json',
  geoTopology: 'config/geo-topology-config.json',
  qualityElement: 'config/quality-element-config.json',
} as const

export const SHARED_CONFIG_PATHS = {
  geoAccuracy: '@liuhange/dsh-geo-data-quality-inspector/config/geo-accuracy-config.json',
  geoTopology: '@liuhange/dsh-geo-data-quality-inspector/config/geo-topology-config.json',
  qualityElement: '@liuhange/dsh-geo-data-quality-inspector/config/quality-element-config.json',
} as const

export const ENV_VARS = {
  geoAccuracy: 'GEO_DATA_QUALITY_ACCURACY_CONFIG_PATH',
  geoTopology: 'GEO_DATA_QUALITY_TOPOLOGY_CONFIG_PATH',
  qualityElement: 'GEO_DATA_QUALITY_ELEMENT_CONFIG_PATH',
} as const

export const OVERRIDE_RECORD_FILE = 'logs/override-records.log'

export const LEGAL_DISCLAIMER =
  '本报告由辅助工具生成，不替代测绘单位的法定质量检验与验收义务，人工复核记录仅限本地保存'

export const STANDARDS = {
  GBT_24356: { fullName: '测绘成果质量检查与验收', number: 'GB/T 24356-2023' },
  GBT_35644: { fullName: '地下管线数据获取规程', number: 'GB/T 35644-2017' },
  DSM_GUIDELINE: { fullName: '数字高程模型质量检查技术规定', number: '自然资源部DSM检查导则' },
  ESRI_SHAPEFILE: { fullName: 'ESRI Shapefile技术规范', number: 'ESRI-Shapefile-1998' },
  RFC_7946: { fullName: 'GeoJSON格式规范', number: 'RFC 7946' },
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
  DATASET_BLOCKED: 'DATASET_BLOCKED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

export const OVERRIDE_CONCLUSIONS = ['合格', '不合格', '误判', '需复检'] as const
export type OverrideConclusion = (typeof OVERRIDE_CONCLUSIONS)[number]

export const INSPECTION_RATIO_STATEMENT =
  '数据检查比例100%，人工检查比例5%'

export const QUALITY_GRADES = ['优级', '良级', '合格', '不合格'] as const
export type QualityGrade = (typeof QUALITY_GRADES)[number]

export const SHAPEFILE_REQUIRED_EXTENSIONS = ['.shp', '.shx', '.dbf'] as const

export const VALID_GEOMETRY_TYPES = [
  'Point',
  'MultiPoint',
  'LineString',
  'MultiLineString',
  'Polygon',
  'MultiPolygon',
  'GeometryCollection',
] as const

export type ValidGeometryType = (typeof VALID_GEOMETRY_TYPES)[number]

export const VALID_FEATURE_TYPES = ['Feature', 'FeatureCollection'] as const
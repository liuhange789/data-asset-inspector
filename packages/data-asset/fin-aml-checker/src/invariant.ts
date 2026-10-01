export const PLUGIN_NAME = '@liuhange/dsh-fin-aml-checker'

export const CONFIG_PATHS = {
  threshold: 'config/threshold-config.json',
  exemption: 'config/exemption-config.json',
  exchangeRate: 'config/exchange-rate-config.json',
  holiday: 'config/holiday-config.json',
} as const

export const SHARED_CONFIG_PATHS = {
  threshold: '@liuhange/dsh-fin-aml-checker/config/threshold-config.json',
  exemption: '@liuhange/dsh-fin-aml-checker/config/exemption-config.json',
  exchangeRate: '@liuhange/dsh-fin-aml-checker/config/exchange-rate-config.json',
  holiday: '@liuhange/dsh-fin-aml-checker/config/holiday-config.json',
} as const

export const ENV_VARS = {
  threshold: 'FIN_AML_THRESHOLD_CONFIG_PATH',
  exemption: 'FIN_AML_EXEMPTION_CONFIG_PATH',
  exchangeRate: 'FIN_AML_EXCHANGE_RATE_CONFIG_PATH',
  holiday: 'FIN_AML_HOLIDAY_CONFIG_PATH',
} as const

export const OVERRIDE_RECORD_FILE = 'logs/override-records.log'

export const LEGAL_DISCLAIMER = '本报告由辅助工具生成，不替代金融机构的法定反洗钱报告义务'

export const POLICY_REGULATION_PREFIX =
  '依据：《金融机构大额交易和可疑交易报告管理办法》（中国人民银行令〔2016〕第3号）'

export const ERROR_CODES = {
  CONFIG_INVALID: 'CONFIG_INVALID',
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
  REASON_REQUIRED: 'REASON_REQUIRED',
  OVERWRITE_RECORD_IMMUTABLE: 'OVERWRITE_RECORD_IMMUTABLE',
  INVALID_OVERRIDE_CONCLUSION: 'INVALID_OVERRIDE_CONCLUSION',
  CURRENCY_NOT_CONFIGURED: 'CURRENCY_NOT_CONFIGURED',
  INPUT_INVALID: 'INPUT_INVALID',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PATH_INVALID: 'PATH_INVALID',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

export const OVERRIDE_CONCLUSIONS = ['应报', '不应报', '豁免', '不豁免'] as const
export type OverrideConclusion = (typeof OVERRIDE_CONCLUSIONS)[number]

export const REPORT_DEADLINE_WORKING_DAYS = 5
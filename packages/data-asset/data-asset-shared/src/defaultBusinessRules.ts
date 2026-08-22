import type { BusinessRulesConfig } from './types.js'

export const defaultQualityScoringConfig = {
  weights: {
    completeness: 0.25,
    accuracy: 0.25,
    consistency: 0.25,
    timeliness: 0.25,
  },
  thresholds: {
    completeness: 60,
    accuracy: 60,
    consistency: 60,
    timeliness: 60,
  },
  completeness: {
    missingMarkers: ['null', 'undefined', 'N/A', '', 'NULL', 'NaN'],
  },
  accuracy: {
    formatRules: [
      { fieldName: 'phone', pattern: '1[3-9]\\d{9}', weight: 0.5 },
      { fieldName: 'email', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', weight: 0.5 },
    ],
    domainRules: [
      { fieldName: 'age', min: 0, max: 150, weight: 0.5 },
      { fieldName: 'score', min: 0, max: 100, weight: 0.5 },
    ],
  },
  consistency: {
    crossFieldRules: [
      { name: 'endDateAfterStartDate', fields: ['startDate', 'endDate'], constraint: 'after' },
    ],
  },
  timeliness: {
    timestampField: 'updatedAt',
    freshnessThresholdHours: 720,
  },
}

export const defaultLineageConfig = {
  enabled: false,
  storagePath: 'lineage',
  hashAlgorithm: 'SHA-256',
}

export const defaultAdvancedMaskingConfig = {
  defaultAlgorithm: 'hash',
  fieldAlgorithms: {},
  fpe: {
    key: '',
    radix: 10,
  },
  kAnonymity: {
    kValue: 2,
    quasiIdentifiers: ['zipCode', 'age', 'gender'],
  },
  differentialPrivacy: {
    epsilon: 1.0,
    totalBudget: 5.0,
    sensitivity: 1.0,
  },
  hash: {
    algorithm: 'SHA-256',
    salt: '',
  },
}

export const defaultVisualizationConfig = {
  charts: {
    bar: { enabled: true, title: '脱敏统计' },
    comparison: { enabled: true, title: '清洗前后对比' },
    pie: { enabled: true, title: '数据资产分布' },
    radar: { enabled: true, title: '质量评分' },
    flowchart: { enabled: true, title: '血缘追踪' },
  },
  layout: {
    columns: 2,
    responsive: true,
  },
  colorScheme: {
    primary: '#4A90D9',
    secondary: '#F5A623',
    success: '#7ED321',
    warning: '#F8E71C',
    danger: '#D0021B',
    background: '#F5F5F5',
    text: '#333333',
  },
  interactions: {
    expandCollapse: true,
    chartSwitch: true,
    tooltip: true,
  },
  templateVersion: '1.0',
}

export const defaultSensitivityClassificationConfig = {
  fieldNameRules: [
    { name: 'idCard', pattern: 'id_?card|身份证|identity', level: 'Secret' },
    { name: 'phone', pattern: 'phone|手机|mobile|tel', level: 'Confidential' },
    { name: 'email', pattern: 'email|邮箱|mail', level: 'Confidential' },
    { name: 'bankCard', pattern: 'bank_?card|银行卡|account', level: 'Secret' },
    { name: 'address', pattern: 'address|地址|addr', level: 'Internal' },
    { name: 'name', pattern: '^name$|姓名|username', level: 'Internal' },
    { name: 'public', pattern: 'status|type|category|label|tag|level', level: 'Public' },
  ],
  fieldValueRules: [
    { name: 'idCardValue', pattern: '[1-9]\\d{5}(18|19|20)?\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]', level: 'Secret' },
    { name: 'phoneValue', pattern: '1[3-9]\\d{9}', level: 'Confidential' },
    { name: 'emailValue', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', level: 'Confidential' },
    { name: 'bankCardValue', pattern: '[1-9]\\d{15,18}', level: 'Secret' },
  ],
  levelMapping: {
    Public: 'none',
    Internal: 'partial',
    Confidential: 'full',
    Secret: 'encrypt',
  },
  defaultLevel: 'Internal',
}

export const defaultIncrementalSchedulingConfig = {
  incrementalMode: false,
  cronExpression: '0 2 * * *',
  hashAlgorithm: 'SHA-256',
  watchDirectory: 'input',
  stateFilePath: 'state/incremental-state.json',
  lockTimeout: 3600,
}

export const defaultBusinessRules: BusinessRulesConfig = {
  version: '1.0',
  lastUpdated: '2026-08-17',
  valueAssessment: {
    highValue: {
      keywords: ['供应链', '销售明细', '设备工况', '交易流水'],
      score: 5,
      label: '★★★★★',
      recommendation: '优先交易，建议入表',
    },
    mediumValue: {
      keywords: ['用户行为', '产品数据', '行业报告'],
      score: 3,
      label: '★★★',
      recommendation: '脱敏后交易',
    },
    lowValue: {
      keywords: ['日志', '备份', '临时'],
      score: 1,
      label: '★',
      recommendation: '评估处理成本',
    },
    defaultValue: {
      score: 3,
      label: '★★★',
      recommendation: '需进一步评估',
    },
  },
  sensitivePatterns: {
    idCard: {
      pattern: '[1-9]\\d{5}(18|19|20)?\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]',
      level: 'FULL',
    },
    phone: {
      pattern: '1[3-9]\\d{9}',
      level: 'PARTIAL',
    },
    bankCard: {
      pattern: '[1-9]\\d{15,18}',
      level: 'PARTIAL',
    },
    email: {
      pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
      level: 'PARTIAL',
    },
  },
  maskingLevels: {
    FULL: {
      description: '完全匿名化',
      applyTo: ['idCard'],
    },
    PARTIAL: {
      description: '假名化，保留前3后4',
      applyTo: ['phone', 'bankCard'],
    },
    GENERALIZE: {
      description: '泛化处理',
      applyTo: ['email'],
    },
  },
  cleaningRules: {
    missingValueStrategy: {
      government: 'interpolation',
      financial: 'manual_review',
      behavior: 'mode_fill',
    },
    qualityThreshold: {
      A: { missingRate: 0.05, errorRate: 0.01, label: '优秀' },
      B: { missingRate: 0.10, errorRate: 0.03, label: '良好' },
      C: { missingRate: 0.20, errorRate: 0.05, label: '合格' },
      D: { missingRate: 0.20, errorRate: 0.05, label: '不合格', action: '不建议交易' },
    },
  },
  compliance: {
    policies: [
      { name: '数据产权登记工作指引', doc: '国数综政策〔2026〕35号', check: '数据来源可登记' },
      { name: '数据流通安全治理', doc: '发改数据〔2025〕18号', check: '来源合法性' },
      { name: '数据脱敏工具标准', doc: 'YD/T 6225-2024', check: '脱敏效果达标' },
    ],
  },
  packaging: {
    complianceStatements: [
      '本数据产品已完成脱敏处理',
      '不包含个人身份信息',
      '数据来源合法',
      '建议交易前完成数据产权登记',
    ],
    pricingRules: [
      { valueLevel: '★★★★★', suggestion: '根据数据质量、稀缺性和应用场景综合定价，建议高价交易' },
      { valueLevel: '★★★★', suggestion: '根据数据质量和应用场景定价，建议中高价交易' },
      { valueLevel: '★★★', suggestion: '根据数据质量和应用场景综合定价' },
      { valueLevel: '★★', suggestion: '建议低价交易或内部使用' },
      { valueLevel: '★', suggestion: '建议评估处理成本后决定是否交易' },
    ],
    defaultDescription: '适用于数据分析、模型训练、行业研究等场景',
    version: 'V1.0',
  },
}

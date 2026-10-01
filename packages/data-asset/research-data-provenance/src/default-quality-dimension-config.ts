import type { QualityDimensionConfig, RemediationSuggestionConfig } from './types.js'

export const defaultQualityDimensionConfig: QualityDimensionConfig = {
  version: '1.0.0',
  lastUpdated: '2025-01-01T00:00:00.000Z',
  weights: {
    accuracy: 0.1667,
    completeness: 0.1667,
    consistency: 0.1667,
    timeliness: 0.1667,
    normality: 0.1667,
    security: 0.1665,
  },
  accuracy: {
    rules: [
      {
        ruleId: 'rule-acc-1',
        description: '字段值域校验：关键字段取值须落在合法值域内',
        judgmentLogic: 'valueRangeValid === true',
        weight: 0.5,
        enabled: true,
      },
      {
        ruleId: 'rule-acc-2',
        description: '参照完整性：外键引用须在主表中存在',
        judgmentLogic: 'referenceMatch === true',
        weight: 0.5,
        enabled: true,
      },
    ],
  },
  completeness: {
    rules: [
      {
        ruleId: 'rule-comp-1',
        description: '缺失值检测：必填字段不得存在缺失值',
        judgmentLogic: 'missingValueCount === 0',
        weight: 0.6,
        enabled: true,
      },
      {
        ruleId: 'rule-comp-2',
        description: '记录数检测：数据集记录数须大于零',
        judgmentLogic: 'recordCount !== 0',
        weight: 0.4,
        enabled: true,
      },
    ],
  },
  consistency: {
    rules: [
      {
        ruleId: 'rule-cons-1',
        description: '字段间逻辑一致性：关联字段须满足业务逻辑约束',
        judgmentLogic: 'fieldLogicConsistent === true',
        weight: 0.5,
        enabled: true,
      },
      {
        ruleId: 'rule-cons-2',
        description: '跨表一致性：同一实体在不同表中的取值须一致',
        judgmentLogic: 'crossTableConsistent === true',
        weight: 0.5,
        enabled: true,
      },
    ],
  },
  timeliness: {
    rules: [
      {
        ruleId: 'rule-time-1',
        description: '更新频率检测：数据集须在配置有效期内更新',
        judgmentLogic: 'isExpired === false',
        weight: 0.6,
        enabled: true,
      },
      {
        ruleId: 'rule-time-2',
        description: '有效期检测：数据须在有效期内',
        judgmentLogic: 'withinValidity === true',
        weight: 0.4,
        enabled: true,
      },
    ],
  },
  normality: {
    rules: [
      {
        ruleId: 'rule-norm-1',
        description: '命名规范：字段命名须符合小驼峰命名规范',
        judgmentLogic: 'namingPattern =~ ^[a-z][a-zA-Z0-9]*$',
        weight: 0.4,
        enabled: true,
      },
      {
        ruleId: 'rule-norm-2',
        description: '格式规范：数据格式须符合配置的格式约定',
        judgmentLogic: 'formatValid === true',
        weight: 0.3,
        enabled: true,
      },
      {
        ruleId: 'rule-norm-3',
        description: '元数据规范：元数据字段须完整填写',
        judgmentLogic: 'metadataComplete === true',
        weight: 0.3,
        enabled: true,
      },
    ],
  },
  security: {
    rules: [
      {
        ruleId: 'rule-sec-1',
        description: '访问控制：数据集须配置访问控制策略',
        judgmentLogic: 'accessControlEnabled === true',
        weight: 0.4,
        enabled: true,
      },
      {
        ruleId: 'rule-sec-2',
        description: '敏感字段标识：敏感字段须被显式标识',
        judgmentLogic: 'sensitiveFieldLabeled === true',
        weight: 0.3,
        enabled: true,
      },
      {
        ruleId: 'rule-sec-3',
        description: '加密要求：敏感数据须加密存储',
        judgmentLogic: 'encrypted === true',
        weight: 0.3,
        enabled: true,
      },
    ],
  },
}

export const defaultRemediationSuggestionConfig: RemediationSuggestionConfig = {
  version: '1.0.0',
  lastUpdated: '2025-01-01T00:00:00.000Z',
  suggestions: {
    '血缘缺失：采集方法': {
      missingItemType: '血缘缺失：采集方法',
      suggestion: '请补充原始数据的采集方法描述，明确采集所用的仪器、流程或方法学',
      policyBasis: '依据：《科学数据管理办法》（国办发〔2018〕17号）第九条',
    },
    '血缘缺失：采集时间': {
      missingItemType: '血缘缺失：采集时间',
      suggestion: '请补充原始数据的采集时间记录',
      policyBasis: '依据：《科学数据管理办法》（国办发〔2018〕17号）第九条',
    },
    '血缘缺失：来源系统': {
      missingItemType: '血缘缺失：来源系统',
      suggestion: '请补充原始数据来源系统标识',
      policyBasis: '依据：《科学数据管理办法》（国办发〔2018〕17号）第九条',
    },
    '血缘完全缺失': {
      missingItemType: '血缘完全缺失',
      suggestion: '请补充原始数据来源记录，包含来源系统、采集时间与采集方法',
      policyBasis: '依据：《科学数据管理办法》（国办发〔2018〕17号）第九条',
    },
    '无分析代码': {
      missingItemType: '无分析代码',
      suggestion: '请上传分析代码或脚本附件，确保数据集可复现',
      policyBasis: '依据：《科学数据管理办法》（国办发〔2018〕17号）第十一条',
    },
    '无环境声明': {
      missingItemType: '无环境声明',
      suggestion: '请补充运行环境声明与依赖版本清单',
      policyBasis: '依据：《科学数据管理办法》（国办发〔2018〕17号）第十一条',
    },
    '参数不完整': {
      missingItemType: '参数不完整',
      suggestion: '请补充完整的运行参数配置文件',
      policyBasis: '依据：《科学数据管理办法》（国办发〔2018〕17号）第十一条',
    },
  },
}
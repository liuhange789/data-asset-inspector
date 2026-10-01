import type {
  PipelineInspectionConfig,
  PipelineAttributeConfig,
  QualityElementConfig,
} from '../src/types.js'

export function createInspectionConfig(): PipelineInspectionConfig {
  return {
    version: '1.0.0',
    lastUpdated: '2026-10-01',
    workspace: {
      description: '巡检工作区范围定义',
      requiredLayers: ['pipeline_point', 'pipeline_segment', 'pipeline_structure'],
      policyBasis: '依据：《地下管线数据获取规程》（GB/T 35644-2017）第5.1条',
    },
    edgeMatching: {
      description: '接边点坐标容差',
      toleranceMeter: 0.005,
      policyBasis: '依据：《城市地下管线探测技术规程》（CJJ 61-2017）第4.6.2条',
    },
    legalCoordinateSystems: {
      description: '合法坐标系枚举',
      allowedSridList: [
        'CGCS2000_3_degree_GK_Zone_38',
        'CGCS2000_3_degree_GK_Zone_39',
        'CGCS2000_3_degree_GK_Zone_40',
        'CGCS2000',
      ],
      policyBasis: '依据：《地下管线数据获取规程》（GB/T 35644-2017）第5.2.2条',
    },
    verticalDatum: {
      description: '合法高程基准枚举',
      allowedDatumList: ['1985国家高程基准', '1956黄海高程系', '地方独立高程基准'],
      policyBasis: '依据：《地下管线数据获取规程》（GB/T 35644-2017）第5.2.3条',
    },
    connectivity: {
      description: '连通性要求',
      minConnectedSegments: 1,
      maxConnectedSegments: 4,
      policyBasis: '依据：《地下管线数据获取规程》（GB/T 35644-2017）第6.3条',
    },
    grossErrorRate: {
      description: '管线点粗差率阈值',
      thresholdRate: 0.05,
      policyBasis: '依据：《广东省地下管线数据检查导则》第7.3.11条',
    },
    fieldIntegrity: {
      description: '必填字段清单',
      pipelinePointRequiredFields: ['pointId', 'pointType', 'x', 'y', 'elevation'],
      pipelineSegmentRequiredFields: [
        'segmentId',
        'startPointId',
        'endPointId',
        'diameter',
        'material',
        'buryMethod',
      ],
      policyBasis: '依据：《信息技术 地下管线数据交换技术要求》（GB/T 29806-2013）第6.2条',
    },
  }
}

export function createAttributeConfig(): PipelineAttributeConfig {
  return {
    version: '1.0.0',
    lastUpdated: '2026-10-01',
    diameterRange: {
      description: '管径值域',
      minMm: 0,
      maxMm: 3000,
      policyBasis: '依据：《信息技术 地下管线数据交换技术要求》（GB/T 29806-2013）第6.3.4条',
    },
    materialEnum: {
      description: '管材材质枚举',
      allowedValues: ['钢管', '铸铁管', '球墨铸铁管', '钢筋混凝土管', 'PE管', 'PVC管', '其他'],
      policyBasis: '依据：《信息技术 地下管线数据交换技术要求》（GB/T 29806-2013）第6.3.5条',
    },
    buryMethodEnum: {
      description: '埋设方式枚举',
      allowedValues: ['直埋', '管沟', '顶管', '其他'],
      policyBasis: '依据：《信息技术 地下管线数据交换技术要求》（GB/T 29806-2013）第6.3.6条',
    },
    flowDirectionEnum: {
      description: '排水流向枚举',
      allowedValues: ['顺流', '逆流', '未知'],
      policyBasis: '依据：《城镇排水管渠运行维护及安全技术规程》（CJJ 68-2016）第3.2.4条',
    },
    attributeSpec: {
      description: '属性项规范',
      fieldConstraints: [
        { fieldName: 'pointId', maxLength: 32, policyBasis: '依据：《信息技术 地下管线数据交换技术要求》（GB/T 29806-2013）第6.2.1条' },
        { fieldName: 'segmentId', maxLength: 32, policyBasis: '依据：《信息技术 地下管线数据交换技术要求》（GB/T 29806-2013）第6.2.2条' },
        { fieldName: 'pointType', maxLength: 16, policyBasis: '依据：《信息技术 地下管线数据交换技术要求》（GB/T 29806-2013）第6.2.3条' },
        { fieldName: 'material', maxLength: 16, policyBasis: '依据：《信息技术 地下管线数据交换技术要求》（GB/T 29806-2013）第6.3.5条' },
        { fieldName: 'buryMethod', maxLength: 16, policyBasis: '依据：《信息技术 地下管线数据交换技术要求》（GB/T 29806-2013）第6.3.6条' },
      ],
      policyBasis: '依据：《信息技术 地下管线数据交换技术要求》（GB/T 29806-2013）第6.2条',
    },
  }
}

export function createQualityElementConfig(): QualityElementConfig {
  return {
    version: '1.0.0',
    lastUpdated: '2026-10-01',
    qualityElements: {
      description: '六类质量元素及权重',
      elements: [
        { elementName: '空间参考系', weight: 0.1667, policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.1条' },
        { elementName: '位置精度', weight: 0.1667, policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.2条' },
        { elementName: '逻辑一致性', weight: 0.1667, policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.3条' },
        { elementName: '时间精度', weight: 0.1667, policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.4条' },
        { elementName: '栅格质量', weight: 0.1666, policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.5条' },
        { elementName: '附件质量', weight: 0.1666, policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.6条' },
      ],
      policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6章',
    },
    errorClassThresholds: {
      description: 'A/B/C/D扣分阈值',
      classAScoreDeduction: 1.0,
      classBScoreDeduction: 0.6,
      classCScoreDeduction: 0.3,
      classDScoreDeduction: 0.1,
      policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第7.2条',
    },
    qualityGradeThresholds: {
      description: '质量等级划分阈值',
      excellentMinScore: 90,
      goodMinScore: 80,
      qualifiedMinScore: 70,
      policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第8.1条',
    },
  }
}
import { loadJsonConfig } from '@liuhange/dsh-data-asset-shared'
import { CONFIG_PATHS, SHARED_CONFIG_PATHS, ENV_VARS } from './invariant.js'
import type {
  PipelineInspectionConfig,
  PipelineAttributeConfig,
  QualityElementConfig,
  ConfigLoadResult,
  ConfigLoadStatus,
} from './types.js'

const defaultInspectionConfig: PipelineInspectionConfig = {
  version: '1.0.0',
  lastUpdated: '2026-10-01',
  workspace: {
    description: '巡检工作区范围定义，含图层名称与边界',
    requiredLayers: ['pipeline_point', 'pipeline_segment', 'pipeline_structure'],
    policyBasis: '依据：《地下管线数据获取规程》（GB/T 35644-2017）第5.1条',
  },
  edgeMatching: {
    description: '接边点坐标容差，单位米',
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
    description: '连通性要求，管线点最小连通管段数与最大连通管段数',
    minConnectedSegments: 1,
    maxConnectedSegments: 4,
    policyBasis: '依据：《地下管线数据获取规程》（GB/T 35644-2017）第6.3条',
  },
  grossErrorRate: {
    description: '管线点粗差率阈值，超过则不合格',
    thresholdRate: 0.05,
    policyBasis: '依据：《广东省地下管线数据检查导则》第7.3.11条',
  },
  fieldIntegrity: {
    description: '管线点与管段必填字段清单',
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

const defaultAttributeConfig: PipelineAttributeConfig = {
  version: '1.0.0',
  lastUpdated: '2026-10-01',
  diameterRange: {
    description: '管径值域，单位毫米',
    minMm: 0,
    maxMm: 3000,
    policyBasis: '依据：《信息技术 地下管线数据交换技术要求》（GB/T 29806-2013）第6.3.4条',
  },
  materialEnum: {
    description: '管材材质枚举',
    allowedValues: [
      '钢管',
      '铸铁管',
      '球墨铸铁管',
      '钢筋混凝土管',
      '混凝土管',
      '陶土管',
      'PVC管',
      'PE管',
      'HDPE管',
      '玻璃钢管',
      '塑料管',
      '其他',
    ],
    policyBasis: '依据：《信息技术 地下管线数据交换技术要求》（GB/T 29806-2013）第6.3.5条',
  },
  buryMethodEnum: {
    description: '埋设方式枚举',
    allowedValues: ['直埋', '管沟', '顶管', '拖拉管', '盾构', '其他'],
    policyBasis: '依据：《信息技术 地下管线数据交换技术要求》（GB/T 29806-2013）第6.3.6条',
  },
  flowDirectionEnum: {
    description: '排水流向枚举',
    allowedValues: ['顺流', '逆流', '未知'],
    policyBasis: '依据：《城镇排水管渠运行维护及安全技术规程》（CJJ 68-2016）第3.2.4条',
  },
  attributeSpec: {
    description: '属性项规范，字段名称与最大长度约束',
    fieldConstraints: [
      {
        fieldName: 'pointId',
        maxLength: 32,
        policyBasis: '依据：《信息技术 地下管线数据交换技术要求》（GB/T 29806-2013）第6.2.1条',
      },
      {
        fieldName: 'segmentId',
        maxLength: 32,
        policyBasis: '依据：《信息技术 地下管线数据交换技术要求》（GB/T 29806-2013）第6.2.2条',
      },
      {
        fieldName: 'pointType',
        maxLength: 16,
        policyBasis: '依据：《信息技术 地下管线数据交换技术要求》（GB/T 29806-2013）第6.2.3条',
      },
      {
        fieldName: 'material',
        maxLength: 16,
        policyBasis: '依据：《信息技术 地下管线数据交换技术要求》（GB/T 29806-2013）第6.3.5条',
      },
      {
        fieldName: 'buryMethod',
        maxLength: 16,
        policyBasis: '依据：《信息技术 地下管线数据交换技术要求》（GB/T 29806-2013）第6.3.6条',
      },
    ],
    policyBasis: '依据：《信息技术 地下管线数据交换技术要求》（GB/T 29806-2013）第6.2条',
  },
}

const defaultQualityElementConfig: QualityElementConfig = {
  version: '1.0.0',
  lastUpdated: '2026-10-01',
  qualityElements: {
    description: '六类质量元素及权重，等权配置',
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
    description: 'A/B/C/D错误分类扣分阈值，A类最严重',
    classAScoreDeduction: 1.0,
    classBScoreDeduction: 0.6,
    classCScoreDeduction: 0.3,
    classDScoreDeduction: 0.1,
    policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第7.2条',
  },
  qualityGradeThresholds: {
    description: '质量等级划分阈值，合格分下限',
    excellentMinScore: 90,
    goodMinScore: 80,
    qualifiedMinScore: 70,
    policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第8.1条',
  },
}

export class PipelineConfigLoader {
  private readonly configPath: string | undefined

  constructor(configPath?: string) {
    this.configPath = configPath
  }

  load(): ConfigLoadResult {
    const warnings: string[] = []
    let overallStatus: ConfigLoadStatus = 'CONFIG_LOADED'

    const inspectionResult = this.loadSingleConfig<PipelineInspectionConfig>(
      ENV_VARS.inspection,
      this.resolvePath(CONFIG_PATHS.inspection),
      SHARED_CONFIG_PATHS.inspection,
      defaultInspectionConfig,
      warnings,
    )
    if (inspectionResult.status !== 'CONFIG_LOADED' && overallStatus === 'CONFIG_LOADED') {
      overallStatus = inspectionResult.status
    }

    const attributeResult = this.loadSingleConfig<PipelineAttributeConfig>(
      ENV_VARS.attribute,
      this.resolvePath(CONFIG_PATHS.attribute),
      SHARED_CONFIG_PATHS.attribute,
      defaultAttributeConfig,
      warnings,
    )
    if (attributeResult.status !== 'CONFIG_LOADED' && overallStatus === 'CONFIG_LOADED') {
      overallStatus = attributeResult.status
    }

    const qualityElementResult = this.loadSingleConfig<QualityElementConfig>(
      ENV_VARS.qualityElement,
      this.resolvePath(CONFIG_PATHS.qualityElement),
      SHARED_CONFIG_PATHS.qualityElement,
      defaultQualityElementConfig,
      warnings,
    )
    if (qualityElementResult.status !== 'CONFIG_LOADED' && overallStatus === 'CONFIG_LOADED') {
      overallStatus = qualityElementResult.status
    }

    return {
      inspectionConfig: inspectionResult.config,
      attributeConfig: attributeResult.config,
      qualityElementConfig: qualityElementResult.config,
      loadStatus: overallStatus,
      warnings,
    }
  }

  private resolvePath(defaultPath: string): string {
    if (this.configPath) {
      const base = this.configPath.replace(/[/\\]+$/, '')
      const fileName = defaultPath.split('/').pop() ?? defaultPath
      return `${base}/${fileName}`
    }
    return defaultPath
  }

  private loadSingleConfig<T>(
    envVar: string,
    localPath: string,
    sharedPackagePath: string,
    defaultConfig: T,
    warnings: string[],
  ): { config: T; status: ConfigLoadStatus } {
    try {
      const raw = loadJsonConfig(envVar, localPath, sharedPackagePath)
      return this.validateConfig<T>(raw, defaultConfig, warnings)
    } catch (e) {
      const message = (e as Error).message
      if (message.includes('CONFIG_NOT_FOUND')) {
        warnings.push(`配置文件缺失: ${localPath}，使用缺省配置`)
        return { config: defaultConfig, status: 'DEFAULT_MISSING' }
      }
      warnings.push(`配置文件解析失败: ${localPath}，使用缺省配置。错误: ${message}`)
      return { config: defaultConfig, status: 'DEFAULT_PARSE' }
    }
  }

  private validateConfig<T>(
    raw: Record<string, unknown>,
    defaultConfig: T,
    warnings: string[],
  ): { config: T; status: ConfigLoadStatus } {
    const version = raw.version
    if (typeof version !== 'string' || !version.startsWith('1.')) {
      warnings.push(`配置版本号不兼容: ${String(version)}，使用缺省配置`)
      return { config: defaultConfig, status: 'DEFAULT_VERSION' }
    }

    const config = raw as unknown as T
    if (!this.checkRequiredFields(config)) {
      warnings.push('配置必填节点缺失，使用缺省配置')
      return { config: defaultConfig, status: 'DEFAULT_PARTIAL' }
    }

    return { config, status: 'CONFIG_LOADED' }
  }

  private checkRequiredFields(config: unknown): boolean {
    if (config === null || typeof config !== 'object') return false
    const obj = config as Record<string, unknown>
    return typeof obj.version === 'string' && typeof obj.lastUpdated === 'string'
  }
}
import { loadJsonConfig } from '@liuhange/dsh-data-asset-shared'
import { CONFIG_PATHS, SHARED_CONFIG_PATHS, ENV_VARS } from './invariant.js'
import type {
  GeoAccuracyConfig,
  GeoTopologyConfig,
  QualityElementConfig,
  ConfigLoadResult,
  ConfigLoadStatus,
} from './types.js'

const defaultGeoAccuracyConfig: GeoAccuracyConfig = {
  version: '1.0.0',
  lastUpdated: '2026-10-01',
  elevationAccuracy: {
    description: '高程中误差阈值，单位米，依据自然资源部DSM检查导则',
    rmseThresholdMeter: 0.5,
    policyBasis: '依据：《数字高程模型质量检查技术规定》（自然资源部DSM检查导则）第4.2条',
  },
  planarAccuracy: {
    description: '平面位置中误差阈值，单位米',
    rmseThresholdMeter: 0.25,
    policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.2条',
  },
  edgeMatching: {
    description: '接边精度容差，单位米',
    toleranceMeter: 0.01,
    policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.2.3条',
  },
  checkPointCount: {
    description: '桩点法检测点数范围，最少20点最多50点',
    minCheckPoints: 20,
    maxCheckPoints: 50,
    policyBasis: '依据：《数字高程模型质量检查技术规定》（自然资源部DSM检查导则）第5.1条',
  },
  gridParameter: {
    description: '格网参数约束，同名格网高程值一致性容差与格网间距',
    sameNameElevationToleranceMeter: 0.05,
    gridSpacingMeter: 1.0,
    policyBasis: '依据：《数字高程模型质量检查技术规定》（自然资源部DSM检查导则）第6.3条',
  },
  highPrecisionReference: {
    description: '高精度资料定点验证配置，不可用时降级为桩点法',
    degradationReason: '高精度参考资料不可用，降级为桩点法检测',
    policyBasis: '依据：《数字高程模型质量检查技术规定》（自然资源部DSM检查导则）第5.2条',
  },
  crossValidation: {
    description: '参考资料交叉验证容差，单位米',
    toleranceMeter: 0.3,
    policyBasis: '依据：《数字高程模型质量检查技术规定》（自然资源部DSM检查导则）第5.3条',
  },
  spatialReference: {
    description: '合法坐标系与高程基准枚举',
    allowedSridList: [
      'CGCS2000',
      'CGCS2000_3_degree_GK_Zone_38',
      'CGCS2000_3_degree_GK_Zone_39',
      'CGCS2000_3_degree_GK_Zone_40',
      'WGS84',
      'EPSG:4490',
      'EPSG:4326',
    ],
    allowedVerticalDatumList: ['1985国家高程基准', '1956黄海高程系', '地方独立高程基准'],
    policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.1条',
  },
}

const defaultGeoTopologyConfig: GeoTopologyConfig = {
  version: '1.0.0',
  lastUpdated: '2026-10-01',
  pseudoNode: {
    description: '伪节点容差，单位米，两线段端点距离小于容差视为伪节点',
    toleranceMeter: 0.001,
    policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.3.2条',
  },
  danglingNode: {
    description: '悬挂点容差，单位米，线段端点无匹配点且距离大于容差视为悬挂点',
    toleranceMeter: 0.001,
    policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.3.3条',
  },
  polygonOverlap: {
    description: '面重叠容差，单位平方米，面要素重叠面积大于容差视为重叠错误',
    toleranceSquareMeter: 0.0001,
    policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.3.4条',
  },
  polygonGap: {
    description: '面缝隙容差，单位平方米，相邻面要素缝隙面积大于容差视为缝隙错误',
    toleranceSquareMeter: 0.0001,
    policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.3.5条',
  },
  duplicateCollection: {
    description: '重复采集阈值，同一地物重复采集次数超过阈值视为重复采集错误',
    maxDuplicateCount: 1,
    policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.3.6条',
  },
  topologyTimeout: {
    description: '面要素拓扑计算超时阈值，单位毫秒，超时标记未完成建议分批处理',
    timeoutMs: 5000,
    policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.3条',
  },
}

const defaultQualityElementConfig: QualityElementConfig = {
  version: '1.0.0',
  lastUpdated: '2026-10-01',
  qualityElements: {
    description: '四类质量元素及权重：数学精度0.25、地理精度0.38、整饰质量0.25、附件质量0.12',
    elements: [
      { elementName: '数学精度', weight: 0.25, policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.2条' },
      { elementName: '地理精度', weight: 0.38, policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.3条' },
      { elementName: '整饰质量', weight: 0.25, policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.4条' },
      { elementName: '附件质量', weight: 0.12, policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.5条' },
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

export class GeoConfigLoader {
  private readonly configPath: string | undefined

  constructor(configPath?: string) {
    this.configPath = configPath
  }

  load(): ConfigLoadResult {
    const warnings: string[] = []
    let overallStatus: ConfigLoadStatus = 'CONFIG_LOADED'

    const geoAccuracyResult = this.loadSingleConfig<GeoAccuracyConfig>(
      ENV_VARS.geoAccuracy,
      this.resolvePath(CONFIG_PATHS.geoAccuracy),
      SHARED_CONFIG_PATHS.geoAccuracy,
      defaultGeoAccuracyConfig,
      warnings,
    )
    if (geoAccuracyResult.status !== 'CONFIG_LOADED' && overallStatus === 'CONFIG_LOADED') {
      overallStatus = geoAccuracyResult.status
    }

    const geoTopologyResult = this.loadSingleConfig<GeoTopologyConfig>(
      ENV_VARS.geoTopology,
      this.resolvePath(CONFIG_PATHS.geoTopology),
      SHARED_CONFIG_PATHS.geoTopology,
      defaultGeoTopologyConfig,
      warnings,
    )
    if (geoTopologyResult.status !== 'CONFIG_LOADED' && overallStatus === 'CONFIG_LOADED') {
      overallStatus = geoTopologyResult.status
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
      geoAccuracyConfig: geoAccuracyResult.config,
      geoTopologyConfig: geoTopologyResult.config,
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
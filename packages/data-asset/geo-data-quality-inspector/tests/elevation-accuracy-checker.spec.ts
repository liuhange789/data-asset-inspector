import { describe, it, expect } from 'vitest'
import { ElevationAccuracyChecker } from '../src/elevation-accuracy-checker.js'
import type { GeoDataset, GeoAccuracyConfig, CheckPoint } from '../src/types.js'

describe('ElevationAccuracyChecker', () => {
  const checker = new ElevationAccuracyChecker()

  const config: GeoAccuracyConfig = {
    version: '1.0.0',
    lastUpdated: '2026-10-01',
    elevationAccuracy: { description: '', rmseThresholdMeter: 0.5, policyBasis: '依据：DSM导则第4.2条' },
    planarAccuracy: { description: '', rmseThresholdMeter: 0.25, policyBasis: 'p' },
    edgeMatching: { description: '', toleranceMeter: 0.01, policyBasis: 'p' },
    checkPointCount: { description: '', minCheckPoints: 20, maxCheckPoints: 50, policyBasis: '依据：DSM导则第5.1条' },
    gridParameter: { description: '', sameNameElevationToleranceMeter: 0.05, gridSpacingMeter: 1.0, policyBasis: 'p' },
    highPrecisionReference: { description: '', degradationReason: '高精度参考资料不可用，降级为桩点法检测', policyBasis: '依据：DSM导则第5.2条' },
    crossValidation: { description: '', toleranceMeter: 0.3, policyBasis: '依据：DSM导则第5.3条' },
    spatialReference: {
      description: '',
      allowedSridList: ['CGCS2000'],
      allowedVerticalDatumList: ['1985国家高程基准'],
      policyBasis: 'p',
    },
  }

  const createCheckPoints = (count: number, error: number): CheckPoint[] => {
    const points: CheckPoint[] = []
    for (let i = 0; i < count; i++) {
      points.push({
        pointId: `CP-${String(i).padStart(3, '0')}`,
        measuredElevation: 100 + error,
        referenceElevation: 100,
      })
    }
    return points
  }

  it('桩点法 - 检测点数充足时计算中误差', () => {
    const checkPoints = createCheckPoints(25, 0.1)
    const dataset: GeoDataset = {
      format: 'GeoJSON',
      features: [],
      checkPoints,
    }
    const result = checker.check(dataset, config)
    expect(result.method).toBe('桩点法')
    expect(result.rmse).not.toBeNull()
    expect(result.checkPointCount).toBe(25)
    expect(result.passed).toBe(true)
  })

  it('桩点法 - 检测点数不足20标记数据不足不计算', () => {
    const checkPoints = createCheckPoints(15, 0.1)
    const dataset: GeoDataset = {
      format: 'GeoJSON',
      features: [],
      checkPoints,
    }
    const result = checker.check(dataset, config)
    expect(result.rmse).toBeNull()
    expect(result.passed).toBeNull()
    expect(result.degradationReason).toContain('数据不足')
    expect(result.checkResults.length).toBe(1)
    expect(result.checkResults[0]?.errorClass).toBe('B')
  })

  it('桩点法 - 中误差超阈值标记不合格', () => {
    const checkPoints = createCheckPoints(25, 1.0)
    const dataset: GeoDataset = {
      format: 'GeoJSON',
      features: [],
      checkPoints,
    }
    const result = checker.check(dataset, config)
    expect(result.rmse).not.toBeNull()
    expect(result.rmse!).toBeGreaterThan(0.5)
    expect(result.passed).toBe(false)
    expect(result.checkResults.some((r) => r.errorClass === 'B')).toBe(true)
  })

  it('高精度资料定点验证 - 有高精度参考资料时使用', () => {
    const crossValidationPoints = createCheckPoints(25, 0.05)
    const dataset: GeoDataset = {
      format: 'GeoJSON',
      features: [],
      checkPoints: createCheckPoints(25, 0.1),
      crossValidationPoints,
      highPrecisionReferenceAvailable: true,
    }
    const result = checker.check(dataset, config)
    expect(result.method).toBe('高精度资料定点验证')
    expect(result.rmse).not.toBeNull()
    expect(result.checkPointCount).toBe(25)
  })

  it('高精度资料不可用时降级为桩点法并标注降级原因', () => {
    const checkPoints = createCheckPoints(25, 0.1)
    const dataset: GeoDataset = {
      format: 'GeoJSON',
      features: [],
      checkPoints,
      highPrecisionReferenceAvailable: false,
    }
    const result = checker.check(dataset, config)
    expect(result.method).toBe('桩点法')
    expect(result.degradationReason).toBe('高精度参考资料不可用，降级为桩点法检测')
  })

  it('参考资料交叉验证 - 无高精度资料但有交叉验证点时使用', () => {
    const crossValidationPoints = createCheckPoints(25, 0.1)
    const dataset: GeoDataset = {
      format: 'GeoJSON',
      features: [],
      checkPoints: createCheckPoints(25, 0.2),
      crossValidationPoints,
    }
    const result = checker.check(dataset, config)
    expect(result.method).toBe('参考资料交叉验证')
    expect(result.rmse).not.toBeNull()
  })

  it('检测点数超过最大值50标记D类警告', () => {
    const checkPoints = createCheckPoints(55, 0.1)
    const dataset: GeoDataset = {
      format: 'GeoJSON',
      features: [],
      checkPoints,
    }
    const result = checker.check(dataset, config)
    expect(result.checkResults.some((r) => r.errorClass === 'D')).toBe(true)
    expect(result.checkPointCount).toBe(55)
  })
})
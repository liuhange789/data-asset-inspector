import { describe, it, expect } from 'vitest'
import { FormatConsistencyChecker } from '../src/format-consistency-checker.js'
import type { GeoDataset, GeoAccuracyConfig } from '../src/types.js'

describe('FormatConsistencyChecker', () => {
  const checker = new FormatConsistencyChecker()

  const config: GeoAccuracyConfig = {
    version: '1.0.0',
    lastUpdated: '2026-10-01',
    elevationAccuracy: { description: '', rmseThresholdMeter: 0.5, policyBasis: 'p' },
    planarAccuracy: { description: '', rmseThresholdMeter: 0.25, policyBasis: 'p' },
    edgeMatching: { description: '', toleranceMeter: 0.01, policyBasis: 'p' },
    checkPointCount: { description: '', minCheckPoints: 20, maxCheckPoints: 50, policyBasis: 'p' },
    gridParameter: { description: '', sameNameElevationToleranceMeter: 0.05, gridSpacingMeter: 1.0, policyBasis: 'p' },
    highPrecisionReference: { description: '', degradationReason: '降级', policyBasis: 'p' },
    crossValidation: { description: '', toleranceMeter: 0.3, policyBasis: 'p' },
    spatialReference: {
      description: '',
      allowedSridList: ['CGCS2000'],
      allowedVerticalDatumList: ['1985国家高程基准'],
      policyBasis: 'p',
    },
  }

  it('Shapefile 完整文件通过检查', () => {
    const dataset: GeoDataset = {
      format: 'Shapefile',
      features: [],
      shapefileManifest: {
        basePath: '/data/test.shp',
        existingExtensions: ['.shp', '.shx', '.dbf'],
        missingExtensions: [],
      },
    }
    const result = checker.check(dataset, config)
    expect(result.shapefileComplete).toBe(true)
    expect(result.missingExtensions.length).toBe(0)
    expect(result.blocked).toBe(false)
    expect(result.checkResults.length).toBe(0)
  })

  it('Shapefile 缺少 .dbf 文件标记A类错误并阻断', () => {
    const dataset: GeoDataset = {
      format: 'Shapefile',
      features: [],
      shapefileManifest: {
        basePath: '/data/test.shp',
        existingExtensions: ['.shp', '.shx'],
        missingExtensions: ['.dbf'],
      },
    }
    const result = checker.check(dataset, config)
    expect(result.shapefileComplete).toBe(false)
    expect(result.missingExtensions).toContain('.dbf')
    expect(result.blocked).toBe(true)
    expect(result.checkResults.length).toBe(1)
    expect(result.checkResults[0]?.errorClass).toBe('A')
    expect(result.checkResults[0]?.checkName).toBe('Shapefile完整性检查')
  })

  it('Shapefile 缺少清单信息标记A类错误并阻断', () => {
    const dataset: GeoDataset = {
      format: 'Shapefile',
      features: [],
    }
    const result = checker.check(dataset, config)
    expect(result.shapefileComplete).toBe(false)
    expect(result.blocked).toBe(true)
    expect(result.checkResults.length).toBe(1)
    expect(result.checkResults[0]?.errorClass).toBe('A')
  })

  it('GeoJSON 合法要素通过检查', () => {
    const dataset: GeoDataset = {
      format: 'GeoJSON',
      features: [
        {
          featureId: 'F-001',
          geometry: { type: 'Point', coordinates: [116.0, 40.0] },
          properties: {},
        },
      ],
    }
    const result = checker.check(dataset, config)
    expect(result.geoJsonValid).toBe(true)
    expect(result.blocked).toBe(false)
    expect(result.checkResults.length).toBe(0)
  })

  it('GeoJSON 非法几何类型标记A类错误', () => {
    const dataset: GeoDataset = {
      format: 'GeoJSON',
      features: [
        {
          featureId: 'F-002',
          geometry: { type: 'InvalidType' as never, coordinates: [116.0, 40.0] },
          properties: {},
        },
      ],
    }
    const result = checker.check(dataset, config)
    expect(result.geoJsonValid).toBe(false)
    expect(result.checkResults.length).toBe(1)
    expect(result.checkResults[0]?.errorClass).toBe('A')
    expect(result.checkResults[0]?.checkName).toBe('RFC 7946合规检查')
  })
})
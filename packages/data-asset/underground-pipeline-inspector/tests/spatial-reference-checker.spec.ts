import { describe, it, expect } from 'vitest'
import { SpatialReferenceChecker } from '../src/spatial-reference-checker.js'
import { createInspectionConfig } from './test-config-helper.js'
import type { PipelineDataset } from '../src/types.js'

describe('SpatialReferenceChecker', () => {
  const checker = new SpatialReferenceChecker()
  const config = createInspectionConfig()

  it('合法坐标系和高程基准时无错误', () => {
    const dataset: PipelineDataset = {
      points: [
        {
          pointId: 'P-001',
          pointType: '起点',
          x: 100,
          y: 200,
          elevation: 10,
          srid: 'CGCS2000_3_degree_GK_Zone_39',
          verticalDatum: '1985国家高程基准',
        },
      ],
      segments: [],
      structures: [],
    }
    const { spatialReferenceResult, checkResults } = checker.check(dataset, config)
    expect(spatialReferenceResult.invalidSrid.length).toBe(0)
    expect(spatialReferenceResult.invalidVerticalDatum.length).toBe(0)
    expect(checkResults.length).toBe(0)
  })

  it('非法坐标系报告A类错误', () => {
    const dataset: PipelineDataset = {
      points: [
        {
          pointId: 'P-001',
          pointType: '起点',
          x: 100,
          y: 200,
          elevation: 10,
          srid: 'WGS84_UTM_Zone_50',
          verticalDatum: '1985国家高程基准',
        },
      ],
      segments: [],
      structures: [],
    }
    const { spatialReferenceResult, checkResults } = checker.check(dataset, config)
    expect(spatialReferenceResult.invalidSrid.length).toBe(1)
    expect(spatialReferenceResult.invalidSrid[0]!.pointId).toBe('P-001')
    const sridErrors = checkResults.filter((r) => r.checkName === '坐标系检查')
    expect(sridErrors.length).toBe(1)
    expect(sridErrors[0]!.errorClass).toBe('A')
    expect(sridErrors[0]!.policyBasis).toContain('GB/T 35644-2017')
  })

  it('非法高程基准报告A类错误', () => {
    const dataset: PipelineDataset = {
      points: [
        {
          pointId: 'P-001',
          pointType: '起点',
          x: 100,
          y: 200,
          elevation: 10,
          srid: 'CGCS2000',
          verticalDatum: '吴淞高程基准',
        },
      ],
      segments: [],
      structures: [],
    }
    const { spatialReferenceResult, checkResults } = checker.check(dataset, config)
    expect(spatialReferenceResult.invalidVerticalDatum.length).toBe(1)
    const datumErrors = checkResults.filter((r) => r.checkName === '高程基准检查')
    expect(datumErrors.length).toBe(1)
    expect(datumErrors[0]!.errorClass).toBe('A')
    expect(datumErrors[0]!.policyBasis).toContain('GB/T 35644-2017')
  })

  it('未设置坐标系和高程基准时不报错', () => {
    const dataset: PipelineDataset = {
      points: [
        { pointId: 'P-001', pointType: '起点', x: 100, y: 200, elevation: 10 },
      ],
      segments: [],
      structures: [],
    }
    const { checkResults } = checker.check(dataset, config)
    expect(checkResults.length).toBe(0)
  })

  it('多个点同时存在坐标系和高程基准错误', () => {
    const dataset: PipelineDataset = {
      points: [
        { pointId: 'P-001', pointType: '起点', x: 100, y: 200, elevation: 10, srid: 'INVALID_SRID', verticalDatum: 'INVALID_DATUM' },
        { pointId: 'P-002', pointType: '终点', x: 110, y: 210, elevation: 9, srid: 'INVALID_SRID_2', verticalDatum: 'INVALID_DATUM_2' },
      ],
      segments: [],
      structures: [],
    }
    const { checkResults } = checker.check(dataset, config)
    expect(checkResults.length).toBe(4)
    const sridErrors = checkResults.filter((r) => r.checkName === '坐标系检查')
    const datumErrors = checkResults.filter((r) => r.checkName === '高程基准检查')
    expect(sridErrors.length).toBe(2)
    expect(datumErrors.length).toBe(2)
    for (const result of checkResults) {
      expect(result.errorClass).toBe('A')
      expect(result.policyBasis).toContain('依据：')
    }
  })
})
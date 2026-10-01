import { describe, it, expect } from 'vitest'
import { TopologyChecker } from '../src/topology-checker.js'
import { createInspectionConfig } from './test-config-helper.js'
import type { PipelineDataset } from '../src/types.js'

describe('TopologyChecker', () => {
  const checker = new TopologyChecker()
  const config = createInspectionConfig()

  it('无重复管段时无错误', () => {
    const dataset: PipelineDataset = {
      points: [
        { pointId: 'P-001', pointType: '起点', x: 100, y: 200, elevation: 10 },
        { pointId: 'P-002', pointType: '终点', x: 110, y: 210, elevation: 9 },
      ],
      segments: [
        { segmentId: 'S-001', startPointId: 'P-001', endPointId: 'P-002', diameter: 300, material: '钢管', buryMethod: '直埋' },
      ],
      structures: [],
    }
    const { topologyResult, checkResults } = checker.check(dataset, config)
    expect(topologyResult.duplicateSegments.length).toBe(0)
    expect(topologyResult.duplicatePoints.length).toBe(0)
    expect(topologyResult.isolatedPoints.length).toBe(0)
    expect(checkResults.length).toBe(0)
  })

  it('重复管段报告A类错误', () => {
    const dataset: PipelineDataset = {
      points: [
        { pointId: 'P-001', pointType: '起点', x: 100, y: 200, elevation: 10 },
        { pointId: 'P-002', pointType: '终点', x: 110, y: 210, elevation: 9 },
      ],
      segments: [
        { segmentId: 'S-001', startPointId: 'P-001', endPointId: 'P-002', diameter: 300, material: '钢管', buryMethod: '直埋' },
        { segmentId: 'S-001', startPointId: 'P-001', endPointId: 'P-002', diameter: 300, material: '钢管', buryMethod: '直埋' },
      ],
      structures: [],
    }
    const { topologyResult, checkResults } = checker.check(dataset, config)
    expect(topologyResult.duplicateSegments.length).toBe(1)
    const dupErrors = checkResults.filter((r) => r.checkName === '重复管段检查')
    expect(dupErrors.length).toBe(1)
    expect(dupErrors[0]!.errorClass).toBe('A')
    expect(dupErrors[0]!.policyBasis).toContain('GB/T 35644-2017')
  })

  it('重复管点报告A类错误', () => {
    const dataset: PipelineDataset = {
      points: [
        { pointId: 'P-001', pointType: '起点', x: 100, y: 200, elevation: 10 },
        { pointId: 'P-001', pointType: '起点', x: 100, y: 200, elevation: 10 },
        { pointId: 'P-002', pointType: '终点', x: 110, y: 210, elevation: 9 },
      ],
      segments: [
        { segmentId: 'S-001', startPointId: 'P-001', endPointId: 'P-002', diameter: 300, material: '钢管', buryMethod: '直埋' },
      ],
      structures: [],
    }
    const { topologyResult, checkResults } = checker.check(dataset, config)
    expect(topologyResult.duplicatePoints.length).toBe(1)
    const dupErrors = checkResults.filter((r) => r.checkName === '重复管点检查')
    expect(dupErrors.length).toBe(1)
    expect(dupErrors[0]!.errorClass).toBe('A')
  })

  it('孤立点报告C类错误', () => {
    const dataset: PipelineDataset = {
      points: [
        { pointId: 'P-001', pointType: '起点', x: 100, y: 200, elevation: 10 },
        { pointId: 'P-002', pointType: '终点', x: 110, y: 210, elevation: 9 },
        { pointId: 'P-003', pointType: '孤立', x: 120, y: 220, elevation: 8 },
      ],
      segments: [
        { segmentId: 'S-001', startPointId: 'P-001', endPointId: 'P-002', diameter: 300, material: '钢管', buryMethod: '直埋' },
      ],
      structures: [],
    }
    const { topologyResult, checkResults } = checker.check(dataset, config)
    expect(topologyResult.isolatedPoints.length).toBe(1)
    expect(topologyResult.isolatedPoints[0]!.pointId).toBe('P-003')
    const isolatedErrors = checkResults.filter((r) => r.checkName === '孤立点检查')
    expect(isolatedErrors.length).toBe(1)
    expect(isolatedErrors[0]!.errorClass).toBe('C')
    expect(isolatedErrors[0]!.policyBasis).toContain('GB/T 35644-2017')
  })

  it('构筑物重复报告B类错误', () => {
    const dataset: PipelineDataset = {
      points: [
        { pointId: 'P-001', pointType: '起点', x: 100, y: 200, elevation: 10 },
        { pointId: 'P-002', pointType: '终点', x: 110, y: 210, elevation: 9 },
      ],
      segments: [
        { segmentId: 'S-001', startPointId: 'P-001', endPointId: 'P-002', diameter: 300, material: '钢管', buryMethod: '直埋' },
      ],
      structures: [
        { structureId: 'ST-001', structureType: '阀门井' },
        { structureId: 'ST-001', structureType: '阀门井' },
      ],
    }
    const { topologyResult, checkResults } = checker.check(dataset, config)
    expect(topologyResult.duplicateStructures.length).toBe(1)
    const dupErrors = checkResults.filter((r) => r.checkName === '构筑物重复检查')
    expect(dupErrors.length).toBe(1)
    expect(dupErrors[0]!.errorClass).toBe('B')
  })

  it('连通数超出范围报告C类错误', () => {
    const dataset: PipelineDataset = {
      points: [
        { pointId: 'P-001', pointType: '多通', x: 100, y: 200, elevation: 10 },
        { pointId: 'P-002', pointType: '终点', x: 110, y: 210, elevation: 9 },
        { pointId: 'P-003', pointType: '终点', x: 120, y: 220, elevation: 8 },
        { pointId: 'P-004', pointType: '终点', x: 130, y: 230, elevation: 7 },
        { pointId: 'P-005', pointType: '终点', x: 140, y: 240, elevation: 6 },
        { pointId: 'P-006', pointType: '终点', x: 150, y: 250, elevation: 5 },
      ],
      segments: [
        { segmentId: 'S-001', startPointId: 'P-001', endPointId: 'P-002', diameter: 300, material: '钢管', buryMethod: '直埋' },
        { segmentId: 'S-002', startPointId: 'P-001', endPointId: 'P-003', diameter: 300, material: '钢管', buryMethod: '直埋' },
        { segmentId: 'S-003', startPointId: 'P-001', endPointId: 'P-004', diameter: 300, material: '钢管', buryMethod: '直埋' },
        { segmentId: 'S-004', startPointId: 'P-001', endPointId: 'P-005', diameter: 300, material: '钢管', buryMethod: '直埋' },
        { segmentId: 'S-005', startPointId: 'P-001', endPointId: 'P-006', diameter: 300, material: '钢管', buryMethod: '直埋' },
      ],
      structures: [],
    }
    const { topologyResult, checkResults } = checker.check(dataset, config)
    expect(topologyResult.connectivityViolations.length).toBe(1)
    expect(topologyResult.connectivityViolations[0]!.pointId).toBe('P-001')
    const connErrors = checkResults.filter((r) => r.checkName === '连通数检查')
    expect(connErrors.length).toBe(1)
    expect(connErrors[0]!.errorClass).toBe('C')
  })

  it('所有检测结果含policyBasis字段', () => {
    const dataset: PipelineDataset = {
      points: [
        { pointId: 'P-001', pointType: '起点', x: 100, y: 200, elevation: 10 },
        { pointId: 'P-001', pointType: '起点', x: 100, y: 200, elevation: 10 },
      ],
      segments: [],
      structures: [],
    }
    const { checkResults } = checker.check(dataset, config)
    for (const result of checkResults) {
      expect(result.policyBasis).toBeTruthy()
      expect(result.policyBasis).toContain('依据：')
    }
  })
})
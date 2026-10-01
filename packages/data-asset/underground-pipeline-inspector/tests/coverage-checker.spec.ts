import { describe, it, expect } from 'vitest'
import { CoverageChecker } from '../src/coverage-checker.js'
import { createInspectionConfig } from './test-config-helper.js'
import type { PipelineDataset } from '../src/types.js'

describe('CoverageChecker', () => {
  const checker = new CoverageChecker()
  const config = createInspectionConfig()

  it('工作区包含所有必需图层时无错误', () => {
    const dataset: PipelineDataset = {
      points: [],
      segments: [],
      structures: [],
      workspaceLayers: ['pipeline_point', 'pipeline_segment', 'pipeline_structure'],
    }
    const { coverageResult, checkResults } = checker.check(dataset, config)
    expect(coverageResult.missingLayers.length).toBe(0)
    expect(checkResults.length).toBe(0)
  })

  it('工作区缺少必需图层时报告B类错误', () => {
    const dataset: PipelineDataset = {
      points: [],
      segments: [],
      structures: [],
      workspaceLayers: ['pipeline_point'],
    }
    const { coverageResult, checkResults } = checker.check(dataset, config)
    expect(coverageResult.missingLayers).toContain('pipeline_segment')
    expect(coverageResult.missingLayers).toContain('pipeline_structure')
    expect(checkResults.length).toBe(2)
    for (const result of checkResults) {
      expect(result.errorClass).toBe('B')
      expect(result.policyBasis).toContain('GB/T 35644-2017')
    }
  })

  it('管线点字段完整时无错误', () => {
    const dataset: PipelineDataset = {
      points: [
        { pointId: 'P-001', pointType: '三通', x: 100.0, y: 200.0, elevation: 10.0 },
      ],
      segments: [],
      structures: [],
      workspaceLayers: ['pipeline_point', 'pipeline_segment', 'pipeline_structure'],
    }
    const { checkResults } = checker.check(dataset, config)
    const pointErrors = checkResults.filter((r) => r.checkName === '管线点字段完整性检查')
    expect(pointErrors.length).toBe(0)
  })

  it('管线点字段缺失时报告B类错误', () => {
    const dataset: PipelineDataset = {
      points: [
        { pointId: 'P-001', pointType: '三通', x: 100.0, y: 200.0, elevation: 10.0 },
        { pointId: 'P-002', pointType: '', x: 100.0, y: 200.0, elevation: 10.0 },
      ],
      segments: [],
      structures: [],
      workspaceLayers: ['pipeline_point', 'pipeline_segment', 'pipeline_structure'],
    }
    const { checkResults } = checker.check(dataset, config)
    const pointErrors = checkResults.filter((r) => r.checkName === '管线点字段完整性检查')
    expect(pointErrors.length).toBe(1)
    expect(pointErrors[0]!.errorClass).toBe('B')
    expect(pointErrors[0]!.objectId).toBe('P-002')
    expect(pointErrors[0]!.policyBasis).toContain('GB/T 29806-2013')
  })

  it('管段字段完整时无错误', () => {
    const dataset: PipelineDataset = {
      points: [],
      segments: [
        {
          segmentId: 'S-001',
          startPointId: 'P-001',
          endPointId: 'P-002',
          diameter: 300,
          material: '钢管',
          buryMethod: '直埋',
        },
      ],
      structures: [],
      workspaceLayers: ['pipeline_point', 'pipeline_segment', 'pipeline_structure'],
    }
    const { checkResults } = checker.check(dataset, config)
    const segmentErrors = checkResults.filter((r) => r.checkName === '管段字段完整性检查')
    expect(segmentErrors.length).toBe(0)
  })

  it('管段字段缺失时报告B类错误', () => {
    const dataset: PipelineDataset = {
      points: [],
      segments: [
        {
          segmentId: 'S-001',
          startPointId: 'P-001',
          endPointId: 'P-002',
          diameter: 300,
          material: '',
          buryMethod: '直埋',
        },
      ],
      structures: [],
      workspaceLayers: ['pipeline_point', 'pipeline_segment', 'pipeline_structure'],
    }
    const { checkResults } = checker.check(dataset, config)
    const segmentErrors = checkResults.filter((r) => r.checkName === '管段字段完整性检查')
    expect(segmentErrors.length).toBe(1)
    expect(segmentErrors[0]!.errorClass).toBe('B')
    expect(segmentErrors[0]!.objectId).toBe('S-001')
  })

  it('所有检测结果含policyBasis字段', () => {
    const dataset: PipelineDataset = {
      points: [],
      segments: [],
      structures: [],
      workspaceLayers: [],
    }
    const { checkResults } = checker.check(dataset, config)
    for (const result of checkResults) {
      expect(result.policyBasis).toBeTruthy()
      expect(result.policyBasis).toContain('依据：')
    }
  })
})
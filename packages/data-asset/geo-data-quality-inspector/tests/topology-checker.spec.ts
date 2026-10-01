import { describe, it, expect } from 'vitest'
import { TopologyChecker } from '../src/topology-checker.js'
import type { GeoDataset, GeoTopologyConfig, GeoFeature } from '../src/types.js'

describe('TopologyChecker', () => {
  const checker = new TopologyChecker()

  const config: GeoTopologyConfig = {
    version: '1.0.0',
    lastUpdated: '2026-10-01',
    pseudoNode: { description: '', toleranceMeter: 0.001, policyBasis: 'p' },
    danglingNode: { description: '', toleranceMeter: 0.001, policyBasis: 'p' },
    polygonOverlap: { description: '', toleranceSquareMeter: 0.0001, policyBasis: 'p' },
    polygonGap: { description: '', toleranceSquareMeter: 0.0001, policyBasis: 'p' },
    duplicateCollection: { description: '', maxDuplicateCount: 1, policyBasis: 'p' },
    topologyTimeout: { description: '', timeoutMs: 5000, policyBasis: 'p' },
  }

  const createLineFeature = (featureId: string, coords: number[][]): GeoFeature => ({
    featureId,
    geometry: { type: 'LineString', coordinates: coords },
    properties: {},
  })

  const createPolygonFeature = (featureId: string, ring: number[][]): GeoFeature => ({
    featureId,
    geometry: { type: 'Polygon', coordinates: [ring] },
    properties: {},
  })

  it('伪节点检查 - 线段端点距离小于容差标记D类错误', () => {
    const features: GeoFeature[] = [
      createLineFeature('L-001', [[0, 0], [10, 0], [10, 10]]),
      createLineFeature('L-002', [[10.00005, 10.00005], [20, 20]]),
    ]
    const dataset: GeoDataset = { format: 'GeoJSON', features }
    const result = checker.check(dataset, config)
    expect(result.pseudoNodes.length).toBeGreaterThan(0)
    expect(result.checkResults.some((r) => r.checkName === '伪节点检查' && r.errorClass === 'D')).toBe(true)
  })

  it('悬挂点检查 - 线段端点无匹配标记C类错误', () => {
    const features: GeoFeature[] = [
      createLineFeature('L-001', [[0, 0], [10, 0]]),
      createLineFeature('L-002', [[100, 100], [200, 200]]),
    ]
    const dataset: GeoDataset = { format: 'GeoJSON', features }
    const result = checker.check(dataset, config)
    expect(result.danglingNodes.length).toBeGreaterThan(0)
    expect(result.checkResults.some((r) => r.checkName === '悬挂点检查' && r.errorClass === 'C')).toBe(true)
  })

  it('面重叠检查 - 重叠面标记B类错误', () => {
    const ring1 = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
    const ring2 = [[5, 5], [15, 5], [15, 15], [5, 15], [5, 5]]
    const features: GeoFeature[] = [
      createPolygonFeature('P-001', ring1),
      createPolygonFeature('P-002', ring2),
    ]
    const dataset: GeoDataset = { format: 'GeoJSON', features }
    const result = checker.check(dataset, config)
    expect(result.polygonOverlaps.length).toBeGreaterThan(0)
    expect(result.checkResults.some((r) => r.checkName === '面重叠检查' && r.errorClass === 'B')).toBe(true)
  })

  it('面缝隙检查 - 相邻面有缝隙标记C类错误', () => {
    const ring1 = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
    const ring2 = [[10.001, 0], [20, 0], [20, 10], [10.001, 10], [10.001, 0]]
    const features: GeoFeature[] = [
      createPolygonFeature('P-003', ring1),
      createPolygonFeature('P-004', ring2),
    ]
    const dataset: GeoDataset = { format: 'GeoJSON', features }
    const result = checker.check(dataset, config)
    expect(result.polygonGaps.length).toBeGreaterThan(0)
    expect(result.checkResults.some((r) => r.checkName === '面缝隙检查' && r.errorClass === 'C')).toBe(true)
  })

  it('重复采集检查 - 相同要素重复标记B类错误', () => {
    const coords: number[][] = [[0, 0], [10, 0], [10, 10]]
    const features: GeoFeature[] = [
      createLineFeature('L-DUP-001', coords),
      createLineFeature('L-DUP-002', coords),
    ]
    const dataset: GeoDataset = { format: 'GeoJSON', features }
    const result = checker.check(dataset, config)
    expect(result.duplicateCollections.length).toBeGreaterThan(0)
    expect(result.checkResults.some((r) => r.checkName === '重复采集检查' && r.errorClass === 'B')).toBe(true)
  })

  it('超时测试 - 超时阈值极小时标记超时未完成', () => {
    const features: GeoFeature[] = [
      createPolygonFeature('P-T-001', [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]),
      createPolygonFeature('P-T-002', [[5, 5], [15, 5], [15, 15], [5, 15], [5, 5]]),
    ]
    const dataset: GeoDataset = { format: 'GeoJSON', features }
    const timeoutConfig: GeoTopologyConfig = {
      ...config,
      topologyTimeout: { description: '', timeoutMs: 0, policyBasis: 'p' },
    }
    const result = checker.check(dataset, timeoutConfig)
    expect(result.timedOut).toBe(true)
    expect(result.checkResults.some((r) => r.checkName === '面要素拓扑检查' && r.errorClass === 'D')).toBe(true)
  })

  it('无拓扑错误时返回空结果', () => {
    const features: GeoFeature[] = [
      createLineFeature('L-OK-001', [[0, 0], [10, 0]]),
      createLineFeature('L-OK-002', [[10, 0], [10, 10]]),
      createLineFeature('L-OK-003', [[10, 10], [0, 0]]),
    ]
    const dataset: GeoDataset = { format: 'GeoJSON', features }
    const result = checker.check(dataset, config)
    expect(result.pseudoNodes.length).toBe(0)
    expect(result.danglingNodes.length).toBe(0)
    expect(result.polygonOverlaps.length).toBe(0)
    expect(result.polygonGaps.length).toBe(0)
    expect(result.duplicateCollections.length).toBe(0)
    expect(result.timedOut).toBe(false)
  })
})
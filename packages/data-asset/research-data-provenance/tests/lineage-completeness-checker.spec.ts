import { describe, it, expect } from 'vitest'
import { LineageCompletenessChecker } from '../src/lineage-completeness-checker.js'
import type { DatasetMetadata, LineageRecord } from '../src/types.js'

const metadata: DatasetMetadata = {
  datasetId: 'ds-001',
  datasetName: '测试数据集',
  creatingOrganization: '测试单位',
  createdAt: '2024-01-01T00:00:00.000Z',
}

describe('LineageCompletenessChecker', () => {
  it('缺少采集方法标记"血缘缺失：采集方法"并附带第九条政策依据', () => {
    const lineage: LineageRecord = {
      lineageId: 'lin-1',
      sourceSystem: '观测系统',
      collectionTime: '2024-01-01T00:00:00.000Z',
      collectionMethod: '',
      steps: [],
    }
    const detail = new LineageCompletenessChecker().check(metadata, lineage)
    expect(detail.result.missingItems).toContain('血缘缺失：采集方法')
    expect(detail.result.policyBasis).toContain('第九条')
    expect(detail.result.policyBasis).toContain('国办发〔2018〕17号')
  })

  it('处理步骤缺少处理人标记"处理链断裂：第N步缺少处理人"', () => {
    const lineage: LineageRecord = {
      lineageId: 'lin-1',
      sourceSystem: '观测系统',
      collectionTime: '2024-01-01T00:00:00.000Z',
      collectionMethod: '人工采集',
      steps: [{ stepOrder: 1, operationType: '清洗', processingTime: '2024-01-02T00:00:00.000Z', operatorId: '' }],
    }
    const detail = new LineageCompletenessChecker().check(metadata, lineage)
    expect(detail.result.missingItems).toContain('处理链断裂：第1步缺少处理人')
  })

  it('步骤从1跳到3标记"链路不连续：第2步缺失"', () => {
    const lineage: LineageRecord = {
      lineageId: 'lin-1',
      sourceSystem: '观测系统',
      collectionTime: '2024-01-01T00:00:00.000Z',
      collectionMethod: '人工采集',
      steps: [
        { stepOrder: 1, operationType: '清洗', processingTime: '2024-01-02T00:00:00.000Z', operatorId: 'op-1' },
        { stepOrder: 3, operationType: '聚合', processingTime: '2024-01-03T00:00:00.000Z', operatorId: 'op-2' },
      ],
    }
    const detail = new LineageCompletenessChecker().check(metadata, lineage)
    expect(detail.result.brokenPoints).toContain('链路不连续：第2步缺失')
  })

  it('血缘记录为空评分0.00并标记"血缘完全缺失"', () => {
    const detail = new LineageCompletenessChecker().check(metadata, null)
    expect(detail.result.completenessScore).toBe(0)
    expect(detail.result.missingItems).toContain('血缘完全缺失')
    expect(detail.lineageEmpty).toBe(true)
  })

  it('血缘记录格式不兼容标记格式不兼容', () => {
    const detail = new LineageCompletenessChecker().check(metadata, { wrong: 'shape' } as unknown as LineageRecord)
    expect(detail.formatCompatible).toBe(false)
    expect(detail.result.missingItems).toContain('血缘记录格式不兼容')
  })

  it('完整血缘评分100.00', () => {
    const lineage: LineageRecord = {
      lineageId: 'lin-1',
      sourceSystem: '观测系统',
      collectionTime: '2024-01-01T00:00:00.000Z',
      collectionMethod: '人工采集',
      steps: [{ stepOrder: 1, operationType: '清洗', processingTime: '2024-01-02T00:00:00.000Z', operatorId: 'op-1' }],
    }
    const detail = new LineageCompletenessChecker().check(metadata, lineage)
    expect(detail.result.completenessScore).toBe(100)
    expect(detail.result.missingItems).toHaveLength(0)
    expect(detail.result.brokenPoints).toHaveLength(0)
  })

  it('应记录6项完整4项评分66.67', () => {
    const lineage: LineageRecord = {
      lineageId: 'lin-1',
      sourceSystem: '观测系统',
      collectionTime: '2024-01-01T00:00:00.000Z',
      collectionMethod: '人工采集',
      steps: [{ stepOrder: 1, operationType: '清洗', processingTime: '2024-01-02T00:00:00.000Z', operatorId: '' }],
    }
    const detail = new LineageCompletenessChecker().check(metadata, lineage)
    expect(detail.expectedItemCount).toBe(6)
    expect(detail.actualItemCount).toBe(5)
    expect(detail.result.completenessScore).toBe(83.33)
  })

  it('元数据不存在返回空结果', () => {
    const detail = new LineageCompletenessChecker().check(null, null)
    expect(detail.result.completenessScore).toBe(0)
    expect(detail.lineageEmpty).toBe(true)
  })
})
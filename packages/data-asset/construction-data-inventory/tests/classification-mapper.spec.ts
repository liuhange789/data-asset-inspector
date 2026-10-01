import { describe, expect, it, beforeEach } from 'vitest'
import { ClassificationMapper } from '../src/classification-mapper.js'
import { defaultClassificationConfig } from '../src/default-classification-config.js'
import type { ClassificationConfig, UnifiedAssetItem } from '../src/types.js'

describe('ClassificationMapper', () => {
  let mapper: ClassificationMapper

  beforeEach(() => {
    mapper = new ClassificationMapper()
  })

  it('设计数据映射至建设成果分类', () => {
    const assets: UnifiedAssetItem[] = [
      {
        assetId: 'A-001',
        sourceSystemId: 'sys-1',
        dataType: 'BIM构件-元素',
        projectId: 'proj-1',
        collectionTime: '2024-01-01',
        classificationCode: '',
        assetCode: '',
        judgmentStatus: '自动判定',
      },
    ]
    const result = mapper.map(assets, defaultClassificationConfig)

    expect(result.assets[0]!.classificationCode).toBe('14')
    expect(result.assets[0]!.policyBasis).toContain('GB/T 51269-2017')
  })

  it('施工数据映射至建设进程分类', () => {
    const assets: UnifiedAssetItem[] = [
      {
        assetId: 'A-002',
        sourceSystemId: 'sys-1',
        dataType: '进度记录-行为',
        projectId: 'proj-1',
        collectionTime: '2024-01-01',
        classificationCode: '',
        assetCode: '',
        judgmentStatus: '自动判定',
      },
    ]
    const result = mapper.map(assets, defaultClassificationConfig)

    expect(result.assets[0]!.classificationCode).toBe('21')
  })

  it('材料数据映射至建设资源分类', () => {
    const assets: UnifiedAssetItem[] = [
      {
        assetId: 'A-003',
        sourceSystemId: 'sys-1',
        dataType: '材料清单-材质',
        projectId: 'proj-1',
        collectionTime: '2024-01-01',
        classificationCode: '',
        assetCode: '',
        judgmentStatus: '自动判定',
      },
    ]
    const result = mapper.map(assets, defaultClassificationConfig)

    expect(result.assets[0]!.classificationCode).toBe('40')
  })

  it('属性数据映射至建设属性分类', () => {
    const assets: UnifiedAssetItem[] = [
      {
        assetId: 'A-004',
        sourceSystemId: 'sys-1',
        dataType: '验收属性',
        projectId: 'proj-1',
        collectionTime: '2024-01-01',
        classificationCode: '',
        assetCode: '',
        judgmentStatus: '自动判定',
      },
    ]
    const result = mapper.map(assets, defaultClassificationConfig)

    expect(result.assets[0]!.classificationCode).toBe('41')
  })

  it('无法分类项标记为未分类', () => {
    const assets: UnifiedAssetItem[] = [
      {
        assetId: 'A-005',
        sourceSystemId: 'sys-1',
        dataType: '未知数据类型',
        projectId: 'proj-1',
        collectionTime: '2024-01-01',
        classificationCode: '',
        assetCode: '',
        judgmentStatus: '自动判定',
      },
    ]
    const result = mapper.map(assets, defaultClassificationConfig)

    expect(result.assets[0]!.classificationCode).toBe('')
    expect(result.unclassified).toContain('A-005')
    expect(result.warnings.some((w) => w.includes('无法分类'))).toBe(true)
  })

  it('多规则匹配按优先级选取', () => {
    const customConfig: ClassificationConfig = {
      version: '1.0.0',
      lastUpdated: '2024-01-01',
      nodes: [
        { classificationCode: '10', classificationName: '类A', parentCode: '', level: 1, mappedDataTypes: ['test-data'] },
        { classificationCode: '14', classificationName: '类B', parentCode: '', level: 1, mappedDataTypes: ['test-data'] },
      ],
    }
    const assets: UnifiedAssetItem[] = [
      {
        assetId: 'A-006',
        sourceSystemId: 'sys-1',
        dataType: 'test-data',
        projectId: 'proj-1',
        collectionTime: '2024-01-01',
        classificationCode: '',
        assetCode: '',
        judgmentStatus: '自动判定',
      },
    ]
    const result = mapper.map(assets, customConfig)

    expect(result.assets[0]!.classificationCode).toBe('10')
    expect(result.warnings.some((w) => w.includes('多规则匹配'))).toBe(true)
  })

  it('分类配置缺失时所有项标记为未分类', () => {
    const assets: UnifiedAssetItem[] = [
      {
        assetId: 'A-007',
        sourceSystemId: 'sys-1',
        dataType: 'BIM构件-元素',
        projectId: 'proj-1',
        collectionTime: '2024-01-01',
        classificationCode: '',
        assetCode: '',
        judgmentStatus: '自动判定',
      },
    ]
    const result = mapper.map(assets, null)

    expect(result.assets[0]!.classificationCode).toBe('')
    expect(result.unclassified).toContain('A-007')
    expect(result.warnings.some((w) => w.includes('分类配置未提供'))).toBe(true)
  })

  it('isValidClassificationCode 校验分类代码', () => {
    expect(mapper.isValidClassificationCode('10', defaultClassificationConfig)).toBe(true)
    expect(mapper.isValidClassificationCode('99', defaultClassificationConfig)).toBe(false)
  })
})
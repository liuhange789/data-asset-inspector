import { describe, expect, it, beforeEach } from 'vitest'
import { AssetCodeGenerator } from '../src/asset-code-generator.js'
import { defaultEncodingRuleConfig } from '../src/default-encoding-rule-config.js'
import type { UnifiedAssetItem } from '../src/types.js'

describe('AssetCodeGenerator', () => {
  let generator: AssetCodeGenerator

  beforeEach(() => {
    generator = new AssetCodeGenerator()
  })

  it('生成三段式编码：分类层级码+顺序码+校验位', () => {
    const assets: UnifiedAssetItem[] = [
      {
        assetId: 'A-001',
        sourceSystemId: 'sys-1',
        dataType: 'BIM构件-元素',
        projectId: 'proj-1',
        collectionTime: '2024-01-01',
        classificationCode: '14',
        assetCode: '',
        judgmentStatus: '自动判定',
      },
    ]
    const result = generator.generate(assets, defaultEncodingRuleConfig)

    expect(result.assets[0]!.assetCode).not.toBe('')
    const code = result.assets[0]!.assetCode
    expect(code!.length).toBe(defaultEncodingRuleConfig.classificationCodeLength + defaultEncodingRuleConfig.sequentialCodeLength + 1)
    expect(code!.startsWith('00014')).toBe(true)
  })

  it('未分类项不生成编码', () => {
    const assets: UnifiedAssetItem[] = [
      {
        assetId: 'A-002',
        sourceSystemId: 'sys-1',
        dataType: 'unknown',
        projectId: 'proj-1',
        collectionTime: '2024-01-01',
        classificationCode: '',
        assetCode: '',
        judgmentStatus: '自动判定',
      },
    ]
    const result = generator.generate(assets, defaultEncodingRuleConfig)

    expect(result.assets[0]!.assetCode).toBe('')
  })

  it('多项资产生成唯一编码', () => {
    const assets: UnifiedAssetItem[] = []
    for (let i = 0; i < 100; i++) {
      assets.push({
        assetId: `A-${i}`,
        sourceSystemId: 'sys-1',
        dataType: 'BIM构件-元素',
        projectId: 'proj-1',
        collectionTime: '2024-01-01',
        classificationCode: '14',
        assetCode: '',
        judgmentStatus: '自动判定',
      })
    }
    const result = generator.generate(assets, defaultEncodingRuleConfig)

    const codes = result.assets.map((a) => a.assetCode).filter((c) => c !== '')
    const uniqueCodes = new Set(codes)
    expect(uniqueCodes.size).toBe(codes.length)
    expect(codes.length).toBe(100)
  })

  it('附加政策依据字段', () => {
    const assets: UnifiedAssetItem[] = [
      {
        assetId: 'A-003',
        sourceSystemId: 'sys-1',
        dataType: 'BIM构件-元素',
        projectId: 'proj-1',
        collectionTime: '2024-01-01',
        classificationCode: '14',
        assetCode: '',
        judgmentStatus: '自动判定',
      },
    ]
    const result = generator.generate(assets, defaultEncodingRuleConfig)

    expect(result.assets[0]!.policyBasis).toContain('GB/T 51269-2017')
    expect(result.assets[0]!.policyBasis).toContain('编码规则')
  })

  it('校验位算法缺失时返回错误', () => {
    const assets: UnifiedAssetItem[] = [
      {
        assetId: 'A-004',
        sourceSystemId: 'sys-1',
        dataType: 'BIM构件-元素',
        projectId: 'proj-1',
        collectionTime: '2024-01-01',
        classificationCode: '14',
        assetCode: '',
        judgmentStatus: '自动判定',
      },
    ]
    const badConfig = { ...defaultEncodingRuleConfig, checksumAlgorithm: '' }
    const result = generator.generate(assets, badConfig)

    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0]).toContain('校验位算法配置缺失')
  })

  it('顺序码溢出时标记失败', () => {
    const assets: UnifiedAssetItem[] = []
    for (let i = 0; i < 5; i++) {
      assets.push({
        assetId: `A-${i}`,
        sourceSystemId: 'sys-1',
        dataType: 'BIM构件-元素',
        projectId: 'proj-1',
        collectionTime: '2024-01-01',
        classificationCode: '14',
        assetCode: '',
        judgmentStatus: '自动判定',
      })
    }
    const overflowConfig = { ...defaultEncodingRuleConfig, sequentialCodeStart: 9998, sequentialCodeMax: 9999 }
    const result = generator.generate(assets, overflowConfig)

    expect(result.overflowAssets.length).toBe(3)
    expect(result.errors.some((e) => e.includes('顺序码溢出'))).toBe(true)
  })

  it('regenerateForAsset 保留原编码', () => {
    const asset: UnifiedAssetItem = {
      assetId: 'A-005',
      sourceSystemId: 'sys-1',
      dataType: 'BIM构件-元素',
      projectId: 'proj-1',
      collectionTime: '2024-01-01',
      classificationCode: '14',
      assetCode: 'OLD-CODE',
      judgmentStatus: '自动判定',
    }
    const result = generator.regenerateForAsset(asset, defaultEncodingRuleConfig)

    expect(result.assets[0]!.originalAssetCode).toBe('OLD-CODE')
    expect(result.assets[0]!.assetCode).not.toBe('OLD-CODE')
  })
})
import { describe, it, expect } from 'vitest'
import { AssetTripleConditionScreener } from '../assetTripleConditionScreener.js'
import { OwnershipClueAnnotator } from '../ownershipClueAnnotator.js'

describe('AssetTripleConditionScreener', () => {
  const config = {
    pastTransactionKeywords: ['购买', '合同', '交易'],
    ownershipControlKeywords: ['自有', '控制', '拥有'],
    economicBenefitKeywords: ['收益', '价值', '利润'],
  }
  const screener = new AssetTripleConditionScreener(config)

  it('三条件全满足→初筛通过', () => {
    const result = screener.screen({
      desc: '通过购买合同取得，企业自有控制，预期带来收益',
    })
    expect(result.passed).toBe(true)
    expect(result.missingConditions).toHaveLength(0)
  })

  it('缺少过去交易→不通过', () => {
    const result = screener.screen({
      desc: '企业自有控制，预期带来收益',
    })
    expect(result.passed).toBe(false)
    expect(result.missingConditions).toContain('过去交易或事项形成')
  })
})

describe('OwnershipClueAnnotator', () => {
  const rules = {
    holdingRightFields: ['owner', 'holder'],
    usageRightFields: ['license', 'usage'],
    operationRightFields: ['admin', 'operator'],
  }
  const annotator = new OwnershipClueAnnotator(rules)

  it('正确标注权属线索', () => {
    const result = annotator.annotate({
      owner: '某科技公司',
      license: '授权使用',
      admin: '管理部门',
    })
    expect(result.holdingRight).toBe('某科技公司')
    expect(result.usageRight).toBe('授权使用')
    expect(result.operationRight).toBe('管理部门')
  })

  it('无匹配时返回空线索', () => {
    const result = annotator.annotate({
      unknown: '无',
    })
    expect(result.holdingRight).toBe('')
    expect(result.usageRight).toBe('')
    expect(result.operationRight).toBe('')
  })
})

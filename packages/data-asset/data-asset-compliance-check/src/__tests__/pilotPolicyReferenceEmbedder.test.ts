import { describe, it, expect } from 'vitest'
import { embedPilotPolicyReference } from '../pilotPolicyReferenceEmbedder.js'

describe('PilotPolicyReferenceEmbedder', () => {
  const config = {
    enabled: true,
    policyName: '数据资产全过程管理试点方案',
    policyRef: '财资〔2024〕167号',
    keyPoints: ['台账编制', '登记', '授权运营', '收益分配', '交易流通'],
    embedMessage: '合规审查属于全过程管理试点中台账编制与登记环节的前置要求',
  }

  it('enabled时嵌入试点依据', () => {
    const result = embedPilotPolicyReference(config)
    expect(result.embedded).toBe(true)
    expect(result.policyRef).toBe('财资〔2024〕167号')
    expect(result.keyPoints).toHaveLength(5)
    expect(result.message).toContain('全过程管理试点')
  })

  it('disabled时跳过嵌入', () => {
    const result = embedPilotPolicyReference({ ...config, enabled: false })
    expect(result.embedded).toBe(false)
    expect(result.keyPoints).toHaveLength(0)
  })
})
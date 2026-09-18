import { describe, it, expect } from 'vitest'
import { promptTripleAuditStandard, promptSevenStepFlow } from '../tripleAuditAndSevenStep.js'

describe('TripleAuditStandardPrompter', () => {
  const config = {
    enabled: true,
    standards: ['数据描述准确性', '数据来源合规性', '数据产权明确性'],
    policyRef: '国数综政策〔2026〕35号',
    promptMessage: '登记系统审查重点为：数据描述准确性、数据来源合规性、数据产权明确性',
  }

  it('enabled时嵌入三重审核标准', () => {
    const result = promptTripleAuditStandard(config)
    expect(result.enabled).toBe(true)
    expect(result.standards).toHaveLength(3)
    expect(result.promptMessage).toContain('数据描述准确性')
    expect(result.policyRef).toBe('国数综政策〔2026〕35号')
  })

  it('disabled时返回空标准', () => {
    const result = promptTripleAuditStandard({ ...config, enabled: false })
    expect(result.enabled).toBe(false)
    expect(result.standards).toHaveLength(0)
  })
})

describe('SevenStepFlowPrompter', () => {
  const config = {
    enabled: true,
    steps: [
      { step: 1, name: '申请', durationDays: null },
      { step: 2, name: '受理', durationDays: 3 },
      { step: 3, name: '审查', durationDays: null },
      { step: 4, name: '公示', durationDays: 5 },
      { step: 5, name: '异议处理', durationDays: 10 },
      { step: 6, name: '信息存证', durationDays: null },
      { step: 7, name: '凭证核发', durationDays: null },
    ],
    policyRef: '国数综政策〔2026〕35号',
  }

  it('enabled时输出7步流程', () => {
    const result = promptSevenStepFlow(config)
    expect(result.enabled).toBe(true)
    expect(result.steps).toHaveLength(7)
    expect(result.totalMaxDays).toBe(18)
    expect(result.policyRef).toBe('国数综政策〔2026〕35号')
  })

  it('disabled时返回空流程', () => {
    const result = promptSevenStepFlow({ ...config, enabled: false })
    expect(result.enabled).toBe(false)
    expect(result.steps).toHaveLength(0)
    expect(result.totalMaxDays).toBe(0)
  })
})
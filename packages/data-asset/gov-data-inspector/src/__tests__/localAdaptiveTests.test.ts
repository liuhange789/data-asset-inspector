import { describe, it, expect, beforeEach } from 'vitest'
import { ProvincialConfigLoader } from '../provincialConfigLoader.js'
import { ConflictDetector } from '../conflictDetector.js'
import { LocalAdaptiveMerger } from '../localAdaptiveMerger.js'
import type { ExtractedRule, RegulationKnowledgeBase } from '../types.js'
import regulationKb from '../regulation-knowledge-base.json' with { type: 'json' }

const kb = regulationKb as RegulationKnowledgeBase

const coreRules: ExtractedRule[] = [
  {
    ruleId: 'MISSING-事项名称',
    ruleType: 'missing',
    fieldList: ['事项名称'],
    policyBasis: '依据：GB/T 39554.2-2020 表3 — 要素「事项名称」为必填项',
    sourceDocument: '全国一体化政务服务平台',
    sourceClause: '表3',
  },
  {
    ruleId: 'LOG_PROCESS_COMPLETENESS_001',
    ruleType: 'logic',
    keywords: ['受理', '审查', '决定'],
    policyBasis: '依据：GB/T 36114-2018 附录A',
    sourceDocument: '政务服务中心进驻事项服务指南编制规范',
    sourceClause: '附录A',
  },
]

describe('ProvincialConfigLoader', () => {
  beforeEach(() => {
    ProvincialConfigLoader.clearCache()
  })

  it('loads 上海 provincial config', () => {
    const result = ProvincialConfigLoader.load('上海', kb)
    expect(result.degraded).toBe(false)
    expect(result.localAdaptive).not.toBeNull()
    expect(result.localAdaptive!.length).toBeGreaterThan(0)
    for (const rule of result.localAdaptive!) {
      expect(rule.policyBasis).toContain('DB31/T 545-2024')
    }
  })

  it('loads 安徽 provincial config', () => {
    const result = ProvincialConfigLoader.load('安徽', kb)
    expect(result.degraded).toBe(false)
    expect(result.localAdaptive).not.toBeNull()
    expect(result.localAdaptive!.length).toBeGreaterThan(0)
    for (const rule of result.localAdaptive!) {
      expect(rule.policyBasis).toContain('DB34/T 3228-2018')
    }
  })

  it('returns degraded for unknown province', () => {
    const result = ProvincialConfigLoader.load('未知省份', kb)
    expect(result.degraded).toBe(true)
    expect(result.localAdaptive).toBeNull()
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('returns degraded when knowledge base is null', () => {
    const result = ProvincialConfigLoader.load('上海', null)
    expect(result.degraded).toBe(true)
    expect(result.localAdaptive).toBeNull()
  })
})

describe('ConflictDetector', () => {
  it('returns clean for non-conflicting local adaptive', () => {
    const localAdaptive: ExtractedRule[] = [
      {
        ruleId: 'PROV-SH-001',
        ruleType: 'missing',
        fieldList: ['办理地点'],
        policyBasis: '依据：DB31/T 545-2024',
        sourceDocument: '上海标准',
        sourceClause: '第5章',
      },
    ]
    const result = ConflictDetector.detect(coreRules, localAdaptive)
    expect(result.clean).toBe(true)
    expect(result.conflicts).toHaveLength(0)
  })

  it('detects conflict when local adaptive tries to override core rule', () => {
    const conflictingLocal: ExtractedRule[] = [
      {
        ruleId: 'LOG_PROCESS_COMPLETENESS_001',
        ruleType: 'logic',
        keywords: ['受理', '审批'],
        policyBasis: '依据：地方标准',
        sourceDocument: '地方标准',
        sourceClause: '附录A',
      },
    ]
    const result = ConflictDetector.detect(coreRules, conflictingLocal)
    expect(result.clean).toBe(false)
    expect(result.conflicts.length).toBeGreaterThan(0)
    expect(result.conflicts[0]!.reason).toContain('核心规则不可被地方适配覆盖')
  })
})

describe('LocalAdaptiveMerger', () => {
  it('merges non-conflicting local adaptive and preserves core rules', () => {
    const localAdaptive: ExtractedRule[] = [
      {
        ruleId: 'PROV-SH-001',
        ruleType: 'missing',
        fieldList: ['办理地点'],
        policyBasis: '依据：DB31/T 545-2024',
        sourceDocument: '上海标准',
        sourceClause: '第5章',
      },
    ]
    const result = LocalAdaptiveMerger.merge(coreRules, localAdaptive)
    expect(result.conflicts).toHaveLength(0)
    expect(result.mergedRules.length).toBe(coreRules.length + localAdaptive.length)
    const coreRule = result.mergedRules.find((r) => r.ruleId === 'MISSING-事项名称')
    expect(coreRule).toBeDefined()
    expect(coreRule!.policyBasis).toBe(coreRules[0]!.policyBasis)
  })

  it('rejects conflicting local adaptive and preserves core rules', () => {
    const conflictingLocal: ExtractedRule[] = [
      {
        ruleId: 'LOG_PROCESS_COMPLETENESS_001',
        ruleType: 'logic',
        keywords: ['受理', '审批'],
        policyBasis: '依据：地方标准',
        sourceDocument: '地方标准',
        sourceClause: '附录A',
      },
    ]
    const result = LocalAdaptiveMerger.merge(coreRules, conflictingLocal)
    expect(result.conflicts.length).toBeGreaterThan(0)
    const coreRule = result.mergedRules.find((r) => r.ruleId === 'LOG_PROCESS_COMPLETENESS_001')
    expect(coreRule).toBeDefined()
    expect(coreRule!.keywords).toEqual(['受理', '审查', '决定'])
  })
})

describe('Province switching', () => {
  beforeEach(() => {
    ProvincialConfigLoader.clearCache()
  })

  it('core rules remain consistent across provinces', () => {
    const shResult = ProvincialConfigLoader.load('上海', kb)
    const ahResult = ProvincialConfigLoader.load('安徽', kb)

    expect(shResult.degraded).toBe(false)
    expect(ahResult.degraded).toBe(false)

    const shMerge = LocalAdaptiveMerger.merge(coreRules, shResult.localAdaptive ?? [])
    const ahMerge = LocalAdaptiveMerger.merge(coreRules, ahResult.localAdaptive ?? [])

    const shCore = shMerge.mergedRules.find((r) => r.ruleId === 'MISSING-事项名称')
    const ahCore = ahMerge.mergedRules.find((r) => r.ruleId === 'MISSING-事项名称')
    expect(shCore!.policyBasis).toBe(ahCore!.policyBasis)
  })
})
import { describe, it, expect } from 'vitest'
import { extractRulesFromKnowledgeBase, extractHotlineWhitelist, extractQualityDimensions, extractRequiredFields, extractProcessCoreStepKeywords } from '../ruleExtractor.js'
import { RegulationKnowledgeBaseValidator } from '../regulationKnowledgeBaseValidator.js'
import { RegulationKnowledgeBaseLoader } from '../regulationKnowledgeBaseLoader.js'
import { enrichWithPolicyBasis, annotateFormatIssuePolicyBasis } from '../reportGenerator.js'
import type { RegulationKnowledgeBase, FormatIssue } from '../types.js'
import regulationKb from '../regulation-knowledge-base.json' with { type: 'json' }

const kb = regulationKb as RegulationKnowledgeBase

describe('RuleExtractor', () => {
  it('extractRulesFromKnowledgeBase returns non-empty rules with policyBasis', () => {
    const rules = extractRulesFromKnowledgeBase(kb)
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) {
      expect(rule.policyBasis).toBeTruthy()
      expect(rule.sourceDocument).toBeTruthy()
      expect(rule.sourceClause).toBeTruthy()
      expect(rule.ruleId).toBeTruthy()
    }
  })

  it('extractHotlineWhitelist returns 15 items matching v3.5.8', () => {
    const hotlines = extractHotlineWhitelist(kb)
    expect(hotlines).toHaveLength(15)
    expect(hotlines).toContain('12345')
    expect(hotlines).toContain('12123')
    expect(hotlines).toContain('12348')
    expect(hotlines).toContain('12338')
    expect(hotlines).toContain('12355')
  })

  it('extractQualityDimensions returns 6 dimensions 20 indicators', () => {
    const dims = extractQualityDimensions(kb)
    expect(dims).toHaveLength(6)
    const totalIndicators = dims.reduce((sum, d) => sum + d.indicators.length, 0)
    expect(totalIndicators).toBe(20)
  })

  it('extractRequiredFields returns 14 fields matching v3.5.8', () => {
    const fields = extractRequiredFields(kb)
    expect(fields).toHaveLength(14)
    expect(fields).toContain('事项名称')
    expect(fields).toContain('实施主体')
    expect(fields).toContain('办理条件')
    expect(fields).toContain('申请材料')
    expect(fields).toContain('办理流程')
    expect(fields).toContain('办理时限')
    expect(fields).toContain('收费标准')
    expect(fields).toContain('办理地点')
    expect(fields).toContain('咨询电话')
    expect(fields).toContain('监督电话')
    expect(fields).toContain('网上办理深度')
    expect(fields).toContain('办理时间')
    expect(fields).toContain('结果送达方式')
    expect(fields).toContain('表格下载')
  })

  it('extractProcessCoreStepKeywords returns 受理/审查/决定', () => {
    const keywords = extractProcessCoreStepKeywords(kb)
    expect(keywords).toHaveLength(3)
    expect(keywords).toContain('受理')
    expect(keywords).toContain('审查')
    expect(keywords).toContain('决定')
  })

  it('extractor functions are pure (same input → same output, no mutation)', () => {
    const rules1 = extractRulesFromKnowledgeBase(kb)
    const rules2 = extractRulesFromKnowledgeBase(kb)
    expect(JSON.stringify(rules1)).toBe(JSON.stringify(rules2))

    const originalHotlines = kb.hotlineWhitelist.length
    extractHotlineWhitelist(kb)
    expect(kb.hotlineWhitelist.length).toBe(originalHotlines)
  })
})

describe('RegulationKnowledgeBaseValidator', () => {
  it('validates correct knowledge base structure', () => {
    const result = RegulationKnowledgeBaseValidator.validate(kb)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects missing nationalLaws', () => {
    const broken = { ...kb, nationalLaws: [] }
    const result = RegulationKnowledgeBaseValidator.validate(broken)
    expect(result.valid).toBe(false)
  })

  it('rejects missing hotlineWhitelist', () => {
    const broken = { ...kb, hotlineWhitelist: [] }
    const result = RegulationKnowledgeBaseValidator.validate(broken)
    expect(result.valid).toBe(false)
  })
})

describe('enrichWithPolicyBasis', () => {
  it('returns 待补充 when knowledge base is null', () => {
    const result = enrichWithPolicyBasis({ field: 'test' }, null)
    expect(result.policyBasis).toBe('依据：待补充法规依据')
    expect(result.sourceDocument).toBe('')
    expect(result.sourceClause).toBe('')
  })

  it('preserves original fields', () => {
    const input = { field: 'test', value: 123 }
    const result = enrichWithPolicyBasis(input, null)
    expect(result.field).toBe('test')
    expect(result.value).toBe(123)
  })
})

describe('annotateFormatIssuePolicyBasis', () => {
  it('preserves existing FormatIssue fields', () => {
    const issue: FormatIssue = {
      guideId: 'test',
      field: '咨询电话',
      issue: '格式错误',
      suggestion: '修正',
    }
    const result = annotateFormatIssuePolicyBasis(issue, null)
    expect(result.guideId).toBe('test')
    expect(result.field).toBe('咨询电话')
    expect(result.issue).toBe('格式错误')
    expect(result.suggestion).toBe('修正')
    expect(result.policyBasis).toBe('依据：待补充法规依据')
  })
})

describe('RegulationKnowledgeBaseLoader', () => {
  it('isLoaded returns boolean', () => {
    expect(typeof RegulationKnowledgeBaseLoader.isLoaded()).toBe('boolean')
  })

  it('get returns RegulationKnowledgeBase or null', () => {
    const result = RegulationKnowledgeBaseLoader.get()
    expect(result === null || typeof result === 'object').toBe(true)
  })
})
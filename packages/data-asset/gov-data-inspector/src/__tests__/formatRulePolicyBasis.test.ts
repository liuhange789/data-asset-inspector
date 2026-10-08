import { describe, it, expect } from 'vitest'
import { findRuleById } from '../ruleExtractor.js'
import { annotateFormatIssuePolicyBasis } from '../reportGenerator.js'
import type { FormatIssue, RegulationKnowledgeBase } from '../types.js'
import regulationKb from '../regulation-knowledge-base.json' with { type: 'json' }

const kb = regulationKb as RegulationKnowledgeBase

const FORMAT_RULE_IDS = [
  'FORMAT-监督电话',
  'FORMAT-办理时限',
  'FORMAT-办理地点',
] as const

describe('format 规则法规知识库注册与 policyBasis 追溯', () => {
  describe('findRuleById 反查 3 条 format 规则', () => {
    for (const ruleId of FORMAT_RULE_IDS) {
      it(`${ruleId} 能被 findRuleById 反查到`, () => {
        const rule = findRuleById(kb, ruleId)
        expect(rule).not.toBeNull()
        expect(rule!.ruleId).toBe(ruleId)
      })

      it(`${ruleId} 反查结果包含 policyBasis/sourceDocument/sourceClause`, () => {
        const rule = findRuleById(kb, ruleId)
        expect(rule).not.toBeNull()
        expect(rule!.policyBasis).toBeTruthy()
        expect(rule!.sourceDocument).toBeTruthy()
        expect(rule!.sourceClause).toBeTruthy()
      })

      it(`${ruleId} policyBasis 格式正确（依据：《文档名》（标准号）— 条款摘要）`, () => {
        const rule = findRuleById(kb, ruleId)
        expect(rule).not.toBeNull()
        expect(rule!.policyBasis).toMatch(/^依据：.+[—–-].+$/)
        expect(rule!.policyBasis).not.toContain('待补充')
        expect(rule!.policyBasis).toContain('GB/T 39554.2-2020')
      })
    }
  })

  describe('annotateFormatIssuePolicyBasis 通过 ruleId 追溯 format 规则', () => {
    it('FORMAT-监督电话 annotateFormatIssuePolicyBasis 返回真实 policyBasis', () => {
      const issue: FormatIssue = {
        guideId: 'g1',
        field: '监督电话',
        issue: '格式错误',
        suggestion: '修正',
        ruleId: 'FORMAT-监督电话',
      }
      const result = annotateFormatIssuePolicyBasis(issue, kb)
      expect(result.policyBasis).not.toBe('依据：待补充法规依据')
      expect(result.policyBasis).toContain('GB/T 39554.2-2020')
      expect(result.sourceDocument).toContain('要素要求')
      expect(result.sourceClause).toBe('表3')
    })

    it('FORMAT-办理时限 annotateFormatIssuePolicyBasis 返回真实 policyBasis', () => {
      const issue: FormatIssue = {
        guideId: 'g1',
        field: '办理时限',
        issue: '格式错误',
        suggestion: '修正',
        ruleId: 'FORMAT-办理时限',
      }
      const result = annotateFormatIssuePolicyBasis(issue, kb)
      expect(result.policyBasis).not.toBe('依据：待补充法规依据')
      expect(result.policyBasis).toContain('GB/T 39554.2-2020')
    })

    it('FORMAT-办理地点 annotateFormatIssuePolicyBasis 返回真实 policyBasis', () => {
      const issue: FormatIssue = {
        guideId: 'g1',
        field: '办理地点',
        issue: '格式错误',
        suggestion: '修正',
        ruleId: 'FORMAT-办理地点',
      }
      const result = annotateFormatIssuePolicyBasis(issue, kb)
      expect(result.policyBasis).not.toBe('依据：待补充法规依据')
      expect(result.policyBasis).toContain('GB/T 39554.2-2020')
    })
  })
})
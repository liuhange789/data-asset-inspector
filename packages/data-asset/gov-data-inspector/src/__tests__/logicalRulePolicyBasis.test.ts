import { describe, it, expect } from 'vitest'
import { findRuleById } from '../ruleExtractor.js'
import { enrichWithPolicyBasis } from '../reportGenerator.js'
import type { ErrorDetail, RegulationKnowledgeBase } from '../types.js'
import regulationKb from '../regulation-knowledge-base.json' with { type: 'json' }

const kb = regulationKb as RegulationKnowledgeBase

const LOGICAL_RULE_IDS = [
  'LOG_INSTANT_TIME_LIMIT_CONTRADICTION_001',
  'LOG_MATERIAL_CONDITION_001',
  'LOG_CONDITION_FIELD_MISPLACED_001',
] as const

describe('logical 规则法规知识库注册与 policyBasis 追溯', () => {
  describe('findRuleById 反查 3 条 logical 规则', () => {
    for (const ruleId of LOGICAL_RULE_IDS) {
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
      })
    }
  })

  describe('enrichWithPolicyBasis 通过 ruleId 追溯 logical 规则', () => {
    it('LOG_INSTANT_TIME_LIMIT_CONTRADICTION_001 enrichWithPolicyBasis 返回真实 policyBasis', () => {
      const detail: ErrorDetail = {
        guideId: 'g1',
        field: '办理时限',
        errorType: 'logical',
        severity: 'major',
        description: '即办件时限矛盾',
        suggestion: '修正时限',
        ruleId: 'LOG_INSTANT_TIME_LIMIT_CONTRADICTION_001',
      }
      const result = enrichWithPolicyBasis(detail, kb)
      expect(result.policyBasis).not.toBe('依据：待补充法规依据')
      expect(result.policyBasis).toContain('GB/T 36114-2018')
      expect(result.sourceDocument).toBe('政务服务中心进驻事项服务指南编制规范')
      expect(result.sourceClause).toBe('附录A')
    })

    it('LOG_MATERIAL_CONDITION_001 enrichWithPolicyBasis 返回真实 policyBasis', () => {
      const detail: ErrorDetail = {
        guideId: 'g1',
        field: '申请材料',
        errorType: 'logical',
        severity: 'major',
        description: '材料条件不一致',
        suggestion: '补充材料',
        ruleId: 'LOG_MATERIAL_CONDITION_001',
      }
      const result = enrichWithPolicyBasis(detail, kb)
      expect(result.policyBasis).not.toBe('依据：待补充法规依据')
      expect(result.policyBasis).toContain('GB/T 39554.2-2020')
      expect(result.sourceDocument).toContain('要素要求')
      expect(result.sourceClause).toBe('表3')
    })

    it('LOG_CONDITION_FIELD_MISPLACED_001 enrichWithPolicyBasis 返回真实 policyBasis', () => {
      const detail: ErrorDetail = {
        guideId: 'g1',
        field: '办理条件',
        errorType: 'logical',
        severity: 'major',
        description: '条件字段错位',
        suggestion: '修正字段内容',
        ruleId: 'LOG_CONDITION_FIELD_MISPLACED_001',
      }
      const result = enrichWithPolicyBasis(detail, kb)
      expect(result.policyBasis).not.toBe('依据：待补充法规依据')
      expect(result.policyBasis).toContain('GB/T 36114-2018')
      expect(result.sourceDocument).toBe('政务服务中心进驻事项服务指南编制规范')
      expect(result.sourceClause).toBe('附录A')
    })
  })

  describe('全部已注册 logical 规则均可追溯', () => {
    it('知识库中所有 LOG_ 前缀规则均含完整 policyBasis', () => {
      const allRuleIds = [
        'LOG_PROCESS_COMPLETENESS_001',
        'LOG_PROCESS_TIME_LIMIT_INCONSISTENT_001',
        ...LOGICAL_RULE_IDS,
      ]
      for (const ruleId of allRuleIds) {
        const rule = findRuleById(kb, ruleId)
        expect(rule).not.toBeNull()
        expect(rule!.policyBasis).toBeTruthy()
        expect(rule!.policyBasis).not.toContain('待补充')
        expect(rule!.sourceDocument).toBeTruthy()
        expect(rule!.sourceClause).toBeTruthy()
      }
    })
  })
})
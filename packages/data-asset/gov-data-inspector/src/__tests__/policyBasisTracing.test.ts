import { describe, it, expect } from 'vitest'
import { findRuleById, extractRulesFromKnowledgeBase } from '../ruleExtractor.js'
import { enrichWithPolicyBasis, annotateFormatIssuePolicyBasis } from '../reportGenerator.js'
import { resolveErrorDetailPolicyBasis } from '../policyBasis.js'
import { MissingFieldDetector } from '../missingFieldDetector.js'
import type { ErrorDetail, FormatIssue, RegulationKnowledgeBase } from '../types.js'
import regulationKb from '../regulation-knowledge-base.json' with { type: 'json' }

const kb = regulationKb as RegulationKnowledgeBase

describe('policyBasis 追溯链路', () => {
  describe('findRuleById 反查', () => {
    it('已知 ruleId → 返回对应 ExtractedRule', () => {
      const rule = findRuleById(kb, 'MISSING-事项名称')
      expect(rule).not.toBeNull()
      expect(rule!.policyBasis).toBeTruthy()
      expect(rule!.sourceDocument).toBeTruthy()
      expect(rule!.sourceClause).toBeTruthy()
    })

    it('省级 ruleId PROV-SH-001 → 返回上海地方规则', () => {
      const rule = findRuleById(kb, 'PROV-SH-001')
      expect(rule).not.toBeNull()
      expect(rule!.policyBasis).toContain('DB31/T')
    })

    it('省级 ruleId PROV-AH-001 → 返回安徽地方规则', () => {
      const rule = findRuleById(kb, 'PROV-AH-001')
      expect(rule).not.toBeNull()
      expect(rule!.policyBasis).toContain('DB34/T')
    })

    it('不存在 ruleId → 返回 null', () => {
      const rule = findRuleById(kb, 'NONEXISTENT-RULE-999')
      expect(rule).toBeNull()
    })

    it('所有提取的规则均可通过 findRuleById 反查', () => {
      const allRules = extractRulesFromKnowledgeBase(kb)
      const seenRuleIds = new Set<string>()
      for (const rule of allRules) {
        const found = findRuleById(kb, rule.ruleId)
        expect(found).not.toBeNull()
        expect(found!.ruleId).toBe(rule.ruleId)
        expect(found!.policyBasis).toBeTruthy()
        if (!seenRuleIds.has(rule.ruleId)) {
          seenRuleIds.add(rule.ruleId)
          expect(found!.policyBasis).toBe(rule.policyBasis)
        }
      }
    })
  })

  describe('enrichWithPolicyBasis 通过 ruleId 追溯', () => {
    it('ErrorDetail 含 ruleId → enrichWithPolicyBasis 返回真实 policyBasis', () => {
      const detail: ErrorDetail = {
        guideId: 'g1',
        field: '事项名称',
        errorType: 'missing',
        severity: 'critical',
        description: '缺失事项名称',
        suggestion: '请补充',
        ruleId: 'MISSING-事项名称',
      }
      const result = enrichWithPolicyBasis(detail, kb)
      expect(result.policyBasis).not.toBe('依据：待补充法规依据')
      expect(result.sourceDocument).not.toBe('')
      expect(result.sourceClause).not.toBe('')
    })

    it('FormatIssue 含 ruleId → annotateFormatIssuePolicyBasis 返回真实 policyBasis', () => {
      const issue: FormatIssue = {
        guideId: 'g1',
        field: '咨询电话',
        issue: '格式错误',
        suggestion: '修正',
        ruleId: 'FORMAT-001',
      }
      const result = annotateFormatIssuePolicyBasis(issue, kb)
      expect(result.policyBasis).not.toBe('依据：待补充法规依据')
      expect(result.sourceDocument).toBeTruthy()
    })

    it('无 ruleId 且无匹配 standardClause → 返回待补充', () => {
      const detail: ErrorDetail = {
        guideId: 'g1',
        field: '未知字段',
        errorType: 'missing',
        severity: 'critical',
        description: '测试',
        suggestion: '测试',
      }
      const result = enrichWithPolicyBasis(detail, kb)
      expect(result.policyBasis).toBe('依据：待补充法规依据')
    })

    it('ruleId 优先于 standardClause 匹配', () => {
      const rule = findRuleById(kb, 'MISSING-收费标准')
      expect(rule).not.toBeNull()
      const detail: ErrorDetail = {
        guideId: 'g1',
        field: '收费标准',
        errorType: 'missing',
        severity: 'critical',
        description: '测试',
        suggestion: '测试',
        ruleId: 'MISSING-收费标准',
        standardClause: 'some-other-clause',
      }
      const result = enrichWithPolicyBasis(detail, kb)
      expect(result.policyBasis).toBe(rule!.policyBasis)
      expect(result.sourceDocument).toBe(rule!.sourceDocument)
    })
  })

  describe('resolveErrorDetailPolicyBasis 通过 ruleId 追溯', () => {
    it('ruleId 匹配知识库 → 返回规则 policyBasis', () => {
      const basis = resolveErrorDetailPolicyBasis(
        'missing', '', null, [], kb, 'MISSING-事项名称',
      )
      expect(basis).not.toBe('依据：待补充法规依据')
      expect(basis).not.toContain('政策依据未配置')
    })

    it('ruleId 不匹配 → 回退到 errorType 映射', () => {
      const basis = resolveErrorDetailPolicyBasis(
        'missing', '', null, [], kb, 'NONEXISTENT-999',
      )
      expect(typeof basis).toBe('string')
      expect(basis.startsWith('依据：')).toBe(true)
    })

    it('warning 类型 → 返回服务完善性建议', () => {
      const basis = resolveErrorDetailPolicyBasis(
        'warning', '', null, [], kb, 'some-rule',
      )
      expect(basis).toBe('依据：服务完善性建议（非法定强制要素）')
    })
  })

  describe('MissingFieldDetector 输出含 ruleId', () => {
    it('漏项检测每条 ErrorDetail 含 ruleId=MISSING-{field}', () => {
      const guide: Record<string, unknown> = {
        事项名称: '测试',
        实施主体: '部门',
      }
      const required = ['事项名称', '实施主体', '办理条件', '申请材料']
      const details = MissingFieldDetector.detect(guide, 'g1', required)
      for (const d of details) {
        expect(d.ruleId).toBeDefined()
        expect(d.ruleId).toMatch(/^MISSING-/)
      }
    })

    it('漏项检测 ruleId 可反查知识库获取 policyBasis', () => {
      const guide: Record<string, unknown> = { 事项名称: '测试' }
      const required = ['事项名称', '实施主体']
      const details = MissingFieldDetector.detect(guide, 'g1', required)
      const detail = details.find((d) => d.field === '实施主体')
      expect(detail).toBeDefined()
      expect(detail!.ruleId).toBe('MISSING-实施主体')
      const rule = findRuleById(kb, detail!.ruleId!)
      expect(rule).not.toBeNull()
      expect(rule!.policyBasis).not.toBe('依据：待补充法规依据')
    })
  })

  describe('全量规则 policyBasis 非空校验', () => {
    it('知识库中每条 ExtractedRule 的 policyBasis 不为空且不以"待补充"开头', () => {
      const allRules = extractRulesFromKnowledgeBase(kb)
      expect(allRules.length).toBeGreaterThan(0)
      for (const rule of allRules) {
        expect(rule.policyBasis).toBeTruthy()
        expect(rule.policyBasis).not.toContain('待补充')
        expect(rule.sourceDocument).toBeTruthy()
        expect(rule.sourceClause).toBeTruthy()
      }
    })
  })
})
import { POLICY_STANDARD_NAME } from './invariant.js'

export class PolicyBasisBuilder {
  build(clause: string): string {
    return `依据：${POLICY_STANDARD_NAME}第${clause}章`
  }

  buildClassification(): string {
    return `依据：${POLICY_STANDARD_NAME}分类体系`
  }

  buildEncoding(): string {
    return `依据：${POLICY_STANDARD_NAME}编码规则`
  }

  buildChangeTraceability(): string {
    return `依据：${POLICY_STANDARD_NAME}变更管理要求`
  }

  buildSummary(policyBasisList: string[]): string[] {
    const unique = new Set<string>()
    for (const basis of policyBasisList) {
      if (basis && basis.trim() !== '') {
        unique.add(basis)
      }
    }
    return Array.from(unique).sort()
  }
}
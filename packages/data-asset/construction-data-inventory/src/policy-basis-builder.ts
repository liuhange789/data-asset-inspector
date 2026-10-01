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

  buildQualityElement(clause: string): string {
    return `依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第${clause}条`
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
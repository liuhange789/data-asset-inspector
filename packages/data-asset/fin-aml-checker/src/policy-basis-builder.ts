import { POLICY_REGULATION_PREFIX } from './invariant.js'

export class PolicyBasisBuilder {
  build(clause: string): string {
    return `${POLICY_REGULATION_PREFIX}${clause}`
  }

  buildSummary(policyBasisList: string[]): string[] {
    const uniqueSet = new Set<string>()
    for (const basis of policyBasisList) {
      uniqueSet.add(basis)
    }
    return Array.from(uniqueSet)
  }

  extractClauses(policyBasisList: string[]): string[] {
    const clauses = new Set<string>()
    for (const basis of policyBasisList) {
      if (basis.startsWith(POLICY_REGULATION_PREFIX)) {
        const clause = basis.slice(POLICY_REGULATION_PREFIX.length)
        clauses.add(clause)
      }
    }
    return Array.from(clauses)
  }
}
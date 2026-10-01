import {
  SCIENCE_DATA_REGULATION_NAME,
  SCIENCE_DATA_REGULATION_NUMBER,
  QUALITY_GUIDE_NAME,
  QUALITY_GUIDE_NUMBER,
} from './invariant.js'

export class PolicyBasisBuilder {
  buildScienceDataClause(clause: string): string {
    return `依据：${SCIENCE_DATA_REGULATION_NAME}（${SCIENCE_DATA_REGULATION_NUMBER}）${clause}`
  }

  buildQualityGuideClause(clause: string): string {
    return `依据：${QUALITY_GUIDE_NAME}（${QUALITY_GUIDE_NUMBER}）${clause}`
  }

  buildSummary(policyBasisList: string[]): string[] {
    const seen = new Set<string>()
    const result: string[] = []
    for (const basis of policyBasisList) {
      if (typeof basis === 'string' && basis.trim() !== '' && !seen.has(basis)) {
        seen.add(basis)
        result.push(basis)
      }
    }
    return result
  }
}
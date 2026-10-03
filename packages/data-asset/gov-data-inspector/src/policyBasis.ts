import { loadJsonConfig } from '@liuhange/dsh-data-asset-shared'

interface PolicyDoc {
  name: string
  docNumber: string
  coreRequirement: string
}

const EXCLUDED_STANDARDS = [
  'GB/T 47949-2026',
  'GB/T 47950-2026',
  '国办发〔2015〕46号',
]

export function filterPolicyBasis(basis: string[]): string[] {
  return basis.filter((b) => !EXCLUDED_STANDARDS.some((ex) => b.includes(ex)))
}

export function resolvePolicyBasis(
  stage: string,
  packPolicyBasis?: PolicyDoc[],
): string[] {
  if (packPolicyBasis && packPolicyBasis.length > 0) {
    return packPolicyBasis.map((d) => `依据：《${d.name}》（${d.docNumber}）—${d.coreRequirement}`)
  }

  try {
    const config = loadJsonConfig(
      'POLICY_REFS_PATH',
      'config/policy-references.json',
      '@liuhange/dsh-data-asset-shared/config/policy-references.json',
    )
    const refs = (config as { policyReferences: { stage: string; documents: PolicyDoc[] }[] }).policyReferences
    const stageEntry = refs?.find((s) => s.stage === stage)
    if (!stageEntry) {
      console.warn(`Policy stage "${stage}" not configured`)
      return [`依据：政策依据未配置（stage=${stage}）`]
    }
    const raw = stageEntry.documents.map((d) => `依据：《${d.name}》（${d.docNumber}）—${d.coreRequirement}`)
    return filterPolicyBasis(raw)
  } catch {
    return ['依据：政策依据配置加载失败']
  }
}

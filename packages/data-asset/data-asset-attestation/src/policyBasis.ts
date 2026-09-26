import { loadJsonConfig } from '@liuhange/dsh-data-asset-shared'

export function resolvePolicyBasis(stage: string): string[] {
  try {
    const config = loadJsonConfig(
      'POLICY_REFS_PATH',
      'config/policy-references.json',
      '@liuhange/dsh-data-asset-shared/config/policy-references.json',
    )
    const refs = (config as { policyReferences: { stage: string; documents: { name: string; docNumber: string; coreRequirement: string }[] }[] }).policyReferences
    const stageEntry = refs?.find((s) => s.stage === stage)
    if (!stageEntry) {
      console.warn(`Policy stage "${stage}" not configured`)
      return [`依据：政策依据未配置（stage=${stage}）`]
    }
    return stageEntry.documents.map((d) => `依据：《${d.name}》（${d.docNumber}）—${d.coreRequirement}`)
  } catch {
    return ['依据：政策依据配置加载失败']
  }
}
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface PolicyBasisItem {
  name: string
  docNumber: string
  coreRequirement: string
}

export interface ConfigPack {
  configPackId: string
  region: string
  configPackVersion: string
  policyBasis: PolicyBasisItem[]
  requiredFields: unknown
  formatRules: unknown
  localStandardTerms: unknown
  logicErrorRules: unknown
  scoringWeights: unknown
  itemTypeMatching: unknown
  severityMapping: unknown
  gbtMapping: unknown
  dataSourceCredentials: unknown
  dataSourcePriority: unknown
  [key: string]: unknown
}

export const configPack: ConfigPack = JSON.parse(
  readFileSync(resolve(__dirname, '../config-pack.json'), 'utf8')
)

export const region = configPack.region
export const configPackId = configPack.configPackId
export const configPackVersion = configPack.configPackVersion

export function getPolicyBasis(): PolicyBasisItem[] {
  return configPack.policyBasis
}

export function getRequiredFields(): unknown {
  return configPack.requiredFields
}

export function getFormatRules(): unknown {
  return configPack.formatRules
}

export function getScoringWeights(): unknown {
  return configPack.scoringWeights
}

export function loadConfig(): ConfigPack {
  return configPack
}

export function validateConfig(pack: ConfigPack): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (!pack.configPackId || typeof pack.configPackId !== 'string') {
    errors.push('configPackId must be a non-empty string')
  }
  if (!pack.region || typeof pack.region !== 'string') {
    errors.push('region must be a non-empty string')
  }
  if (!pack.configPackVersion || typeof pack.configPackVersion !== 'string') {
    errors.push('configPackVersion must be a non-empty string')
  }
  if (!Array.isArray(pack.policyBasis)) {
    errors.push('policyBasis must be an array')
  }
  return { valid: errors.length === 0, errors }
}

export default configPack
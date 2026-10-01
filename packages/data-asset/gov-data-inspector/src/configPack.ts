import type { FormatRule, StandardRule } from './types.js'

export interface PolicyDocument {
  name: string
  docNumber: string
  coreRequirement: string
}

export interface LocalStandardTerms {
  materials: string[]
  conditions: string[]
}

export interface ScoringWeights {
  completeness: number
  accuracy: number
  traceability: number
}

export interface ItemTypeMatchingRule {
  keywords: string[]
  codePrefix: string
}

export type SeverityMapping = Record<string, string>

export type GbtMapping = Record<string, string>

export interface DataSourceCredential {
  apiKey: string
  endpoint: string
}

export interface StandardDataSourceCredential {
  docPath: string
  endpoint: string
}

export interface DataSourceCredentials {
  national: DataSourceCredential
  provincial: DataSourceCredential
  standard: StandardDataSourceCredential
}

export interface ConfigPack {
  configPackId: string
  region: string
  configPackVersion: string
  policyBasis: PolicyDocument[]
  requiredFields: string[]
  formatRules: FormatRule[]
  localStandardTerms: LocalStandardTerms
  logicErrorRules: StandardRule[]
  scoringWeights: ScoringWeights
  itemTypeMatching: Record<string, ItemTypeMatchingRule>
  severityMapping: SeverityMapping
  gbtMapping: GbtMapping
  dataSourceCredentials: DataSourceCredentials
  dataSourcePriority: string[]
  convenienceWeights?: Record<string, number>
  materialConciseThreshold?: number
  missingFieldStandardClause?: string
  degradedSimilarityThreshold?: number
  inputLengthThreshold?: number
}

const REQUIRED_FIELDS: (keyof ConfigPack)[] = [
  'configPackId',
  'region',
  'configPackVersion',
  'policyBasis',
  'requiredFields',
  'formatRules',
  'localStandardTerms',
  'logicErrorRules',
  'scoringWeights',
  'itemTypeMatching',
  'severityMapping',
  'gbtMapping',
  'dataSourceCredentials',
  'dataSourcePriority',
]

export function normalizeConfigPack(raw: Record<string, unknown>): ConfigPack {
  const requiredFields = (raw.requiredFields ?? raw.guideRequiredElements) as string[] | undefined
  const scoringWeights = (raw.scoringWeights ?? raw.scoreWeights) as ScoringWeights | undefined
  const gbtMapping = (raw.gbtMapping ?? raw.gbt47949Mapping) as GbtMapping | undefined

  const partial: Record<string, unknown> = { ...raw }

  if (requiredFields !== undefined) partial.requiredFields = requiredFields
  if (scoringWeights !== undefined) partial.scoringWeights = scoringWeights
  if (gbtMapping !== undefined) partial.gbtMapping = gbtMapping

  delete partial.guideRequiredElements
  delete partial.scoreWeights
  delete partial.gbt47949Mapping

  for (const field of REQUIRED_FIELDS) {
    if (partial[field] === undefined || partial[field] === null) {
      throw new Error(`GOV_CONFIG_PACK_INVALID: 必填字段 "${field}" 缺失`)
    }
  }

  return partial as unknown as ConfigPack
}
import type { StandardTimeLimit, StandardMaterial, StandardCondition, KnowledgeBase, DataSourceStatus, DataSourceStatusEntry, OfficialStandardData } from './types.js'
import { NationalDataSource } from './nationalDataSource.js'
import { ProvincialDataSource } from './provincialDataSource.js'

let cachedTimeLimits: StandardTimeLimit[] | null = null
let cachedMaterials: StandardMaterial[] | null = null
let cachedConditions: StandardCondition[] | null = null
let cachedDataSourceStatus: DataSourceStatus | null = null

const FAILED_STATUS: DataSourceStatusEntry = { status: 'failed', fetchedAt: '', recordCount: 0 }

function mergeByPriority(
  national: OfficialStandardData[],
  provincial: OfficialStandardData[],
  priority: string[],
): OfficialStandardData[] {
  const merged = new Map<string, OfficialStandardData>()
  const sources = { national, provincial }
  for (const src of priority) {
    const data = sources[src as keyof typeof sources]
    if (!data) continue
    for (const item of data) {
      const key = `${item.itemType}:${item.standardName ?? item.elementName ?? 'limit'}`
      if (!merged.has(key)) merged.set(key, item)
    }
  }
  return Array.from(merged.values())
}

function toTimeLimits(data: OfficialStandardData[]): StandardTimeLimit[] {
  return data
    .filter((d) => d.legalUpperLimit !== undefined && d.legalLowerLimit !== undefined)
    .map((d) => ({
      itemType: d.itemType,
      legalUpperLimit: d.legalUpperLimit!,
      legalLowerLimit: d.legalLowerLimit!,
      basisClause: d.standardClause,
      dataSource: d.dataSource,
      standardClause: d.standardClause,
    }))
}

function toMaterials(data: OfficialStandardData[]): StandardMaterial[] {
  return data
    .filter((d) => d.standardName !== undefined)
    .map((d) => ({
      itemType: d.itemType,
      standardName: d.standardName!,
      isRequired: d.isRequired ?? false,
      basisClause: d.standardClause,
      dataSource: d.dataSource,
      standardClause: d.standardClause,
    }))
}

function toConditions(data: OfficialStandardData[]): StandardCondition[] {
  return data
    .filter((d) => d.elementName !== undefined && d.standardValue !== undefined)
    .map((d) => ({
      itemType: d.itemType,
      elementName: d.elementName!,
      standardValue: d.standardValue!,
      basisClause: d.standardClause,
      dataSource: d.dataSource,
      standardClause: d.standardClause,
    }))
}

export interface KnowledgeBaseLoadResult {
  kb: KnowledgeBase
  degraded: boolean
  degradedReason?: string
}

export const KnowledgeBaseLoader = {
  async load(
    credentials?: {
      national?: { apiKey?: string | undefined; endpoint?: string | undefined }
      provincial?: { apiKey?: string | undefined; endpoint?: string | undefined }
    },
    dataSourcePriority?: string[],
  ): Promise<KnowledgeBaseLoadResult> {
    const priority = dataSourcePriority ?? ['provincial', 'national']

    const nationalResult = await NationalDataSource.fetch(credentials?.national)
    const provincialResult = await ProvincialDataSource.fetch(credentials?.provincial)

    const mergedData = mergeByPriority(nationalResult.data, provincialResult.data, priority)

    cachedTimeLimits = toTimeLimits(mergedData)
    cachedMaterials = toMaterials(mergedData)
    cachedConditions = toConditions(mergedData)

    cachedDataSourceStatus = {
      national: nationalResult.status,
      provincial: provincialResult.status,
      standard: FAILED_STATUS,
    }

    const allFailed =
      nationalResult.status.status === 'failed' && provincialResult.status.status === 'failed'

    const kb: KnowledgeBase = {
      timeLimits: cachedTimeLimits,
      materials: cachedMaterials,
      conditions: cachedConditions,
      dataSourceStatus: cachedDataSourceStatus,
    }

    if (allFailed) {
      return {
        kb,
        degraded: true,
        degradedReason: '官方数据源全部不可用，已降级为本地规则检测模式',
      }
    }

    return { kb, degraded: false }
  },

  getTimeLimits(): StandardTimeLimit[] {
    if (!cachedTimeLimits) throw new Error('GOV_DATA_KB_MISSING: 知识库尚未加载')
    return cachedTimeLimits
  },

  getMaterials(): StandardMaterial[] {
    if (!cachedMaterials) throw new Error('GOV_DATA_KB_MISSING: 知识库尚未加载')
    return cachedMaterials
  },

  getConditions(): StandardCondition[] {
    if (!cachedConditions) throw new Error('GOV_DATA_KB_MISSING: 知识库尚未加载')
    return cachedConditions
  },

  getDataSourceStatus(): DataSourceStatus {
    if (!cachedDataSourceStatus) {
      return {
        national: FAILED_STATUS,
        provincial: FAILED_STATUS,
        standard: FAILED_STATUS,
      }
    }
    return cachedDataSourceStatus
  },

  isLoaded(): boolean {
    return cachedTimeLimits !== null && cachedMaterials !== null && cachedConditions !== null
  },

  _setTestData(kb: KnowledgeBase): void {
    cachedTimeLimits = kb.timeLimits
    cachedMaterials = kb.materials
    cachedConditions = kb.conditions
    cachedDataSourceStatus = kb.dataSourceStatus
  },
}
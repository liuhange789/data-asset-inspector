import type { OfficialStandardData, DataSourceStatusEntry } from './types.js'
import { EndpointResolver } from './endpointResolver.js'

export interface DataSourceFetchResult {
  data: OfficialStandardData[]
  status: DataSourceStatusEntry
}

const FAILED_RESULT: DataSourceFetchResult = {
  data: [],
  status: { status: 'failed', fetchedAt: '', recordCount: 0 },
}

function parseOfficialData(raw: unknown, source: 'national' | 'provincial'): OfficialStandardData[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item: Record<string, unknown>) => item && typeof item === 'object')
    .map((item: Record<string, unknown>) => ({
      dataSource: source as 'national' | 'provincial',
      itemType: String(item.itemType ?? ''),
      legalUpperLimit: item.legalUpperLimit as number | undefined,
      legalLowerLimit: item.legalLowerLimit as number | undefined,
      standardName: item.standardName as string | undefined,
      isRequired: item.isRequired as boolean | undefined,
      elementName: item.elementName as string | undefined,
      standardValue: item.standardValue as string | undefined,
      standardClause: String(item.standardClause ?? ''),
    }))
    .filter((d: OfficialStandardData) => d.itemType && d.standardClause)
}

export const ProvincialDataSource = {
  async fetch(credentials?: { apiKey?: string | undefined; endpoint?: string | undefined }): Promise<DataSourceFetchResult> {
    const apiKey = credentials?.apiKey ?? process.env.PROVINCIAL_API_KEY
    const endpoint = credentials?.endpoint ?? process.env.PROVINCIAL_API_ENDPOINT

    if (!apiKey || !endpoint) {
      return { ...FAILED_RESULT, status: { ...FAILED_RESULT.status } }
    }

    const resolved = EndpointResolver.resolve(endpoint)
    if (!resolved) {
      return { ...FAILED_RESULT, status: { ...FAILED_RESULT.status } }
    }

    try {
      if (resolved.kind === 'file') {
        const { readFileSync } = require('node:fs') as typeof import('node:fs')
        const raw = JSON.parse(readFileSync(resolved.target, 'utf-8'))
        const data = parseOfficialData(raw, 'provincial')
        return {
          data,
          status: { status: 'success', fetchedAt: new Date().toISOString(), recordCount: data.length },
        }
      }

      const url = new URL(resolved.target)
      if (apiKey) url.searchParams.set('apiKey', apiKey)

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) return { ...FAILED_RESULT, status: { ...FAILED_RESULT.status } }

      const raw = await response.json()
      const data = parseOfficialData(raw, 'provincial')

      return {
        data,
        status: { status: 'success', fetchedAt: new Date().toISOString(), recordCount: data.length },
      }
    } catch {
      return { ...FAILED_RESULT, status: { ...FAILED_RESULT.status } }
    }
  },
}
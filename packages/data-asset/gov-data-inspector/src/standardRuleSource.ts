import type { StandardRule, DataSourceStatusEntry } from './types.js'

export interface StandardRuleFetchResult {
  rules: StandardRule[]
  status: DataSourceStatusEntry
}

const FAILED_RESULT: StandardRuleFetchResult = {
  rules: [],
  status: { status: 'failed', fetchedAt: '', recordCount: 0 },
}

export const StandardRuleSource = {
  async fetch(credentials?: { docPath?: string | undefined; endpoint?: string | undefined }): Promise<StandardRuleFetchResult> {
    const docPath = credentials?.docPath ?? process.env.STANDARD_DOC_PATH
    const endpoint = credentials?.endpoint ?? process.env.STANDARD_RULES_ENDPOINT

    if (!docPath && !endpoint) {
      return { ...FAILED_RESULT, status: { ...FAILED_RESULT.status } }
    }

    try {
      if (endpoint && endpoint.startsWith('https://')) {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(10000),
        })

        if (!response.ok) return { ...FAILED_RESULT, status: { ...FAILED_RESULT.status } }

        const raw = await response.json()
        if (!Array.isArray(raw)) return { ...FAILED_RESULT, status: { ...FAILED_RESULT.status } }

        const rules = parseRules(raw)
        return {
          rules,
          status: { status: 'success', fetchedAt: new Date().toISOString(), recordCount: rules.length },
        }
      }

      if (docPath) {
        const { readFileSync } = await import('node:fs')
        const raw = JSON.parse(readFileSync(docPath, 'utf-8'))
        if (!Array.isArray(raw)) return { ...FAILED_RESULT, status: { ...FAILED_RESULT.status } }

        const rules = parseRules(raw)
        return {
          rules,
          status: { status: 'success', fetchedAt: new Date().toISOString(), recordCount: rules.length },
        }
      }

      return { ...FAILED_RESULT, status: { ...FAILED_RESULT.status } }
    } catch {
      return { ...FAILED_RESULT, status: { ...FAILED_RESULT.status } }
    }
  },
}

function parseRules(raw: unknown[]): StandardRule[] {
  return raw
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
    .map((item: Record<string, unknown>) => ({
      ruleId: String(item.ruleId ?? ''),
      standardClause: String(item.standardClause ?? ''),
      triggerFields: Array.isArray(item.triggerFields) ? (item.triggerFields as string[]) : [],
      condition: String(item.condition ?? ''),
      threshold: item.threshold as number | undefined,
      suggestionTemplate: String(item.suggestionTemplate ?? ''),
      triggerKeywords: Array.isArray(item.triggerKeywords) ? (item.triggerKeywords as string[]) : [],
    }))
    .filter((r: StandardRule) => r.ruleId && r.standardClause && r.triggerFields.length > 0)
}
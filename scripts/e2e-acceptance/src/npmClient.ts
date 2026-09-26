import { TIMEOUTS } from './config.js'
import type { NpmPackageMetadata } from './types.js'

export async function getPackageMetadata(packageName: string): Promise<NpmPackageMetadata> {
  const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUTS.npmQuery)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`NPM_REGISTRY_ERROR: HTTP ${response.status} for ${packageName}`)
    }
    const data = await response.json() as {
      'dist-tags'?: { latest?: string }
      versions?: Record<string, unknown>
      description?: string
      repository?: { url?: string }
      homepage?: string
    }
    const latest = data['dist-tags']?.latest
    if (!latest) {
      throw new Error(`NPM_REGISTRY_ERROR: no dist-tags.latest for ${packageName}`)
    }
    return {
      name: packageName,
      latestVersion: latest,
      versions: Object.keys(data.versions ?? {}),
      description: data.description ?? '',
      repositoryUrl: data.repository?.url ?? '',
      homepage: data.homepage ?? '',
    }
  } catch (e) {
    const err = e as Error
    if (err.name === 'AbortError') {
      throw new Error(`NPM_QUERY_TIMEOUT: ${packageName} timed out after ${TIMEOUTS.npmQuery}ms`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export async function checkPageAccessible(packageName: string): Promise<{ statusCode: number; accessible: boolean }> {
  const url = `https://www.npmjs.com/package/${packageName}`
  try {
    const response = await fetch(url, {

      signal: AbortSignal.timeout(TIMEOUTS.npmQuery),
    })
    return { statusCode: response.status, accessible: response.ok }
  } catch {
    return { statusCode: 0, accessible: false }
  }
}
import { PACKAGES } from './config.js'
import { getPackageMetadata, checkPageAccessible } from './npmClient.js'
import type { NpmAcceptanceResult, ErrorRecord } from './types.js'

export async function runNpmAcceptance(): Promise<NpmAcceptanceResult> {
  const errors: ErrorRecord[] = []
  const packageChecks: { packageName: string; expectedVersion: string; actualLatest: string; pageAccessible: boolean; versionMatch: boolean }[] = []

  for (const pkg of PACKAGES) {
    try {
      const metadata = await getPackageMetadata(pkg.name)
      const pageCheck = await checkPageAccessible(pkg.name)
      const versionMatch = metadata.latestVersion === pkg.version

      packageChecks.push({
        packageName: pkg.name,
        expectedVersion: pkg.version,
        actualLatest: metadata.latestVersion,
        pageAccessible: pageCheck.accessible,
        versionMatch,
      })

      if (!versionMatch) {
        errors.push({
          severity: 'error',
          code: 'VERSION_MISMATCH',
          message: `${pkg.name}: expected ${pkg.version}, got ${metadata.latestVersion}`,
        })
      }

      if (!pageCheck.accessible) {
        errors.push({
          severity: 'warning',
          code: 'NPM_PAGE_INACCESSIBLE',
          message: `${pkg.name} npm page not accessible (HTTP ${pageCheck.statusCode})`,
        })
      }
    } catch (e) {
      packageChecks.push({
        packageName: pkg.name,
        expectedVersion: pkg.version,
        actualLatest: 'unknown',
        pageAccessible: false,
        versionMatch: false,
      })
      errors.push({
        severity: 'error',
        code: 'NPM_QUERY_FAILED',
        message: `Failed to query ${pkg.name}: ${(e as Error).message}`,
      })
    }
  }

  const passed = errors.filter(e => e.severity === 'error').length === 0

  return { packageChecks, passed, errors }
}
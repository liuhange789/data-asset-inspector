export interface UrlReachabilityResult {
  reachable: boolean
  error?: string
}

export const UrlReachabilityChecker = {
  async check(dataSource: string): Promise<UrlReachabilityResult> {
    if (!dataSource || typeof dataSource !== 'string') {
      return { reachable: false, error: '数据源路径为空' }
    }

    if (dataSource.startsWith('http://') || dataSource.startsWith('https://')) {
      try {
        const response = await fetch(dataSource, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
        })
        if (response.ok) {
          return { reachable: true }
        }
        return { reachable: false, error: `数据源不可达，HTTP状态码: ${response.status}` }
      } catch (e) {
        return { reachable: false, error: `数据源不可达: ${(e as Error).message}` }
      }
    }

    const { existsSync } = require('node:fs') as typeof import('node:fs')
    if (existsSync(dataSource)) {
      return { reachable: true }
    }

    return { reachable: false, error: '数据源不可达，请检查路径或 URL' }
  },
}
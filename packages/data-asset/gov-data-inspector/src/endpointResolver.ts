import { existsSync } from 'node:fs'

export interface ResolvedEndpoint {
  kind: 'https' | 'http' | 'file'
  target: string
}

export const EndpointResolver = {
  resolve(endpoint: string): ResolvedEndpoint | null {
    if (!endpoint || typeof endpoint !== 'string') return null

    if (endpoint.startsWith('https://')) {
      return { kind: 'https', target: endpoint }
    }

    if (endpoint.startsWith('http://')) {
      return { kind: 'http', target: endpoint }
    }

    if (existsSync(endpoint)) {
      return { kind: 'file', target: endpoint }
    }

    if (endpoint.startsWith('./') || endpoint.startsWith('../') || endpoint.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(endpoint)) {
      return { kind: 'file', target: endpoint }
    }

    return null
  },
}
import type { AgencyMatchResult, RegistrationConfig } from './types.js'

export function matchAgency(
  dataType: string,
  region: string | undefined,
  config: RegistrationConfig['agencies'],
): AgencyMatchResult {
  const regionKey = region ?? inferRegionFromDataType(dataType)
  const endpoint = config.httpEndpoints[regionKey]

  if (endpoint) {
    return {
      recommendedAgency: regionKey,
      url: endpoint.url,
      matched: true,
    }
  }

  const firstKey = Object.keys(config.httpEndpoints)[0]
  if (firstKey) {
    const fallback = config.httpEndpoints[firstKey]
    if (fallback) {
      return {
        recommendedAgency: firstKey,
        url: fallback.url,
        matched: false,
      }
    }
  }

  return {
    recommendedAgency: 'unknown',
    url: '',
    matched: false,
  }
}

function inferRegionFromDataType(dataType: string): string {
  const typeLower = dataType.toLowerCase()
  if (typeLower.includes('金融') || typeLower.includes('finance')) return 'shanghai'
  if (typeLower.includes('科技') || typeLower.includes('tech')) return 'shenzhen'
  return 'beijing'
}
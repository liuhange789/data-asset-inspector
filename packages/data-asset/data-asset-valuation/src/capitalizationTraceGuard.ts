export interface CapitalizationTraceGuardConfig {
  enabled: boolean
  policyRef: string
  rule: string
  warningMessage: string
}

export interface GuardResult {
  passed: boolean
  warning: string | null
  policyRef: string
}

export function checkCapitalizationTrace(
  _recommendedValue: number,
  config: CapitalizationTraceGuardConfig,
): GuardResult {
  if (!config.enabled) {
    return { passed: true, warning: null, policyRef: config.policyRef }
  }
  return {
    passed: true,
    warning: config.warningMessage,
    policyRef: config.policyRef,
  }
}

export interface CostReliabilityConfig {
  enabled: boolean
  policyRef: string
  reliabilityLevels: string[]
  criteria: Record<string, string>
}

export interface CostReliabilityAnnotation {
  level: 'high' | 'medium' | 'low'
  criteria: string
  policyRef: string
}

export function annotateCostReliability(
  hasCompleteVouchers: boolean,
  hasPartialVouchers: boolean,
  config: CostReliabilityConfig,
): CostReliabilityAnnotation {
  if (!config.enabled) {
    return { level: 'medium', criteria: config.criteria.medium ?? '', policyRef: config.policyRef }
  }
  let level: 'high' | 'medium' | 'low'
  if (hasCompleteVouchers) {
    level = 'high'
  } else if (hasPartialVouchers) {
    level = 'medium'
  } else {
    level = 'low'
  }
  return {
    level,
    criteria: config.criteria[level] ?? '',
    policyRef: config.policyRef,
  }
}
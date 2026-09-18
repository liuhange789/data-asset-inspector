export interface TripleAuditConfig {
  enabled: boolean
  standards: string[]
  policyRef: string
  promptMessage: string
}

export interface TripleAuditResult {
  enabled: boolean
  standards: string[]
  promptMessage: string
  policyRef: string
}

export function promptTripleAuditStandard(
  config: TripleAuditConfig,
): TripleAuditResult {
  return {
    enabled: config.enabled,
    standards: config.enabled ? config.standards : [],
    promptMessage: config.enabled ? config.promptMessage : '',
    policyRef: config.policyRef,
  }
}

export interface SevenStepFlowConfig {
  enabled: boolean
  steps: Array<{ step: number; name: string; durationDays: number | null }>
  policyRef: string
}

export interface SevenStepFlowResult {
  enabled: boolean
  steps: Array<{ step: number; name: string; durationDays: number | null }>
  totalMaxDays: number
  policyRef: string
}

export function promptSevenStepFlow(
  config: SevenStepFlowConfig,
): SevenStepFlowResult {
  if (!config.enabled) {
    return { enabled: false, steps: [], totalMaxDays: 0, policyRef: config.policyRef }
  }
  const totalMaxDays = config.steps.reduce(
    (sum, s) => sum + (s.durationDays ?? 0),
    0,
  )
  return {
    enabled: true,
    steps: config.steps,
    totalMaxDays,
    policyRef: config.policyRef,
  }
}
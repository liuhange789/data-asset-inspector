export interface PilotPolicyConfig {
  enabled: boolean
  policyName: string
  policyRef: string
  keyPoints: string[]
  embedMessage: string
}

export interface PilotPolicyResult {
  embedded: boolean
  message: string
  policyRef: string
  keyPoints: string[]
}

export function embedPilotPolicyReference(
  config: PilotPolicyConfig,
): PilotPolicyResult {
  if (!config.enabled) {
    return { embedded: false, message: '', policyRef: config.policyRef, keyPoints: [] }
  }
  return {
    embedded: true,
    message: config.embedMessage,
    policyRef: config.policyRef,
    keyPoints: config.keyPoints,
  }
}
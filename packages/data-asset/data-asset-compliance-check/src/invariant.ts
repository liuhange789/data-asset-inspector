export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`INVARIANT_VIOLATION: ${message}`)
  }
}

export function validateComplianceArgs(args: Record<string, unknown>): {
  assetName: string
  sourceDescription: string
  processingDescription: string
  usageDescription: string
  hasPersonalInfo: boolean
  personalInfoFields: string[]
} {
  if (!args || typeof args !== 'object') {
    throw new Error('INVALID_ARGS: args must be an object')
  }
  if (!args.assetName || typeof args.assetName !== 'string') {
    throw new Error('INVALID_ARGS: assetName is required and must be a string')
  }
  if (typeof args.sourceDescription !== 'string') {
    throw new Error('INVALID_ARGS: sourceDescription is required and must be a string')
  }
  if (typeof args.processingDescription !== 'string') {
    throw new Error('INVALID_ARGS: processingDescription is required and must be a string')
  }
  if (typeof args.usageDescription !== 'string') {
    throw new Error('INVALID_ARGS: usageDescription is required and must be a string')
  }
  const hasPersonalInfo = args.hasPersonalInfo === true
  const personalInfoFields = Array.isArray(args.personalInfoFields)
    ? (args.personalInfoFields as unknown[]).filter(f => typeof f === 'string') as string[]
    : []
  return {
    assetName: args.assetName as string,
    sourceDescription: args.sourceDescription as string,
    processingDescription: args.processingDescription as string,
    usageDescription: args.usageDescription as string,
    hasPersonalInfo,
    personalInfoFields,
  }
}
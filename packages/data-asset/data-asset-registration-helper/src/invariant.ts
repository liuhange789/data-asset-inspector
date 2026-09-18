export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`INVARIANT_VIOLATION: ${message}`)
  }
}

export function validateRegistrationArgs(args: Record<string, unknown>): {
  assetName: string
  assetDescription: string
  dataType: string
  region?: string
  ownershipConfirmation: {
    hasDispute: boolean
    confirmedAt: string
    holder: string
    processor: string
    operator: string
  }
  orchestrationResult: string
} {
  if (!args || typeof args !== 'object') {
    throw new Error('INVALID_ARGS: args must be an object')
  }
  if (!args.assetName || typeof args.assetName !== 'string') {
    throw new Error('INVALID_ARGS: assetName is required and must be a string')
  }
  if (typeof args.assetDescription !== 'string') {
    throw new Error('INVALID_ARGS: assetDescription is required and must be a string')
  }
  if (!args.dataType || typeof args.dataType !== 'string') {
    throw new Error('INVALID_ARGS: dataType is required and must be a string')
  }
  const oc = args.ownershipConfirmation as Record<string, unknown>
  if (!oc || typeof oc !== 'object') {
    throw new Error('INVALID_ARGS: ownershipConfirmation is required')
  }
  if (typeof oc.hasDispute !== 'boolean') {
    throw new Error('INVALID_ARGS: ownershipConfirmation.hasDispute must be boolean')
  }
  if (typeof oc.confirmedAt !== 'string' || typeof oc.holder !== 'string' || typeof oc.processor !== 'string' || typeof oc.operator !== 'string') {
    throw new Error('INVALID_ARGS: ownershipConfirmation needs confirmedAt/holder/processor/operator as strings')
  }
  if (!args.orchestrationResult || typeof args.orchestrationResult !== 'string') {
    throw new Error('INVALID_ARGS: orchestrationResult is required and must be a string (JSON)')
  }
  const result: {
    assetName: string
    assetDescription: string
    dataType: string
    region?: string
    ownershipConfirmation: {
      hasDispute: boolean
      confirmedAt: string
      holder: string
      processor: string
      operator: string
    }
    orchestrationResult: string
  } = {
    assetName: args.assetName as string,
    assetDescription: args.assetDescription as string,
    dataType: args.dataType as string,
    ownershipConfirmation: oc as {
      hasDispute: boolean
      confirmedAt: string
      holder: string
      processor: string
      operator: string
    },
    orchestrationResult: args.orchestrationResult as string,
  }
  if (typeof args.region === 'string') {
    result.region = args.region
  }
  return result
}
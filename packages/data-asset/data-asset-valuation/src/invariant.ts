export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`INVARIANT_VIOLATION: ${message}`)
  }
}

export function validateValuationArgs(args: Record<string, unknown>): {
  assetName: string
  costItems: Array<{ category: string; amount: number; year: number }>
  incomeScenarios: Array<{ type: string; annualRevenue: number; annualCost: number; years: number }>
  discountRate?: number
  qualityScore?: number
} {
  if (!args || typeof args !== 'object') {
    throw new Error('INVALID_ARGS: args must be an object')
  }
  if (!args.assetName || typeof args.assetName !== 'string') {
    throw new Error('INVALID_ARGS: assetName is required and must be a string')
  }
  if (!Array.isArray(args.costItems)) {
    throw new Error('INVALID_ARGS: costItems is required and must be an array')
  }
  for (const item of args.costItems) {
    if (typeof item.category !== 'string' || typeof item.amount !== 'number' || typeof item.year !== 'number') {
      throw new Error('INVALID_ARGS: each costItem must have category(string), amount(number), year(number)')
    }
    if (item.amount < 0) {
      throw new Error(`INVALID_ARGS: cost amount cannot be negative for category "${item.category}"`)
    }
  }
  if (!Array.isArray(args.incomeScenarios)) {
    throw new Error('INVALID_ARGS: incomeScenarios is required and must be an array')
  }
  for (const scenario of args.incomeScenarios) {
    if (typeof scenario.type !== 'string' || typeof scenario.annualRevenue !== 'number' || typeof scenario.annualCost !== 'number') {
      throw new Error('INVALID_ARGS: each incomeScenario must have type(string), annualRevenue(number), annualCost(number)')
    }
    if (scenario.annualRevenue < 0 || scenario.annualCost < 0) {
      throw new Error(`INVALID_ARGS: revenue/cost cannot be negative for scenario "${scenario.type}"`)
    }
  }
  const result: {
    assetName: string
    costItems: Array<{ category: string; amount: number; year: number }>
    incomeScenarios: Array<{ type: string; annualRevenue: number; annualCost: number; years: number }>
    discountRate?: number
    qualityScore?: number
  } = {
    assetName: args.assetName as string,
    costItems: args.costItems as Array<{ category: string; amount: number; year: number }>,
    incomeScenarios: args.incomeScenarios as Array<{ type: string; annualRevenue: number; annualCost: number; years: number }>,
  }
  if (typeof args.discountRate === 'number') {
    result.discountRate = args.discountRate
  }
  if (typeof args.qualityScore === 'number') {
    result.qualityScore = args.qualityScore
  }
  return result
}
export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`INVARIANT_VIOLATION: ${message}`)
  }
}

export function validateScanArgs(args: Record<string, unknown>): {
  scanSource: string
  sourceType: 'directory' | 'database'
  outputPathDir?: string
} {
  if (!args || typeof args !== 'object') {
    throw new Error('INVALID_ARGS: args must be an object')
  }
  if (!args.scanSource || typeof args.scanSource !== 'string') {
    throw new Error('INVALID_ARGS: scanSource is required and must be a string')
  }
  if (!args.sourceType || !['directory', 'database'].includes(args.sourceType as string)) {
    throw new Error('INVALID_ARGS: sourceType is required and must be "directory" or "database"')
  }
  const result: {
    scanSource: string
    sourceType: 'directory' | 'database'
    outputPathDir?: string
  } = {
    scanSource: args.scanSource as string,
    sourceType: args.sourceType as 'directory' | 'database',
  }
  if (typeof args.outputPathDir === 'string') {
    result.outputPathDir = args.outputPathDir
  }
  return result
}
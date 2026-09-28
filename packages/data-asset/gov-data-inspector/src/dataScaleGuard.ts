export interface DataScaleCheckResult {
  exceeded: boolean
  fieldCount: number
}

export const DataScaleGuard = {
  check(data: unknown[], maxFieldCount?: number): DataScaleCheckResult {
    const limit = maxFieldCount ?? 1000000
    let fieldCount = 0
    for (const row of data) {
      if (typeof row === 'object' && row !== null) {
        fieldCount += Object.keys(row as Record<string, unknown>).length
      } else {
        fieldCount++
      }
      if (fieldCount > limit) {
        return { exceeded: true, fieldCount }
      }
    }
    return { exceeded: false, fieldCount }
  },
}
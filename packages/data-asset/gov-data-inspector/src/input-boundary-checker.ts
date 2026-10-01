export const InputBoundaryChecker = {
  checkEmpty(data: unknown[]): { isEmpty: boolean } {
    if (!Array.isArray(data) || data.length === 0) return { isEmpty: true }
    for (const item of data) {
      if (typeof item !== 'object' || item === null) return { isEmpty: false }
      const values = Object.values(item as Record<string, unknown>)
      const hasValid = values.some((v) => v !== undefined && v !== null && v !== '' && (typeof v !== 'string' || v.trim() !== ''))
      if (hasValid) return { isEmpty: false }
    }
    return { isEmpty: true }
  },

  checkTooLarge(raw: string, threshold: number): { isTooLarge: boolean; length: number } {
    const length = raw.length
    return { isTooLarge: length > threshold, length }
  },
}
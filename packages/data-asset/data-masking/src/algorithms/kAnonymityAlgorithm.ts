export class KAnonymityAlgorithm {
  anonymize(
    records: Record<string, unknown>[],
    kValue: number,
    quasiIdentifiers: string[],
  ): {
    anonymizedRecords: Record<string, unknown>[]
    actualMinEquivalenceClass: number
    suppressedCount: number
  } {
    if (records.length === 0 || quasiIdentifiers.length === 0) {
      return { anonymizedRecords: records, actualMinEquivalenceClass: 0, suppressedCount: 0 }
    }

    let workingRecords = [...records]
    let generalized = true
    let generalizationLevel = 0

    while (generalized) {
      generalized = false
      const groups = this.groupByQuasiIdentifiers(workingRecords, quasiIdentifiers)
      const minGroupSize = Math.min(...groups.map(g => g.length))

      if (minGroupSize >= kValue) {
        const minClass = Math.min(...groups.map(g => g.length))
        return { anonymizedRecords: workingRecords, actualMinEquivalenceClass: minClass, suppressedCount: 0 }
      }

      if (generalizationLevel < 3) {
        workingRecords = this.generalize(workingRecords, quasiIdentifiers, generalizationLevel)
        generalizationLevel++
        generalized = true
      }
    }

    const groups = this.groupByQuasiIdentifiers(workingRecords, quasiIdentifiers)
    const validGroups = groups.filter(g => g.length >= kValue)
    const suppressedRecords = groups.filter(g => g.length < kValue).flat()

    const anonymizedRecords = validGroups.flat()
    const allGroups = [...validGroups, ...groups.filter(g => g.length < kValue)]
    const actualMin = allGroups.length > 0 ? Math.min(...allGroups.map(g => g.length)) : 0

    return {
      anonymizedRecords,
      actualMinEquivalenceClass: actualMin,
      suppressedCount: suppressedRecords.length,
    }
  }

  private groupByQuasiIdentifiers(
    records: Record<string, unknown>[],
    quasiIdentifiers: string[],
  ): Record<string, unknown>[][] {
    const groups = new Map<string, Record<string, unknown>[]>()

    for (const record of records) {
      const key = quasiIdentifiers.map(qi => String(record[qi] ?? '')).join('|')
      const group = groups.get(key)
      if (group) {
        group.push(record)
      } else {
        groups.set(key, [record])
      }
    }

    return Array.from(groups.values())
  }

  private generalize(
    records: Record<string, unknown>[],
    quasiIdentifiers: string[],
    level: number,
  ): Record<string, unknown>[] {
    return records.map(record => {
      const generalized = { ...record }
      for (const qi of quasiIdentifiers) {
        const value = String(generalized[qi] ?? '')
        if (value.length > level + 1) {
          generalized[qi] = value.substring(0, value.length - level - 1) + '*'.repeat(level + 1)
        } else {
          generalized[qi] = '*'.repeat(value.length)
        }
      }
      return generalized
    })
  }
}
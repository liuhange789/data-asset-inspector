import type { SensitiveField, SensitiveFieldType, SensitivePatterns } from '@liuhange/dsh-data-asset-shared'

export interface ScanResult {
  fields: SensitiveField[]
  typeCounts: Record<string, number>
}

export class SensitiveFieldScanner {
  scan(lines: string[], sensitivePatterns: SensitivePatterns): ScanResult {
    const fields: SensitiveField[] = []
    const typeCounts: Record<string, number> = {}

    const patternEntries = Object.entries(sensitivePatterns) as Array<
      [SensitiveFieldType, { pattern: string; level: string }]
    >

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex] ?? ''
      for (const [type, config] of patternEntries) {
        const regex = new RegExp(config.pattern as string, 'g')
        let match: RegExpExecArray | null
        while ((match = regex.exec(line)) !== null) {
          fields.push({
            type,
            value: match[0],
            line: lineIndex + 1,
            column: match.index + 1,
          })
          typeCounts[type] = (typeCounts[type] ?? 0) + 1
        }
      }
    }

    return { fields, typeCounts }
  }
}

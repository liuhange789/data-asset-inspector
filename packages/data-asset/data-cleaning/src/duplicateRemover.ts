export interface DuplicateRemoverResult {
  cleanedLines: string[]
  duplicateRemoved: number
}

export class DuplicateRemover {
  remove(lines: string[]): DuplicateRemoverResult {
    const seen = new Set<string>()
    const cleanedLines: string[] = []

    for (const line of lines) {
      if (!seen.has(line)) {
        seen.add(line)
        cleanedLines.push(line)
      }
    }

    return {
      cleanedLines,
      duplicateRemoved: lines.length - cleanedLines.length,
    }
  }
}

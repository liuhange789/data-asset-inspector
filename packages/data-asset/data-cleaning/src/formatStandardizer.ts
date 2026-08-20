export class FormatStandardizer {
  standardize(lines: string[]): string[] {
    return lines.map(line => line.replace(/\s+/g, ' ').trim())
  }
}

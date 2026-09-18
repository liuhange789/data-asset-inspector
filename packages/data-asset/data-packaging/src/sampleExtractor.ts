import { FileFormatAdapter } from '@liuhange/dsh-data-asset-shared'

export class SampleExtractor {
  private readonly formatAdapter = new FileFormatAdapter()

  async extract(filePath: string, lineCount = 5): Promise<string[]> {
    const readResult = await this.formatAdapter.read(filePath)
    return readResult.lines.slice(0, lineCount)
  }
}

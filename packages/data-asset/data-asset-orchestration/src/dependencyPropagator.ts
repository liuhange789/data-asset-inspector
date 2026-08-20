import * as path from 'path'

export class DependencyPropagator {
  propagateMaskingToCleaning(maskingOutputPath: string): string {
    return maskingOutputPath
  }

  propagateCleaningToInventory(cleanedOutputPath: string): string {
    return path.dirname(cleanedOutputPath)
  }

  propagateCleaningToPackaging(cleanedOutputPath: string): string {
    return cleanedOutputPath
  }

  getMaskedOutputPath(inputPath: string): string {
    const ext = path.extname(inputPath)
    const baseName = path.basename(inputPath, ext)
    return path.join(path.dirname(inputPath), `${baseName}_masked${ext}`)
  }

  getCleanedOutputPath(inputPath: string): string {
    const ext = path.extname(inputPath)
    const baseName = path.basename(inputPath, ext)
    return path.join(path.dirname(inputPath), `${baseName}_cleaned${ext}`)
  }
}

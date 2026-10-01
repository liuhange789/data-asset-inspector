export class CodeUniquenessValidator {
  private readonly codeSet: Set<string> = new Set()

  validate(assetCode: string): boolean {
    if (this.codeSet.has(assetCode)) {
      return false
    }
    this.codeSet.add(assetCode)
    return true
  }

  has(assetCode: string): boolean {
    return this.codeSet.has(assetCode)
  }

  clear(): void {
    this.codeSet.clear()
  }

  size(): number {
    return this.codeSet.size
  }
}
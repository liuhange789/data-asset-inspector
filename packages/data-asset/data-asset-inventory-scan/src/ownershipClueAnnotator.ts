export interface OwnershipClueRules {
  holdingRightFields: string[]
  usageRightFields: string[]
  operationRightFields: string[]
}

export interface OwnershipClues {
  holdingRight: string
  usageRight: string
  operationRight: string
}

export class OwnershipClueAnnotator {
  constructor(private rules: OwnershipClueRules) {}

  annotate(metadata: Record<string, unknown>): OwnershipClues {
    return {
      holdingRight: this._extractFirst(metadata, this.rules.holdingRightFields),
      usageRight: this._extractFirst(metadata, this.rules.usageRightFields),
      operationRight: this._extractFirst(metadata, this.rules.operationRightFields),
    }
  }

  private _extractFirst(metadata: Record<string, unknown>, fields: string[]): string {
    for (const field of fields) {
      const value = metadata[field]
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value)
      }
    }
    return ''
  }
}
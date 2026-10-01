import type { EncodingRuleConfig } from './types.js'

export class SequentialCodeAllocator {
  private current: number
  private readonly max: number
  private readonly start: number

  constructor(config: EncodingRuleConfig) {
    this.start = config.sequentialCodeStart
    this.current = config.sequentialCodeStart
    this.max = config.sequentialCodeMax
  }

  allocate(): number | null {
    if (this.current > this.max) {
      return null
    }
    const value = this.current
    this.current++
    return value
  }

  reset(): void {
    this.current = this.start
  }
}
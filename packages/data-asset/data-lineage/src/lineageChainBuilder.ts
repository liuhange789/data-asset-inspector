import type { LineageStep, LineageChain } from './types.js'

export class LineageChainBuilder {
  private steps: LineageStep[] = []
  private chainIntact = true
  private brokenAt: number | undefined

  append(step: LineageStep): void {
    if (this.steps.length > 0 && this.chainIntact) {
      const prevStep = this.steps[this.steps.length - 1]!
      if (step.input.hash !== null && prevStep.output.hash !== null && step.input.hash !== prevStep.output.hash) {
        this.chainIntact = false
        this.brokenAt = this.steps.length
      }
    }
    this.steps.push(step)
  }

  flush(): LineageChain {
    const result: LineageChain = {
      steps: this.steps,
      chainIntact: this.chainIntact,
      generatedAt: new Date().toISOString(),
    }
    if (this.brokenAt !== undefined) {
      result.brokenAt = this.brokenAt
    }
    return result
  }

  reset(): void {
    this.steps = []
    this.chainIntact = true
    this.brokenAt = undefined
  }
}
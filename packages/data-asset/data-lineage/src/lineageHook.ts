import type { LineageStep, LineageChain, LineageHook } from './types.js'
import type { LineageConfig } from '@liuhange/dsh-data-asset-shared'
import { HashCalculator } from './hashCalculator.js'
import { LineageChainBuilder } from './lineageChainBuilder.js'

interface PendingStep {
  stepName: string
  timestamp: string
  inputPath: string
  inputHash: string | null
  parameters: Record<string, unknown>
}

export class LineageHookImpl implements LineageHook {
  private config: LineageConfig
  private hashCalculator: HashCalculator
  private chainBuilder: LineageChainBuilder
  private pendingStep: PendingStep | null = null

  constructor(config: LineageConfig) {
    this.config = config
    this.hashCalculator = new HashCalculator()
    this.chainBuilder = new LineageChainBuilder()
  }

  recordBefore(toolName: string, inputPath: string, params: Record<string, unknown>): void {
    if (!this.config.enabled) {
      return
    }
    const hash = this.hashCalculator.calculate(inputPath, this.config.hashAlgorithm as 'SHA-256' | 'SHA-512')
    this.pendingStep = {
      stepName: toolName,
      timestamp: new Date().toISOString(),
      inputPath,
      inputHash: hash,
      parameters: params,
    }
  }

  recordAfter(toolName: string, outputPath: string, transformRule: string): void {
    if (!this.config.enabled || this.pendingStep === null) {
      return
    }
    const outputHash = this.hashCalculator.calculate(outputPath, this.config.hashAlgorithm as 'SHA-256' | 'SHA-512')
    const step: LineageStep = {
      stepName: toolName,
      timestamp: this.pendingStep.timestamp,
      input: { filePath: this.pendingStep.inputPath, hash: this.pendingStep.inputHash },
      output: { filePath: outputPath, hash: outputHash },
      transformRule,
      parameters: this.pendingStep.parameters,
    }
    this.chainBuilder.append(step)
    this.pendingStep = null
  }

  isEnabled(): boolean {
    return this.config.enabled
  }

  flush(): LineageChain {
    return this.chainBuilder.flush()
  }

  reset(): void {
    this.chainBuilder.reset()
    this.pendingStep = null
  }
}
import type { LineageStep } from './types.js'

export class LineageRecorder {
  record(
    stepName: string,
    inputPath: string,
    outputPath: string,
    transformRule: string,
    parameters: Record<string, unknown>,
    inputHash: string | null,
    outputHash: string | null,
  ): LineageStep {
    return {
      stepName,
      timestamp: new Date().toISOString(),
      input: { filePath: inputPath, hash: inputHash },
      output: { filePath: outputPath, hash: outputHash },
      transformRule,
      parameters,
    }
  }
}
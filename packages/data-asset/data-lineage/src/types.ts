export interface LineageFileRef {
  filePath: string
  hash: string | null
}

export interface LineageStep {
  stepName: string
  timestamp: string
  input: LineageFileRef
  output: LineageFileRef
  transformRule: string
  parameters: Record<string, unknown>
}

export interface LineageChain {
  steps: LineageStep[]
  chainIntact: boolean
  brokenAt?: number
  generatedAt: string
}

export interface TraceDataLineageParams {
  lineageFilePath: string
  outputFormat?: 'json' | 'mermaid' | 'markdown' | 'all'
}

export interface TraceDataLineageResult {
  jsonPath?: string
  mermaidPath?: string
  markdownPath?: string
  report: LineageChain
  stepCount: number
  chainIntact: boolean
  status: 'SUCCESS' | 'FAILED'
}

export interface LineageHook {
  recordBefore(toolName: string, inputPath: string, params: Record<string, unknown>): void
  recordAfter(toolName: string, outputPath: string, transformRule: string): void
  isEnabled(): boolean
  flush(): LineageChain
}
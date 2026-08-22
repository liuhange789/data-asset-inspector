export type ChartType = 'bar' | 'comparison' | 'pie' | 'radar' | 'flowchart'

export interface GenerateVisualizationParams {
  reportPaths: {
    masking?: string
    cleaning?: string
    inventory?: string
    quality?: string
    lineage?: string
  }
  outputPath: string
}

export interface ChartRenderResult {
  type: ChartType
  title: string
  svgContent: string
  dataAvailable: boolean
  errorMessage?: string
}

export interface GenerateVisualizationResult {
  htmlPath: string
  chartCount: number
  chartsRendered: string[]
  status: 'SUCCESS' | 'FAILED'
  configStatus: string
}

export interface ReportDataLoadResult {
  data: unknown
  error?: string
}
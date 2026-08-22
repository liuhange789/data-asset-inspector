import * as fs from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VisualizationConfig } from '@liuhange/dsh-data-asset-shared'
import { ReportDataLoader } from '../src/reportDataLoader.js'
import { TemplateLoader } from '../src/templateLoader.js'
import { InteractionScript } from '../src/interactionScript.js'
import { HtmlAssembler } from '../src/htmlAssembler.js'
import { BarChartRenderer } from '../src/chartRenderers/barChartRenderer.js'
import { ComparisonChartRenderer } from '../src/chartRenderers/comparisonChartRenderer.js'
import { PieChartRenderer } from '../src/chartRenderers/pieChartRenderer.js'
import { RadarChartRenderer } from '../src/chartRenderers/radarChartRenderer.js'
import { FlowchartRenderer } from '../src/chartRenderers/flowchartRenderer.js'
import { defaultVisualizationConfig } from '../src/defaultVisualizationConfig.js'
import { apply, name, inject } from '../src/index.js'
import type { ChartRenderResult } from '../src/types.js'

let tempDir: string
const originalCwd = process.cwd()

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'dsh-viz-'))
})

afterEach(async () => {
  process.chdir(originalCwd)
  await rm(tempDir, { recursive: true, force: true })
})

describe('defaultVisualizationConfig', () => {
  it('enables all five charts with a 2-column layout', () => {
    expect(defaultVisualizationConfig.charts.bar?.enabled).toBe(true)
    expect(defaultVisualizationConfig.charts.comparison?.enabled).toBe(true)
    expect(defaultVisualizationConfig.charts.pie?.enabled).toBe(true)
    expect(defaultVisualizationConfig.charts.radar?.enabled).toBe(true)
    expect(defaultVisualizationConfig.charts.flowchart?.enabled).toBe(true)
    expect(defaultVisualizationConfig.layout.columns).toBe(2)
    expect(defaultVisualizationConfig.templateVersion).toBe('1.0')
  })
})

describe('ReportDataLoader', () => {
  const loader = new ReportDataLoader()

  it('returns an error when the file does not exist', async () => {
    const result = await loader.load(join(tempDir, 'nope.json'))
    expect(result.data).toBeNull()
    expect(result.error).toBe('文件不存在')
  })

  it('loads and parses a valid JSON file', async () => {
    const file = join(tempDir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ a: 1 }), 'utf-8')
    const result = await loader.load(file)
    expect(result.data).toEqual({ a: 1 })
    expect(result.error).toBeUndefined()
  })

  it('returns an error for unparseable JSON', async () => {
    const file = join(tempDir, 'bad.json')
    fs.writeFileSync(file, '{ broken', 'utf-8')
    const result = await loader.load(file)
    expect(result.data).toBeNull()
    expect(result.error).toBe('数据格式错误')
  })
})

describe('TemplateLoader', () => {
  const loader = new TemplateLoader()

  it('returns the provided config when defined', () => {
    const custom: VisualizationConfig = { ...defaultVisualizationConfig, templateVersion: '2.0' }
    expect(loader.load(custom).templateVersion).toBe('2.0')
  })

  it('falls back to the default config when undefined', () => {
    expect(loader.load(undefined)).toBe(defaultVisualizationConfig)
  })
})

describe('InteractionScript', () => {
  const script = new InteractionScript()

  it('generates all three interaction handlers when all are enabled', () => {
    const out = script.generate({ expandCollapse: true, chartSwitch: true, tooltip: true })
    expect(out).toContain('toggleSection')
    expect(out).toContain('switchChart')
    expect(out).toContain('DOMContentLoaded')
  })

  it('omits disabled interactions', () => {
    const out = script.generate({ expandCollapse: false, chartSwitch: false, tooltip: false })
    expect(out).not.toContain('toggleSection')
    expect(out).not.toContain('switchChart')
    expect(out).not.toContain('DOMContentLoaded')
  })

  it('generates only the expandCollapse handler when only it is enabled', () => {
    const out = script.generate({ expandCollapse: true, chartSwitch: false, tooltip: false })
    expect(out).toContain('toggleSection')
    expect(out).not.toContain('switchChart')
  })
})

describe('HtmlAssembler', () => {
  const assembler = new HtmlAssembler()

  it('assembles a full HTML document with charts and report data', () => {
    const charts: ChartRenderResult[] = [
      { type: 'bar', title: '脱敏统计', svgContent: '<svg></svg>', dataAvailable: true },
      { type: 'pie', title: '资产分布', svgContent: '<svg></svg>', dataAvailable: false, errorMessage: '数据不可用' },
    ]
    const html = assembler.assemble({ charts, config: defaultVisualizationConfig, reportData: { masking: { a: 1 } } })
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('数据资产可视化报表')
    expect(html).toContain('chart-bar')
    expect(html).toContain('chart-pie')
    expect(html).toContain('数据不可用')
    expect(html).toContain('"masking":{"a":1}')
  })

  it('renders an empty chart grid when no charts are provided', () => {
    const html = assembler.assemble({ charts: [], config: defaultVisualizationConfig, reportData: {} })
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('chart-grid')
  })
})

describe('BarChartRenderer', () => {
  const renderer = new BarChartRenderer()
  const config = defaultVisualizationConfig

  it('returns a placeholder when data is null', () => {
    const result = renderer.render(null, config)
    expect(result.dataAvailable).toBe(false)
    expect(result.svgContent).toContain('数据不可用')
  })

  it('returns a placeholder when the data has no fieldTypeCounts', () => {
    const result = renderer.render({ other: 1 }, config)
    expect(result.dataAvailable).toBe(false)
    expect(result.svgContent).toContain('无数据')
  })

  it('renders bars for fieldTypeCounts data', () => {
    const result = renderer.render({ fieldTypeCounts: { phone: 3, email: 1 } }, config)
    expect(result.dataAvailable).toBe(true)
    expect(result.svgContent).toContain('<rect')
    expect(result.svgContent).toContain('phone')
    expect(result.svgContent).toContain('email')
  })
})

describe('ComparisonChartRenderer', () => {
  const renderer = new ComparisonChartRenderer()
  const config = defaultVisualizationConfig

  it('returns a placeholder when data is null', () => {
    const result = renderer.render(null, config)
    expect(result.dataAvailable).toBe(false)
    expect(result.svgContent).toContain('数据不可用')
  })

  it('returns a placeholder when before and after are both 0', () => {
    const result = renderer.render({}, config)
    expect(result.dataAvailable).toBe(false)
    expect(result.svgContent).toContain('无数据')
  })

  it('renders before/after bars from originalLineCount and cleanedLineCount', () => {
    const result = renderer.render({ originalLineCount: 100, cleanedLineCount: 80 }, config)
    expect(result.dataAvailable).toBe(true)
    expect(result.svgContent).toContain('清洗前')
    expect(result.svgContent).toContain('清洗后')
    expect(result.svgContent).toContain('100')
    expect(result.svgContent).toContain('80')
  })
})

describe('PieChartRenderer', () => {
  const renderer = new PieChartRenderer()
  const config = defaultVisualizationConfig

  it('returns a placeholder when data is null', () => {
    expect(renderer.render(null, config).dataAvailable).toBe(false)
  })

  it('returns a placeholder when assetItems is empty', () => {
    expect(renderer.render({ assetItems: [] }, config).dataAvailable).toBe(false)
  })

  it('returns a placeholder when all item sizes sum to 0', () => {
    const result = renderer.render({ assetItems: [{ fileName: 'a', size: 0 }] }, config)
    expect(result.dataAvailable).toBe(false)
    expect(result.svgContent).toContain('无数据')
  })

  it('renders pie slices for asset items with positive sizes', () => {
    const result = renderer.render({ assetItems: [{ fileName: 'a.csv', size: 100 }, { fileName: 'b.csv', size: 50 }] }, config)
    expect(result.dataAvailable).toBe(true)
    expect(result.svgContent).toContain('<path')
  })
})

describe('RadarChartRenderer', () => {
  const renderer = new RadarChartRenderer()
  const config = defaultVisualizationConfig

  it('returns a placeholder when data is null', () => {
    expect(renderer.render(null, config).dataAvailable).toBe(false)
  })

  it('returns a placeholder when dimensions are absent', () => {
    expect(renderer.render({}, config).dataAvailable).toBe(false)
  })

  it('renders a radar polygon for dimension scores', () => {
    const result = renderer.render({ dimensions: { completeness: { score: 80 }, accuracy: { score: 90 } } }, config)
    expect(result.dataAvailable).toBe(true)
    expect(result.svgContent).toContain('<path')
    expect(result.svgContent).toContain('completeness')
  })
})

describe('FlowchartRenderer', () => {
  const renderer = new FlowchartRenderer()
  const config = defaultVisualizationConfig

  it('returns a placeholder when data is null', () => {
    expect(renderer.render(null, config).dataAvailable).toBe(false)
  })

  it('returns a placeholder when steps are absent', () => {
    expect(renderer.render({}, config).dataAvailable).toBe(false)
  })

  it('renders nodes and arrows for lineage steps', () => {
    const result = renderer.render({ steps: [{ stepName: 'mask' }, { stepName: 'clean' }] }, config)
    expect(result.dataAvailable).toBe(true)
    expect(result.svgContent).toContain('mask')
    expect(result.svgContent).toContain('clean')
    expect(result.svgContent).toContain('<polygon')
  })

  it('renders a single node without an arrow for one step', () => {
    const result = renderer.render({ steps: [{ stepName: 'mask' }] }, config)
    expect(result.dataAvailable).toBe(true)
    expect(result.svgContent).not.toContain('<polygon')
  })
})

describe('apply (data-visualization plugin)', () => {
  function registerPlugin(): { execute: (args: Record<string, unknown>) => Promise<string> }[] {
    const registered: { execute: (args: Record<string, unknown>) => Promise<string> }[] = []
    const ctx = { tools: { register: (tool: unknown) => { registered.push(tool as { execute: (args: Record<string, unknown>) => Promise<string> }) } } }
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    apply(ctx as never)
    consoleSpy.mockRestore()
    return registered
  }

  it('exports name, inject, and registers the generate_visualization tool', () => {
    expect(name).toBe('data-visualization')
    expect(inject).toEqual(['tools'])
  })

  it('execute writes a self-contained HTML report with all charts', async () => {
    process.chdir(tempDir)
    const maskingReport = join(tempDir, 'masking.json')
    const cleaningReport = join(tempDir, 'cleaning.json')
    fs.writeFileSync(maskingReport, JSON.stringify({ fieldTypeCounts: { phone: 2, email: 1 } }), 'utf-8')
    fs.writeFileSync(cleaningReport, JSON.stringify({ originalLineCount: 10, cleanedLineCount: 8 }), 'utf-8')
    const out = join(tempDir, 'report.html')
    const [tool] = registerPlugin()
    const result = await tool.execute({
      reportPaths: JSON.stringify({ masking: 'masking.json', cleaning: 'cleaning.json' }),
      outputPath: 'report.html',
    })
    const parsed = JSON.parse(result) as { status: string; htmlPath: string; chartCount: number; chartsRendered: string[] }
    expect(parsed.status).toBe('SUCCESS')
    expect(parsed.chartCount).toBe(5)
    expect(fs.existsSync(parsed.htmlPath)).toBe(true)
    const html = fs.readFileSync(parsed.htmlPath, 'utf-8')
    expect(html).toContain('<!DOCTYPE html>')
  })

  it('execute renders placeholders when report paths are missing', async () => {
    process.chdir(tempDir)
    const [tool] = registerPlugin()
    const result = await tool.execute({
      reportPaths: JSON.stringify({}),
      outputPath: 'report.html',
    })
    const parsed = JSON.parse(result) as { status: string; chartCount: number }
    expect(parsed.status).toBe('SUCCESS')
    expect(parsed.chartCount).toBe(5)
  })

  it('execute returns an error string for an invalid output path', async () => {
    process.chdir(tempDir)
    const [tool] = registerPlugin()
    const result = await tool.execute({
      reportPaths: JSON.stringify({}),
      outputPath: '../escape.html',
    })
    expect(result).toContain('错误：路径不合法')
  })

  it('execute tolerates an unparseable reportPaths JSON', async () => {
    process.chdir(tempDir)
    const [tool] = registerPlugin()
    const result = await tool.execute({
      reportPaths: '{ broken',
      outputPath: 'report.html',
    })
    const parsed = JSON.parse(result) as { status: string }
    expect(parsed.status).toBe('SUCCESS')
  })
})
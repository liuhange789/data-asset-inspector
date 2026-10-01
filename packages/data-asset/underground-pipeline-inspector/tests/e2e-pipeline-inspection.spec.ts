import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFileSync, mkdirSync, existsSync, readFileSync, unlinkSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { apply } from '../src/index.js'

interface RegisteredTool {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute: (args: Record<string, unknown>) => Promise<string>
}

describe('e2e-pipeline-inspection', () => {
  const testDir = resolve(tmpdir(), 'underground-pipeline-e2e')
  const datasetPath = resolve(testDir, 'test-dataset.json')
  const reportJsonPath = resolve(testDir, 'inspection-report.json')
  const reportMarkdownPath = resolve(testDir, 'inspection-report.md')
  const overrideLogPath = resolve(process.cwd(), 'logs', 'override-records.log')

  let tools: RegisteredTool[]

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true })
    tools = []
    const ctx = {
      tools: {
        register: (tool: unknown) => {
          tools.push(tool as RegisteredTool)
        },
      },
    }
    apply(ctx)
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
    if (existsSync(overrideLogPath)) {
      unlinkSync(overrideLogPath)
    }
  })

  const createDataset = (): unknown => ({
    workspaceLayers: ['pipeline_point', 'pipeline_segment', 'pipeline_structure'],
    points: [
      { pointId: 'P-001', pointType: '起点', x: 100.0, y: 200.0, elevation: 10.0, srid: 'CGCS2000_3_degree_GK_Zone_39', verticalDatum: '1985国家高程基准' },
      { pointId: 'P-002', pointType: '终点', x: 110.0, y: 210.0, elevation: 9.0, srid: 'CGCS2000_3_degree_GK_Zone_39', verticalDatum: '1985国家高程基准' },
      { pointId: 'P-003', pointType: '三通', x: 120.0, y: 220.0, elevation: 8.0, srid: 'INVALID_SRID', verticalDatum: '1985国家高程基准' },
    ],
    segments: [
      { segmentId: 'S-001', startPointId: 'P-001', endPointId: 'P-002', diameter: 300, material: '钢管', buryMethod: '直埋', flowDirection: '顺流' },
      { segmentId: 'S-001', startPointId: 'P-002', endPointId: 'P-003', diameter: 200, material: 'PE管', buryMethod: '管沟', flowDirection: '顺流' },
    ],
    structures: [
      { structureId: 'ST-001', structureType: '阀门井', x: 105.0, y: 205.0, elevation: 9.5 },
    ],
  })

  it('注册两个工具 inspect_underground_pipeline 和 submit_review_override', () => {
    const toolNames = tools.map((t) => t.name)
    expect(toolNames).toContain('inspect_underground_pipeline')
    expect(toolNames).toContain('submit_review_override')
  })

  it('完整巡检流程生成报告', async () => {
    writeFileSync(datasetPath, JSON.stringify(createDataset()), 'utf-8')

    const inspectTool = tools.find((t) => t.name === 'inspect_underground_pipeline')!
    const resultRaw = await inspectTool.execute({ datasetFilePath: datasetPath, outputPathDir: testDir })
    const result = JSON.parse(resultRaw) as Record<string, unknown>

    expect(result.reportId).toBeTruthy()
    expect(result.inspectionTime).toBeTruthy()
    expect(result.legalDisclaimer).toContain('辅助工具生成')

    const summary = result.summary as Record<string, unknown>
    expect(summary.totalPoints).toBe(3)
    expect(summary.totalSegments).toBe(2)
    expect(summary.totalStructures).toBe(1)
    expect(summary.totalCheckResults).toBeGreaterThan(0)

    expect(existsSync(reportJsonPath)).toBe(true)
    expect(existsSync(reportMarkdownPath)).toBe(true)
  })

  it('报告JSON含所有必要字段', async () => {
    writeFileSync(datasetPath, JSON.stringify(createDataset()), 'utf-8')

    const inspectTool = tools.find((t) => t.name === 'inspect_underground_pipeline')!
    await inspectTool.execute({ datasetFilePath: datasetPath, outputPathDir: testDir })

    const report = JSON.parse(readFileSync(reportJsonPath, 'utf-8')) as Record<string, unknown>
    expect(report.reportId).toBeTruthy()
    expect(report.inspectionTime).toBeTruthy()
    expect(report.inspectionScope).toBe(datasetPath)
    expect(report.inspectionRatioStatement).toContain('全检比例')
    expect(Array.isArray(report.checkResults)).toBe(true)
    expect(Array.isArray(report.qualityElementScores)).toBe(true)
    expect(report.errorClassStatistics).toBeDefined()
    expect(report.grossErrorRate).toBeDefined()
    expect(report.legalDisclaimer).toBeTruthy()
    expect(Array.isArray(report.policyBasisSummary)).toBe(true)
    expect(report.configVersions).toBeDefined()
  })

  it('检测结果含policyBasis字段', async () => {
    writeFileSync(datasetPath, JSON.stringify(createDataset()), 'utf-8')

    const inspectTool = tools.find((t) => t.name === 'inspect_underground_pipeline')!
    await inspectTool.execute({ datasetFilePath: datasetPath, outputPathDir: testDir })

    const report = JSON.parse(readFileSync(reportJsonPath, 'utf-8')) as {
      checkResults: Array<{ policyBasis: string }>
    }
    expect(report.checkResults.length).toBeGreaterThan(0)
    for (const result of report.checkResults) {
      expect(result.policyBasis).toBeTruthy()
      expect(result.policyBasis).toContain('依据：')
    }
  })

  it('人工复核覆盖流程', async () => {
    writeFileSync(datasetPath, JSON.stringify(createDataset()), 'utf-8')

    const inspectTool = tools.find((t) => t.name === 'inspect_underground_pipeline')!
    await inspectTool.execute({ datasetFilePath: datasetPath, outputPathDir: testDir })

    const overrideTool = tools.find((t) => t.name === 'submit_review_override')!
    const overrideResultRaw = await overrideTool.execute({
      objectId: 'S-001',
      overrideConclusion: '误判',
      overrideReason: '经核实该重复管段为数据合并遗留，实际不重复',
      operator: 'quality-officer-001',
      inspectionReportPath: reportJsonPath,
    })
    const overrideResult = JSON.parse(overrideResultRaw) as Record<string, unknown>

    expect(overrideResult.success).toBe(true)
    expect(overrideResult.objectId).toBe('S-001')
    expect(overrideResult.newConclusion).toBe('误判')
    expect(overrideResult.message).toContain('已记录')
  })

  it('文件不存在时返回FILE_NOT_FOUND错误', async () => {
    const inspectTool = tools.find((t) => t.name === 'inspect_underground_pipeline')!
    const resultRaw = await inspectTool.execute({ datasetFilePath: '/nonexistent/path.json' })
    const result = JSON.parse(resultRaw) as Record<string, unknown>
    expect(result.error).toBe('FILE_NOT_FOUND')
  })

  it('参数缺失时返回INPUT_INVALID错误', async () => {
    const inspectTool = tools.find((t) => t.name === 'inspect_underground_pipeline')!
    const resultRaw = await inspectTool.execute({})
    const result = JSON.parse(resultRaw) as Record<string, unknown>
    expect(result.error).toBe('INPUT_INVALID')
  })

  it('Markdown报告含法律免责声明', async () => {
    writeFileSync(datasetPath, JSON.stringify(createDataset()), 'utf-8')

    const inspectTool = tools.find((t) => t.name === 'inspect_underground_pipeline')!
    await inspectTool.execute({ datasetFilePath: datasetPath, outputPathDir: testDir })

    const markdown = readFileSync(reportMarkdownPath, 'utf-8')
    expect(markdown).toContain('地下管线数据质量巡检报告')
    expect(markdown).toContain('辅助工具生成')
    expect(markdown).toContain('全检比例')
    expect(markdown).toContain('质量元素评分')
    expect(markdown).toContain('错误分类统计')
    expect(markdown).toContain('管线点粗差率')
  })
})
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFileSync, mkdirSync, existsSync, unlinkSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'

interface RegisteredTool {
  name: string
  execute: (args: Record<string, unknown>) => Promise<string>
}

describe('e2e geo data quality inspection', () => {
  const testDir = resolve(tmpdir(), 'geo-quality-e2e')
  const datasetPath = resolve(testDir, 'test-dataset.json')

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  const loadPlugin = async (): Promise<RegisteredTool[]> => {
    const tools: RegisteredTool[] = []
    const mod = await import('../src/index.js')
    mod.apply({
      tools: {
        register: (tool: unknown) => {
          tools.push(tool as RegisteredTool)
        },
      },
    })
    return tools
  }

  it('GeoJSON 数据集完整巡检流程', async () => {
    const dataset = {
      format: 'GeoJSON',
      spatialReference: {
        srid: 'CGCS2000',
        verticalDatum: '1985国家高程基准',
      },
      features: [
        {
          featureId: 'F-001',
          featureType: '建筑物',
          classificationCode: '110000',
          geometry: { type: 'Point', coordinates: [116.0, 40.0, 100.5] },
          properties: { name: '测试建筑' },
        },
        {
          featureId: 'F-002',
          featureType: '道路',
          classificationCode: '130000',
          geometry: { type: 'LineString', coordinates: [[116.0, 40.0], [116.1, 40.0]] },
          properties: { roadName: '测试路' },
        },
      ],
      checkPoints: Array.from({ length: 25 }, (_, i) => ({
        pointId: `CP-${String(i).padStart(3, '0')}`,
        measuredElevation: 100.1,
        referenceElevation: 100.0,
        measuredX: 116.0 + i * 0.001,
        measuredY: 40.0 + i * 0.001,
        referenceX: 116.0 + i * 0.001,
        referenceY: 40.0 + i * 0.001,
      })),
    }

    writeFileSync(datasetPath, JSON.stringify(dataset), 'utf-8')

    const tools = await loadPlugin()
    const inspectTool = tools.find((t) => t.name === 'inspect_geo_data_quality')
    expect(inspectTool).toBeDefined()

    const resultRaw = await inspectTool!.execute({
      datasetFilePath: datasetPath,
      outputPathDir: testDir,
    })
    const result = JSON.parse(resultRaw) as Record<string, unknown>

    expect(result.error).toBeUndefined()
    expect(result.reportId).toBeDefined()
    expect(result.summary).toBeDefined()
    expect(result.legalDisclaimer).toContain('辅助工具')
    expect(result.reportPaths).toBeDefined()

    const jsonPath = resolve(testDir, 'inspection-report.json')
    const mdPath = resolve(testDir, 'inspection-report.md')
    expect(existsSync(jsonPath)).toBe(true)
    expect(existsSync(mdPath)).toBe(true)
  })

  it('Shapefile 缺少必要文件时阻断后续检查', async () => {
    const dataset = {
      format: 'Shapefile',
      shapefileManifest: {
        basePath: '/data/test.shp',
        existingExtensions: ['.shp'],
        missingExtensions: ['.shx', '.dbf'],
      },
      features: [],
    }

    writeFileSync(datasetPath, JSON.stringify(dataset), 'utf-8')

    const tools = await loadPlugin()
    const inspectTool = tools.find((t) => t.name === 'inspect_geo_data_quality')
    const resultRaw = await inspectTool!.execute({
      datasetFilePath: datasetPath,
      outputPathDir: testDir,
    })
    const result = JSON.parse(resultRaw) as Record<string, unknown>

    expect(result.error).toBeUndefined()
    const summary = result.summary as Record<string, unknown>
    expect(summary.blocked).toBe(true)
    expect(summary.classAErrors).toBe(1)
  })

  it('空间参考系无法解析时跳过精度检查', async () => {
    const dataset = {
      format: 'GeoJSON',
      features: [
        {
          featureId: 'F-001',
          geometry: { type: 'Point', coordinates: [116.0, 40.0] },
          properties: {},
        },
      ],
      checkPoints: Array.from({ length: 25 }, (_, i) => ({
        pointId: `CP-${i}`,
        measuredElevation: 100.1,
        referenceElevation: 100.0,
      })),
    }

    writeFileSync(datasetPath, JSON.stringify(dataset), 'utf-8')

    const tools = await loadPlugin()
    const inspectTool = tools.find((t) => t.name === 'inspect_geo_data_quality')
    const resultRaw = await inspectTool!.execute({
      datasetFilePath: datasetPath,
      outputPathDir: testDir,
    })
    const result = JSON.parse(resultRaw) as Record<string, unknown>

    expect(result.error).toBeUndefined()
    const summary = result.summary as Record<string, unknown>
    expect(summary.spatialReferenceResolvable).toBe(false)
  })

  it('参数缺失返回 INPUT_INVALID', async () => {
    const tools = await loadPlugin()
    const inspectTool = tools.find((t) => t.name === 'inspect_geo_data_quality')
    const resultRaw = await inspectTool!.execute({})
    const result = JSON.parse(resultRaw) as Record<string, unknown>
    expect(result.error).toBe('INPUT_INVALID')
  })

  it('文件不存在返回 FILE_NOT_FOUND', async () => {
    const tools = await loadPlugin()
    const inspectTool = tools.find((t) => t.name === 'inspect_geo_data_quality')
    const resultRaw = await inspectTool!.execute({
      datasetFilePath: '/nonexistent/path.json',
    })
    const result = JSON.parse(resultRaw) as Record<string, unknown>
    expect(result.error).toBe('FILE_NOT_FOUND')
  })

  it('submit_review_override 工具注册', async () => {
    const tools = await loadPlugin()
    const overrideTool = tools.find((t) => t.name === 'submit_review_override')
    expect(overrideTool).toBeDefined()
  })
})
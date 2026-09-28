import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'

const tmpDir = resolve(tmpdir(), 'gov-data-inspector-test')
const badJsonPath = resolve(tmpDir, 'bad.json')
const emptyPath = resolve(tmpDir, 'empty.json')
const emptyArrayPath = resolve(tmpDir, 'empty-array.json')
const nonUtf8Path = resolve(tmpDir, 'non-utf8.json')
const partialDataPath = resolve(tmpDir, 'partial.json')
const validDataPath = resolve(tmpDir, 'valid.json')

beforeAll(() => {
  mkdirSync(tmpDir, { recursive: true })
  writeFileSync(badJsonPath, '{ "事项名称": "测试", invalid json }', 'utf-8')
  writeFileSync(emptyPath, '', 'utf-8')
  writeFileSync(emptyArrayPath, '[]', 'utf-8')
  const gbkBuffer = Buffer.from([0xB2, 0xE2, 0xCA, 0xD4])
  writeFileSync(nonUtf8Path, gbkBuffer)
  writeFileSync(partialDataPath, JSON.stringify([{ 事项名称: '测试事项' }]), 'utf-8')
  writeFileSync(validDataPath, JSON.stringify([{ 事项名称: '食品经营许可', 办理时限: '20个工作日' }]), 'utf-8')
})

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

async function getExecute() {
  const mod = await import('../index.js')
  const tools: unknown[] = []
  mod.apply({ tools: { register: (t: unknown) => tools.push(t) } })
  const tool = tools[0] as { execute: (args: Record<string, unknown>) => Promise<string> }
  return tool.execute
}

describe('异常输入处理', () => {
  it('格式错误的JSON → 返回GOV_DATA_INPUT_INVALID', async () => {
    const execute = await getExecute()
    const result = JSON.parse(await execute({ dataSource: badJsonPath }))
    expect(result.error).toBe('GOV_DATA_INPUT_INVALID')
    expect(result.message).toContain('JSON 格式错误')
  })

  it('空数据(空文件) → 返回无数据提示', async () => {
    const execute = await getExecute()
    const result = JSON.parse(await execute({ dataSource: emptyPath }))
    expect(result.error).toBe('GOV_DATA_INPUT_INVALID')
    expect(result.message).toContain('无数据')
  })

  it('空数据(空数组) → 返回无数据提示', async () => {
    const execute = await getExecute()
    const result = JSON.parse(await execute({ dataSource: emptyArrayPath }))
    expect(result.error).toBe('GOV_DATA_INPUT_INVALID')
    expect(result.message).toContain('无数据')
  })

  it('无效URL → 返回不可达提示而非崩溃', async () => {
    const execute = await getExecute()
    const result = JSON.parse(await execute({ dataSource: 'http://invalid.localhost.nonexistent:99999/data.json' }))
    expect(result.error).toBeDefined()
    expect(result.message).toBeDefined()
  })

  it('部分字段缺失的数据 → 正常处理并报告缺失字段', async () => {
    const execute = await getExecute()
    const result = JSON.parse(await execute({ dataSource: partialDataPath, inspectionMode: 'guide' }))
    expect(result.error).toBeUndefined()
    expect(result.guideInspection).toBeDefined()
    expect(result.guideInspection.missingFields).toBeGreaterThan(0)
  })

  it('非UTF-8编码文件 → 返回编码错误提示', async () => {
    const execute = await getExecute()
    const result = JSON.parse(await execute({ dataSource: nonUtf8Path }))
    expect(result.error).toBe('GOV_DATA_ENCODING_ERROR')
    expect(result.message).toContain('UTF-8')
  })
})

describe('EncodingDetector', () => {
  it('UTF-8文件正常读取', async () => {
    const { EncodingDetector } = await import('../encodingDetector.js')
    const result = EncodingDetector.detect(validDataPath)
    expect(result.content).not.toBeNull()
    expect(result.encodingError).toBeUndefined()
  })

  it('非UTF-8文件返回编码错误', async () => {
    const { EncodingDetector } = await import('../encodingDetector.js')
    const result = EncodingDetector.detect(nonUtf8Path)
    expect(result.content).toBeNull()
    expect(result.encodingError).toContain('UTF-8')
  })

  it('不存在的文件返回读取错误', async () => {
    const { EncodingDetector } = await import('../encodingDetector.js')
    const result = EncodingDetector.detect(resolve(tmpDir, 'nonexistent.json'))
    expect(result.content).toBeNull()
    expect(result.encodingError).toContain('无法读取')
  })
})

describe('DataScaleGuard', () => {
  it('正常规模数据通过', async () => {
    const { DataScaleGuard } = await import('../dataScaleGuard.js')
    const data = [{ a: 1, b: 2 }, { c: 3 }]
    const result = DataScaleGuard.check(data)
    expect(result.exceeded).toBe(false)
    expect(result.fieldCount).toBe(3)
  })

  it('超100万字段数据返回exceeded=true', async () => {
    const { DataScaleGuard } = await import('../dataScaleGuard.js')
    const data: Record<string, unknown>[] = []
    for (let i = 0; i < 100001; i++) data.push({ f: i })
    const result = DataScaleGuard.check(data, 100000)
    expect(result.exceeded).toBe(true)
    expect(result.fieldCount).toBeGreaterThan(100000)
  })

  it('自定义上限', async () => {
    const { DataScaleGuard } = await import('../dataScaleGuard.js')
    const result = DataScaleGuard.check([{ a: 1, b: 2, c: 3 }], 2)
    expect(result.exceeded).toBe(true)
  })
})

describe('UrlReachabilityChecker', () => {
  it('本地文件存在 → reachable=true', async () => {
    const { UrlReachabilityChecker } = await import('../urlReachabilityChecker.js')
    const result = await UrlReachabilityChecker.check(validDataPath)
    expect(result.reachable).toBe(true)
  })

  it('不存在的文件 → reachable=false', async () => {
    const { UrlReachabilityChecker } = await import('../urlReachabilityChecker.js')
    const result = await UrlReachabilityChecker.check(resolve(tmpDir, 'nonexistent.json'))
    expect(result.reachable).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('空路径 → reachable=false', async () => {
    const { UrlReachabilityChecker } = await import('../urlReachabilityChecker.js')
    const result = await UrlReachabilityChecker.check('')
    expect(result.reachable).toBe(false)
  })
})

describe('EndpointResolver', () => {
  it('HTTPS URL → kind=https', async () => {
    const { EndpointResolver } = await import('../endpointResolver.js')
    const result = EndpointResolver.resolve('https://api.example.com/data')
    expect(result?.kind).toBe('https')
  })

  it('HTTP URL → kind=http', async () => {
    const { EndpointResolver } = await import('../endpointResolver.js')
    const result = EndpointResolver.resolve('http://api.example.com/data')
    expect(result?.kind).toBe('http')
  })

  it('本地文件路径 → kind=file', async () => {
    const { EndpointResolver } = await import('../endpointResolver.js')
    const result = EndpointResolver.resolve(validDataPath)
    expect(result?.kind).toBe('file')
  })

  it('相对路径 → kind=file', async () => {
    const { EndpointResolver } = await import('../endpointResolver.js')
    const result = EndpointResolver.resolve('./data.json')
    expect(result?.kind).toBe('file')
  })

  it('非法字符串 → null', async () => {
    const { EndpointResolver } = await import('../endpointResolver.js')
    const result = EndpointResolver.resolve('not-a-valid-endpoint')
    expect(result).toBeNull()
  })
})

describe('DegradedModeController', () => {
  it('activate返回degradedMode=true', async () => {
    const { DegradedModeController } = await import('../degradedModeController.js')
    const result = DegradedModeController.activate('测试降级原因')
    expect(result.degradedMode).toBe(true)
    expect(result.degradedReason).toBe('测试降级原因')
    expect(result.localKb).toBeDefined()
    expect(result.localKb.timeLimits).toEqual([])
    expect(result.localKb.materials).toEqual([])
    expect(result.localKb.conditions).toEqual([])
  })
})

describe('UnmatchedWarningBuilder', () => {
  it('build返回正确警告结构', async () => {
    const { UnmatchedWarningBuilder } = await import('../unmatchedWarningBuilder.js')
    const warning = UnmatchedWarningBuilder.build('guide-001')
    expect(warning.type).toBe('UNMATCHED_ITEM_TYPE')
    expect(warning.guideId).toBe('guide-001')
    expect(warning.message).toContain('未匹配到检测规则')
  })
})
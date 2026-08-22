import * as fs from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LineageConfig } from '@liuhange/dsh-data-asset-shared'
import { HashCalculator } from '../src/hashCalculator.js'
import { LineageRecorder } from '../src/lineageRecorder.js'
import { LineageChainBuilder } from '../src/lineageChainBuilder.js'
import { MermaidGenerator } from '../src/mermaidGenerator.js'
import { LineageReportGenerator } from '../src/lineageReportGenerator.js'
import { LineageHookImpl } from '../src/lineageHook.js'
import { defaultLineageConfig } from '../src/defaultLineageConfig.js'
import { apply, name, inject } from '../src/index.js'
import type { LineageStep, LineageChain } from '../src/types.js'

let tempDir: string
const originalCwd = process.cwd()

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'dsh-lineage-'))
})

afterEach(async () => {
  process.chdir(originalCwd)
  await rm(tempDir, { recursive: true, force: true })
})

function makeStep(stepName: string, inputHash: string | null, outputHash: string | null): LineageStep {
  return {
    stepName,
    timestamp: '2026-08-22T00:00:00.000Z',
    input: { filePath: `/in/${stepName}.csv`, hash: inputHash },
    output: { filePath: `/out/${stepName}.csv`, hash: outputHash },
    transformRule: 'mask',
    parameters: { strategy: 'FULL' },
  }
}

function makeChain(intact: boolean, brokenAt?: number): LineageChain {
  const chain: LineageChain = {
    steps: [makeStep('mask', 'h1', 'h2'), makeStep('clean', 'h2', 'h3')],
    chainIntact: intact,
    generatedAt: '2026-08-22T00:00:00.000Z',
  }
  if (brokenAt !== undefined) {
    chain.brokenAt = brokenAt
  }
  return chain
}

describe('defaultLineageConfig', () => {
  it('is disabled by default with SHA-256', () => {
    expect(defaultLineageConfig.enabled).toBe(false)
    expect(defaultLineageConfig.hashAlgorithm).toBe('SHA-256')
    expect(defaultLineageConfig.storagePath).toBe('lineage')
  })
})

describe('HashCalculator', () => {
  const calc = new HashCalculator()

  it('calculates a SHA-256 hex digest for an existing file', () => {
    const file = join(tempDir, 'a.txt')
    fs.writeFileSync(file, 'hello', 'utf-8')
    const hash = calc.calculate(file)
    expect(hash).toBeTypeOf('string')
    expect(hash).toHaveLength(64)
  })

  it('calculates a SHA-512 digest when requested', () => {
    const file = join(tempDir, 'a.txt')
    fs.writeFileSync(file, 'hello', 'utf-8')
    const hash = calc.calculate(file, 'SHA-512')
    expect(hash).toBeTypeOf('string')
    expect(hash).toHaveLength(128)
  })

  it('returns null when the file does not exist', () => {
    expect(calc.calculate(join(tempDir, 'nope.txt'))).toBeNull()
  })
})

describe('LineageRecorder', () => {
  const recorder = new LineageRecorder()

  it('records a step with input/output file refs and parameters', () => {
    const step = recorder.record('mask', '/in.csv', '/out.csv', 'mask', { strategy: 'FULL' }, 'h1', 'h2')
    expect(step.stepName).toBe('mask')
    expect(step.input).toEqual({ filePath: '/in.csv', hash: 'h1' })
    expect(step.output).toEqual({ filePath: '/out.csv', hash: 'h2' })
    expect(step.transformRule).toBe('mask')
    expect(step.parameters).toEqual({ strategy: 'FULL' })
    expect(step.timestamp).toBeTypeOf('string')
  })
})

describe('LineageChainBuilder', () => {
  it('builds an intact chain when output hash matches the next input hash', () => {
    const builder = new LineageChainBuilder()
    builder.append(makeStep('mask', 'h1', 'h2'))
    builder.append(makeStep('clean', 'h2', 'h3'))
    const chain = builder.flush()
    expect(chain.chainIntact).toBe(true)
    expect(chain.steps).toHaveLength(2)
    expect(chain.brokenAt).toBeUndefined()
  })

  it('marks the chain broken when a later input hash differs from the previous output hash', () => {
    const builder = new LineageChainBuilder()
    builder.append(makeStep('mask', 'h1', 'h2'))
    builder.append(makeStep('clean', 'hX', 'h3'))
    const chain = builder.flush()
    expect(chain.chainIntact).toBe(false)
    expect(chain.brokenAt).toBe(1)
  })

  it('keeps the chain intact when the next input hash is null', () => {
    const builder = new LineageChainBuilder()
    builder.append(makeStep('mask', 'h1', 'h2'))
    builder.append(makeStep('clean', null, 'h3'))
    const chain = builder.flush()
    expect(chain.chainIntact).toBe(true)
  })

  it('flush returns a single-step chain without cross-step checks', () => {
    const builder = new LineageChainBuilder()
    builder.append(makeStep('mask', 'h1', 'h2'))
    const chain = builder.flush()
    expect(chain.chainIntact).toBe(true)
    expect(chain.steps).toHaveLength(1)
  })

  it('reset clears steps and restores the intact state', () => {
    const builder = new LineageChainBuilder()
    builder.append(makeStep('mask', 'h1', 'h2'))
    builder.reset()
    builder.append(makeStep('clean', 'h9', 'h0'))
    const chain = builder.flush()
    expect(chain.chainIntact).toBe(true)
    expect(chain.steps).toHaveLength(1)
  })
})

describe('MermaidGenerator', () => {
  const gen = new MermaidGenerator()

  it('returns a bare flowchart header for an empty chain', () => {
    const chain: LineageChain = { steps: [], chainIntact: true, generatedAt: '2026-08-22T00:00:00.000Z' }
    expect(gen.generate(chain)).toBe('flowchart LR')
  })

  it('renders nodes and edges for a multi-step chain', () => {
    const chain = makeChain(true)
    const md = gen.generate(chain)
    expect(md).toContain('flowchart LR')
    expect(md).toContain('S0[mask\\nmask]')
    expect(md).toContain('S1[clean\\nmask]')
    expect(md).toContain('S0 -->|mask| S1')
  })

  it('renders a single node without edges for a one-step chain', () => {
    const chain: LineageChain = { steps: [makeStep('mask', 'h1', 'h2')], chainIntact: true, generatedAt: '2026-08-22T00:00:00.000Z' }
    const md = gen.generate(chain)
    expect(md).toContain('S0[mask\\nmask]')
    expect(md).not.toContain('-->')
  })
})

describe('LineageReportGenerator', () => {
  const generator = new LineageReportGenerator()

  it('writeJson creates the parent dir and writes the chain as JSON', async () => {
    const out = join(tempDir, 'nested', 'lineage.json')
    await generator.writeJson(out, makeChain(true))
    const parsed = JSON.parse(fs.readFileSync(out, 'utf-8')) as LineageChain
    expect(parsed.steps).toHaveLength(2)
    expect(parsed.chainIntact).toBe(true)
  })

  it('writeMermaid writes the Mermaid diagram', async () => {
    const out = join(tempDir, 'lineage.mmd')
    await generator.writeMermaid(out, makeChain(true))
    const content = fs.readFileSync(out, 'utf-8')
    expect(content).toContain('flowchart LR')
    expect(content).toContain('S0')
  })

  it('writeMarkdown renders step table and trace path for a non-empty chain', async () => {
    const out = join(tempDir, 'lineage_report.md')
    await generator.writeMarkdown(out, makeChain(false, 1))
    const md = fs.readFileSync(out, 'utf-8')
    expect(md).toContain('【数据血缘追踪报告】')
    expect(md).toContain('> 链完整性: 断裂')
    expect(md).toContain('> 断裂位置: 步骤 1')
    expect(md).toContain('| 0 | mask |')
    expect(md).toContain('mask → clean')
  })

  it('writeMarkdown renders empty placeholders for a chain with no steps', async () => {
    const out = join(tempDir, 'lineage_report.md')
    const chain: LineageChain = { steps: [], chainIntact: true, generatedAt: '2026-08-22T00:00:00.000Z' }
    await generator.writeMarkdown(out, chain)
    const md = fs.readFileSync(out, 'utf-8')
    expect(md).toContain('无血缘步骤')
    expect(md).toContain('无追溯路径')
  })

  it('writeAll writes json, mermaid, and markdown from a base .json path', async () => {
    const base = join(tempDir, 'lineage.json')
    const paths = await generator.writeAll(base, makeChain(true))
    expect(fs.existsSync(paths.jsonPath)).toBe(true)
    expect(fs.existsSync(paths.mermaidPath)).toBe(true)
    expect(fs.existsSync(paths.markdownPath)).toBe(true)
  })

  it('writeAll writes into a directory when the base is not a .json path', async () => {
    const dir = join(tempDir, 'out')
    const paths = await generator.writeAll(dir, makeChain(true))
    expect(paths.jsonPath).toBe(join(dir, 'lineage.json'))
    expect(fs.existsSync(paths.jsonPath)).toBe(true)
    expect(fs.existsSync(paths.mermaidPath)).toBe(true)
    expect(fs.existsSync(paths.markdownPath)).toBe(true)
  })
})

describe('LineageHookImpl', () => {
  it('isEnabled reflects the config enabled flag', () => {
    const enabled = new LineageHookImpl({ ...defaultLineageConfig, enabled: true })
    const disabled = new LineageHookImpl(defaultLineageConfig)
    expect(enabled.isEnabled()).toBe(true)
    expect(disabled.isEnabled()).toBe(false)
  })

  it('skips recording when disabled', () => {
    const hook = new LineageHookImpl(defaultLineageConfig)
    hook.recordBefore('mask', '/in.csv', {})
    hook.recordAfter('mask', '/out.csv', 'mask')
    const chain = hook.flush()
    expect(chain.steps).toHaveLength(0)
  })

  it('records before/after and builds a step for an enabled hook', () => {
    const inFile = join(tempDir, 'in.csv')
    const outFile = join(tempDir, 'out.csv')
    fs.writeFileSync(inFile, 'a', 'utf-8')
    fs.writeFileSync(outFile, 'b', 'utf-8')
    const hook = new LineageHookImpl({ ...defaultLineageConfig, enabled: true })
    hook.recordBefore('mask', inFile, { strategy: 'FULL' })
    hook.recordAfter('mask', outFile, 'mask')
    const chain = hook.flush()
    expect(chain.steps).toHaveLength(1)
    expect(chain.steps[0]!.stepName).toBe('mask')
    expect(chain.steps[0]!.input.hash).not.toBeNull()
    expect(chain.steps[0]!.output.hash).not.toBeNull()
  })

  it('records null hashes for non-existent files', () => {
    const hook = new LineageHookImpl({ ...defaultLineageConfig, enabled: true })
    hook.recordBefore('mask', join(tempDir, 'nope.csv'), {})
    hook.recordAfter('mask', join(tempDir, 'nope2.csv'), 'mask')
    const chain = hook.flush()
    expect(chain.steps[0]!.input.hash).toBeNull()
    expect(chain.steps[0]!.output.hash).toBeNull()
  })

  it('skips recordAfter when no pending step exists', () => {
    const hook = new LineageHookImpl({ ...defaultLineageConfig, enabled: true })
    hook.recordAfter('mask', '/out.csv', 'mask')
    expect(hook.flush().steps).toHaveLength(0)
  })

  it('reset clears the chain and pending step', () => {
    const hook = new LineageHookImpl({ ...defaultLineageConfig, enabled: true })
    hook.recordBefore('mask', '/in.csv', {})
    hook.reset()
    hook.recordAfter('mask', '/out.csv', 'mask')
    expect(hook.flush().steps).toHaveLength(0)
  })
})

describe('apply (data-lineage plugin)', () => {
  function registerPlugin(): { execute: (args: Record<string, unknown>) => Promise<string> }[] {
    const registered: { execute: (args: Record<string, unknown>) => Promise<string> }[] = []
    const ctx = { tools: { register: (tool: unknown) => { registered.push(tool as { execute: (args: Record<string, unknown>) => Promise<string> }) } } }
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    apply(ctx as never)
    consoleSpy.mockRestore()
    return registered
  }

  it('exports name, inject, and registers the trace_data_lineage tool', () => {
    expect(name).toBe('data-lineage')
    expect(inject).toEqual(['tools'])
  })

  it('execute with outputFormat all writes json, mermaid, and markdown', async () => {
    process.chdir(tempDir)
    const lineageFile = join(tempDir, 'lineage.json')
    fs.writeFileSync(lineageFile, JSON.stringify(makeChain(true)), 'utf-8')
    const [tool] = registerPlugin()
    const result = await tool.execute({ lineageFilePath: 'lineage.json', outputFormat: 'all' })
    const parsed = JSON.parse(result) as { status: string; stepCount: number; chainIntact: boolean; jsonPath: string; mermaidPath: string; markdownPath: string }
    expect(parsed.status).toBe('SUCCESS')
    expect(parsed.stepCount).toBe(2)
    expect(parsed.chainIntact).toBe(true)
    expect(fs.existsSync(parsed.jsonPath)).toBe(true)
    expect(fs.existsSync(parsed.mermaidPath)).toBe(true)
    expect(fs.existsSync(parsed.markdownPath)).toBe(true)
  })

  it('execute with outputFormat json writes only the json export', async () => {
    process.chdir(tempDir)
    const lineageFile = join(tempDir, 'lineage.json')
    fs.writeFileSync(lineageFile, JSON.stringify(makeChain(true)), 'utf-8')
    const [tool] = registerPlugin()
    const result = await tool.execute({ lineageFilePath: 'lineage.json', outputFormat: 'json' })
    const parsed = JSON.parse(result) as { jsonPath: string; mermaidPath?: string; markdownPath?: string }
    expect(fs.existsSync(parsed.jsonPath)).toBe(true)
    expect(parsed.mermaidPath).toBeUndefined()
    expect(parsed.markdownPath).toBeUndefined()
  })

  it('execute defaults outputFormat to all when omitted', async () => {
    process.chdir(tempDir)
    const lineageFile = join(tempDir, 'lineage.json')
    fs.writeFileSync(lineageFile, JSON.stringify(makeChain(true)), 'utf-8')
    const [tool] = registerPlugin()
    const result = await tool.execute({ lineageFilePath: 'lineage.json' })
    const parsed = JSON.parse(result) as { jsonPath: string; mermaidPath: string; markdownPath: string }
    expect(parsed.jsonPath).toBeDefined()
    expect(parsed.mermaidPath).toBeDefined()
    expect(parsed.markdownPath).toBeDefined()
  })

  it('execute returns an error string for an invalid path', async () => {
    process.chdir(tempDir)
    const [tool] = registerPlugin()
    const result = await tool.execute({ lineageFilePath: '../escape.json' })
    expect(result).toContain('错误：路径不合法')
  })

  it('execute returns an error string when the file does not exist', async () => {
    process.chdir(tempDir)
    const [tool] = registerPlugin()
    const result = await tool.execute({ lineageFilePath: 'missing.json' })
    expect(result).toContain('错误：文件不存在')
  })

  it('execute returns an error string when the lineage file is unparseable', async () => {
    process.chdir(tempDir)
    const lineageFile = join(tempDir, 'lineage.json')
    fs.writeFileSync(lineageFile, '{ broken', 'utf-8')
    const [tool] = registerPlugin()
    const result = await tool.execute({ lineageFilePath: 'lineage.json' })
    expect(result).toContain('错误：无法解析血缘文件')
  })
})
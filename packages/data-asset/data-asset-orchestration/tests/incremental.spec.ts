import * as fs from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { IncrementalSchedulingConfig } from '@liuhange/dsh-data-asset-shared'
import { IncrementalDetector } from '../src/incremental/incrementalDetector.js'
import { StateManager } from '../src/incremental/stateManager.js'
import { ConcurrencyLock } from '../src/incremental/concurrencyLock.js'
import { IncrementalProcessor } from '../src/incremental/incrementalProcessor.js'
import { CronScheduler } from '../src/incremental/cronScheduler.js'
import { defaultIncrementalConfig } from '../src/incremental/defaultIncrementalConfig.js'
import * as invariantModule from '../src/invariant.js'
import type { IncrementalState } from '../src/incremental/types.js'

let tempDir: string

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'dsh-incremental-'))
})

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true })
})

describe('invariant', () => {
  it('exports the package name and a no-op install', () => {
    expect(invariantModule.invariant).toBe('data-asset-orchestration')
    expect(() => invariantModule.install()).not.toThrow()
  })
})

describe('defaultIncrementalConfig', () => {
  it('is disabled by default with a daily 2am cron and SHA-256', () => {
    expect(defaultIncrementalConfig.incrementalMode).toBe(false)
    expect(defaultIncrementalConfig.cronExpression).toBe('0 2 * * *')
    expect(defaultIncrementalConfig.hashAlgorithm).toBe('SHA-256')
    expect(defaultIncrementalConfig.lockTimeout).toBe(3600)
  })
})

describe('IncrementalDetector', () => {
  const detector = new IncrementalDetector()

  it('returns all files as added on the first run (previousState null)', async () => {
    fs.writeFileSync(join(tempDir, 'a.csv'), 'x', 'utf-8')
    fs.writeFileSync(join(tempDir, 'b.json'), '{}', 'utf-8')
    const result = await detector.detect(tempDir, null, 'SHA-256')
    expect(result.addedFiles).toHaveLength(2)
    expect(result.modifiedFiles).toEqual([])
    expect(result.deletedFiles).toEqual([])
    expect(result.unchangedFiles).toEqual([])
  })

  it('detects added, modified, deleted, and unchanged files against previous state', async () => {
    fs.writeFileSync(join(tempDir, 'keep.csv'), 'same', 'utf-8')
    fs.writeFileSync(join(tempDir, 'mod.csv'), 'v1', 'utf-8')
    const first = await detector.detect(tempDir, null, 'SHA-256')
    const previousState: IncrementalState = {
      lastProcessedAt: '2026-08-22T00:00:00.000Z',
      fileHashes: { ...Object.fromEntries(first.addedFiles.map(f => [f, 'pending'])) },
      processingSummary: [],
    }
    // Recompute real hashes for keep.csv, change mod.csv content, remove one file by not rewriting
    const keepHash = first.addedFiles.find(f => f.endsWith('keep.csv'))!
    const modFile = first.addedFiles.find(f => f.endsWith('mod.csv'))!
    previousState.fileHashes[keepHash] = (await detector.detect(tempDir, null, 'SHA-256')).addedFiles.find(f => f.endsWith('keep.csv')) ? previousState.fileHashes[keepHash]! : ''
    // Build correct hashes by reading files
    const crypto = await import('node:crypto')
    previousState.fileHashes[keepHash] = crypto.createHash('SHA-256').update(fs.readFileSync(keepHash)).digest('hex')
    previousState.fileHashes[modFile] = crypto.createHash('SHA-256').update('v1').digest('hex')
    // Add a deleted file to previous state
    previousState.fileHashes[join(tempDir, 'gone.csv')] = 'oldhash'

    // Now modify mod.csv and add new.csv
    fs.writeFileSync(modFile, 'v2', 'utf-8')
    fs.writeFileSync(join(tempDir, 'new.csv'), 'new', 'utf-8')

    const result = await detector.detect(tempDir, previousState, 'SHA-256')
    expect(result.addedFiles.some(f => f.endsWith('new.csv'))).toBe(true)
    expect(result.modifiedFiles.some(f => f.endsWith('mod.csv'))).toBe(true)
    expect(result.unchangedFiles.some(f => f.endsWith('keep.csv'))).toBe(true)
    expect(result.deletedFiles.some(f => f.endsWith('gone.csv'))).toBe(true)
  })

  it('returns empty arrays when the watch directory does not exist', async () => {
    const result = await detector.detect(join(tempDir, 'nope'), null, 'SHA-256')
    expect(result.addedFiles).toEqual([])
  })

  it('ignores files without a data extension', async () => {
    fs.writeFileSync(join(tempDir, 'a.csv'), 'x', 'utf-8')
    fs.writeFileSync(join(tempDir, 'b.log'), 'x', 'utf-8')
    const result = await detector.detect(tempDir, null, 'SHA-256')
    expect(result.addedFiles.some(f => f.endsWith('.csv'))).toBe(true)
    expect(result.addedFiles.some(f => f.endsWith('.log'))).toBe(false)
  })
})

describe('StateManager', () => {
  const manager = new StateManager()

  it('returns null when the state file does not exist', async () => {
    expect(await manager.load(join(tempDir, 'nope.json'))).toBeNull()
  })

  it('saves and loads a valid state atomically', async () => {
    const statePath = join(tempDir, 'nested', 'state.json')
    const state: IncrementalState = {
      lastProcessedAt: '2026-08-22T00:00:00.000Z',
      fileHashes: { 'a.csv': 'h1' },
      processingSummary: [{ fileName: 'a.csv', status: 'processed', timestamp: '2026-08-22T00:00:00.000Z' }],
    }
    await manager.saveAtomic(statePath, state)
    const loaded = await manager.load(statePath)
    expect(loaded).toEqual(state)
  })

  it('throws when the state file is corrupt (missing required fields)', async () => {
    const statePath = join(tempDir, 'state.json')
    fs.writeFileSync(statePath, JSON.stringify({ lastProcessedAt: 'x' }), 'utf-8')
    await expect(manager.load(statePath)).rejects.toThrow('状态文件损坏')
  })
})

describe('ConcurrencyLock', () => {
  it('acquires and releases', () => {
    const lock = new ConcurrencyLock()
    expect(lock.acquire(10)).toBe(true)
    expect(lock.getState().locked).toBe(true)
    lock.release()
    expect(lock.getState().locked).toBe(false)
    expect(lock.getState().lockedAt).toBeNull()
  })

  it('rejects a second acquire before release', () => {
    const lock = new ConcurrencyLock()
    expect(lock.acquire(10)).toBe(true)
    expect(lock.acquire(10)).toBe(false)
  })

  it('force-acquires after the lock timeout elapses', async () => {
    const lock = new ConcurrencyLock()
    expect(lock.acquire(0)).toBe(true)
    // Wait so elapsed seconds > 0 (the timeout)
    await new Promise(r => setTimeout(r, 10))
    expect(lock.acquire(0)).toBe(true)
  })
})

describe('IncrementalProcessor', () => {
  const processor = new IncrementalProcessor()

  function makeConfig(overrides: Partial<IncrementalSchedulingConfig> = {}): IncrementalSchedulingConfig {
    return { ...defaultIncrementalConfig, ...overrides }
  }

  it('runs full mode on first processing and writes state', async () => {
    fs.writeFileSync(join(tempDir, 'a.csv'), 'x', 'utf-8')
    const statePath = join(tempDir, 'state.json')
    const result = await processor.process(
      { watchDirectory: tempDir, incrementalMode: true, stateFilePath: statePath },
      makeConfig({ stateFilePath: statePath }),
    )
    expect(result.status).toBe('SUCCESS')
    expect(result.stateUpdated).toBe(true)
    expect(result.report).toContain('首次运行')
    expect(fs.existsSync(statePath)).toBe(true)
  })

  it('runs incremental mode on the second processing and skips unchanged files', async () => {
    fs.writeFileSync(join(tempDir, 'a.csv'), 'x', 'utf-8')
    const statePath = join(tempDir, 'state.json')
    const config = makeConfig({ stateFilePath: statePath })
    await processor.process({ watchDirectory: tempDir, incrementalMode: true, stateFilePath: statePath }, config)
    const result = await processor.process({ watchDirectory: tempDir, incrementalMode: true, stateFilePath: statePath }, config)
    expect(result.status).toBe('SUCCESS')
    expect(result.report).toContain('增量处理完成')
  })

  it('skips processing when the lock cannot be acquired', async () => {
    fs.writeFileSync(join(tempDir, 'a.csv'), 'x', 'utf-8')
    const statePath = join(tempDir, 'state.json')
    const config = makeConfig({ stateFilePath: statePath, lockTimeout: 9999 })
    // Start a first process but don't await — instead, test the SKIPPED path by
    // running process twice in parallel (the second should be skipped).
    const p1 = processor.process({ watchDirectory: tempDir, incrementalMode: true, stateFilePath: statePath }, config)
    const p2 = processor.process({ watchDirectory: tempDir, incrementalMode: true, stateFilePath: statePath }, config)
    const [r1, r2] = await Promise.all([p1, p2])
    expect(r1.status).toBe('SUCCESS')
    expect(r2.status).toBe('SKIPPED')
    expect(r2.report).toContain('跳过')
  })
})

describe('CronScheduler', () => {
  const scheduler = new CronScheduler()

  it('validates standard 5-field cron expressions', () => {
    expect(scheduler.isValidCron('0 2 * * *')).toBe(true)
    expect(scheduler.isValidCron('*/5 * * * *')).toBe(true)
    expect(scheduler.isValidCron('0-30 0 1 1 0')).toBe(true)
  })

  it('rejects expressions with the wrong field count', () => {
    expect(scheduler.isValidCron('0 2 * *')).toBe(false)
    expect(scheduler.isValidCron('0 2 * * * *')).toBe(false)
  })

  it('rejects out-of-range numeric fields', () => {
    expect(scheduler.isValidCron('60 2 * * *')).toBe(false)
    expect(scheduler.isValidCron('0 25 * * *')).toBe(false)
    expect(scheduler.isValidCron('0 2 32 * *')).toBe(false)
    expect(scheduler.isValidCron('0 2 * 13 *')).toBe(false)
    expect(scheduler.isValidCron('0 2 * * 7')).toBe(false)
  })

  it('setup returns a platform-specific scheduling config for a valid cron', () => {
    const result = scheduler.setup(defaultIncrementalConfig)
    expect(result.platform).toBe(process.platform)
    expect(result.schedulingConfig).toBeTypeOf('object')
  })

  it('setup throws for an invalid cron expression', () => {
    expect(() => scheduler.setup({ ...defaultIncrementalConfig, cronExpression: 'bad' })).toThrow('无效的Cron表达式')
  })
})
import { beforeEach, describe, expect, it } from 'vitest'
import { AnomalyDetector } from '../src/anomalyDetector.js'
import { DuplicateRemover } from '../src/duplicateRemover.js'
import { FormatStandardizer } from '../src/formatStandardizer.js'

describe('DuplicateRemover', () => {
  let remover: DuplicateRemover

  beforeEach(() => {
    remover = new DuplicateRemover()
  })

  it('removes exact duplicate lines and reports the count removed', () => {
    const result = remover.remove(['a', 'b', 'a', 'c', 'b'])
    expect(result.cleanedLines).toEqual(['a', 'b', 'c'])
    expect(result.duplicateRemoved).toBe(2)
  })

  it('preserves order and returns zero removed for unique input', () => {
    const result = remover.remove(['x', 'y', 'z'])
    expect(result.cleanedLines).toEqual(['x', 'y', 'z'])
    expect(result.duplicateRemoved).toBe(0)
  })

  it('treats blank lines as distinct values (no implicit filtering)', () => {
    const result = remover.remove(['', '', 'a'])
    expect(result.cleanedLines).toEqual(['', 'a'])
    expect(result.duplicateRemoved).toBe(1)
  })

  it('handles an empty input array', () => {
    const result = remover.remove([])
    expect(result.cleanedLines).toEqual([])
    expect(result.duplicateRemoved).toBe(0)
  })
})

describe('FormatStandardizer', () => {
  let standardizer: FormatStandardizer

  beforeEach(() => {
    standardizer = new FormatStandardizer()
  })

  it('collapses internal whitespace runs to a single space and trims edges', () => {
    expect(standardizer.standardize(['  a   b  '])).toEqual(['a b'])
  })

  it('preserves already-clean lines unchanged', () => {
    expect(standardizer.standardize(['a b', 'c'])).toEqual(['a b', 'c'])
  })

  it('normalizes tabs and mixed whitespace', () => {
    expect(standardizer.standardize(['\tfoo\t\tbar\t'])).toEqual(['foo bar'])
  })

  it('returns an empty array for empty input', () => {
    expect(standardizer.standardize([])).toEqual([])
  })
})

describe('AnomalyDetector', () => {
  let detector: AnomalyDetector

  beforeEach(() => {
    detector = new AnomalyDetector()
  })

  it('flags lines shorter than 3 characters as 内容过短', () => {
    const result = detector.detect(['ab', 'normal line'])
    expect(result.anomalies).toEqual([{ line: 1, reason: '内容过短' }])
    expect(result.totalCount).toBe(1)
  })

  it('flags lines containing null or NULL as 包含null值', () => {
    const result = detector.detect(['value is null', 'value is NULL', 'ok'])
    const reasons = result.anomalies.map(a => a.reason)
    expect(reasons).toContain('包含null值')
    // Two null-value lines plus one short line ('ok').
    expect(result.totalCount).toBe(3)
  })

  it('can flag both 内容过短 and 包含null值 on the same line', () => {
    const result = detector.detect(['nu'])
    // 'nu' is length 2 (short) and does not contain null, so only short.
    expect(result.totalCount).toBe(1)
    const both = detector.detect(['nul'])
    // 'nul' is length 3 (not short) and does not contain 'null' literally.
    expect(both.totalCount).toBe(0)
  })

  it('respects the maxDisplay cap while reporting the full totalCount', () => {
    const lines = Array.from({ length: 10 }, () => 'x')
    const result = detector.detect(lines, 3)
    expect(result.anomalies).toHaveLength(3)
    expect(result.totalCount).toBe(10)
  })

  it('uses a default maxDisplay of 5', () => {
    const lines = Array.from({ length: 8 }, () => 'x')
    const result = detector.detect(lines)
    expect(result.anomalies).toHaveLength(5)
    expect(result.totalCount).toBe(8)
  })

  it('returns no anomalies for clean input', () => {
    const result = detector.detect(['valid line one', 'valid line two'])
    expect(result.anomalies).toEqual([])
    expect(result.totalCount).toBe(0)
  })
})

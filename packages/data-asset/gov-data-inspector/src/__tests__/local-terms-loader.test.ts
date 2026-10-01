import { describe, it, expect } from 'vitest'
import { LocalTermsLoader } from '../local-terms-loader.js'
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

describe('LocalTermsLoader', () => {
  const tmpDir = resolve(process.cwd(), 'tmp-test-terms')
  const tmpFile = resolve(tmpDir, 'test-terms.json')

  it('LTL-01: 有效词表路径正常加载', () => {
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(tmpFile, JSON.stringify({ materials: ['身份证原件', '申请表'], conditions: ['年满18周岁'] }), 'utf-8')
    const result = LocalTermsLoader.load(tmpFile)
    expect(result.materials).toContain('身份证原件')
    expect(result.materials).toContain('申请表')
    expect(result.conditions).toContain('年满18周岁')
  })

  it('LTL-02: 不存在路径返回空词表不抛错', () => {
    const result = LocalTermsLoader.load('/nonexistent/path/terms.json')
    expect(result.materials).toEqual([])
    expect(result.conditions).toEqual([])
  })

  it('LTL-03: 空词表文件返回空词表不抛错', () => {
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(tmpFile, JSON.stringify({ materials: [], conditions: [] }), 'utf-8')
    const result = LocalTermsLoader.load(tmpFile)
    expect(result.materials).toEqual([])
    expect(result.conditions).toEqual([])
  })

  it('LTL-04: 未配置路径使用默认路径加载', () => {
    const result = LocalTermsLoader.load()
    expect(Array.isArray(result.materials)).toBe(true)
    expect(Array.isArray(result.conditions)).toBe(true)
  })

  it('cleanup', () => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
  })
})
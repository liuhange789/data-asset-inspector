import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const patchPath = resolve(__dirname, '..', '..', 'cordis.patch.yml')
const patchContent = readFileSync(patchPath, 'utf-8')

describe('cordis.patch.yml 安装阻塞修复', () => {
  it('P0-1: plugin字段值用双引号包裹', () => {
    expect(patchContent).toContain('plugin: "@liuhange/dsh-gov-data-inspector"')
  })

  it('P0-1: version字段用双引号包裹', () => {
    expect(patchContent).toContain('version: "3.1.6"')
  })

  it('P0-2: 顶层数组结构(以- target开头)', () => {
    const lines = patchContent.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'))
    expect(lines[0]!.trim().startsWith('- target:')).toBe(true)
  })

  it('P0-2: 含loaders.web的insert声明', () => {
    expect(patchContent).toContain('target: loaders.web')
    expect(patchContent).toContain('action: insert')
  })

  it('P0-2: 含loaders.headless的insert声明', () => {
    expect(patchContent).toContain('target: loaders.headless')
  })

  it('P0-2: 含tools.register声明', () => {
    expect(patchContent).toContain('target: tools')
    expect(patchContent).toContain('action: register')
  })

  it('P0-2: entry含id和name指向插件', () => {
    expect(patchContent).toContain('id: "@liuhange/dsh-gov-data-inspector"')
    expect(patchContent).toContain('name: "@liuhange/dsh-gov-data-inspector"')
  })

  it('P0-2: 所有@开头值均用双引号包裹', () => {
    const atLines = patchContent.split('\n').filter((l) => l.includes('@liuhange') && !l.trim().startsWith('#'))
    expect(atLines.length).toBeGreaterThan(0)
    for (const line of atLines) {
      expect(line).toContain('"@liuhange')
    }
  })
})
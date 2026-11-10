import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const patchPath = resolve(__dirname, '..', '..', 'cordis.patch.yml')
const patchContent = readFileSync(patchPath, 'utf-8')

describe('cordis.patch.yml 安装格式', () => {
  it('P0-1: 使用 - insert: 结构', () => {
    const lines = patchContent.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'))
    expect(lines[0]!.trim()).toBe('- insert:')
  })

  it('P0-1: insert 列表项的 id 指向本包', () => {
    expect(patchContent).toContain('    - id: "@liuhange/dsh-gov-data-inspector"')
  })

  it('P0-1: insert 列表项的 name 指向本包', () => {
    expect(patchContent).toContain('      name: "@liuhange/dsh-gov-data-inspector"')
  })

  it('P0-1: 不再出现自创的 target / action / entry', () => {
    expect(patchContent).not.toMatch(/^\s*(?:-\s*)?target:/m)
    expect(patchContent).not.toMatch(/^\s*action:/m)
    expect(patchContent).not.toMatch(/^\s*entry:/m)
  })

  it('P0-2: 不写死 version，避免与 package.json 漂移', () => {
    expect(patchContent).not.toMatch(/^\s*version:/m)
  })

  it('P0-2: 所有@开头值均用双引号包裹', () => {
    const atLines = patchContent.split('\n').filter((l) => l.includes('@liuhange') && !l.trim().startsWith('#'))
    expect(atLines.length).toBeGreaterThan(0)
    for (const line of atLines) {
      expect(line).toContain('"@liuhange')
    }
  })
})

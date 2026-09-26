import { describe, it, expect } from 'vitest'

describe('ai-dataset-inspector', () => {
  it('导出name/inject/apply', async () => {
    const mod = await import('../index.js')
    expect(mod.name).toBe('@liuhange/dsh-ai-dataset-inspector')
    expect(mod.inject).toEqual(['tools'])
    expect(typeof mod.apply).toBe('function')
  })

  it('apply注册inspect_ai_dataset工具', async () => {
    const mod = await import('../index.js')
    const tools: unknown[] = []
    mod.apply({ tools: { register: (t: unknown) => tools.push(t) } })
    const tool = tools[0] as { name: string; description: string }
    expect(tool.name).toBe('inspect_ai_dataset')
    expect(tool.description).toContain('AI')
  })
})
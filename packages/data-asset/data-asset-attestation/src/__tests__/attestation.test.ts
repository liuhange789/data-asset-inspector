import { describe, it, expect } from 'vitest'

describe('data-asset-attestation', () => {
  it('导出name/inject/apply', async () => {
    const mod = await import('../index.js')
    expect(mod.name).toBe('@liuhange/dsh-data-asset-attestation')
    expect(mod.inject).toEqual(['tools'])
    expect(typeof mod.apply).toBe('function')
  })

  it('apply注册attest_data_quality工具', async () => {
    const mod = await import('../index.js')
    const tools: unknown[] = []
    mod.apply({ tools: { register: (t: unknown) => tools.push(t) } })
    const tool = tools[0] as { name: string; description: string }
    expect(tool.name).toBe('attest_data_quality')
    expect(tool.description).toContain('鉴证')
  })
})
import { describe, it, expect } from 'vitest'

describe('city-data-classifier', () => {
  it('导出name/inject/apply', async () => {
    const mod = await import('../index.js')
    expect(mod.name).toBe('@liuhange/dsh-city-data-classifier')
    expect(mod.inject).toEqual(['tools'])
    expect(typeof mod.apply).toBe('function')
  })

  it('apply注册classify_city_data和confirm_city_classification工具', async () => {
    const mod = await import('../index.js')
    const tools: unknown[] = []
    mod.apply({ tools: { register: (t: unknown) => tools.push(t) } })
    const tool1 = tools[0] as { name: string; description: string }
    const tool2 = tools[1] as { name: string; description: string }
    expect(tool1.name).toBe('classify_city_data')
    expect(tool1.description).toContain('分类')
    expect(tool2.name).toBe('confirm_city_classification')
  })
})
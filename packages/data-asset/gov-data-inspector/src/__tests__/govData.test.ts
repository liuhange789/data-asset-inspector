import { describe, it, expect } from 'vitest'

describe('gov-data-inspector 回归测试', () => {
  it('导出name/inject/apply', async () => {
    const mod = await import('../index.js')
    expect(mod.name).toBe('@liuhange/dsh-gov-data-inspector')
    expect(mod.inject).toEqual(['tools'])
    expect(typeof mod.apply).toBe('function')
  })

  it('apply注册inspect_gov_data工具', async () => {
    const mod = await import('../index.js')
    const tools: unknown[] = []
    mod.apply({ tools: { register: (t: unknown) => tools.push(t) } })
    const tool = tools[0] as { name: string; description: string }
    expect(tool.name).toBe('inspect_gov_data')
    expect(tool.description).toContain('政务')
  })

  it('工具参数保持dataSource+inspectionMode兼容', async () => {
    const mod = await import('../index.js')
    const tools: unknown[] = []
    mod.apply({ tools: { register: (t: unknown) => tools.push(t) } })
    const tool = tools[0] as {
      parameters: { properties: Record<string, { type: string }> }
    }
    expect(tool.parameters.properties.dataSource).toBeDefined()
    expect(tool.parameters.properties.inspectionMode).toBeDefined()
  })

  it('P0-3: apply注册的工具含output字段', async () => {
    const mod = await import('../index.js')
    const tools: unknown[] = []
    mod.apply({ tools: { register: (t: unknown) => tools.push(t) } })
    const tool = tools[0] as { output: { schema: Record<string, unknown>; render: { type: string } } }
    expect(tool.output).toBeDefined()
    expect(tool.output.schema).toBeDefined()
    expect(tool.output.render).toBeDefined()
  })

  it('P0-3: output.schema描述巡检报告顶层字段', async () => {
    const mod = await import('../index.js')
    const tools: unknown[] = []
    mod.apply({ tools: { register: (t: unknown) => tools.push(t) } })
    const tool = tools[0] as { output: { schema: { properties: Record<string, unknown> } } }
    const props = tool.output.schema.properties
    expect(props.dataSource).toBeDefined()
    expect(props.inspectionMode).toBeDefined()
    expect(props.timestamp).toBeDefined()
    expect(props.policyBasis).toBeDefined()
    expect(props.guideInspection).toBeDefined()
    expect(props.classification).toBeDefined()
  })

  it('P0-3: output.render.type为json', async () => {
    const mod = await import('../index.js')
    const tools: unknown[] = []
    mod.apply({ tools: { register: (t: unknown) => tools.push(t) } })
    const tool = tools[0] as { output: { render: { type: string } } }
    expect(tool.output.render.type).toBe('json')
  })
})
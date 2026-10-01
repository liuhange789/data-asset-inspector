import { describe, it, expect } from 'vitest'
import { ConfigPackSchemaValidator } from '../configPackSchemaValidator.js'
import { normalizeConfigPack } from '../configPack.js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const gdPack = JSON.parse(readFileSync(resolve(__dirname, '..', '..', '..', 'gov-config-gd', 'config-pack.json'), 'utf-8'))
const zjPack = JSON.parse(readFileSync(resolve(__dirname, '..', '..', '..', 'gov-config-zj', 'config-pack.json'), 'utf-8'))

describe('广东省配置包', () => {
  it('Schema 校验通过', () => {
    const normalized = normalizeConfigPack(gdPack)
    const result = ConfigPackSchemaValidator.validate(normalized)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('configPackId 为 gd-gov-2026', () => {
    expect(gdPack.configPackId).toBe('gd-gov-2026')
  })

  it('region 为 广东省', () => {
    expect(gdPack.region).toBe('广东省')
  })

  it('policyBasis 含文号含粤字的政策文件', () => {
    expect(gdPack.policyBasis.some((d: { docNumber: string }) => d.docNumber.includes('粤'))).toBe(true)
  })

  it('dataSourcePriority 省级优先', () => {
    expect(gdPack.dataSourcePriority[0]).toBe('provincial')
  })
})

describe('浙江省配置包', () => {
  it('Schema 校验通过', () => {
    const normalized = normalizeConfigPack(zjPack)
    const result = ConfigPackSchemaValidator.validate(normalized)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('configPackId 为 zj-gov-2026', () => {
    expect(zjPack.configPackId).toBe('zj-gov-2026')
  })

  it('region 为 浙江省', () => {
    expect(zjPack.region).toBe('浙江省')
  })

  it('policyBasis 含文号含浙字的政策文件', () => {
    expect(zjPack.policyBasis.some((d: { docNumber: string }) => d.docNumber.includes('浙'))).toBe(true)
  })

  it('dataSourcePriority 省级优先', () => {
    expect(zjPack.dataSourcePriority[0]).toBe('provincial')
  })
})

describe('地区配置包独立性', () => {
  it('广东省与浙江省 configPackId 不同', () => {
    expect(gdPack.configPackId).not.toBe(zjPack.configPackId)
  })

  it('广东省与浙江省 region 不同', () => {
    expect(gdPack.region).not.toBe(zjPack.region)
  })

  it('广东省与浙江省 dataSourceCredentials 不同', () => {
    expect(gdPack.dataSourceCredentials.national.apiKey).not.toBe(zjPack.dataSourceCredentials.national.apiKey)
  })
})
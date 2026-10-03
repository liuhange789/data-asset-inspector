import { describe, it, expect, afterEach } from 'vitest'
import { ReferenceSystemLoader } from '../configPackLoader.js'
import type { ReferenceSystem } from '../types.js'

const validRefSystem: ReferenceSystem = {
  configVersion: '1.0',
  layer1_govOrders: Array.from({ length: 22 }, (_, i) => ({
    elementName: `要素${i + 1}`,
    sourceDoc: '测试文件',
    docNumber: '国办发〔2018〕45号',
    clause: `第${i + 1}条`,
  })),
  layer2_nationalStandards: [
    { standardNumber: 'GB/T 36114-2018', standardName: '测试规范', elements: [{ elementName: '事项名称', clause: '第5.1节' }] },
  ],
  layer3_provincialStandards: Array.from({ length: 36 }, (_, i) => ({
    elementName: `省级要素${i + 1}`,
    nationalElementMapping: `要素${i + 1}`,
  })),
  layer4_evaluationIndicators: {
    E1: [{ level: 'L1', indicatorCode: 'E1', description: '完整性' }],
    E2: [{ level: 'L1', indicatorCode: 'E2', description: '准确性' }],
    E3: [{ level: 'L1', indicatorCode: 'E3', description: '合规性' }],
    E4: [{ level: 'L1', indicatorCode: 'E4', description: '可用性' }],
  },
}

describe('ReferenceSystemLoader', () => {
  const origEnv = process.env.REFERENCE_SYSTEM_PATH

  afterEach(() => {
    if (origEnv !== undefined) {
      process.env.REFERENCE_SYSTEM_PATH = origEnv
    } else {
      delete process.env.REFERENCE_SYSTEM_PATH
    }
  })

  it('文件存在且结构完整时返回 ReferenceSystem 对象', () => {
    const result = ReferenceSystemLoader.load()
    expect(result.referenceSystem).not.toBeNull()
    expect(result.referenceSystem!.layer1_govOrders).toHaveLength(22)
    expect(result.referenceSystem!.layer3_provincialStandards).toHaveLength(36)
    expect(result.referenceSystem!.layer2_nationalStandards.length).toBeGreaterThanOrEqual(3)
  })

  it('文件缺失时返回 null 并告警 REFERENCE_SYSTEM_MISSING', () => {
    process.env.REFERENCE_SYSTEM_PATH = 'nonexistent-path-12345.json'
    const result = ReferenceSystemLoader.load()
    expect(result.referenceSystem).toBeNull()
    expect(result.warnings.some((w) => w.code === 'REFERENCE_SYSTEM_MISSING')).toBe(true)
  })

  it('四层结构不完整时抛异常', () => {
    process.env.REFERENCE_SYSTEM_PATH = 'nonexistent-path-12345.json'
    const incomplete = { configVersion: '1.0', layer1_govOrders: [], layer2_nationalStandards: [], layer3_provincialStandards: [], layer4_evaluationIndicators: {} }
    const { writeFileSync, unlinkSync } = require('node:fs')
    const tmpPath = 'tmp-ref-incomplete.json'
    writeFileSync(tmpPath, JSON.stringify(incomplete))
    process.env.REFERENCE_SYSTEM_PATH = tmpPath
    expect(() => ReferenceSystemLoader.load()).toThrow('REFERENCE_SYSTEM_INVALID')
    try { unlinkSync(tmpPath) } catch {}
  })

  it('要素数量不匹配时告警但继续加载', () => {
    const { writeFileSync, unlinkSync } = require('node:fs')
    const mismatched = {
      ...validRefSystem,
      layer1_govOrders: validRefSystem.layer1_govOrders.slice(0, 20),
    }
    const tmpPath = 'tmp-ref-mismatch.json'
    writeFileSync(tmpPath, JSON.stringify(mismatched))
    process.env.REFERENCE_SYSTEM_PATH = tmpPath
    const result = ReferenceSystemLoader.load()
    expect(result.referenceSystem).not.toBeNull()
    expect(result.warnings.some((w) => w.code === 'REFERENCE_ELEMENT_COUNT_MISMATCH')).toBe(true)
    try { unlinkSync(tmpPath) } catch {}
  })

  it('含禁止标准时抛异常', () => {
    const { writeFileSync, unlinkSync } = require('node:fs')
    const forbidden = {
      ...validRefSystem,
      layer2_nationalStandards: [
        { standardNumber: 'GB/T 47949-2026', standardName: '禁止标准', elements: [] },
      ],
    }
    const tmpPath = 'tmp-ref-forbidden.json'
    writeFileSync(tmpPath, JSON.stringify(forbidden))
    process.env.REFERENCE_SYSTEM_PATH = tmpPath
    expect(() => ReferenceSystemLoader.load()).toThrow('REFERENCE_SYSTEM_INVALID')
    try { unlinkSync(tmpPath) } catch {}
  })
})
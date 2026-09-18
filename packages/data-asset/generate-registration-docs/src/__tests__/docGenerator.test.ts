import { describe, it, expect } from 'vitest'
import { DocGenerator } from '../docGenerator.js'
import type { OrchestrationResult } from '@liuhange/dsh-data-asset-shared'

const validResult: OrchestrationResult = {
  maskingReport: '脱敏报告，来源合法，合规声明',
  cleaningReport: '清洗报告',
  inventoryReport: '盘点报告，记录数：1000',
  packagingManual: '产品名称：测试数据产品\n格式：csv',
  completedStages: 4,
}

const fullOwnership = {
  holder: '某公司',
  processor: '某公司技术部',
  operator: '某公司数据部',
  hasDispute: false,
  confirmedAt: '2026-09-12T10:00:00Z',
}

describe('DocGenerator', () => {
  const generator = new DocGenerator()

  it('预检通过 → 生成三份材料', () => {
    const docs = generator.generate(validResult, fullOwnership)
    expect(docs).toHaveLength(3)
    expect(docs.map(d => d.name)).toEqual([
      'DATA_DESCRIPTION',
      'SOURCE_LEGALITY_STATEMENT',
      'OWNERSHIP_EXPLANATION',
    ])
  })

  it('字段缺失 → 标注"待企业补充"', () => {
    const incomplete: OrchestrationResult = {
      ...validResult,
      inventoryReport: '无记录数信息',
      packagingManual: '无产品名称',
    }
    const docs = generator.generate(incomplete, fullOwnership)
    const dataDesc = docs.find(d => d.name === 'DATA_DESCRIPTION')
    expect(dataDesc?.status).toBe('PENDING_FIELDS')
    expect(dataDesc?.missingFields).toBeDefined()
  })

  it('部分材料失败 → 保留已生成材料', () => {
    const partialOwnership = {
      holder: '',
      processor: '',
      operator: '',
      hasDispute: false,
      confirmedAt: '2026-09-12T10:00:00Z',
    }
    const docs = generator.generate(validResult, partialOwnership)
    const ownership = docs.find(d => d.name === 'OWNERSHIP_EXPLANATION')
    expect(ownership?.status).toBe('PENDING_FIELDS')
    expect(ownership?.missingFields).toContain('持有权主体')
  })

  it('材料含政策依据章节', () => {
    const docs = generator.generate(validResult, fullOwnership)
    for (const doc of docs) {
      expect(doc.content).toContain('政策依据')
    }
  })
})
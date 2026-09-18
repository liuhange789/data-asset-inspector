import { describe, it, expect } from 'vitest'
import { PrecheckExecutor } from '../precheckExecutor.js'
import type { OrchestrationResult } from '@liuhange/dsh-data-asset-shared'

const validResult: OrchestrationResult = {
  maskingReport: '脱敏报告，来源合法，合规声明',
  cleaningReport: '清洗报告',
  inventoryReport: '盘点报告',
  packagingManual: '包装报告',
  completedStages: 4,
}

const confirmedOwnership = { hasDispute: false, confirmedAt: '2026-09-12T10:00:00Z' }
const disputedOwnership = { hasDispute: true, confirmedAt: '2026-09-12T10:00:00Z' }
const unconfirmedOwnership = { hasDispute: false, confirmedAt: '' }

describe('PrecheckExecutor', () => {
  const executor = new PrecheckExecutor()

  it('四项全通过 → 结论 CAN_REGISTER', () => {
    const report = executor.execute(validResult, confirmedOwnership)
    expect(report.conclusion).toBe('CAN_REGISTER')
    expect(report.failedItems).toHaveLength(0)
    expect(report.checks).toHaveLength(4)
  })

  it('权属有纠纷 → 结论 CANNOT_REGISTER', () => {
    const report = executor.execute(validResult, disputedOwnership)
    expect(report.conclusion).toBe('CANNOT_REGISTER')
    expect(report.failedItems).toContain('权属纠纷检查')
  })

  it('权属未确认 → 结论 PENDING_CONFIRMATION', () => {
    const report = executor.execute(validResult, unconfirmedOwnership)
    expect(report.conclusion).toBe('PENDING_CONFIRMATION')
  })

  it('产物不完整 → 返回缺失项', () => {
    const incomplete: OrchestrationResult = {
      maskingReport: '',
      cleaningReport: '',
      inventoryReport: '',
      packagingManual: '',
      completedStages: 0,
    }
    const report = executor.execute(incomplete, confirmedOwnership)
    expect(report.conclusion).toBe('CANNOT_REGISTER')
    expect(report.failedItems[0]).toContain('体检产物不完整')
  })

  it('来源声明缺失 → UNDETERMINED', () => {
    const noSource: OrchestrationResult = {
      ...validResult,
      maskingReport: '脱敏报告，无相关信息',
    }
    const report = executor.execute(noSource, confirmedOwnership)
    const sourceCheck = report.checks.find(c => c.name === 'SOURCE_COMPLIANCE')
    expect(sourceCheck?.result).toBe('UNDETERMINED')
  })

  it('相同输入相同输出（可重复性）', () => {
    const r1 = executor.execute(validResult, confirmedOwnership)
    const r2 = executor.execute(validResult, confirmedOwnership)
    expect(r1.conclusion).toBe(r2.conclusion)
    expect(r1.checks.length).toBe(r2.checks.length)
  })
})
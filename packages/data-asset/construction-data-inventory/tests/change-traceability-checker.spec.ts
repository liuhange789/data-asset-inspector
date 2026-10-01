import { describe, expect, it, beforeEach } from 'vitest'
import { ChangeTraceabilityChecker } from '../src/change-traceability-checker.js'
import type { ChangeRecord } from '../src/types.js'

describe('ChangeTraceabilityChecker', () => {
  let checker: ChangeTraceabilityChecker

  beforeEach(() => {
    checker = new ChangeTraceabilityChecker()
  })

  it('检测1：未关联资产标记"变更未关联资产"', () => {
    const changes: ChangeRecord[] = [
      {
        changeId: 'CH-001',
        relatedAssetId: '',
        changeReason: '设计变更',
        approvalChain: { initiator: '张三', approver: '李四', approvalTime: '2024-01-01', approvalConclusion: '同意' },
        impactScope: ['A-001'],
        changeDate: '2024-01-01',
      },
    ]
    const result = checker.check(changes, ['A-001'])

    expect(result.results[0]!.assetLinked).toBe(false)
    expect(result.results[0]!.missingItems).toContain('变更未关联资产')
    expect(result.results[0]!.policyBasis).toContain('GB/T 51269-2017')
  })

  it('检测2：缺少变更原因标记"缺少变更原因"', () => {
    const changes: ChangeRecord[] = [
      {
        changeId: 'CH-002',
        relatedAssetId: 'A-001',
        changeReason: '',
        approvalChain: { initiator: '张三', approver: '李四', approvalTime: '2024-01-01', approvalConclusion: '同意' },
        impactScope: ['A-001'],
        changeDate: '2024-01-01',
      },
    ]
    const result = checker.check(changes, ['A-001'])

    expect(result.results[0]!.recordComplete).toBe(false)
    expect(result.results[0]!.missingItems).toContain('缺少变更原因')
  })

  it('检测3：审批链不完整标记缺失项', () => {
    const changes: ChangeRecord[] = [
      {
        changeId: 'CH-003',
        relatedAssetId: 'A-001',
        changeReason: '设计变更',
        approvalChain: { initiator: '张三', approver: '', approvalTime: '', approvalConclusion: '' },
        impactScope: ['A-001'],
        changeDate: '2024-01-01',
      },
    ]
    const result = checker.check(changes, ['A-001'])

    expect(result.results[0]!.approvalChainComplete).toBe(false)
    expect(result.results[0]!.missingItems.some((m) => m.includes('审批链不完整'))).toBe(true)
  })

  it('检测4：影响范围为空标记"影响范围未明确"', () => {
    const changes: ChangeRecord[] = [
      {
        changeId: 'CH-004',
        relatedAssetId: 'A-001',
        changeReason: '设计变更',
        approvalChain: { initiator: '张三', approver: '李四', approvalTime: '2024-01-01', approvalConclusion: '同意' },
        impactScope: [],
        changeDate: '2024-01-01',
      },
    ]
    const result = checker.check(changes, ['A-001'])

    expect(result.results[0]!.impactScopeLinked).toBe(false)
    expect(result.results[0]!.missingItems).toContain('影响范围未明确')
  })

  it('完整变更记录无缺失项', () => {
    const changes: ChangeRecord[] = [
      {
        changeId: 'CH-005',
        relatedAssetId: 'A-001',
        changeReason: '设计变更',
        approvalChain: { initiator: '张三', approver: '李四', approvalTime: '2024-01-01', approvalConclusion: '同意' },
        impactScope: ['A-001'],
        changeDate: '2024-01-01',
      },
    ]
    const result = checker.check(changes, ['A-001'])

    expect(result.results[0]!.assetLinked).toBe(true)
    expect(result.results[0]!.recordComplete).toBe(true)
    expect(result.results[0]!.approvalChainComplete).toBe(true)
    expect(result.results[0]!.impactScopeLinked).toBe(true)
    expect(result.results[0]!.missingItems.length).toBe(0)
  })

  it('变更系统不可用时跳过检测', () => {
    const result = checker.checkWithSkip(null, ['A-001'])

    expect(result.skipped).toBe(true)
    expect(result.warnings.some((w) => w.includes('系统不可用'))).toBe(true)
  })

  it('附加政策依据字段', () => {
    const changes: ChangeRecord[] = [
      {
        changeId: 'CH-006',
        relatedAssetId: 'A-001',
        changeReason: '设计变更',
        approvalChain: { initiator: '张三', approver: '李四', approvalTime: '2024-01-01', approvalConclusion: '同意' },
        impactScope: ['A-001'],
        changeDate: '2024-01-01',
      },
    ]
    const result = checker.check(changes, ['A-001'])

    expect(result.results[0]!.policyBasis).toContain('GB/T 51269-2017')
    expect(result.results[0]!.policyBasis).toContain('变更管理要求')
  })
})
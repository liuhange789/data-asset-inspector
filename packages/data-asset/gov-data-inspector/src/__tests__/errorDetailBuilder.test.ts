import { describe, it, expect } from 'vitest'
import { ErrorDetailBuilder } from '../errorDetailBuilder.js'
import type { ErrorDetail } from '../types.js'

describe('ErrorDetailBuilder', () => {
  it('传入六字段均非空且errorType合法 → 返回ErrorDetail对象', () => {
    const detail = ErrorDetailBuilder.build({
      guideId: 'guide1',
      field: '办理时限',
      errorType: 'semantic',
      description: '办理时限超出法定上限',
      suggestion: '建议调整为20个工作日以内',
    })
    expect(detail.guideId).toBe('guide1')
    expect(detail.field).toBe('办理时限')
    expect(detail.errorType).toBe('semantic')
    expect(detail.severity).toBe('critical')
    expect(detail.description).toBe('办理时限超出法定上限')
    expect(detail.suggestion).toBe('建议调整为20个工作日以内')
  })

  it('传入任一字段为空 → 抛出错误', () => {
    expect(() =>
      ErrorDetailBuilder.build({
        guideId: '',
        field: '办理时限',
        errorType: 'semantic',
        description: 'desc',
        suggestion: 'sug',
      }),
    ).toThrow()
    expect(() =>
      ErrorDetailBuilder.build({
        guideId: 'g1',
        field: '',
        errorType: 'semantic',
        description: 'desc',
        suggestion: 'sug',
      }),
    ).toThrow()
  })

  it('errorType不合法 → 抛出错误', () => {
    expect(() =>
      ErrorDetailBuilder.build({
        guideId: 'g1',
        field: 'f',
        errorType: 'invalid' as never,
        description: 'd',
        suggestion: 's',
      }),
    ).toThrow()
  })

  it('severity未传入时从severityMapping读取映射', () => {
    const detail = ErrorDetailBuilder.build(
      {
        guideId: 'g1',
        field: 'f',
        errorType: 'missing',
        description: 'd',
        suggestion: 's',
      },
      { missing: 'major', semantic: 'critical', logical: 'critical' },
    )
    expect(detail.severity).toBe('major')
  })

  it('传入dataSource与standardClause → 返回的ErrorDetail含该两字段', () => {
    const detail = ErrorDetailBuilder.build({
      guideId: 'g1',
      field: 'f',
      errorType: 'semantic',
      description: 'd',
      suggestion: 's',
      dataSource: 'national',
      standardClause: '行政许可法第四十二条',
    })
    expect(detail.dataSource).toBe('national')
    expect(detail.standardClause).toBe('行政许可法第四十二条')
  })

  it('未传入追溯字段 → 返回的ErrorDetail不含该两字段', () => {
    const detail = ErrorDetailBuilder.build({
      guideId: 'g1',
      field: 'f',
      errorType: 'semantic',
      description: 'd',
      suggestion: 's',
    })
    expect(detail.dataSource).toBeUndefined()
    expect(detail.standardClause).toBeUndefined()
  })

  it('countByType返回值与明细条目数一致', () => {
    const details: ErrorDetail[] = [
      { guideId: 'g1', field: 'f1', errorType: 'missing', severity: 'major', description: 'd', suggestion: 's' },
      { guideId: 'g1', field: 'f2', errorType: 'missing', severity: 'major', description: 'd', suggestion: 's' },
      { guideId: 'g1', field: 'f3', errorType: 'semantic', severity: 'critical', description: 'd', suggestion: 's' },
      { guideId: 'g1', field: 'f4', errorType: 'logical', severity: 'critical', description: 'd', suggestion: 's' },
    ]
    const counts = ErrorDetailBuilder.countByType(details)
    expect(counts.missing).toBe(2)
    expect(counts.semantic).toBe(1)
    expect(counts.logical).toBe(1)
  })
})
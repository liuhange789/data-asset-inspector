import { describe, it, expect } from 'vitest'
import { GrossErrorRateCalculator } from '../src/gross-error-rate-calculator.js'
import { createInspectionConfig } from './test-config-helper.js'
import type { QualityCheckResult } from '../src/types.js'

describe('GrossErrorRateCalculator', () => {
  const calculator = new GrossErrorRateCalculator()
  const config = createInspectionConfig()

  it('无A类错误时粗差率为0且合格', () => {
    const checkResults: QualityCheckResult[] = [
      { checkName: '检查1', errorClass: 'B', objectId: 'O1', description: 'd', policyBasis: 'p' },
      { checkName: '检查2', errorClass: 'C', objectId: 'O2', description: 'd', policyBasis: 'p' },
    ]
    const result = calculator.calculate(checkResults, 100, config)
    expect(result.grossErrorPoints).toBe(0)
    expect(result.rate).toBe(0)
    expect(result.passed).toBe(true)
    expect(result.threshold).toBe(0.05)
  })

  it('粗差率低于阈值时合格', () => {
    const checkResults: QualityCheckResult[] = []
    for (let i = 0; i < 3; i++) {
      checkResults.push({
        checkName: '重复管段检查',
        errorClass: 'A',
        objectId: `O-${i}`,
        description: 'd',
        policyBasis: 'p',
      })
    }
    const result = calculator.calculate(checkResults, 100, config)
    expect(result.grossErrorPoints).toBe(3)
    expect(result.rate).toBe(0.03)
    expect(result.passed).toBe(true)
  })

  it('粗差率超过阈值时不合格', () => {
    const checkResults: QualityCheckResult[] = []
    for (let i = 0; i < 6; i++) {
      checkResults.push({
        checkName: '重复管段检查',
        errorClass: 'A',
        objectId: `O-${i}`,
        description: 'd',
        policyBasis: 'p',
      })
    }
    const result = calculator.calculate(checkResults, 100, config)
    expect(result.grossErrorPoints).toBe(6)
    expect(result.rate).toBe(0.06)
    expect(result.passed).toBe(false)
  })

  it('粗差率等于阈值时合格', () => {
    const checkResults: QualityCheckResult[] = []
    for (let i = 0; i < 5; i++) {
      checkResults.push({
        checkName: '重复管段检查',
        errorClass: 'A',
        objectId: `O-${i}`,
        description: 'd',
        policyBasis: 'p',
      })
    }
    const result = calculator.calculate(checkResults, 100, config)
    expect(result.grossErrorPoints).toBe(5)
    expect(result.rate).toBe(0.05)
    expect(result.passed).toBe(true)
  })

  it('同一对象多个A类错误只计一次', () => {
    const checkResults: QualityCheckResult[] = [
      { checkName: '重复管段检查', errorClass: 'A', objectId: 'O-1', description: 'd', policyBasis: 'p' },
      { checkName: '重复管点检查', errorClass: 'A', objectId: 'O-1', description: 'd', policyBasis: 'p' },
    ]
    const result = calculator.calculate(checkResults, 100, config)
    expect(result.grossErrorPoints).toBe(1)
    expect(result.rate).toBe(0.01)
  })

  it('总点数为0时粗差率为0', () => {
    const checkResults: QualityCheckResult[] = [
      { checkName: '检查', errorClass: 'A', objectId: 'O-1', description: 'd', policyBasis: 'p' },
    ]
    const result = calculator.calculate(checkResults, 0, config)
    expect(result.rate).toBe(0)
    expect(result.passed).toBe(true)
  })

  it('结果含policyBasis字段', () => {
    const result = calculator.calculate([], 100, config)
    expect(result.policyBasis).toBeTruthy()
    expect(result.policyBasis).toContain('广东省地下管线数据检查导则')
  })
})
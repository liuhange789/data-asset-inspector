import { describe, it, expect } from 'vitest'
import { BusinessDayCalculator } from '../src/business-day-calculator.js'
import { defaultHolidayConfig } from '../src/default-threshold-config.js'

describe('BusinessDayCalculator', () => {
  const calculator = new BusinessDayCalculator()
  const holidayConfig = defaultHolidayConfig

  it('计算两个日期之间的工作日（排除周末）', () => {
    const result = calculator.calculateWorkingDays('2026-09-28', '2026-10-02', holidayConfig)
    expect(result.warning).toBeNull()
    expect(result.workingDays).toBeGreaterThan(0)
  })

  it('周五到周一的工作日计算（周末不计入）', () => {
    const result = calculator.calculateWorkingDays('2026-09-18', '2026-09-21', holidayConfig)
    expect(result.workingDays).toBe(2)
  })

  it('排除法定节假日', () => {
    const result = calculator.calculateWorkingDays('2026-09-30', '2026-10-08', holidayConfig)
    expect(result.warning).toBeNull()
    expect(result.workingDays).toBeLessThan(7)
  })

  it('节假日配置缺失时使用自然日计算并返回警告', () => {
    const result = calculator.calculateWorkingDays('2026-09-25', '2026-09-28', null)
    expect(result.warning).toBe('节假日配置缺失，按自然日计算')
    expect(result.workingDays).toBe(4)
  })

  it('空节假日配置使用自然日计算', () => {
    const result = calculator.calculateWorkingDays('2026-09-25', '2026-09-28', {
      version: '1.0.0',
      lastUpdated: '2026-09-30',
      holidays: [],
    })
    expect(result.warning).toBe('节假日配置缺失，按自然日计算')
    expect(result.workingDays).toBe(4)
  })

  it('同一日期返回 1 个工作日（如果是工作日）', () => {
    const result = calculator.calculateWorkingDays('2026-09-30', '2026-09-30', holidayConfig)
    expect(result.workingDays).toBe(1)
  })

  it('同一日期返回 0（如果是周末）', () => {
    const result = calculator.calculateWorkingDays('2026-09-27', '2026-09-27', holidayConfig)
    expect(result.workingDays).toBe(0)
  })

  it('结束日期早于开始日期返回 0', () => {
    const result = calculator.calculateWorkingDays('2026-09-28', '2026-09-25', holidayConfig)
    expect(result.workingDays).toBe(0)
  })

  it('无效日期格式返回 0', () => {
    const result = calculator.calculateWorkingDays('invalid', '2026-09-28', holidayConfig)
    expect(result.workingDays).toBe(0)
    expect(result.warning).toBe('日期格式无效')
  })

  it('国庆假期期间不计为工作日', () => {
    const result = calculator.calculateWorkingDays('2026-10-01', '2026-10-07', holidayConfig)
    expect(result.workingDays).toBe(0)
  })
})
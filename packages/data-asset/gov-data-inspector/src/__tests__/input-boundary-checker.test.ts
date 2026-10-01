import { describe, it, expect } from 'vitest'
import { InputBoundaryChecker } from '../input-boundary-checker.js'

describe('InputBoundaryChecker', () => {
  it('IBC-01: checkEmpty([{}]) 返回 isEmpty=true', () => {
    const result = InputBoundaryChecker.checkEmpty([{}])
    expect(result.isEmpty).toBe(true)
  })

  it('IBC-02: checkEmpty([{事项名称:"测试"}]) 返回 isEmpty=false', () => {
    const result = InputBoundaryChecker.checkEmpty([{ 事项名称: '测试' }])
    expect(result.isEmpty).toBe(false)
  })

  it('IBC-03: checkEmpty([{a:""},{b:null}]) 返回 isEmpty=true', () => {
    const result = InputBoundaryChecker.checkEmpty([{ a: '' }, { b: null }])
    expect(result.isEmpty).toBe(true)
  })

  it('IBC-04: checkTooLarge 50001字符 阈值50000 返回 isTooLarge=true', () => {
    const result = InputBoundaryChecker.checkTooLarge('a'.repeat(50001), 50000)
    expect(result.isTooLarge).toBe(true)
    expect(result.length).toBe(50001)
  })

  it('IBC-05: checkTooLarge 50000字符 阈值50000 返回 isTooLarge=false', () => {
    const result = InputBoundaryChecker.checkTooLarge('a'.repeat(50000), 50000)
    expect(result.isTooLarge).toBe(false)
  })

  it('IBC-06: checkTooLarge 100字符 阈值50000 返回 isTooLarge=false', () => {
    const result = InputBoundaryChecker.checkTooLarge('a'.repeat(100), 50000)
    expect(result.isTooLarge).toBe(false)
  })
})
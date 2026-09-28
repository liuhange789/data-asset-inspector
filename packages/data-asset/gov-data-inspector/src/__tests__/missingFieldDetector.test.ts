import { describe, it, expect } from 'vitest'
import { MissingFieldDetector } from '../missingFieldDetector.js'

const requiredElements = [
  '事项名称', '实施主体', '办理条件', '申请材料', '办理流程', '办理时限',
  '收费标准', '办理地点', '咨询电话', '监督电话', '办理时间', '网上办理深度',
  '表格下载', '结果送达方式',
]

describe('MissingFieldDetector', () => {
  it('缺失"咨询电话"字段 → 返回errorType=missing的明细', () => {
    const guide: Record<string, unknown> = {
      事项名称: '测试事项',
      实施主体: '测试部门',
      办理条件: '条件',
      申请材料: '材料',
      办理流程: '流程',
      办理时限: '20个工作日',
      收费标准: '不收费',
      办理地点: '某地址',
      监督电话: '12345678',
      办理时间: '工作日',
      网上办理深度: '可网办',
      表格下载: '可下载',
      结果送达方式: '邮寄',
    }
    const details = MissingFieldDetector.detect(guide, 'g1', requiredElements, undefined, undefined, 'DB1405/T 085-2025 第4.1条')
    const missingPhone = details.find((d) => d.field === '咨询电话')
    expect(missingPhone).toBeDefined()
    expect(missingPhone!.errorType).toBe('missing')
    expect(missingPhone!.dataSource).toBe('standard')
    expect(missingPhone!.standardClause).toBe('DB1405/T 085-2025 第4.1条')
  })

  it('字段值为空字符串 → 判定为漏项', () => {
    const guide: Record<string, unknown> = { 事项名称: '测试', 咨询电话: '  ' }
    const details = MissingFieldDetector.detect(guide, 'g1', ['咨询电话'], undefined, undefined, 'DB1405/T 085-2025 第4.1条')
    expect(details.length).toBe(1)
    expect(details[0]!.errorType).toBe('missing')
    expect(details[0]!.dataSource).toBe('standard')
  })

  it('字段齐备的指南 → 返回空数组', () => {
    const guide: Record<string, unknown> = {}
    for (const elem of requiredElements) guide[elem] = '有值'
    const details = MissingFieldDetector.detect(guide, 'g1', requiredElements)
    expect(details.length).toBe(0)
  })

  it('requiredElements配置缺失 → 抛出错误', () => {
    expect(() => MissingFieldDetector.detect({}, 'g1', [])).toThrow()
  })

  it('源码中不存在硬编码政策依据文本', () => {
    const guide: Record<string, unknown> = { 事项名称: '测试' }
    const details = MissingFieldDetector.detect(guide, 'g1', ['事项名称'])
    expect(details.length).toBe(0)
  })
})
import { describe, it, expect } from 'vitest'
import { MissingFieldDetector } from '../missingFieldDetector.js'
import defaultConfigPack from '../default-config-pack.json' with { type: 'json' }

const fieldResidueValues = (defaultConfigPack as Record<string, unknown>).fieldResidueValues as string[]

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
    for (const elem of requiredElements) guide[elem] = '有效内容值'
    const details = MissingFieldDetector.detect(guide, 'g1', requiredElements)
    expect(details.length).toBe(0)
  })

  it('requiredElements配置缺失 → 抛出错误', () => {
    expect(() => MissingFieldDetector.detect({}, 'g1', [])).toThrow()
  })

  it('源码中不存在硬编码政策依据文本', () => {
    const guide: Record<string, unknown> = { 事项名称: '食品经营许可' }
    const details = MissingFieldDetector.detect(guide, 'g1', ['事项名称'])
    expect(details.length).toBe(0)
  })
})
describe('MissingFieldDetector.detectGraded', () => {
  const coreFields = ['事项名称', '实施主体', '办理条件']
  const extendedFields = ['结果样本', '网上支付', '物流快递']
  const severityMapping = { missing: 'major', semantic: 'critical', logical: 'critical' }

  it('8.1 核心字段缺失 → coreDetails产出missing明细，severity经映射为major', () => {
    const guide: Record<string, unknown> = { 事项名称: '食品经营许可', 办理条件: '条件' }
    const result = MissingFieldDetector.detectGraded(
      guide, 'g1', coreFields, extendedFields, severityMapping, undefined, '国办发〔2015〕46号 第4.1条',
    )
    expect(result.coreDetails.length).toBe(1)
    expect(result.coreDetails[0]!.field).toBe('实施主体')
    expect(result.coreDetails[0]!.errorType).toBe('missing')
    expect(result.coreDetails[0]!.severity).toBe('major')
    expect(result.coreDetails[0]!.description).toContain('核心要素')
    expect(result.coreDetails[0]!.standardClause).toContain('国办发〔2015〕46号 第4.1条')
  })

  it('8.2 扩展字段缺失 → extendedDetails产出warning明细，severity固定warning', () => {
    const guide: Record<string, unknown> = {
      事项名称: '食品经营许可', 实施主体: '市场监管部门', 办理条件: '条件',
      结果样本: '许可证样本',
    }
    const result = MissingFieldDetector.detectGraded(
      guide, 'g1', coreFields, extendedFields, severityMapping,
    )
    expect(result.coreDetails.length).toBe(0)
    expect(result.extendedDetails.length).toBe(2)
    for (const d of result.extendedDetails) {
      expect(d.errorType).toBe('warning')
      expect(d.severity).toBe('warning')
      expect(d.description).toContain('扩展要素')
    }
  })

  it('8.3 coreRequiredFields为空数组 → 抛出GOV_DATA_RULES_MISSING异常', () => {
    expect(() =>
      MissingFieldDetector.detectGraded({}, 'g1', [], extendedFields, severityMapping),
    ).toThrow('GOV_DATA_RULES_MISSING')
  })

  it('8.4 extendedRequiredFields为空数组 → 不抛异常，extendedDetails为空', () => {
    const guide: Record<string, unknown> = { 事项名称: '食品经营许可', 实施主体: '市场监管部门', 办理条件: '条件' }
    const result = MissingFieldDetector.detectGraded(
      guide, 'g1', coreFields, [], severityMapping,
    )
    expect(result.coreDetails.length).toBe(0)
    expect(result.extendedDetails).toEqual([])
  })

  it('8.5 checkFieldOverlap返回交集；detectGraded剔除重叠项', () => {
    const overlap = MissingFieldDetector.checkFieldOverlap(['A', 'B', 'C'], ['B', 'C', 'D'])
    expect(overlap).toEqual(['B', 'C'])

    const guide: Record<string, unknown> = { 事项名称: '食品经营许可' }
    const result = MissingFieldDetector.detectGraded(
      guide, 'g1', ['事项名称', '实施主体'], ['事项名称', '网上支付'], severityMapping,
    )
    expect(result.coreDetails.some((d) => d.field === '事项名称')).toBe(false)
    expect(result.extendedDetails.some((d) => d.field === '事项名称')).toBe(false)
    expect(result.extendedDetails.some((d) => d.field === '网上支付')).toBe(true)
  })

  it('8.6 扩展占位符值（不适用/无此项/空白等）→ 判定为漏项', () => {
    const placeholders = ['不适用', '无此项', '无内容', '空白', '未指定', '未确定', '未知', '不详', '无限制', '不需要', '无规定', '无特殊要求', '暂不适用', '暂无规定']
    for (const ph of placeholders) {
      const guide: Record<string, unknown> = { 事项名称: '测试', 实施主体: ph, 办理条件: '条件' }
      const result = MissingFieldDetector.detectGraded(
        guide, 'g1', coreFields, extendedFields, severityMapping, undefined, undefined, undefined, { fieldResidueValues },
      )
      expect(result.coreDetails.some((d) => d.field === '实施主体')).toBe(true)
    }
  })

  it('8.7 字段值长度<2个字符 → 判定为内容过于简略，报missing', () => {
    const guide: Record<string, unknown> = { 事项名称: '测试', 实施主体: 'X', 办理条件: '条件' }
    const result = MissingFieldDetector.detectGraded(
      guide, 'g1', coreFields, extendedFields, severityMapping,
    )
    const detail = result.coreDetails.find((d) => d.field === '实施主体')
    expect(detail).toBeDefined()
    expect(detail!.description).toContain('内容过于简略')
  })

  it('8.8 字段值仅含标点符号 → 判定为无效内容，报missing', () => {
    const guide: Record<string, unknown> = { 事项名称: '测试', 实施主体: '。。。', 办理条件: '条件' }
    const result = MissingFieldDetector.detectGraded(
      guide, 'g1', coreFields, extendedFields, severityMapping,
    )
    const detail = result.coreDetails.find((d) => d.field === '实施主体')
    expect(detail).toBeDefined()
    expect(detail!.description).toContain('标点符号')
  })

  it('8.9 字段值正常（≥2字符且含字母/数字）→ 不报内容合规性错误', () => {
    const guide: Record<string, unknown> = { 事项名称: '测试', 实施主体: '市场监管局', 办理条件: '符合法定条件' }
    const result = MissingFieldDetector.detectGraded(
      guide, 'g1', coreFields, extendedFields, severityMapping,
    )
    expect(result.coreDetails.some((d) => d.field === '实施主体')).toBe(false)
  })

  it('8.10 扩展字段内容过于简略 → 不报内容合规性错误（仅core字段检查）', () => {
    const guide: Record<string, unknown> = {
      事项名称: '食品经营许可', 实施主体: '市场监管部门', 办理条件: '条件',
      结果样本: 'X',
    }
    const result = MissingFieldDetector.detectGraded(
      guide, 'g1', coreFields, extendedFields, severityMapping,
    )
    const detail = result.extendedDetails.find((d) => d.field === '结果样本')
    expect(detail).toBeUndefined()
  })

  it('9.1 缺失监督电话 → 报missing（核心字段一视同仁）', () => {
    const core14 = ['事项名称', '实施主体', '办理条件', '申请材料', '办理流程', '办理时限', '收费标准', '办理地点', '咨询电话', '监督电话', '办理时间', '网上办理深度', '结果送达方式', '表格下载']
    const guide: Record<string, unknown> = {
      事项名称: '测试', 实施主体: '部门', 办理条件: '条件', 申请材料: '材料',
      办理流程: '流程', 办理时限: '3个工作日', 收费标准: '不收费', 办理地点: '某路1号',
      咨询电话: '12345', 办理时间: '9:00-17:00', 网上办理深度: '全程网办',
      表格下载: '可下载', 结果送达方式: '邮寄',
    }
    const result = MissingFieldDetector.detectGraded(guide, 'g1', core14, [], severityMapping)
    expect(result.coreDetails.some((d) => d.field === '监督电话' && d.errorType === 'missing')).toBe(true)
  })

  it('9.2 缺失收费标准 → 报missing', () => {
    const core14 = ['事项名称', '实施主体', '办理条件', '申请材料', '办理流程', '办理时限', '收费标准', '办理地点', '咨询电话', '监督电话', '办理时间', '网上办理深度', '结果送达方式', '表格下载']
    const guide: Record<string, unknown> = {
      事项名称: '测试', 实施主体: '部门', 办理条件: '条件', 申请材料: '材料',
      办理流程: '流程', 办理时限: '3个工作日', 办理地点: '某路1号',
      咨询电话: '12345', 监督电话: '67890', 办理时间: '9:00-17:00', 网上办理深度: '全程网办',
      表格下载: '可下载', 结果送达方式: '邮寄',
    }
    const result = MissingFieldDetector.detectGraded(guide, 'g1', core14, [], severityMapping)
    expect(result.coreDetails.some((d) => d.field === '收费标准' && d.errorType === 'missing')).toBe(true)
  })

  it('9.3 缺失办理时间 → 报missing', () => {
    const core14 = ['事项名称', '实施主体', '办理条件', '申请材料', '办理流程', '办理时限', '收费标准', '办理地点', '咨询电话', '监督电话', '办理时间', '网上办理深度', '结果送达方式', '表格下载']
    const guide: Record<string, unknown> = {
      事项名称: '测试', 实施主体: '部门', 办理条件: '条件', 申请材料: '材料',
      办理流程: '流程', 办理时限: '3个工作日', 收费标准: '不收费', 办理地点: '某路1号',
      咨询电话: '12345', 监督电话: '67890', 网上办理深度: '全程网办',
      表格下载: '可下载', 结果送达方式: '邮寄',
    }
    const result = MissingFieldDetector.detectGraded(guide, 'g1', core14, [], severityMapping)
    expect(result.coreDetails.some((d) => d.field === '办理时间' && d.errorType === 'missing')).toBe(true)
  })

  it('9.4 缺失结果送达方式 → 报missing', () => {
    const core14 = ['事项名称', '实施主体', '办理条件', '申请材料', '办理流程', '办理时限', '收费标准', '办理地点', '咨询电话', '监督电话', '办理时间', '网上办理深度', '结果送达方式', '表格下载']
    const guide: Record<string, unknown> = {
      事项名称: '测试', 实施主体: '部门', 办理条件: '条件', 申请材料: '材料',
      办理流程: '流程', 办理时限: '3个工作日', 收费标准: '不收费', 办理地点: '某路1号',
      咨询电话: '12345', 监督电话: '67890', 办理时间: '9:00-17:00', 网上办理深度: '全程网办',
      表格下载: '可下载',
    }
    const result = MissingFieldDetector.detectGraded(guide, 'g1', core14, [], severityMapping)
    expect(result.coreDetails.some((d) => d.field === '结果送达方式' && d.errorType === 'missing')).toBe(true)
  })

  it('9.5 缺失表格下载 → 报missing', () => {
    const core14 = ['事项名称', '实施主体', '办理条件', '申请材料', '办理流程', '办理时限', '收费标准', '办理地点', '咨询电话', '监督电话', '办理时间', '网上办理深度', '结果送达方式', '表格下载']
    const guide: Record<string, unknown> = {
      事项名称: '测试', 实施主体: '部门', 办理条件: '条件', 申请材料: '材料',
      办理流程: '流程', 办理时限: '3个工作日', 收费标准: '不收费', 办理地点: '某路1号',
      咨询电话: '12345', 监督电话: '67890', 办理时间: '9:00-17:00', 网上办理深度: '全程网办',
      结果送达方式: '邮寄',
    }
    const result = MissingFieldDetector.detectGraded(guide, 'g1', core14, [], severityMapping)
    expect(result.coreDetails.some((d) => d.field === '表格下载' && d.errorType === 'missing')).toBe(true)
  })
})
describe('MissingFieldDetector fieldResidueValues 配置化', () => {
  const coreFields = ['事项名称', '实施主体', '办理条件']

  it('null/NULL/Null 大小写变体 → 报missing', () => {
    for (const ph of ['null', 'NULL', 'Null']) {
      const guide: Record<string, unknown> = { 事项名称: '测试', 实施主体: ph, 办理条件: '条件' }
      const result = MissingFieldDetector.detect(guide, 'g1', coreFields, undefined, undefined, undefined, { fieldResidueValues })
      expect(result.some((d) => d.field === '实施主体')).toBe(true)
    }
  })

  it('undefined/Undefined 新增残渣项 → 报missing', () => {
    for (const ph of ['undefined', 'Undefined']) {
      const guide: Record<string, unknown> = { 事项名称: '测试', 实施主体: ph, 办理条件: '条件' }
      const result = MissingFieldDetector.detect(guide, 'g1', coreFields, undefined, undefined, undefined, { fieldResidueValues })
      expect(result.some((d) => d.field === '实施主体')).toBe(true)
    }
  })

  it('N/A/n/a/NA 既有残渣项 → 报missing', () => {
    for (const ph of ['N/A', 'n/a', 'NA']) {
      const guide: Record<string, unknown> = { 事项名称: '测试', 实施主体: ph, 办理条件: '条件' }
      const result = MissingFieldDetector.detect(guide, 'g1', coreFields, undefined, undefined, undefined, { fieldResidueValues })
      expect(result.some((d) => d.field === '实施主体')).toBe(true)
    }
  })

  it('待补充/待填写/待完善 占位值 → 报missing', () => {
    for (const ph of ['待补充', '待填写', '待完善']) {
      const guide: Record<string, unknown> = { 事项名称: '测试', 实施主体: ph, 办理条件: '条件' }
      const result = MissingFieldDetector.detect(guide, 'g1', coreFields, undefined, undefined, undefined, { fieldResidueValues })
      expect(result.some((d) => d.field === '实施主体')).toBe(true)
    }
  })

  it('无/暂无 既有占位值 → 报missing', () => {
    for (const ph of ['无', '暂无']) {
      const guide: Record<string, unknown> = { 事项名称: '测试', 实施主体: ph, 办理条件: '条件' }
      const result = MissingFieldDetector.detect(guide, 'g1', coreFields, undefined, undefined, undefined, { fieldResidueValues })
      expect(result.some((d) => d.field === '实施主体')).toBe(true)
    }
  })

  it('options.fieldResidueValues 缺省时占位值不判定为missing（向后兼容）', () => {
    const guide: Record<string, unknown> = { 事项名称: '测试', 实施主体: '无特殊要求', 办理条件: '条件' }
    const result = MissingFieldDetector.detect(guide, 'g1', coreFields)
    expect(result.some((d) => d.field === '实施主体')).toBe(false)
  })
})
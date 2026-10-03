export const DEFAULT_FIELD_MAPPING: Record<string, string> = {
  '申报条件': '办理条件',
  '审批条件': '办理条件',
  '不见面审批': '网上办理深度',
  '办事流程': '办理流程',
  '申报材料': '申请材料',
  '承诺时限': '办理时限',
  '经办机构': '实施主体',
  '咨询电话号码': '咨询电话',
  '投诉电话': '监督电话',
  '办公地址': '办理地点',
  '办公时间': '办理时间',
}

export function mapFieldName(
  field: string,
  mapping: Record<string, string>,
): string {
  return mapping[field] ?? field
}

export function mapGuideToStandard(
  guide: Record<string, unknown>,
  mapping: Record<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(guide)) {
    const standardKey = mapFieldName(key, mapping)
    result[standardKey] = value
  }
  return result
}
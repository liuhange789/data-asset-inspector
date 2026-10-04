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
  'name': '事项名称',
  'title': '事项名称',
  'itemName': '事项名称',
  'subject': '实施主体',
  'agency': '实施主体',
  'department': '实施主体',
  'organizer': '实施主体',
  'condition': '办理条件',
  'conditions': '办理条件',
  'requirements': '办理条件',
  'materials': '申请材料',
  'applicationMaterials': '申请材料',
  'docs': '申请材料',
  'process': '办理流程',
  'workflow': '办理流程',
  'procedure': '办理流程',
  'timeLimit': '办理时限',
  'deadline': '办理时限',
  'processingTime': '办理时限',
  'fee': '收费标准',
  'cost': '收费标准',
  'charge': '收费标准',
  'fees': '收费标准',
  'location': '办理地点',
  'address': '办理地点',
  'office': '办理地点',
  'phone': '咨询电话',
  'tel': '咨询电话',
  'telephone': '咨询电话',
  'contactPhone': '咨询电话',
  'complaintPhone': '监督电话',
  'supervisionPhone': '监督电话',
  'hours': '办理时间',
  'officeHours': '办理时间',
  'workingHours': '办理时间',
  'onlineCapable': '网上办理深度',
  'onlineDepth': '网上办理深度',
  'online': '网上办理深度',
  'result': '结果样本',
  'sample': '结果样本',
  'delivery': '结果送达方式',
  'deliveryMethod': '结果送达方式',
  'download': '表格下载',
  'formDownload': '表格下载',
  'payment': '网上支付',
  'onlinePayment': '网上支付',
  'logistics': '物流快递',
  'express': '物流快递',
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
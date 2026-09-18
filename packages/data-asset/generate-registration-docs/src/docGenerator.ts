import type {
  OrchestrationResult,
  RegistrationDoc,

  PolicyDocument,
} from '@liuhange/dsh-data-asset-shared'
import { PolicyReferenceResolver } from '@liuhange/dsh-data-asset-shared'

export class DocGenerator {
  generate(
    orchestrationResult: OrchestrationResult,
    ownership: { holder: string; processor: string; operator: string },
  ): RegistrationDoc[] {
    if (!orchestrationResult || !ownership) {
      return [{
        name: 'DATA_DESCRIPTION',
        label: '数据描述',
        content: '输入参数缺失，无法生成登记材料',
        status: 'FAILED',
        missingFields: ['orchestrationResult', 'ownership'],
      }]
    }

    let policyRefs: PolicyDocument[]
    try {
      policyRefs = PolicyReferenceResolver.getInstance().resolve('DOC_GENERATION')
    } catch {
      policyRefs = []
    }

    const docs: RegistrationDoc[] = []

    try {
      docs.push(this.generateDataDescription(orchestrationResult, policyRefs))
    } catch (error) {
      docs.push({
        name: 'DATA_DESCRIPTION',
        label: '数据描述',
        content: `生成失败: ${error instanceof Error ? error.message : String(error)}`,
        status: 'FAILED',
      })
    }

    try {
      docs.push(this.generateSourceLegalityStatement(orchestrationResult, policyRefs))
    } catch (error) {
      docs.push({
        name: 'SOURCE_LEGALITY_STATEMENT',
        label: '来源合法性声明',
        content: `生成失败: ${error instanceof Error ? error.message : String(error)}`,
        status: 'FAILED',
      })
    }

    try {
      docs.push(this.generateOwnershipExplanation(ownership, policyRefs))
    } catch (error) {
      docs.push({
        name: 'OWNERSHIP_EXPLANATION',
        label: '产权归属说明',
        content: `生成失败: ${error instanceof Error ? error.message : String(error)}`,
        status: 'FAILED',
      })
    }

    return docs
  }

  private generateDataDescription(
    result: OrchestrationResult,
    policyRefs: PolicyDocument[],
  ): RegistrationDoc {
    const missingFields: string[] = []
    const inventoryReport = result.inventoryReport || ''
    const packagingManual = result.packagingManual || ''
    const inventoryMatch = inventoryReport.match(/记录数[:：]\s*(\d+)/)
    const formatMatch = packagingManual.match(/格式[:：]\s*(\w+)/)
    const nameMatch = packagingManual.match(/产品名称[:：]\s*(.+)/)

    const datasetName = nameMatch?.[1]?.trim() || '待企业填报'
    const recordCount = inventoryMatch?.[1] || '待企业填报'
    const format = formatMatch?.[1] || '待企业填报'

    if (datasetName === '待企业填报') missingFields.push('数据集名称')
    if (recordCount === '待企业填报') missingFields.push('记录数')
    if (format === '待企业填报') missingFields.push('数据格式')

    const content = `# 数据描述

## 一、数据集基本信息
- 数据集名称：${datasetName}
- 数据记录数：${recordCount}
- 数据格式：${format}
- 内容概述：${inventoryReport.substring(0, 200)}...
- 更新频率：待企业填报

## 二、数据内容说明
${packagingManual.substring(0, 500)}

## 三、政策依据
${policyRefs.map(d => `- 《${d.name}》（${d.docNumber}）`).join('\n')}
`

    return {
      name: 'DATA_DESCRIPTION',
      label: '数据描述',
      content,
      status: missingFields.length > 0 ? 'PENDING_FIELDS' : 'GENERATED',
      ...(missingFields.length > 0 ? { missingFields } : {}),
    }
  }

  private generateSourceLegalityStatement(
    result: OrchestrationResult,
    policyRefs: PolicyDocument[],
  ): RegistrationDoc {
    const maskingReport = result.maskingReport || ''
    const hasSourceInfo = maskingReport.includes('来源') || maskingReport.includes('合规')

    const content = `# 来源合法性声明

## 声明内容
本数据集来源合法，数据获取方式符合相关法律法规规定。

## 脱敏处理说明
${maskingReport.substring(0, 300)}

## 来源合规依据
${hasSourceInfo ? '脱敏报告中已包含来源合法性声明' : '待企业补充来源合法性证明材料'}

## 政策依据
${policyRefs.map(d => `- 《${d.name}》（${d.docNumber}）`).join('\n')}
`

    return {
      name: 'SOURCE_LEGALITY_STATEMENT',
      label: '来源合法性声明',
      content,
      status: hasSourceInfo ? 'GENERATED' : 'PENDING_FIELDS',
      ...(!hasSourceInfo ? { missingFields: ['来源合法性证明材料'] } : {}),
    }
  }

  private generateOwnershipExplanation(
    ownership: { holder: string; processor: string; operator: string },
    policyRefs: PolicyDocument[],
  ): RegistrationDoc {
    const missingFields: string[] = []
    if (!ownership.holder) missingFields.push('持有权主体')
    if (!ownership.processor) missingFields.push('加工使用权主体')
    if (!ownership.operator) missingFields.push('经营权主体')

    const content = `# 产权归属说明

## 一、数据产权三权分置

### 1. 持有权
- 权利主体：${ownership.holder || '待企业填报'}
- 权利内容：对数据资源的持有、控制和支配

### 2. 加工使用权
- 权利主体：${ownership.processor || '待企业填报'}
- 权利内容：对数据资源进行加工、使用和获益

### 3. 经营权
- 权利主体：${ownership.operator || '待企业填报'}
- 权利内容：对数据产品进行经营、交易和处分

## 二、权属确认
- 确认不存在权属纠纷
- 确认数据来源合法

## 三、政策依据
${policyRefs.map(d => `- 《${d.name}》（${d.docNumber}）`).join('\n')}
`

    return {
      name: 'OWNERSHIP_EXPLANATION',
      label: '产权归属说明',
      content,
      status: missingFields.length > 0 ? 'PENDING_FIELDS' : 'GENERATED',
      ...(missingFields.length > 0 ? { missingFields } : {}),
    }
  }
}
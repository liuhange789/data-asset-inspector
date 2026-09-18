import type {
  OrchestrationResult,
  PrecheckReport,
  PrecheckCheckItem,

  PrecheckConclusion,
  PolicyDocument,
} from '@liuhange/dsh-data-asset-shared'
import { PolicyReferenceResolver } from '@liuhange/dsh-data-asset-shared'

const SENSITIVE_KEYWORDS = ['军事', '国防', '机密', '秘密', '核能', '武器']

export class PrecheckExecutor {
  execute(
    orchestrationResult: OrchestrationResult,
    ownershipConfirmation: { hasDispute: boolean; confirmedAt: string },
  ): PrecheckReport {
    try {
      if (!orchestrationResult || !ownershipConfirmation) {
        return {
          conclusion: 'CANNOT_REGISTER',
          checks: [],
          failedItems: ['输入参数缺失：orchestrationResult 或 ownershipConfirmation 为空'],
          policyReferences: this.getPolicyRefs(),
          timestamp: new Date().toISOString(),
        }
      }

      const missingInputs = this.validateInputs(orchestrationResult)
      if (missingInputs.length > 0) {
        return {
          conclusion: 'CANNOT_REGISTER',
          checks: [],
          failedItems: [`体检产物不完整，缺失: ${missingInputs.join(', ')}`],
          policyReferences: this.getPolicyRefs(),
          timestamp: new Date().toISOString(),
        }
      }

      const checks: PrecheckCheckItem[] = []
      const failedItems: string[] = []

      const nationalSecurityCheck = this.checkNationalSecurity(orchestrationResult)
      checks.push(nationalSecurityCheck)
      if (nationalSecurityCheck.result === 'FAIL') failedItems.push(nationalSecurityCheck.label)

      const sourceComplianceCheck = this.checkSourceCompliance(orchestrationResult)
      checks.push(sourceComplianceCheck)
      if (sourceComplianceCheck.result === 'FAIL') failedItems.push(sourceComplianceCheck.label)

      const ownershipCheck = this.checkOwnershipDispute(ownershipConfirmation)
      checks.push(ownershipCheck)
      if (ownershipCheck.result === 'FAIL') failedItems.push(ownershipCheck.label)

      const materialCheck = this.checkMaterialAuthenticity(ownershipConfirmation)
      checks.push(materialCheck)
      if (materialCheck.result === 'FAIL') failedItems.push(materialCheck.label)

      const conclusion = this.determineConclusion(checks, ownershipConfirmation)

      return {
        conclusion,
        checks,
        failedItems,
        policyReferences: this.getPolicyRefs(),
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        conclusion: 'CANNOT_REGISTER',
        checks: [],
        failedItems: [`预检执行异常: ${error instanceof Error ? error.message : String(error)}`],
        policyReferences: [],
        timestamp: new Date().toISOString(),
      }
    }
  }

  private validateInputs(result: OrchestrationResult): string[] {
    const missing: string[] = []
    if (!result.maskingReport) missing.push('maskingReport')
    if (!result.cleaningReport) missing.push('cleaningReport')
    if (!result.inventoryReport) missing.push('inventoryReport')
    if (!result.packagingManual) missing.push('packagingManual')
    return missing
  }

  private checkNationalSecurity(result: OrchestrationResult): PrecheckCheckItem {
    const allText = `${result.maskingReport} ${result.cleaningReport} ${result.inventoryReport} ${result.packagingManual}`
    const found = SENSITIVE_KEYWORDS.some(kw => allText.includes(kw))
    return {
      name: 'NATIONAL_SECURITY',
      label: '国家安全检查',
      result: found ? 'FAIL' : 'PASS',
      detail: found
        ? '数据涉及敏感领域，可能危害国家安全或公共利益'
        : '数据未涉及敏感领域，不危害国家安全或公共利益',
    }
  }

  private checkSourceCompliance(result: OrchestrationResult): PrecheckCheckItem {
    const hasSourceStatement = result.maskingReport.includes('来源') || result.maskingReport.includes('合规')
    return {
      name: 'SOURCE_COMPLIANCE',
      label: '来源合规检查',
      result: hasSourceStatement ? 'PASS' : 'UNDETERMINED',
      detail: hasSourceStatement
        ? '脱敏报告含来源合法性声明，来源合规'
        : '无法判定：脱敏报告中未找到来源合法性声明',
    }
  }

  private checkOwnershipDispute(confirmation: { hasDispute: boolean; confirmedAt: string }): PrecheckCheckItem {
    if (!confirmation.confirmedAt) {
      return {
        name: 'OWNERSHIP_DISPUTE',
        label: '权属纠纷检查',
        result: 'PENDING',
        detail: '企业尚未确认权属状态，待确认',
      }
    }
    return {
      name: 'OWNERSHIP_DISPUTE',
      label: '权属纠纷检查',
      result: confirmation.hasDispute ? 'FAIL' : 'PASS',
      detail: confirmation.hasDispute
        ? '存在尚未解决的数据权属纠纷'
        : '企业确认不存在权属纠纷',
    }
  }

  private checkMaterialAuthenticity(
    confirmation: { hasDispute: boolean; confirmedAt: string },
  ): PrecheckCheckItem {
    if (!confirmation.confirmedAt) {
      return {
        name: 'MATERIAL_AUTHENTICITY',
        label: '材料真实性承诺',
        result: 'PENDING',
        detail: '企业尚未确认权属状态，材料真实性承诺待签署',
      }
    }
    return {
      name: 'MATERIAL_AUTHENTICITY',
      label: '材料真实性承诺',
      result: 'PASS',
      detail: '企业已确认权属状态并承诺如实填报登记申请材料，隐瞒真实情况或提供虚假证明将不予登记',
    }
  }

  private determineConclusion(
    checks: PrecheckCheckItem[],
    ownershipConfirmation: { hasDispute: boolean; confirmedAt: string },
  ): PrecheckConclusion {
    if (!ownershipConfirmation.confirmedAt) {
      return 'PENDING_CONFIRMATION'
    }
    const hasFail = checks.some(c => c.result === 'FAIL')
    return hasFail ? 'CANNOT_REGISTER' : 'CAN_REGISTER'
  }

  private getPolicyRefs(): PolicyDocument[] {
    return PolicyReferenceResolver.getInstance().resolve('PRECHECK')
  }
}
import { describe, it, expect } from 'vitest'
import { checkCompliance } from '../complianceChecker.js'

const config = {
  sourceRules: [
    { id: 'SRC_001', condition: '数据来源须有合同或协议', lawRef: '数据安全法第八条', compliant: true },
    { id: 'SRC_002', condition: '采集方式须明示告知', lawRef: '个人信息保护法第十四条', compliant: true },
    { id: 'SRC_003', condition: '不得非法获取他人数据', lawRef: '数据安全法第八条', compliant: true },
  ],
  processingRules: [
    { id: 'PRC_001', condition: '加工不得超出授权范围', lawRef: '个人信息保护法第十三条', compliant: true },
    { id: 'PRC_002', condition: '个人信息须脱敏处理', lawRef: '个人信息保护法第五十一条', compliant: true },
  ],
  usageRules: [
    { id: 'USE_001', condition: '使用不得超出约定场景', lawRef: '数据安全法第八条', compliant: true },
  ],
  personalInfoMinimizeFields: ['idCard', 'phone', 'bankCard', 'email', 'address', 'name', 'birthDate'],
}

const policyDocs = [{ name: '数据安全法', docNumber: '主席令第八十四号', coreRequirement: '安全保护' }]

describe('complianceChecker', () => {
  it('全合规场景通过', () => {
    const report = checkCompliance({
      assetName: '测试资产',
      sourceDescription: '通过合同获取，已明示告知用户',
      processingDescription: '在授权范围内加工，个人信息已脱敏',
      usageDescription: '用于约定场景',
      hasPersonalInfo: true,
      personalInfoFields: ['phone', 'email'],
    }, config, policyDocs)

    expect(report.overallPassed).toBe(true)
    expect(report.sourceCompliance.passed).toBe(true)
    expect(report.processingCompliance.passed).toBe(true)
    expect(report.usageCompliance.passed).toBe(true)
  })

  it('来源含非法获取→不通过', () => {
    const report = checkCompliance({
      assetName: '测试资产',
      sourceDescription: '非法获取他人数据',
      processingDescription: '正常加工',
      usageDescription: '正常使用',
      hasPersonalInfo: false,
      personalInfoFields: [],
    }, config, policyDocs)

    expect(report.sourceCompliance.passed).toBe(false)
    expect(report.overallPassed).toBe(false)
    expect(report.sourceCompliance.issues.length).toBeGreaterThan(0)
  })

  it('个人信息未脱敏字段→不通过', () => {
    const report = checkCompliance({
      assetName: '测试资产',
      sourceDescription: '合法来源',
      processingDescription: '正常加工',
      usageDescription: '正常使用',
      hasPersonalInfo: true,
      personalInfoFields: ['rawIdCard', 'rawPhone'],
    }, config, policyDocs)

    expect(report.personalInfoMinimize.allMinimized).toBe(false)
    expect(report.overallPassed).toBe(false)
  })

  it('无个人信息时脱敏检查自动通过', () => {
    const report = checkCompliance({
      assetName: '测试资产',
      sourceDescription: '合法来源',
      processingDescription: '正常加工',
      usageDescription: '正常使用',
      hasPersonalInfo: false,
      personalInfoFields: [],
    }, config, policyDocs)

    expect(report.personalInfoMinimize.allMinimized).toBe(true)
  })
})
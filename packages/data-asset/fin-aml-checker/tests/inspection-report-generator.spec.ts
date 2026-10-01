import { describe, it, expect } from 'vitest'
import { InspectionReportGenerator } from '../src/inspection-report-generator.js'
import { LEGAL_DISCLAIMER } from '../src/invariant.js'
import type {
  ReportableTransaction,
  ExemptedTransaction,
  OverdueTransaction,
  ReviewOverrideRecord,
  ValidationError,
  ConfigVersionSet,
} from '../src/types.js'

describe('InspectionReportGenerator', () => {
  const generator = new InspectionReportGenerator()

  const configVersions: ConfigVersionSet = {
    thresholdConfigVersion: '1.0.0',
    exemptionConfigVersion: '1.0.0',
    exchangeRateConfigVersion: '1.0.0',
    holidayConfigVersion: '1.0.0',
  }

  const reportableList: ReportableTransaction[] = [
    {
      transactionId: 'TX-001',
      triggeredThresholdType: '现金类',
      policyBasis: '依据：《金融机构大额交易和可疑交易报告管理办法》（中国人民银行令〔2016〕第3号）第五条第一款',
      judgmentStatus: '自动判定',
    },
  ]

  const exemptedList: ExemptedTransaction[] = [
    {
      transactionId: 'TX-002',
      exemptionReason: '定期存款续存',
      policyBasis: '依据：《金融机构大额交易和可疑交易报告管理办法》（中国人民银行令〔2016〕第3号）第七条第一项',
      judgmentStatus: '自动判定',
    },
  ]

  const overdueList: OverdueTransaction[] = [
    {
      transactionId: 'TX-003',
      overdueDays: 3,
      policyBasis: '依据：《金融机构大额交易和可疑交易报告管理办法》（中国人民银行令〔2016〕第3号）第八条',
    },
  ]

  const overrideList: ReviewOverrideRecord[] = [
    {
      transactionId: 'TX-001',
      originalConclusion: '应报',
      newConclusion: '不应报',
      overrideReason: '经核实不应报告',
      operator: 'officer-001',
      overrideTime: '2026-09-30T10:00:00.000Z',
    },
  ]

  const errorList: ValidationError[] = [
    {
      transactionId: 'TX-ERR-001',
      missingFields: ['amount'],
      errorMessage: 'amount 必须为大于 0 的数值',
    },
  ]

  it('报告包含七个部分', () => {
    const report = generator.generate({
      reportableList,
      exemptedList,
      overdueList,
      overrideList,
      errorList,
      configVersions,
      inspectionScope: 'test-scope',
      warnings: [],
    })
    expect(report.reportableList).toBeDefined()
    expect(report.exemptedList).toBeDefined()
    expect(report.overdueList).toBeDefined()
    expect(report.overrideList).toBeDefined()
    expect(report.errorList).toBeDefined()
    expect(report.policyBasisSummary).toBeDefined()
    expect(report.configVersions).toBeDefined()
    expect(report.legalDisclaimer).toBeDefined()
  })

  it('法律免责声明固定文本存在', () => {
    const report = generator.generate({
      reportableList: [],
      exemptedList: [],
      overdueList: [],
      overrideList: [],
      errorList: [],
      configVersions,
      inspectionScope: 'test-scope',
      warnings: [],
    })
    expect(report.legalDisclaimer).toBe(LEGAL_DISCLAIMER)
    expect(report.legalDisclaimer).toBe('本报告由辅助工具生成，不替代金融机构的法定反洗钱报告义务')
  })

  it('政策依据汇总去重', () => {
    const report = generator.generate({
      reportableList: [
        ...reportableList,
        { ...reportableList[0]!, transactionId: 'TX-001-DUP' },
      ],
      exemptedList,
      overdueList,
      overrideList: [],
      errorList: [],
      configVersions,
      inspectionScope: 'test-scope',
      warnings: [],
    })
    const basisCount = report.policyBasisSummary.filter(
      (b) => b.includes('第五条第一款'),
    ).length
    expect(basisCount).toBe(1)
  })

  it('配置版本号记录', () => {
    const report = generator.generate({
      reportableList: [],
      exemptedList: [],
      overdueList: [],
      overrideList: [],
      errorList: [],
      configVersions,
      inspectionScope: 'test-scope',
      warnings: [],
    })
    expect(report.configVersions.thresholdConfigVersion).toBe('1.0.0')
    expect(report.configVersions.exemptionConfigVersion).toBe('1.0.0')
    expect(report.configVersions.exchangeRateConfigVersion).toBe('1.0.0')
    expect(report.configVersions.holidayConfigVersion).toBe('1.0.0')
  })

  it('报告标识和巡检时间生成', () => {
    const report = generator.generate({
      reportableList: [],
      exemptedList: [],
      overdueList: [],
      overrideList: [],
      errorList: [],
      configVersions,
      inspectionScope: 'test-scope',
      warnings: [],
    })
    expect(report.reportId).toBeTruthy()
    expect(report.inspectionTime).toBeTruthy()
    expect(report.inspectionScope).toBe('test-scope')
  })

  it('空报告正常生成', () => {
    const report = generator.generate({
      reportableList: [],
      exemptedList: [],
      overdueList: [],
      overrideList: [],
      errorList: [],
      configVersions,
      inspectionScope: 'empty-scope',
      warnings: ['巡检范围内无交易数据'],
    })
    expect(report.reportableList.length).toBe(0)
    expect(report.exemptedList.length).toBe(0)
    expect(report.overdueList.length).toBe(0)
    expect(report.warnings).toContain('巡检范围内无交易数据')
  })

  it('政策依据格式包含法规全称', () => {
    const report = generator.generate({
      reportableList,
      exemptedList,
      overdueList,
      overrideList: [],
      errorList: [],
      configVersions,
      inspectionScope: 'test-scope',
      warnings: [],
    })
    for (const basis of report.policyBasisSummary) {
      expect(basis).toContain('《金融机构大额交易和可疑交易报告管理办法》')
      expect(basis).toContain('中国人民银行令〔2016〕第3号')
    }
  })
})
import { describe, it, expect } from 'vitest'
import { TimelinessChecker } from '../src/timeliness-checker.js'
import { defaultHolidayConfig } from '../src/default-threshold-config.js'
import type { ReportableTransaction, SubmittedReport } from '../src/types.js'

describe('TimelinessChecker', () => {
  const checker = new TimelinessChecker()
  const holidayConfig = defaultHolidayConfig

  const createReportable = (transactionId: string): ReportableTransaction => ({
    transactionId,
    triggeredThresholdType: '现金类',
    policyBasis: '依据：《金融机构大额交易和可疑交易报告管理办法》（中国人民银行令〔2016〕第3号）第五条第一款',
    judgmentStatus: '自动判定',
  })

  it('超过 5 个工作日未提交标记为逾期（第八条）', () => {
    const transactionDateMap = new Map([['TX-OVERDUE-001', '2026-09-01']])
    const candidates = [createReportable('TX-OVERDUE-001')]
    const { overdue } = checker.check(candidates, [], holidayConfig, transactionDateMap)
    expect(overdue.length).toBe(1)
    expect(overdue[0]?.transactionId).toBe('TX-OVERDUE-001')
    expect(overdue[0]?.overdueDays).toBeGreaterThan(0)
    expect(overdue[0]?.policyBasis).toContain('第八条')
  })

  it('5 个工作日内不标记为逾期', () => {
    const today = new Date()
    const recentDate = new Date(today)
    recentDate.setDate(recentDate.getDate() - 3)
    const dateStr = recentDate.toISOString().split('T')[0] as string
    const transactionDateMap = new Map([['TX-WITHIN-001', dateStr]])
    const candidates = [createReportable('TX-WITHIN-001')]
    const { overdue } = checker.check(candidates, [], holidayConfig, transactionDateMap)
    expect(overdue.length).toBe(0)
  })

  it('已提交报告不标记为逾期', () => {
    const transactionDateMap = new Map([['TX-SUBMITTED-001', '2026-09-01']])
    const candidates = [createReportable('TX-SUBMITTED-001')]
    const submittedReports: SubmittedReport[] = [
      { transactionId: 'TX-SUBMITTED-001', submittedDate: '2026-09-02' },
    ]
    const { overdue } = checker.check(candidates, submittedReports, holidayConfig, transactionDateMap)
    expect(overdue.length).toBe(0)
  })

  it('报送系统不可用（null）跳过时效检查', () => {
    const transactionDateMap = new Map([['TX-UNAVAIL-001', '2026-09-01']])
    const candidates = [createReportable('TX-UNAVAIL-001')]
    const { overdue, warnings } = checker.check(candidates, null, holidayConfig, transactionDateMap)
    expect(overdue.length).toBe(0)
    expect(warnings).toContain('时效检查因报送系统不可用而跳过')
  })

  it('报送系统不可用（undefined）跳过时效检查', () => {
    const transactionDateMap = new Map([['TX-UNAVAIL-002', '2026-09-01']])
    const candidates = [createReportable('TX-UNAVAIL-002')]
    const { overdue, warnings } = checker.check(candidates, undefined, holidayConfig, transactionDateMap)
    expect(overdue.length).toBe(0)
    expect(warnings).toContain('时效检查因报送系统不可用而跳过')
  })

  it('周末不计入工作日', () => {
    const transactionDateMap = new Map([['TX-WEEKEND-001', '2026-09-25']])
    const candidates = [createReportable('TX-WEEKEND-001')]
    const submittedReports: SubmittedReport[] = [
      { transactionId: 'TX-WEEKEND-001', submittedDate: '2026-09-28' },
    ]
    const { overdue } = checker.check(candidates, submittedReports, holidayConfig, transactionDateMap)
    expect(overdue.length).toBe(0)
  })

  it('交易缺少日期时跳过并记录警告', () => {
    const transactionDateMap = new Map<string, string>()
    const candidates = [createReportable('TX-NODATE-001')]
    const { overdue, warnings } = checker.check(candidates, [], holidayConfig, transactionDateMap)
    expect(overdue.length).toBe(0)
    expect(warnings.some((w) => w.includes('TX-NODATE-001'))).toBe(true)
  })

  it('逾期天数等于工作日间隔减 5', () => {
    const transactionDateMap = new Map([['TX-DAYS-001', '2026-09-01']])
    const candidates = [createReportable('TX-DAYS-001')]
    const { overdue } = checker.check(candidates, [], holidayConfig, transactionDateMap)
    expect(overdue.length).toBe(1)
    expect(overdue[0]?.overdueDays).toBeGreaterThan(0)
  })
})
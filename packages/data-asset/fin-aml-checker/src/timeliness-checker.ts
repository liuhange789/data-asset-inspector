import type {
  ReportableTransaction,
  SubmittedReport,
  HolidayConfig,
  OverdueTransaction,
} from './types.js'
import { BusinessDayCalculator } from './business-day-calculator.js'
import { POLICY_REGULATION_PREFIX, REPORT_DEADLINE_WORKING_DAYS } from './invariant.js'

export interface TimelinessCheckResult {
  overdue: OverdueTransaction[]
  warnings: string[]
}

export class TimelinessChecker {
  private readonly businessDayCalculator: BusinessDayCalculator

  constructor() {
    this.businessDayCalculator = new BusinessDayCalculator()
  }

  check(
    reportableTransactions: ReportableTransaction[],
    submittedReports: SubmittedReport[] | null | undefined,
    holidayConfig: HolidayConfig | null | undefined,
    transactionDateMap: Map<string, string>,
  ): TimelinessCheckResult {
    const overdue: OverdueTransaction[] = []
    const warnings: string[] = []

    if (submittedReports === null || submittedReports === undefined) {
      warnings.push('时效检查因报送系统不可用而跳过')
      return { overdue, warnings }
    }

    const submittedMap = new Map<string, string>()
    for (const report of submittedReports) {
      submittedMap.set(report.transactionId, report.submittedDate)
    }

    const processedTransactionIds = new Set<string>()
    const today = this.getToday()

    for (const reportable of reportableTransactions) {
      if (processedTransactionIds.has(reportable.transactionId)) continue
      processedTransactionIds.add(reportable.transactionId)

      const transactionDate = transactionDateMap.get(reportable.transactionId)
      if (!transactionDate) {
        warnings.push(`交易 ${reportable.transactionId} 缺少交易日期，跳过时效检查`)
        continue
      }

      const submittedDate = submittedMap.get(reportable.transactionId)
      const referenceDate = submittedDate ?? today

      const { workingDays, warning } = this.businessDayCalculator.calculateWorkingDays(
        transactionDate,
        referenceDate,
        holidayConfig,
      )

      if (warning) {
        warnings.push(warning)
      }

      if (workingDays > REPORT_DEADLINE_WORKING_DAYS) {
        const overdueDays = workingDays - REPORT_DEADLINE_WORKING_DAYS
        overdue.push({
          transactionId: reportable.transactionId,
          overdueDays,
          policyBasis: `${POLICY_REGULATION_PREFIX}第八条`,
        })
      }
    }

    return { overdue, warnings }
  }

  private getToday(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
}
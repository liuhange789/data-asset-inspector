import type { HolidayConfig } from './types.js'

export interface WorkingDayResult {
  workingDays: number
  warning: string | null
}

export class BusinessDayCalculator {
  calculateWorkingDays(
    startDate: string,
    endDate: string,
    holidayConfig: HolidayConfig | null | undefined,
  ): WorkingDayResult {
    if (!holidayConfig || !holidayConfig.holidays || holidayConfig.holidays.length === 0) {
      const naturalDays = this.calculateNaturalDays(startDate, endDate)
      return {
        workingDays: naturalDays,
        warning: '节假日配置缺失，按自然日计算',
      }
    }

    const holidaySet = new Set(holidayConfig.holidays)
    const start = this.parseDate(startDate)
    const end = this.parseDate(endDate)

    if (start === null || end === null) {
      return { workingDays: 0, warning: '日期格式无效' }
    }

    if (start.getTime() > end.getTime()) {
      return { workingDays: 0, warning: null }
    }

    let workingDays = 0
    const current = new Date(start)

    while (current.getTime() <= end.getTime()) {
      if (!this.isWeekend(current) && !this.isHoliday(current, holidaySet)) {
        workingDays++
      }
      current.setUTCDate(current.getUTCDate() + 1)
    }

    return { workingDays, warning: null }
  }

  private calculateNaturalDays(startDate: string, endDate: string): number {
    const start = this.parseDate(startDate)
    const end = this.parseDate(endDate)
    if (start === null || end === null) return 0
    if (start.getTime() > end.getTime()) return 0
    const diffMs = end.getTime() - start.getTime()
    return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1
  }

  private parseDate(dateStr: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null
    const date = new Date(dateStr + 'T00:00:00Z')
    if (Number.isNaN(date.getTime())) return null
    return date
  }

  private isWeekend(date: Date): boolean {
    const day = date.getUTCDay()
    return day === 0 || day === 6
  }

  private isHoliday(date: Date, holidaySet: Set<string>): boolean {
    const dateStr = this.formatDate(date)
    return holidaySet.has(dateStr)
  }

  private formatDate(date: Date): string {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
}
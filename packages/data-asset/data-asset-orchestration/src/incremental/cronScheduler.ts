import type { IncrementalSchedulingConfig } from '@liuhange/dsh-data-asset-shared'

export class CronScheduler {
  setup(config: IncrementalSchedulingConfig): { schedulingConfig: unknown; platform: string } {
    const cronExpression = config.cronExpression

    if (!this.isValidCron(cronExpression)) {
      throw new Error('错误：无效的Cron表达式')
    }

    const platform = process.platform
    let schedulingConfig: unknown

    if (platform === 'win32') {
      schedulingConfig = {
        type: 'windows-task-scheduler',
        script: 'run_scheduled.ps1',
        cronExpression,
        command: `node ${process.cwd()}/lib/index.js --incremental`,
      }
    } else {
      schedulingConfig = {
        type: 'crontab',
        cronExpression,
        command: `node ${process.cwd()}/lib/index.js --incremental`,
      }
    }

    return { schedulingConfig, platform }
  }

  isValidCron(expression: string): boolean {
    const parts = expression.trim().split(/\s+/)
    if (parts.length !== 5) {
      return false
    }

    const ranges = [
      { min: 0, max: 59 },
      { min: 0, max: 23 },
      { min: 1, max: 31 },
      { min: 1, max: 12 },
      { min: 0, max: 6 },
    ]

    for (let i = 0; i < 5; i++) {
      const part = parts[i]!
      const range = ranges[i]!
      if (part === '*') {
        continue
      }
      if (/^\d+$/.test(part)) {
        const num = parseInt(part, 10)
        if (num < range.min || num > range.max) {
          return false
        }
      } else if (/^\*\/\d+$/.test(part)) {
        continue
      } else if (/^\d+-\d+$/.test(part)) {
        const [min, max] = part.split('-').map(n => parseInt(n!, 10))
        if (min! < range.min || max! > range.max) {
          return false
        }
      }
    }

    return true
  }
}
import * as fs from 'fs'
import * as path from 'path'

export type AuditLogLevel = 'INFO' | 'WARN' | 'ERROR'

export interface AuditLogParams {
  pluginName: string
  operation: string
  inputPath: string
  outputPath: string
  result: string
  operator?: string
  writeToFile?: boolean
  level?: AuditLogLevel
}

export class AuditLogger {
  private readonly logDir: string

  constructor(logDir?: string) {
    this.logDir = logDir ?? path.resolve(process.cwd(), 'logs')
  }

  log(params: AuditLogParams): void {
    const timestamp = new Date().toISOString()
    const operator = params.operator ?? 'system'
    const level = params.level ?? 'INFO'
    const logLine = `[${level}][${params.pluginName}] ${timestamp} | 操作: ${params.operation} | 操作人: ${operator} | 输入: ${params.inputPath} | 输出: ${params.outputPath} | 结果: ${params.result}`

    console.log(logLine)

    if (params.writeToFile) {
      this.writeToFile(logLine)
    }
  }

  warn(params: Omit<AuditLogParams, 'level'>): void {
    this.log({ ...params, level: 'WARN' })
  }

  error(params: Omit<AuditLogParams, 'level'>): void {
    this.log({ ...params, level: 'ERROR' })
  }

  private writeToFile(logLine: string): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }

    const date = new Date().toISOString().split('T')[0]
    const logFile = path.join(this.logDir, `audit-${date}.log`)
    fs.appendFileSync(logFile, logLine + '\n', 'utf-8')
  }
}

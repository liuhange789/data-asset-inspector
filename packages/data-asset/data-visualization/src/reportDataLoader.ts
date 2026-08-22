import * as fs from 'fs'
import type { ReportDataLoadResult } from './types.js'

export class ReportDataLoader {
  async load(filePath: string): Promise<ReportDataLoadResult> {
    if (!fs.existsSync(filePath)) {
      return { data: null, error: '文件不存在' }
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(content)
      return { data: parsed }
    } catch {
      return { data: null, error: '数据格式错误' }
    }
  }
}
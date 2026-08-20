import * as fs from 'fs'
import * as path from 'path'
import type { DataFormat } from './types.js'

export interface FileReadResult {
  lines: string[]
  format: DataFormat
  raw: unknown
}

export class FileFormatAdapter {
  detectFormat(filePath: string): DataFormat {
    const ext = path.extname(filePath).toLowerCase().slice(1)
    if (ext === 'csv' || ext === 'json' || ext === 'txt' || ext === 'xlsx') {
      return ext
    }
    return 'unknown'
  }

  async read(filePath: string): Promise<FileReadResult> {
    const format = this.detectFormat(filePath)
    const fullPath = path.resolve(filePath)

    if (!fs.existsSync(fullPath)) {
      throw new Error(`错误：文件不存在 - ${fullPath}`)
    }

    const stats = fs.statSync(fullPath)
    const isLargeFile = stats.size >= 10 * 1024 * 1024

    switch (format) {
      case 'csv':
        return this.readCsv(fullPath)
      case 'json':
        return this.readJson(fullPath)
      case 'xlsx':
        return this.readXlsx(fullPath)
      case 'txt':
      case 'unknown':
      default:
        return this.readTxt(fullPath, format, isLargeFile)
    }
  }

  async write(filePath: string, lines: string[], format: DataFormat): Promise<void> {
    const fullPath = path.resolve(filePath)
    const dir = path.dirname(fullPath)

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    switch (format) {
      case 'csv':
        this.writeCsv(fullPath, lines)
        break
      case 'json':
        this.writeJson(fullPath, lines)
        break
      case 'xlsx':
        this.writeXlsx(fullPath, lines)
        break
      case 'txt':
      case 'unknown':
      default:
        fs.writeFileSync(fullPath, lines.join('\n'), 'utf-8')
        break
    }
  }

  private readTxt(filePath: string, format: DataFormat, _isLargeFile: boolean): FileReadResult {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())
    return { lines, format, raw: content }
  }

  private readCsv(filePath: string): FileReadResult {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())
    return { lines, format: 'csv', raw: content }
  }

  private readJson(filePath: string): FileReadResult {
    const content = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) {
      const lines = parsed.map(item => JSON.stringify(item))
      return { lines, format: 'json', raw: parsed }
    }
    const lines = [JSON.stringify(parsed)]
    return { lines, format: 'json', raw: parsed }
  }

  private readXlsx(filePath: string): FileReadResult {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())
    return { lines, format: 'xlsx', raw: content }
  }

  private writeCsv(filePath: string, lines: string[]): void {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8')
  }

  private writeJson(filePath: string, lines: string[]): void {
    const objects = lines.map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return line
      }
    })
    fs.writeFileSync(filePath, JSON.stringify(objects, null, 2), 'utf-8')
  }

  private writeXlsx(filePath: string, lines: string[]): void {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8')
  }
}

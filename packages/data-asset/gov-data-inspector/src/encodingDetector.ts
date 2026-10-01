import { readFileSync } from 'node:fs'

export interface EncodingDetectResult {
  content: string | null
  encodingError?: string
}

export const EncodingDetector = {
  detect(filePath: string): EncodingDetectResult {
    let buffer: Buffer
    try {
      buffer = readFileSync(filePath)
    } catch {
      return { content: null, encodingError: `无法读取文件: ${filePath}` }
    }

    if (buffer.length === 0) {
      return { content: '', encodingError: '文件为空' }
    }

    const isUtf8 = this.isValidUtf8(buffer)
    if (!isUtf8) {
      return { content: null, encodingError: '文件编码非 UTF-8，请将文件转换为 UTF-8 编码后重试' }
    }

    return { content: buffer.toString('utf-8') }
  },

  isValidUtf8(buffer: Buffer): boolean {
    try {
      const str = buffer.toString('utf-8')
      const reencoded = Buffer.from(str, 'utf-8')
      return reencoded.equals(buffer)
    } catch {
      return false
    }
  },
}
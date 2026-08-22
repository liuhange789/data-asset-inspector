import * as crypto from 'crypto'
import * as fs from 'fs'

export class HashCalculator {
  calculate(filePath: string, algorithm: 'SHA-256' | 'SHA-512' = 'SHA-256'): string | null {
    try {
      const content = fs.readFileSync(filePath)
      const hash = crypto.createHash(algorithm)
      hash.update(content)
      return hash.digest('hex')
    } catch {
      return null
    }
  }
}
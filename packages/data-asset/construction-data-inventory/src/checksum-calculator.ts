export class ChecksumCalculator {
  calculate(code: string, algorithm: string): string {
    if (!algorithm || algorithm.trim() === '') {
      throw new Error('CHECKSUM_ALGORITHM_MISSING')
    }
    switch (algorithm.toUpperCase()) {
      case 'LUHN':
        return this.luhnChecksum(code)
      case 'MOD11':
        return this.mod11Checksum(code)
      default:
        throw new Error('CHECKSUM_ALGORITHM_MISSING')
    }
  }

  private luhnChecksum(code: string): string {
    const digits = code.replace(/\D/g, '').split('').map(Number)
    let sum = 0
    let shouldDouble = false
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i]!
      if (shouldDouble) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      sum += digit
      shouldDouble = !shouldDouble
    }
    const checksum = (10 - (sum % 10)) % 10
    return String(checksum)
  }

  private mod11Checksum(code: string): string {
    const digits = code.replace(/\D/g, '').split('').map(Number)
    let sum = 0
    const weights = [2, 3, 4, 5, 6, 7, 8, 9, 10, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    for (let i = 0; i < digits.length; i++) {
      const weight = weights[i % weights.length]!
      sum += digits[i]! * weight
    }
    const remainder = sum % 11
    const checksum = remainder === 0 ? '0' : remainder === 1 ? 'X' : String(11 - remainder)
    return checksum
  }

  validate(codeWithChecksum: string, algorithm: string): boolean {
    if (codeWithChecksum.length < 2) return false
    const code = codeWithChecksum.slice(0, -1)
    const providedChecksum = codeWithChecksum.slice(-1)
    const expectedChecksum = this.calculate(code, algorithm)
    return providedChecksum === expectedChecksum
  }
}
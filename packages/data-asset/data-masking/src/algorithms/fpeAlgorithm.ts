import * as crypto from 'crypto'

export class FpeAlgorithm {
  encrypt(plaintext: string, key: string): string {
    if (!key) {
      throw new Error('错误：FPE密钥未配置')
    }

    const chars = plaintext.split('')
    const radix = 10
    const isNumeric = chars.every(c => /\d/.test(c))

    if (!isNumeric) {
      return this.encryptGeneric(plaintext, key)
    }

    const n = plaintext.length
    if (n < 2) {
      return plaintext
    }

    const keyHash = crypto.createHash('sha256').update(key).digest()
    const rounds = 10

    const inputNums = chars.map(c => parseInt(c, 10))

    for (let round = 0; round < rounds; round++) {
      const roundKey = crypto.createHash('sha256').update(keyHash).update(Buffer.from([round])).digest()
      for (let i = 0; i < n - 1; i++) {
        const mod = radix ** (n - i - 1)
        const prfInput = Buffer.alloc(4)
        prfInput.writeUInt32BE(inputNums[i]!, 0)
        const prf = crypto.createHmac('sha256', roundKey).update(prfInput).digest()
        const prfNum = prf.readUInt32BE(0) % mod
        inputNums[i + 1]! = (inputNums[i + 1]! + prfNum) % radix
      }
      for (let i = n - 2; i >= 0; i--) {
        const mod = radix ** (n - i - 1)
        const prfInput = Buffer.alloc(4)
        prfInput.writeUInt32BE(inputNums[i + 1]!, 0)
        const prf = crypto.createHmac('sha256', roundKey).update(prfInput).digest()
        const prfNum = prf.readUInt32BE(0) % mod
        inputNums[i]! = (inputNums[i]! + prfNum) % radix
      }
    }

    return inputNums.join('')
  }

  decrypt(ciphertext: string, key: string): string {
    if (!key) {
      throw new Error('错误：FPE密钥未配置')
    }

    const chars = ciphertext.split('')
    const radix = 10
    const isNumeric = chars.every(c => /\d/.test(c))

    if (!isNumeric) {
      return this.decryptGeneric(ciphertext, key)
    }

    const n = ciphertext.length
    if (n < 2) {
      return ciphertext
    }

    const keyHash = crypto.createHash('sha256').update(key).digest()
    const rounds = 10

    const outputNums = chars.map(c => parseInt(c, 10))

    for (let round = rounds - 1; round >= 0; round--) {
      const roundKey = crypto.createHash('sha256').update(keyHash).update(Buffer.from([round])).digest()
      for (let i = 0; i < n - 1; i++) {
        const mod = radix ** (n - i - 1)
        const prfInput = Buffer.alloc(4)
        prfInput.writeUInt32BE(outputNums[i + 1]!, 0)
        const prf = crypto.createHmac('sha256', roundKey).update(prfInput).digest()
        const prfNum = prf.readUInt32BE(0) % mod
        outputNums[i]! = ((outputNums[i]! - prfNum) % radix + radix) % radix
      }
      for (let i = n - 2; i >= 0; i--) {
        const mod = radix ** (n - i - 1)
        const prfInput = Buffer.alloc(4)
        prfInput.writeUInt32BE(outputNums[i]!, 0)
        const prf = crypto.createHmac('sha256', roundKey).update(prfInput).digest()
        const prfNum = prf.readUInt32BE(0) % mod
        outputNums[i + 1]! = ((outputNums[i + 1]! - prfNum) % radix + radix) % radix
      }
    }

    return outputNums.join('')
  }

  private encryptGeneric(plaintext: string, key: string): string {
    const keyHash = crypto.createHash('sha256').update(key).digest()
    const result: string[] = []
    for (let i = 0; i < plaintext.length; i++) {
      const charCode = plaintext.charCodeAt(i)
      const prf = crypto.createHmac('sha256', keyHash).update(Buffer.from([i & 0xff])).digest()
      const offset = prf[0]! % 256
      result.push(String.fromCharCode((charCode + offset) % 256))
    }
    return result.join('')
  }

  private decryptGeneric(ciphertext: string, key: string): string {
    const keyHash = crypto.createHash('sha256').update(key).digest()
    const result: string[] = []
    for (let i = 0; i < ciphertext.length; i++) {
      const charCode = ciphertext.charCodeAt(i)
      const prf = crypto.createHmac('sha256', keyHash).update(Buffer.from([i & 0xff])).digest()
      const offset = prf[0]! % 256
      result.push(String.fromCharCode((charCode - offset + 256) % 256))
    }
    return result.join('')
  }
}
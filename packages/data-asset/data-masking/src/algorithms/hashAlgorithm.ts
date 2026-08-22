import * as crypto from 'crypto'

export class HashAlgorithm {
  hash(
    plaintext: string,
    hashAlgorithm: 'SHA-256' | 'SHA-512',
    salt?: string,
  ): { digest: string; salted: boolean; digestLength: number } {
    const input = salt ? salt + plaintext : plaintext
    const algorithm = hashAlgorithm === 'SHA-512' ? 'SHA-512' : 'SHA-256'

    const hash = crypto.createHash(algorithm)
    hash.update(input, 'utf-8')
    const digest = hash.digest('hex')

    return {
      digest,
      salted: salt !== undefined && salt !== '',
      digestLength: digest.length,
    }
  }
}
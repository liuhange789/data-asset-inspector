import type { ConcurrencyLockState } from './types.js'

export class ConcurrencyLock {
  private locked = false
  private lockedAt: string | null = null

  acquire(lockTimeout: number): boolean {
    if (this.locked) {
      if (this.lockedAt) {
        const elapsed = (Date.now() - new Date(this.lockedAt).getTime()) / 1000
        if (elapsed > lockTimeout) {
          this.release()
        } else {
          return false
        }
      }
    }

    this.locked = true
    this.lockedAt = new Date().toISOString()
    return true
  }

  release(): void {
    this.locked = false
    this.lockedAt = null
  }

  getState(): ConcurrencyLockState {
    return { locked: this.locked, lockedAt: this.lockedAt }
  }
}
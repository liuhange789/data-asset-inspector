import * as crypto from 'crypto'
import type { BudgetTracker } from '../budgetTracker.js'

export class DifferentialPrivacyAlgorithm {
  addNoise(
    trueValue: number,
    epsilon: number,
    sensitivity: number,
    budgetTracker: BudgetTracker,
    totalBudget: number,
  ): number {
    if (!budgetTracker.canConsume(epsilon, totalBudget)) {
      throw new Error('隐私预算已耗尽，拒绝查询')
    }

    const scale = sensitivity / epsilon
    const noise = this.generateLaplaceNoise(scale)

    budgetTracker.consume(epsilon)

    return trueValue + noise
  }

  private generateLaplaceNoise(scale: number): number {
    const u = this.generateSecureUniform()
    const adjustedU = u - 0.5
    return -scale * Math.sign(adjustedU) * Math.log(1 - 2 * Math.abs(adjustedU))
  }

  private generateSecureUniform(): number {
    const bytes = crypto.randomBytes(8)
    const uint64 = bytes.readBigUInt64BE(0)
    const maxUint64 = BigInt(2) ** BigInt(64) - BigInt(1)
    return Number(uint64) / Number(maxUint64)
  }
}
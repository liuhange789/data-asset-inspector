import type { BudgetTrackerState } from './algorithms/types.js'

export class BudgetTracker {
  private consumed = 0
  private queryCount = 0
  private readonly totalBudget: number

  constructor(totalBudget: number) {
    this.totalBudget = totalBudget
  }

  consume(epsilon: number): void {
    this.consumed += epsilon
    this.queryCount++
  }

  canConsume(epsilon: number, totalBudget: number): boolean {
    return this.consumed + epsilon <= totalBudget
  }

  getState(): BudgetTrackerState {
    return {
      totalBudget: this.totalBudget,
      consumed: this.consumed,
      remaining: this.totalBudget - this.consumed,
      queryCount: this.queryCount,
    }
  }
}
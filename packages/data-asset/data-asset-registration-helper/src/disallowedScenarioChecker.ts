import type { DisallowedScenario, PrecheckResult } from './types.js'

export function checkDisallowedScenarios(
  assetDescription: string,
  disallowedScenarios: DisallowedScenario[],
  hasDispute: boolean,
): PrecheckResult {
  const failedItems: string[] = []
  const hitScenarios: DisallowedScenario[] = []

  for (const scenario of disallowedScenarios) {
    const matched = scenario.keywords.some(kw => assetDescription.includes(kw))
    if (matched) {
      hitScenarios.push(scenario)
      failedItems.push(`${scenario.id}: ${scenario.label}（关键词: ${scenario.keywords.join(', ')}）`)
    }
  }

  if (hasDispute) {
    failedItems.push('权属纠纷未解决: ownershipConfirmation.hasDispute = true')
  }

  return {
    conclusion: failedItems.length === 0 ? 'CAN_REGISTER' : 'CANNOT_REGISTER',
    failedItems,
    disallowedScenariosHit: hitScenarios,
  }
}
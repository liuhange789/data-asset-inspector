import type { LineageChain } from './types.js'

export class MermaidGenerator {
  generate(chain: LineageChain): string {
    const lines: string[] = ['flowchart LR']
    const steps = chain.steps

    if (steps.length === 0) {
      return 'flowchart LR'
    }

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!
      const label = `${step.stepName}\\n${step.transformRule}`
      lines.push(`  S${i}[${label}]`)
    }

    for (let i = 1; i < steps.length; i++) {
      const prevStep = steps[i - 1]!
      lines.push(`  S${i - 1} -->|${prevStep.transformRule}| S${i}`)
    }

    return lines.join('\n')
  }
}
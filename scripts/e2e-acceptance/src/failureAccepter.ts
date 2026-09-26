import { TRIGGERS } from './config.js'
import type { DshClientType, FailureAcceptanceResult, FailureTestResult, ErrorRecord, Trigger, InvalidTestDataSets } from './types.js'

export async function runFailureAcceptance(
  dshClient: DshClientType,
  invalidData: InvalidTestDataSets,
): Promise<FailureAcceptanceResult> {
  const errors: ErrorRecord[] = []
  const failureResults: FailureTestResult[] = []

  for (const trigger of TRIGGERS) {
    const invalidSpec = invalidData[trigger]
    try {
      const args: Record<string, unknown> = {
        trigger,
        dataSource: invalidSpec.path,
      }
      const rawOutput = await dshClient.invokeTool('execute_vertical_chain', args)
      let parsed: Record<string, unknown> | null = null
      try {
        parsed = JSON.parse(rawOutput)
      } catch {
        // not JSON
      }

      const hasFailureStructure = parsed !== null
        && typeof parsed.trigger === 'string'
        && Array.isArray(parsed.completed)
        && typeof parsed.failed === 'string'
        && typeof parsed.error === 'string'
        && typeof parsed.completedAt === 'string'

      const completedSteps = hasFailureStructure ? (parsed!.completed as string[]) : []
      const failedStep = hasFailureStructure ? (parsed!.failed as string) : null
      const errorMessage = hasFailureStructure ? (parsed!.error as string) : null

      const passed = hasFailureStructure && failedStep !== null

      if (!passed) {
        errors.push({
          severity: 'error',
          code: 'FAILURE_STRUCTURE_MISSING',
          message: `Chain ${trigger} failure response does not match VerticalChainFailureResult`,
          context: rawOutput,
        })
      }

      failureResults.push({
        trigger,
        rawOutput,
        hasFailureStructure,
        completedSteps,
        failedStep,
        errorMessage,
        passed,
      })
    } catch (e) {
      errors.push({
        severity: 'error',
        code: 'FAILURE_TEST_ERROR',
        message: `Chain ${trigger} failure test threw: ${(e as Error).message}`,
      })
      failureResults.push({
        trigger,
        rawOutput: '',
        hasFailureStructure: false,
        completedSteps: [],
        failedStep: null,
        errorMessage: (e as Error).message,
        passed: false,
      })
    }
  }

  const passed = errors.length === 0

  return { failureResults, passed, errors }
}
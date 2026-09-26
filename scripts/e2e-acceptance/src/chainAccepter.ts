import { TRIGGERS, CHAIN_CHECKPOINT_FIELDS, TIMEOUTS } from './config.js'
import type { DshClientType, ChainAcceptanceResult, ChainRunOutput, ErrorRecord, Trigger, NormalTestDataSets } from './types.js'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

export async function runChain(
  dshClient: DshClientType,
  trigger: Trigger,
  testData: { inputFiles: readonly { path: string; description: string }[] },
  samplesDir: string,
): Promise<ChainRunOutput> {
  const start = Date.now()
  try {
    const args: Record<string, unknown> = {
      trigger,
      dataSource: testData.inputFiles[0]?.path ?? '',
    }
    const rawOutput = await dshClient.invokeTool('execute_vertical_chain', args)
    const durationMs = Date.now() - start

    let parsedOutput: Record<string, unknown> | null = null
    try {
      parsedOutput = JSON.parse(rawOutput)
    } catch {
      // not JSON
    }

    const success = parsedOutput?.error === undefined

    const sampleDir = resolve(samplesDir, trigger.replace(/\s+/g, '-'))
    mkdirSync(sampleDir, { recursive: true })
    writeFileSync(resolve(sampleDir, 'output.json'), rawOutput)

    return { trigger, rawOutput, parsedOutput, success, durationMs }
  } catch (e) {
    return {
      trigger,
      rawOutput: JSON.stringify({ error: 'CHAIN_EXECUTION_ERROR', message: (e as Error).message }),
      parsedOutput: null,
      success: false,
      durationMs: Date.now() - start,
    }
  }
}

export async function runChainAcceptance(
  dshClient: DshClientType,
  normalData: NormalTestDataSets,
  samplesDir: string,
): Promise<ChainAcceptanceResult> {
  const errors: ErrorRecord[] = []
  const chainResults: ChainRunOutput[] = []
  const checkpointChecks: { trigger: Trigger; field: string; present: boolean; nonEmpty: boolean }[] = []

  for (const trigger of TRIGGERS) {
    const result = await runChain(dshClient, trigger, normalData[trigger], samplesDir)
    chainResults.push(result)

    if (!result.success) {
      errors.push({ severity: 'error', code: 'CHAIN_FAILED', message: `Chain ${trigger} failed`, context: result.rawOutput })
      continue
    }

    const output = result.parsedOutput
    if (!output) {
      errors.push({ severity: 'error', code: 'CHAIN_OUTPUT_UNPARSEABLE', message: `Chain ${trigger} output is not valid JSON` })
      continue
    }

    const expectedFields = CHAIN_CHECKPOINT_FIELDS[trigger]
    for (const field of expectedFields) {
      const value = output[field]
      const present = value !== undefined
      const nonEmpty = present && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)
      checkpointChecks.push({ trigger, field, present, nonEmpty })
      if (!present) {
        errors.push({ severity: 'error', code: 'CHECKPOINT_MISSING', message: `Chain ${trigger} missing field: ${field}` })
      } else if (!nonEmpty) {
        errors.push({ severity: 'warning', code: 'CHECKPOINT_EMPTY', message: `Chain ${trigger} field ${field} is empty` })
      }
    }
  }

  const passed = errors.filter(e => e.severity === 'fatal' || e.severity === 'error').length === 0

  return { chainResults, checkpointChecks, passed, errors }
}
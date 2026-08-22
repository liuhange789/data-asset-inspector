import { join, dirname, basename, extname } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { DependencyPropagator } from '../src/dependencyPropagator.js'
import { OrchestrationExecutor } from '../src/orchestrationExecutor.js'
import { ReportAggregator } from '../src/reportAggregator.js'
import { SequentialExecutor } from '../src/sequentialExecutor.js'

describe('DependencyPropagator', () => {
  let propagator: DependencyPropagator

  beforeEach(() => {
    propagator = new DependencyPropagator()
  })

  it('getMaskedOutputPath appends _masked before the extension', () => {
    expect(propagator.getMaskedOutputPath(join('data', 'file.csv'))).toBe(join('data', 'file_masked.csv'))
  })

  it('getCleanedOutputPath appends _cleaned before the extension', () => {
    expect(propagator.getCleanedOutputPath(join('data', 'file.csv'))).toBe(join('data', 'file_cleaned.csv'))
  })

  it('propagateMaskingToCleaning returns the masked path unchanged', () => {
    const masked = join('data', 'file_masked.csv')
    expect(propagator.propagateMaskingToCleaning(masked)).toBe(masked)
  })

  it('propagateCleaningToPackaging returns the cleaned path unchanged', () => {
    const cleaned = join('data', 'file_cleaned.csv')
    expect(propagator.propagateCleaningToPackaging(cleaned)).toBe(cleaned)
  })

  it('propagateCleaningToInventory returns the directory of the cleaned file', () => {
    const cleaned = join('data', 'sub', 'file_cleaned.csv')
    expect(propagator.propagateCleaningToInventory(cleaned)).toBe(join('data', 'sub'))
  })

  it('chains masked -> cleaned -> inventory dir end to end', () => {
    const input = join('work', 'supply.csv')
    const masked = propagator.getMaskedOutputPath(input)
    const cleaned = propagator.getCleanedOutputPath(masked)
    const inventoryDir = propagator.propagateCleaningToInventory(cleaned)
    expect(basename(masked)).toBe('supply_masked.csv')
    expect(basename(cleaned)).toBe('supply_masked_cleaned.csv')
    expect(inventoryDir).toBe(dirname(cleaned))
    expect(extname(cleaned)).toBe('.csv')
  })
})

describe('ReportAggregator', () => {
  let aggregator: ReportAggregator

  beforeEach(() => {
    aggregator = new ReportAggregator()
  })

  it('aggregate combines four reports and marks 4 completed stages', () => {
    const result = aggregator.aggregate('M', 'C', 'I', 'P')
    expect(result.maskingReport).toBe('M')
    expect(result.cleaningReport).toBe('C')
    expect(result.inventoryReport).toBe('I')
    expect(result.packagingManual).toBe('P')
    expect(result.completedStages).toBe(4)
    expect(result.failedStage).toBeUndefined()
    expect(result.error).toBeUndefined()
  })

  it('aggregatePartial fills completed reports and records the failure', () => {
    const result = aggregator.aggregatePartial(['M', 'C'], 'clean_data', 'boom')
    expect(result.maskingReport).toBe('M')
    expect(result.cleaningReport).toBe('C')
    expect(result.inventoryReport).toBe('')
    expect(result.packagingManual).toBe('')
    expect(result.completedStages).toBe(2)
    expect(result.failedStage).toBe('clean_data')
    expect(result.error).toBe('boom')
  })

  it('aggregatePartial returns empty strings when the reports array is empty', () => {
    const result = aggregator.aggregatePartial([], 'mask_sensitive_data', 'early')
    expect(result.maskingReport).toBe('')
    expect(result.completedStages).toBe(0)
    expect(result.failedStage).toBe('mask_sensitive_data')
  })
})

describe('SequentialExecutor', () => {
  let executor: SequentialExecutor

  beforeEach(() => {
    executor = new SequentialExecutor()
  })

  it('plan generates a 4-step pipeline with the correct tools and chained paths', () => {
    const input = join('work', 'supply.csv')
    const plan = executor.plan(input, 'PARTIAL', '供应链产品')

    expect(plan.steps).toHaveLength(4)
    const mask = plan.steps[0]!
    const clean = plan.steps[1]!
    const inventory = plan.steps[2]!
    const packaging = plan.steps[3]!

    expect(mask.toolName).toBe('mask_sensitive_data')
    expect(mask.inputPath).toBe(input)
    expect(mask.params).toEqual({ filePath: input, strategy: 'PARTIAL' })

    expect(clean.toolName).toBe('clean_data')
    const maskedPath = mask.inputPath.replace(/\.csv$/, '_masked.csv')
    expect(clean.inputPath).toBe(maskedPath)
    expect(clean.params).toEqual({ filePath: maskedPath, removeDuplicates: true, standardizeFormat: true })

    expect(inventory.toolName).toBe('inventory_data')
    expect(inventory.params.directory).toBe(inventory.inputPath)

    expect(packaging.toolName).toBe('package_data_asset')
    expect(packaging.params.productName).toBe('供应链产品')
  })

  it('plan chains masked -> cleaned -> inventory dir correctly', () => {
    const input = join('data', 'file.csv')
    const plan = executor.plan(input, 'FULL', 'P')
    // steps[0].inputPath is the original input; steps[1] is the masked output.
    const masked = plan.steps[1]!.inputPath
    const cleaned = plan.steps[3]!.inputPath
    const inventoryDir = plan.steps[2]!.inputPath
    expect(masked).toBe(join('data', 'file_masked.csv'))
    expect(cleaned).toBe(join('data', 'file_masked_cleaned.csv'))
    expect(inventoryDir).toBe(dirname(cleaned))
    // The cleaning step consumes the masked output; packaging consumes the cleaned output.
    expect(plan.steps[1]!.inputPath).toBe(masked)
    expect(plan.steps[3]!.inputPath).toBe(cleaned)
  })

  it('aggregateResults delegates to ReportAggregator and reports success', () => {
    const { success, result } = executor.aggregateResults('M', 'C', 'I', 'P')
    expect(success).toBe(true)
    expect(result.completedStages).toBe(4)
    expect(result.packagingManual).toBe('P')
  })

  it('aggregateFailure delegates to aggregatePartial and reports failure', () => {
    const { success, result } = executor.aggregateFailure(['M'], 'clean_data', 'err')
    expect(success).toBe(false)
    expect(result.completedStages).toBe(1)
    expect(result.failedStage).toBe('clean_data')
    expect(result.error).toBe('err')
  })
})

describe('OrchestrationExecutor', () => {
  let executor: OrchestrationExecutor

  beforeEach(() => {
    executor = new OrchestrationExecutor()
  })

  it('plan mirrors SequentialExecutor.plan', () => {
    const plan = executor.plan(join('d', 'f.csv'), 'PARTIAL', 'P')
    expect(plan.steps).toHaveLength(4)
    expect(plan.steps[0]!.toolName).toBe('mask_sensitive_data')
    expect(plan.steps[3]!.toolName).toBe('package_data_asset')
  })

  it('aggregateResults reports success with 4 completed stages', () => {
    const { success, result } = executor.aggregateResults('M', 'C', 'I', 'P')
    expect(success).toBe(true)
    expect(result.completedStages).toBe(4)
  })

  it('aggregateFailure reports failure with partial reports', () => {
    const { success, result } = executor.aggregateFailure(['M', 'C'], 'inventory_data', 'oops')
    expect(success).toBe(false)
    expect(result.completedStages).toBe(2)
    expect(result.failedStage).toBe('inventory_data')
  })

  it('getTimeoutMs returns the configured full-flow timeout', () => {
    expect(executor.getTimeoutMs()).toBe(180000)
  })
})

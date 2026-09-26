import type { VerticalChain, VerticalChainExecutionResult, VerticalChainFailureResult, VerticalChainSuccessResult } from './verticalChainTypes.js'

export async function executeVerticalChain(
  chain: VerticalChain,
  toolExecutor?: (tool: string) => Promise<string>,
): Promise<VerticalChainExecutionResult> {
  const steps = chain.chain.map((tool) => ({
    tool,
    status: 'pending' as 'pending' | 'running' | 'completed' | 'failed',
    output: null as string | null,
  }))

  const completed: string[] = []

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!
    step.status = 'running'
    try {
      if (toolExecutor) {
        step.output = await toolExecutor(step.tool)
      } else {
        step.output = `工具 ${step.tool} 待执行（需通过编排引擎调用）`
      }
      step.status = 'completed'
      completed.push(step.tool)
    } catch (e) {
      step.status = 'failed'
      const errorMsg = (e as Error).message
      step.output = `执行失败: ${errorMsg}`
      const failureResult: VerticalChainFailureResult = {
        trigger: chain.trigger,
        completed,
        failed: step.tool,
        error: errorMsg,
        completedAt: new Date().toISOString(),
      }
      return failureResult
    }
  }

  const successResult: VerticalChainSuccessResult = {
    trigger: chain.trigger,
    completed,
    steps,
    completedAt: new Date().toISOString(),
  }
  return successResult
}
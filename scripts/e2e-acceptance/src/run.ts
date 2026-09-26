import { resolve } from 'node:path'
import { exit } from 'node:process'
import { prepare, cleanupSandbox } from './environmentPreparer.js'
import { generateNormal, generateInvalid } from './testDataFixture.js'
import { runVisibilityAcceptance } from './visibilityAccepter.js'
import { runChainAcceptance } from './chainAccepter.js'
import { runFailureAcceptance } from './failureAccepter.js'
import { runPolicyAcceptance } from './policyAccepter.js'
import { runNpmAcceptance } from './npmAccepter.js'
import { generateReport } from './reportGenerator.js'
import type { AcceptanceReport, AcceptanceConfig, AcceptanceExitCode, ThreeStandardsSummary, ErrorRecord, DshClientType, PreparedEnvironment } from './types.js'

async function main(): Promise<AcceptanceExitCode> {
  const config: AcceptanceConfig = {
    keepSandbox: process.env['KEEP_SANDBOX'] === 'true',
    timeoutMultiplier: parseInt(process.env['TIMEOUT_MULTIPLIER'] ?? '1', 10),
  }

  const outputDir = resolve(process.cwd(), 'e2e-reports')
  const samplesDir = resolve(outputDir, 'samples')
  const allErrors: ErrorRecord[] = []

  console.log('[e2e] 开始端到端验收...')

  console.log('[e2e] 验收项 5: npm 包可查性（可独立执行）')
  const npmResult = await runNpmAcceptance()
  allErrors.push(...npmResult.errors)
  console.log(`[e2e] npm 可查性: ${npmResult.passed ? '✅' : '❌'}`)

  console.log('[e2e] 准备前置环境...')
  const prepResult = await prepare(config)
  if (!prepResult.success || !prepResult.environment) {
    allErrors.push(...prepResult.errors)
    console.error('[e2e] 环境准备失败，生成部分报告')
    const report: AcceptanceReport = {
      generatedAt: new Date().toISOString(),
      environment: { nodeVersion: process.version, platform: process.platform, sandboxDir: '', dshBaseUrl: '', startedAt: new Date().toISOString() },
      visibility: { pluginsVisible: [], toolsRegistered: [], loadErrors: [], peerDepWarnings: [], passed: false, errors: [] },
      chain: { chainResults: [], checkpointChecks: [], passed: false, errors: [] },
      failure: { failureResults: [], passed: false, errors: [] },
      policy: { totalExpected: 9, foundInReports: [], missing: [], formatIssues: [], passed: false, errors: [] },
      npm: npmResult,
      threeStandards: { visible: { passed: false, details: '环境准备失败' }, queryable: { passed: npmResult.passed, details: 'npm可查性' }, usable: { passed: false, details: '环境准备失败' } },
      overallPassed: false,
      errors: allErrors,
    }
    const reportPath = generateReport(report, outputDir)
    console.log(`[e2e] 部分报告已生成: ${reportPath}`)
    return 1
  }

  const env = prepResult.environment
  const dshClient = env.dshClient as DshClientType

  console.log('[e2e] 生成测试数据...')
  const normalData = await generateNormal(env.sandboxDir)
  const invalidData = await generateInvalid(env.sandboxDir)

  console.log('[e2e] 验收项 1: 插件加载可见性')
  const visibility = await runVisibilityAcceptance(dshClient, env.installLog)
  allErrors.push(...visibility.errors)
  console.log(`[e2e] 可见性: ${visibility.passed ? '✅' : '❌'}`)

  console.log('[e2e] 验收项 2: 5条编排链路端到端')
  const chain = await runChainAcceptance(dshClient, normalData, samplesDir)
  allErrors.push(...chain.errors)
  console.log(`[e2e] 链路端到端: ${chain.passed ? '✅' : '❌'}`)

  console.log('[e2e] 验收项 3: 失败处理验证')
  const failure = await runFailureAcceptance(dshClient, invalidData)
  allErrors.push(...failure.errors)
  console.log(`[e2e] 失败处理: ${failure.passed ? '✅' : '❌'}`)

  console.log('[e2e] 验收项 4: 政策依据可查性')
  const policy = runPolicyAcceptance(chain.chainResults)
  allErrors.push(...policy.errors)
  console.log(`[e2e] 政策依据: ${policy.passed ? '✅' : '❌'}`)

  const threeStandards: ThreeStandardsSummary = {
    visible: { passed: visibility.passed, details: `${visibility.pluginsVisible.filter(p => p.visible).length}/${visibility.pluginsVisible.length} 插件可见, ${visibility.toolsRegistered.filter(t => t.registered).length}/${visibility.toolsRegistered.length} 工具已注册` },
    queryable: { passed: policy.passed && npmResult.passed, details: `政策依据 ${policy.foundInReports.length}/${policy.totalExpected}, npm ${npmResult.packageChecks.filter(c => c.versionMatch).length}/${npmResult.packageChecks.length} 版本一致` },
    usable: { passed: chain.passed && failure.passed, details: `链路 ${chain.chainResults.filter(r => r.success).length}/${chain.chainResults.length} 通过, 失败处理 ${failure.failureResults.filter(f => f.passed).length}/${failure.failureResults.length} 正确` },
  }

  const overallPassed = threeStandards.visible.passed && threeStandards.queryable.passed && threeStandards.usable.passed

  const report: AcceptanceReport = {
    generatedAt: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      sandboxDir: env.sandboxDir,
      dshBaseUrl: env.baseUrl,
      startedAt: new Date().toISOString(),
    },
    visibility,
    chain,
    failure,
    policy,
    npm: npmResult,
    threeStandards,
    overallPassed,
    errors: allErrors,
  }

  console.log('[e2e] 生成验收报告...')
  const reportPath = generateReport(report, outputDir)
  console.log(`[e2e] 报告已生成: ${reportPath}`)

  console.log('[e2e] 清理环境...')
  ;(env.dshProcess as { kill: () => void }).kill()
  cleanupSandbox(env.sandboxDir, config.keepSandbox)

  console.log(`[e2e] 总体结论: ${overallPassed ? '✅ 可见、可查、可用三标准全部通过' : '❌ 存在失败项'}`)
  return overallPassed ? 0 : 1
}

main().then(code => exit(code)).catch(e => {
  console.error(`[e2e] 致命错误: ${(e as Error).message}`)
  exit(2)
})
import { PACKAGES, EXPECTED_TOOL_NAMES } from './config.js'
import type { DshClientType, VisibilityAcceptanceResult, ErrorRecord, InstallLogEntry } from './types.js'
import { scanLoadErrors, scanPeerDepWarnings } from './environmentPreparer.js'

export async function checkPluginsVisible(dshClient: DshClientType): Promise<{ packageName: string; visible: boolean }[]> {
  const pluginList = await dshClient.listPlugins()
  return PACKAGES.map(pkg => ({
    packageName: pkg.name,
    visible: pluginList.some(p => p.includes(pkg.name)),
  }))
}

export async function checkToolsRegistered(dshClient: DshClientType): Promise<{ toolName: string; registered: boolean }[]> {
  const results: { toolName: string; registered: boolean }[] = []
  for (const toolName of EXPECTED_TOOL_NAMES) {
    const meta = await dshClient.getToolMetadata(toolName)
    results.push({ toolName, registered: meta !== null })
  }
  return results
}

export async function runVisibilityAcceptance(
  dshClient: DshClientType,
  installLog: readonly InstallLogEntry[],
): Promise<VisibilityAcceptanceResult> {
  const errors: ErrorRecord[] = []

  const pluginsVisible = await checkPluginsVisible(dshClient)
  const toolsRegistered = await checkToolsRegistered(dshClient)
  const loadErrors = scanLoadErrors(installLog)
  const peerDepWarnings = scanPeerDepWarnings(installLog)

  for (const p of pluginsVisible) {
    if (!p.visible) {
      errors.push({ severity: 'error', code: 'PLUGIN_NOT_VISIBLE', message: `Plugin ${p.packageName} not visible in DSH list` })
    }
  }

  for (const t of toolsRegistered) {
    if (!t.registered) {
      errors.push({ severity: 'error', code: 'TOOL_NOT_FOUND', message: `Tool ${t.toolName} not registered` })
    }
  }

  for (const err of loadErrors) {
    errors.push({ severity: 'error', code: 'LOAD_ERROR', message: err })
  }

  for (const warn of peerDepWarnings) {
    errors.push({ severity: 'warning', code: 'PEER_DEP_WARNING', message: warn })
  }

  const passed = errors.filter(e => e.severity !== 'warning').length === 0

  return { pluginsVisible, toolsRegistered, loadErrors, peerDepWarnings, passed, errors }
}
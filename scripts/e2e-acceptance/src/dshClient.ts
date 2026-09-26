import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { TIMEOUTS } from './config.js'
import type { DshClientType } from './types.js'

const execFileAsync = promisify(execFile)

export class DshClient implements DshClientType {
  private readonly baseUrl: string
  private readonly timeoutMs: number

  constructor(baseUrl: string, timeoutMs: number = TIMEOUTS.chainExecution) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.timeoutMs = timeoutMs
  }

  async invokeTool(toolName: string, args: Record<string, unknown>): Promise<string> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await fetch(`${this.baseUrl}/api/tools/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName, args }),
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new Error(`DSH_API_UNREACHABLE: HTTP ${response.status}`)
      }
      const data = await response.json() as { result?: string; error?: string }
      if (data.error) {
        throw new Error(`TOOL_EXECUTION_ERROR: ${data.error}`)
      }
      return data.result ?? JSON.stringify(data)
    } catch (e) {
      const err = e as Error
      if (err.name === 'AbortError') {
        throw new Error(`DSH_API_TIMEOUT: ${toolName} timed out after ${this.timeoutMs}ms`)
      }
      if (err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED')) {
        return this.invokeToolCli(toolName, args)
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  }

  private async invokeToolCli(toolName: string, args: Record<string, unknown>): Promise<string> {
    try {
      const { stdout } = await execFileAsync('dsh', ['tool', 'invoke', toolName, '--args', JSON.stringify(args)], {
        timeout: this.timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      })
      return stdout
    } catch (e) {
      throw new Error(`DSH_CLI_FALLBACK_USED: ${(e as Error).message}`)
    }
  }

  async listPlugins(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/plugins`, {
        signal: AbortSignal.timeout(TIMEOUTS.npmQuery),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json() as { plugins?: string[] }
      return data.plugins ?? []
    } catch {
      try {
        const { stdout } = await execFileAsync('dsh', ['plugin', 'list'], { timeout: TIMEOUTS.npmQuery })
        return stdout.split('\n').map(l => l.trim()).filter(Boolean)
      } catch {
        return []
      }
    }
  }

  async getToolMetadata(toolName: string): Promise<{ name: string; description: string } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tools/${encodeURIComponent(toolName)}`, {
        signal: AbortSignal.timeout(TIMEOUTS.npmQuery),
      })
      if (!response.ok) return null
      const data = await response.json() as { name: string; description: string }
      return data
    } catch {
      return null
    }
  }

  async getStartupLogs(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/logs/startup`, {
        signal: AbortSignal.timeout(TIMEOUTS.npmQuery),
      })
      if (!response.ok) return ''
      return await response.text()
    } catch {
      return ''
    }
  }
}
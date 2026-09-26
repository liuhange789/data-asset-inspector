import { mkdirSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { resolve } from 'node:path'
import { DshClient } from './dshClient.js'
import { PACKAGES, TIMEOUTS, DSH_PROFILE, REPO_ROOT_PATH } from './config.js'
import type { AcceptanceConfig, PreparedEnvironment, InstallLogEntry, ErrorRecord, PreparationResult } from './types.js'

const execFileAsync = promisify(execFile)

export function createSandbox(): string {
  const baseDir = process.platform === 'win32' ? 'D:\\dsh-e2e-sandbox' : resolve(tmpdir(), 'dsh-e2e')
  const sandboxDir = resolve(baseDir, randomUUID())
  if (sandboxDir.startsWith(REPO_ROOT_PATH)) {
    throw new Error('SANDBOX_INSIDE_REPO: sandbox created inside repo path')
  }
  mkdirSync(sandboxDir, { recursive: true })
  return sandboxDir
}

export function cleanupSandbox(sandboxDir: string, keep: boolean = false): void {
  if (keep) return
  if (existsSync(sandboxDir)) {
    rmSync(sandboxDir, { recursive: true, force: true })
  }
}

interface DshProcessInfo {
  process: ReturnType<typeof spawn>
  baseUrl: string
  client: DshClient
}

export async function startDshWeb(sandboxDir: string): Promise<DshProcessInfo> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('npx', ['@deepseek-ai/dsh', 'web'], {
      cwd: sandboxDir,
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    })

    let stdout = ''
    let stderr = ''
    let resolved = false

    child.on('error', (err: Error) => {
      if (!resolved) {
        resolved = true
        reject(new Error(`DSH_START_FAILED: spawn error: ${err.message}`))
      }
    })

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true
        child.kill()
        reject(new Error(`DSH_START_TIMEOUT: no listening port after ${TIMEOUTS.dshStartup}ms. stderr: ${stderr}`))
      }
    }, TIMEOUTS.dshStartup)

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString()
      const portMatch = stdout.match(/listening on port (\d+)/i)
      if (portMatch && !resolved) {
        resolved = true
        clearTimeout(timer)
        const port = parseInt(portMatch[1]!, 10)
        const baseUrl = `http://127.0.0.1:${port}`
        const client = new DshClient(baseUrl)
        resolvePromise({ process: child, baseUrl, client })
      }
    })

    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    child.on('exit', (code) => {
      if (!resolved) {
        resolved = true
        clearTimeout(timer)
        reject(new Error(`DSH_START_FAILED: process exited with code ${code}. stderr: ${stderr}`))
      }
    })
  })
}

export async function installPackages(
  sandboxDir: string,
  timeoutMultiplier: number = 1,
): Promise<{ installLog: InstallLogEntry[]; errors: ErrorRecord[] }> {
  const installLog: InstallLogEntry[] = []
  const errors: ErrorRecord[] = []

  for (const pkg of PACKAGES) {
    const start = Date.now()
    const cmd = `dsh plugin --profile ${DSH_PROFILE} add ${pkg.name}@${pkg.version}`
    try {
      const { stdout, stderr } = await execFileAsync('dsh', ['plugin', '--profile', DSH_PROFILE, 'add', `${pkg.name}@${pkg.version}`], {
        cwd: sandboxDir,
        timeout: TIMEOUTS.packageInstall * timeoutMultiplier,
        maxBuffer: 10 * 1024 * 1024,
      })
      installLog.push({
        packageName: pkg.name,
        version: pkg.version,
        stdout,
        stderr,
        exitCode: 0,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      })
    } catch (e) {
      const err = e as Error & { code?: number; stderr?: string }
      installLog.push({
        packageName: pkg.name,
        version: pkg.version,
        stdout: '',
        stderr: err.stderr ?? err.message,
        exitCode: err.code ?? 1,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      })
      errors.push({
        severity: 'fatal',
        code: 'PACKAGE_INSTALL_FAILED',
        message: `Failed to install ${pkg.name}@${pkg.version}`,
        context: err.message,
      })
      break
    }
  }

  return { installLog, errors }
}

export function scanLoadErrors(installLog: readonly InstallLogEntry[]): string[] {
  const errors: string[] = []
  for (const entry of installLog) {
    const combined = `${entry.stdout}\n${entry.stderr}`
    for (const line of combined.split('\n')) {
      if (/ERR_|failed to load|Error:|Cannot find module/i.test(line)) {
        errors.push(line.trim())
      }
    }
  }
  return errors
}

export function scanPeerDepWarnings(installLog: readonly InstallLogEntry[]): string[] {
  const warnings: string[] = []
  for (const entry of installLog) {
    const combined = `${entry.stdout}\n${entry.stderr}`
    for (const line of combined.split('\n')) {
      if (/peerDependency|peer dependency|WARN.*peer/i.test(line)) {
        warnings.push(line.trim())
      }
    }
  }
  return warnings
}

export async function prepare(config: AcceptanceConfig): Promise<PreparationResult> {
  const errors: ErrorRecord[] = []
  let sandboxDir: string
  let dshInfo: DshProcessInfo | null = null

  try {
    sandboxDir = config.sandboxDir ?? createSandbox()
  } catch (e) {
    errors.push({ severity: 'fatal', code: 'SANDBOX_CREATE_FAILED', message: (e as Error).message })
    return { success: false, errors }
  }

  try {
    dshInfo = await startDshWeb(sandboxDir)
  } catch (e) {
    errors.push({ severity: 'fatal', code: 'DSH_START_FAILED', message: (e as Error).message })
    cleanupSandbox(sandboxDir, config.keepSandbox)
    return { success: false, errors }
  }

  const { installLog, errors: installErrors } = await installPackages(sandboxDir, config.timeoutMultiplier)
  errors.push(...installErrors)

  if (errors.length > 0) {
    dshInfo.process.kill()
    cleanupSandbox(sandboxDir, config.keepSandbox)
    return { success: false, errors }
  }

  return {
    success: true,
    environment: {
      sandboxDir,
      dshClient: dshInfo.client,
      dshProcess: dshInfo.process,
      installLog,
      baseUrl: dshInfo.baseUrl,
    },
    errors,
  }
}
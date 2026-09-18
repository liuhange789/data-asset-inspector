import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'

export function loadJsonConfig(
  envVar: string,
  localPath: string,
  sharedPackagePath: string,
): Record<string, unknown> {
  const envPath = process.env[envVar]
  if (envPath && existsSync(envPath)) {
    return JSON.parse(readFileSync(envPath, 'utf-8'))
  }
  if (existsSync(localPath)) {
    return JSON.parse(readFileSync(localPath, 'utf-8'))
  }
  try {
    const req = createRequire(import.meta.url)
    const resolved = req.resolve(sharedPackagePath)
    return JSON.parse(readFileSync(resolved, 'utf-8'))
  } catch {
    throw new Error(`CONFIG_NOT_FOUND: tried ${envVar}, ${localPath}, ${sharedPackagePath}`)
  }
}
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const schema: Record<string, unknown> = JSON.parse(
  readFileSync(resolve(__dirname, '../config-pack-schema.json'), 'utf8')
)

export function getSchema(): Record<string, unknown> {
  return schema
}

export function getRequiredFields(): string[] {
  return (schema.required as string[]) ?? []
}

export function getProperties(): Record<string, unknown> {
  return (schema.properties as Record<string, unknown>) ?? {}
}

export function validateConfigPack(pack: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const required = (schema.required as string[]) ?? []
  for (const field of required) {
    if (!(field in pack)) {
      errors.push(`Missing required field: ${field}`)
    }
  }
  return { valid: errors.length === 0, errors }
}

export default schema